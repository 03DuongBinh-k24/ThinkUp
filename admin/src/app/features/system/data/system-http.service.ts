import { apiErrorMessage } from '../../../shared/utils/api-error';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { collectAllPages } from '../../../shared/utils/api-paging';
import { ADMIN_ROLES, AUDIT_SUMMARY, MOMO_CONFIG, SYSTEM_SETTINGS } from '../../../core/data/mock/system.mock';
import { AdminHistoryEntry, AdminPerson, AdminRoleCode, AuditLog, AuditSummary, InternalStaff, MomoGatewayConfig, PaymentGateway, RoleChangeResult, SettingsParameters, SystemSettings } from '../models/system.models';
import { SystemPage, SystemStore } from './system.store';

/** Audit logs trả `{ items, pagination: { page, limit, total, totalPages } }`. */
interface ApiEnvelope<T> { items?: T[]; pagination?: { total?: number; pages?: number; totalPages?: number }; summary?: AuditSummary; }
interface ApiSettings { general?: Record<string, unknown>; parameters?: Record<string, unknown> }

/** 12 parameter hệ thống mà `GET /system/settings` trả về, khớp 1:1 với `SettingsParameters`. */
const PARAMETER_KEYS: Record<keyof SettingsParameters, string> = {
  platformRevenueShare: 'platform_revenue_share_percent',
  lecturerRevenueShare: 'instructor_revenue_share_percent',
  skillMasteryThreshold: 'roadmap_mastery_threshold',
  knowledgeGapThreshold: 'roadmap_knowledge_gap_threshold',
  minWithdrawal: 'minimum_payout_amount',
  maxWithdrawalsPerWeek: 'maximum_weekly_payout_requests',
  taxThreshold: 'tax_threshold',
  taxRate: 'tax_rate',
  superAdminThreshold: 'super_admin_threshold',
  paymentTimeout: 'payment_timeout_minutes',
  ordersPerPage: 'orders_per_page',
  courseReviewHours: 'course_review_hours',
  sMatchThreshold: 's_match_threshold',
  minCoursesPerMilestone: 'min_courses_per_milestone',
  testPassScore: 'test_pass_score',
  studentLockReasonMin: 'student_lock_min_chars',
  lecturerDisciplineReasonMin: 'lecturer_discipline_min_chars',
  courseRejectReasonMin: 'course_reject_min_chars'
};

/** Real system adapter. Unsupported UI-only secrets/gateway fields deliberately remain masked/mock-shaped. */
@Injectable()
export class SystemHttpService implements SystemStore {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/system`;
  private readonly adminState = signal<readonly AdminPerson[]>([]);
  private readonly candidateState = signal<readonly InternalStaff[]>([]);
  private readonly auditState = signal<readonly AuditLog[]>([]);
  private readonly summaryState = signal<AuditSummary>(AUDIT_SUMMARY);
  private readonly settingsState = signal<SystemSettings>(structuredClone(SYSTEM_SETTINGS));
  private readonly historyState = signal<readonly AdminHistoryEntry[]>([]);
  readonly admins = this.adminState.asReadonly(); readonly candidates = this.candidateState.asReadonly();
  readonly auditLogs = this.auditState.asReadonly(); readonly auditSummary = this.summaryState.asReadonly();
  readonly history = this.historyState.asReadonly(); readonly settings = this.settingsState.asReadonly();
  readonly roles = ADMIN_ROLES; readonly gateways = signal<readonly PaymentGateway[]>([]).asReadonly();
  readonly momoConfig = signal<MomoGatewayConfig>(structuredClone(MOMO_CONFIG)).asReadonly();
  readonly defaultParameters: SettingsParameters = structuredClone(SYSTEM_SETTINGS.parameters);

  readonly loading = signal(false);
  readonly loadError = signal('');
  private page: SystemPage = 'settings';
  private revision = 0;
  open(page: SystemPage): void { this.page = page; void this.load(); }

  async load(): Promise<void> {
    const revision = ++this.revision;
    this.loading.set(true);
    this.loadError.set('');
    const receive = async <T>(request: Promise<T>, apply: (value: T) => void) => {
      try {
        const value = await request;
        if (revision === this.revision) apply(value);
      } catch (error) {
        if (revision === this.revision) this.loadError.set(apiErrorMessage(error));
      }
    };
    switch (this.page) {
      case 'security':
        await Promise.all([
          receive(firstValueFrom(this.http.get<Raw[]>(`${this.base}/security/admins`)), rows => this.adminState.set(rows.map(toAdmin))),
          receive(firstValueFrom(this.http.get<Raw[]>(`${this.base}/security/candidates`)), rows => this.candidateState.set(rows.map(toCandidate)))
        ]);
        break;
      case 'audit':
        await Promise.all([
          receive(this.fetchAuditLogs(), rows => this.auditState.set(rows.map(toAudit))),
          receive(firstValueFrom(this.http.get<AuditSummary>(`${this.base}/audit/summary`)), summary => this.summaryState.set(summary))
        ]);
        break;
      case 'settings':
        await receive(firstValueFrom(this.http.get<ApiSettings>(`${this.base}/settings`)), settings => {
          if (!settings.parameters) throw new Error('Thiếu tham số cấu hình hệ thống.');
          this.settingsState.set(mapSettings(settings));
        });
    }
    if (revision === this.revision) this.loading.set(false);
  }

  private async fetchAuditLogs(): Promise<Record<string, unknown>[]> {
    const { items } = await collectAllPages<Record<string, unknown>>(async (page, pageSize) => {
      const params = new HttpParams({ fromObject: { page: String(page), limit: String(pageSize) } });
      const response = await firstValueFrom(this.http.get<ApiEnvelope<Record<string, unknown>>>(`${this.base}/audit/logs`, { params }));
      if (!Array.isArray(response.items)) throw new Error('Danh sách nhật ký không hợp lệ.');
      return {
        items: response.items,
        total: response.pagination?.total ?? 0,
        page,
        pageSize,
        pages: response.pagination?.totalPages ?? response.pagination?.pages ?? 1
      };
    });
    return items;
  }

  assignRole(id: string, role: AdminRoleCode, reason: string, otp: string): Promise<RoleChangeResult> { return this.fire('/security/assign-role', { email: this.candidates().find(person => person.id === id)?.email, role, reason, saOtp: otp }); }
  changeRole(id: string, role: AdminRoleCode, reason: string, otp: string): Promise<RoleChangeResult> { return this.fire('/security/change-role', { adminId: id, newRole: role, reason, saOtp: otp }); }
  setAccountLocked(id: string, locked: boolean, reason: string, otp: string): Promise<RoleChangeResult> { return this.fire('/security/toggle-lock', { adminId: id, lock: locked, reason, saOtp: otp }); }
  resetTwoFactor(id: string, reason: string, otp: string): Promise<RoleChangeResult> { return this.fire('/security/reset-2fa', { adminId: id, reason, saOtp: otp }); }
  async updateSettings(next: SystemSettings, otp: string): Promise<RoleChangeResult> {
    const updates = mapSettingsToApi(next, this.settings());
    const result = await this.send(this.http.put(`${this.base}/settings`, { updates, saOtp: otp }));
    if (result.ok) this.settingsState.set(structuredClone(next));
    return result;
  }
  setMaintenance(enabled: boolean): void { this.settingsState.update(value => ({ ...value, maintenance: { ...value.maintenance, enabled } })); }
  updateMomoConfig(config: MomoGatewayConfig): void { /* TODO(api-contract): backend chưa có endpoint cấu hình gateway trong handoff. */ }
  setGatewayStatus(_id: string, _status: PaymentGateway['status'], _statusLabel: string): void { /* TODO(api-contract): gateway status API chưa được bàn giao. */ }

  private async fire(path: string, body: Record<string, unknown>): Promise<RoleChangeResult> {
    const result = await this.send(this.http.post(`${this.base}${path}`, body));
    if (result.ok) await this.load();
    return result;
  }

  private async send(request: Observable<unknown>): Promise<RoleChangeResult> {
    try {
      await firstValueFrom(request);
      return { ok: true, message: 'Đã lưu thay đổi.' };
    } catch (error) {
      return { ok: false, message: apiErrorMessage(error) };
    }
  }
}

type Raw = Record<string, unknown>;
const isRaw = (value: unknown): value is Raw => !!value && typeof value === 'object' && !Array.isArray(value);
const obj = (value: unknown): Raw => (isRaw(value) ? value : {});
const value = (row: Raw, ...keys: string[]): string => {
  for (const key of keys) {
    const item = row[key];
    if (item != null && typeof item !== 'object') { return String(item); }
  }
  return '';
};
const ADMIN_ROLE_CODES: readonly string[] = ['SA', 'CA', 'FA', 'CS'];
/** Vai trò cũ (`SUPER_ADMIN`, `ADMIN`) chưa có trong UI; quy về SA để bảng không hiện mã lạ. */
const toRoleCode = (raw: string): AdminRoleCode => ADMIN_ROLE_CODES.includes(raw) ? raw as AdminRoleCode : ['SUPER_ADMIN', 'ADMIN'].includes(raw) ? 'SA' : 'CS';
const toAccountStatus = (raw: string): AdminPerson['status'] => raw.toLowerCase() === 'locked' ? 'locked' : raw.toLowerCase() === 'unverified' ? 'unverified' : 'active';
const toRisk = (raw: string): AuditLog['risk'] => raw === 'high' ? 'high' : raw === 'attention' ? 'attention' : 'normal';
const initialsOf = (name: string): string => name.trim().split(/\s+/).slice(-2).map(part => part[0] ?? '').join('').toUpperCase() || 'AD';
/** `diff.before/after` là object key→value; UI hiển thị danh sách label/value. */
const diffRows = (value: unknown): ReadonlyArray<{ label: string; value: string }> =>
  Object.entries(obj(value)).map(([label, item]) => ({ label, value: item == null ? '—' : typeof item === 'object' ? JSON.stringify(item) : String(item) }));

function toAdmin(row: Raw): AdminPerson {
  return {
    id: value(row, 'id', '_id'),
    code: value(row, 'code', 'admin_code'),
    name: value(row, 'name'),
    email: value(row, 'email'),
    role: toRoleCode(value(row, 'role')),
    twoFactor: row['twoFactor'] === 'active' ? 'active' : 'inactive',
    lastLoginAt: value(row, 'lastLoginAt', 'last_login_at'),
    lastLoginDevice: value(row, 'lastLoginDevice', 'last_login_device'),
    // Backend dùng cả `ACTIVE` và `active`.
    status: toAccountStatus(value(row, 'status')),
    isSelf: row['isSelf'] === true
  };
}
function toCandidate(row: Raw): InternalStaff { return { id: value(row, 'id', '_id'), name: value(row, 'name'), email: value(row, 'email') }; }
function toAudit(row: Raw): AuditLog {
  const actor = obj(row['actor']);
  const target = obj(row['target']);
  const client = obj(row['client_context']);
  const basis = obj(row['basis']);
  const diff = obj(row['diff']);
  const actorName = value(actor, 'name');
  return {
    // `log_code` (LOG-2026-…) là mã người dùng đọc được; `_id` chỉ là ObjectId.
    id: value(row, 'log_code', '_id', 'id'),
    at: value(row, 'timestamp', 'at', 'created_at'),
    actorName,
    actorEmail: value(actor, 'email'),
    actorRole: value(actor, 'role'),
    actorInitials: initialsOf(actorName),
    // Dùng nhãn tiếng Việt để bộ lọc module và chip trong trang Audit khớp danh sách có sẵn.
    module: value(row, 'module_label', 'module'),
    action: value(row, 'action_label', 'action'),
    outcome: row['outcome'] === 'failed' ? 'failed' : 'success',
    targetId: value(target, 'id'),
    targetName: value(target, 'name'),
    targetMeta: value(target, 'meta'),
    ip: value(client, 'ip'),
    location: value(client, 'location'),
    device: value(client, 'device'),
    risk: toRisk(value(row, 'risk_level', 'risk')),
    sessionId: value(client, 'session_id'),
    basis: value(basis, 'reason'),
    evidenceName: value(basis, 'evidence_name'),
    before: diffRows(diff['before']),
    after: diffRows(diff['after']),
    checksum: value(row, 'checksum')
  };
}

/**
 * API lưu `language` dạng mã ngắn (`vi`), còn `settings.component.ts` dùng nhãn hiển thị
 * (`Tiếng Việt`/`English`). Hai chiều phải map để custom-select không rơi về giá trị rỗng.
 */
const LANGUAGE_LABELS: Record<string, string> = { vi: 'Tiếng Việt', en: 'English' };
const LANGUAGE_CODES: Record<string, string> = { 'Tiếng Việt': 'vi', English: 'en' };

// tax_rate API là phân số (0.1); UI hiển thị theo % (10).
function mapSettings(api: ApiSettings): SystemSettings {
  const general = { ...SYSTEM_SETTINGS.general };
  const siteName = api.general?.['site_name'];
  if (siteName != null) { general.siteName = String(siteName); }
  const timezone = api.general?.['timezone'];
  if (timezone != null) { general.timezone = String(timezone); }
  const language = api.general?.['language'];
  if (language != null) { general.language = LANGUAGE_LABELS[String(language)] ?? String(language); }
  const hotline = api.general?.['hotline'];
  if (hotline != null) { general.hotline = String(hotline); }
  const address = api.general?.['address'];
  if (address != null) { general.address = String(address); }

  const parameters: Record<string, number> = { ...SYSTEM_SETTINGS.parameters };
  for (const [field, key] of Object.entries(PARAMETER_KEYS)) {
    const raw = api.parameters?.[key];
    if (raw == null) { continue; }
    parameters[field] = field === 'taxRate' ? Number(raw) * 100 : Number(raw);
  }

  return { ...structuredClone(SYSTEM_SETTINGS), general, parameters: parameters as unknown as SettingsParameters };
}

function mapSettingsToApi(input: SystemSettings, previous: SystemSettings): Record<string, unknown> {
  const parameters: Record<string, number> = {};
  for (const [field, key] of Object.entries(PARAMETER_KEYS)) {
    if (input.parameters[field as keyof SettingsParameters] === previous.parameters[field as keyof SettingsParameters]) continue;
    const amount = Number((input.parameters as unknown as Record<string, number>)[field]);
    parameters[key] = field === 'taxRate' ? amount / 100 : amount;
  }
  return { parameters };
}
