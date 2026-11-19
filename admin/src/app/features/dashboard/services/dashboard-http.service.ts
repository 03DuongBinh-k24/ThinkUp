import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import {
  ActionItem, AuditLog, DashboardAnalytics, DashboardMetric, DashboardOverview, RevenuePoint, TopCourse,
} from '../models/dashboard.models';
import { DashboardQuery, DashboardStore } from './dashboard.store';

/* ------------------------------- API shapes ------------------------------- */

interface ApiOverview {
  success?: boolean;
  kpis?: {
    users?: { total?: number; active?: number; newInPeriod?: number; changePercent?: number | null };
    courses?: { total?: number; newInPeriod?: number; statuses?: Record<string, number> };
    revenue?: { total?: number; paid?: number; pending?: number; changePercent?: number | null; currency?: string };
    rooms?: { active?: number; onlineUsers?: number; capacity?: number; loadPercent?: number; loadStatus?: string };
  };
  actions?: Partial<Record<'payoutsPending' | 'payoutsLargePending' | 'courseApprovals' | 'complaints' | 'alerts', number>>;
}

interface ApiRevenueRow { period: string; original?: number; marketplace?: number; payout?: number }

interface ApiAnalytics {
  success?: boolean;
  revenue?: {
    rows?: ApiRevenueRow[];
    total?: number;
    original?: number;
    marketplace?: number;
    payout?: number;
    changePercent?: number | null;
  };
  learning?: {
    totalEnrollments?: number;
    completed?: number;
    inProgress?: number;
    inactive?: number;
    percentages?: { completed?: number; inProgress?: number; inactive?: number };
  };
  topCourses?: Array<{ courseId?: string; title?: string; purchases?: number; rating?: number | null }>;
}

interface ApiAuditLog {
  id?: string;
  actorName?: string | null;
  actor_name?: string | null;
  email?: string | null;
  role?: string | null;
  action?: string;
  ip?: string;
  userAgent?: string;
  at?: string;
  entity?: string | null;
  before?: unknown;
  after?: unknown;
}

interface ApiAuditLogList { success?: boolean; items?: ApiAuditLog[]; total?: number }

const ROLE_LABELS: Readonly<Record<string, string>> = {
  SA: 'Admin', CA: 'Academic (CA)', FA: 'Finance (FA)', CS: 'Support (CS)',
};

const ACTION_LABELS: Readonly<Record<string, string>> = {
  ADMIN_LOGIN: 'Đăng nhập quản trị',
  ADMIN_LOGOUT: 'Đăng xuất quản trị',
  ADMIN_AUDIT_LOG_EXPORT: 'Xuất nhật ký kiểm toán',
  COURSE_UPDATE: 'Cập nhật khóa học',
  COURSE_STATUS_UPDATE: 'Cập nhật trạng thái khóa học',
  COURSE_APPROVE: 'Duyệt khóa học',
  COURSE_REJECT: 'Từ chối khóa học',
  PAYOUT_APPROVE: 'Duyệt yêu cầu rút tiền',
  PAYOUT_REJECT: 'Từ chối yêu cầu rút tiền',
  VOUCHER_CREATE: 'Tạo voucher',
  VOUCHER_UPDATE: 'Cập nhật voucher',
  SYSTEM_SETTINGS_UPDATE: 'Cập nhật cấu hình hệ thống',
};

const LOAD_LABELS: Readonly<Record<string, string>> = {
  normal: 'Bình thường', high: 'Tải cao', overloaded: 'Quá tải',
};

const numberFmt = new Intl.NumberFormat('vi-VN');
const decimalFmt = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

function numeric(value: unknown): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

/** Rút gọn tiền VNĐ cho thẻ KPI: tỷ / triệu / đồng. */
function moneyParts(value: number): { value: string; unit: string } {
  if (value >= 1_000_000_000) return { value: decimalFmt.format(value / 1_000_000_000), unit: 'tỷ VNĐ' };
  if (value >= 1_000_000) return { value: decimalFmt.format(value / 1_000_000), unit: 'triệu VNĐ' };
  return { value: numberFmt.format(value), unit: 'VNĐ' };
}

/** Chuỗi tiền đầy đủ dùng ở khối tổng doanh thu. */
export function moneyLabel(value: number): string {
  return `${numberFmt.format(Math.round(numeric(value)))} đ`;
}

function trendLabel(value: number | null | undefined): string | undefined {
  if (value === null || value === undefined || !Number.isFinite(value)) return undefined;
  const sign = value > 0 ? '+' : '';
  return `${sign}${decimalFmt.format(value)}%`;
}

function percentOf(part: number, total: number): number {
  return total > 0 ? Number((part / total * 100).toFixed(1)) : 0;
}

/** `2026-11-09` → `09/11`, `2026-11` → `11/26`, `2026-Q4` → `Q4/26`. */
function periodLabel(period: string): string {
  const quarter = /^(\d{4})-Q([1-4])$/.exec(period);
  if (quarter) return `Q${quarter[2]}/${quarter[1].slice(2)}`;
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(period);
  if (day) return `${day[3]}/${day[2]}`;
  const month = /^(\d{4})-(\d{2})$/.exec(period);
  if (month) return `${month[2]}/${month[1].slice(2)}`;
  return period;
}

function formatLogTime(value: string | undefined): string {
  const date = new Date(value ?? '');
  if (!Number.isFinite(date.getTime())) return '—';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function jsonText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

@Injectable({ providedIn: 'root' })
export class DashboardHttpService implements DashboardStore {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  readonly overview = signal<DashboardOverview | null>(null);
  readonly analytics = signal<DashboardAnalytics | null>(null);
  readonly logs = signal<readonly AuditLog[]>([]);
  readonly logsTotal = signal(0);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly logsError = signal('');

  async load(query: DashboardQuery = {}): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    this.logsError.set('');
    const params = this.params(query);
    const [overview, analytics, logs] = await Promise.allSettled([
      firstValueFrom(this.http.get<ApiOverview>(`${this.base}/admin/dashboard/overview`, { params })),
      firstValueFrom(this.http.get<ApiAnalytics>(`${this.base}/admin/dashboard/analytics`, { params: this.analyticsParams(query) })),
      firstValueFrom(this.http.get<ApiAuditLogList>(`${this.base}/admin/dashboard/audit-logs`, { params: new HttpParams().set('limit', '20') })),
    ]);

    if (overview.status === 'fulfilled') {
      this.overview.set(this.mapOverview(overview.value));
    } else {
      this.overview.set(null);
      this.error.set(apiErrorMessage(overview.reason));
    }

    if (analytics.status === 'fulfilled') {
      this.analytics.set(this.mapAnalytics(analytics.value));
    } else {
      this.analytics.set(null);
      // CA/FA/CS nhận 403 ở analytics theo thiết kế phân quyền; không biến nó thành lỗi toàn trang.
      if (!this.error()) this.logsError.set('');
    }

    if (logs.status === 'fulfilled') {
      this.logs.set((logs.value.items ?? []).map(toAuditLog));
      this.logsTotal.set(numeric(logs.value.total));
    } else {
      this.logs.set([]);
      this.logsTotal.set(0);
      this.logsError.set(apiErrorMessage(logs.reason, 'Bạn không có quyền xem nhật ký quản trị.'));
    }

    this.loading.set(false);
  }

  private params(query: DashboardQuery): HttpParams {
    let params = new HttpParams();
    if (query.startDate && query.endDate) {
      params = params.set('startDate', query.startDate).set('endDate', query.endDate);
    } else if (query.period) {
      params = params.set('period', query.period);
    }
    return params;
  }

  private analyticsParams(query: DashboardQuery): HttpParams {
    let params = this.params(query);
    if (query.grain) params = params.set('grain', query.grain);
    return params;
  }

  private mapOverview(api: ApiOverview): DashboardOverview {
    const kpis = api.kpis ?? {};
    const metrics: DashboardMetric[] = [];

    if (kpis.users) {
      metrics.push({
        key: 'users', theme: 'users', title: 'Tổng người dùng',
        value: numberFmt.format(numeric(kpis.users.total)), unit: 'người',
        trend: trendLabel(kpis.users.changePercent),
        detail: [
          `Đang hoạt động: ${numberFmt.format(numeric(kpis.users.active))}`,
          `Mới trong kỳ: ${numberFmt.format(numeric(kpis.users.newInPeriod))}`,
        ],
        link: '/users/students',
      });
    }

    if (kpis.courses) {
      const statuses = kpis.courses.statuses ?? {};
      metrics.push({
        key: 'courses', theme: 'courses', title: 'Khóa học',
        value: numberFmt.format(numeric(kpis.courses.total)), unit: 'khóa học',
        detail: [
          `Đã xuất bản: ${numberFmt.format(numeric(statuses['published']))}`,
          `Chờ duyệt: ${numberFmt.format(numeric(statuses['pending_review']))}`,
          `Bị ẩn: ${numberFmt.format(numeric(statuses['hidden']))}`,
        ],
        link: '/courses',
      });
    }

    if (kpis.revenue) {
      const money = moneyParts(numeric(kpis.revenue.total));
      metrics.push({
        key: 'revenue', theme: 'revenue', title: 'Doanh thu',
        value: money.value, unit: money.unit,
        trend: trendLabel(kpis.revenue.changePercent),
        detail: [
          `Đã thanh toán: ${moneyParts(numeric(kpis.revenue.paid)).value} ${moneyParts(numeric(kpis.revenue.paid)).unit}`,
          `Chờ đối soát: ${moneyParts(numeric(kpis.revenue.pending)).value} ${moneyParts(numeric(kpis.revenue.pending)).unit}`,
        ],
        link: '/business/orders',
      });
    }

    if (kpis.rooms) {
      const loadPercent = numeric(kpis.rooms.loadPercent);
      metrics.push({
        key: 'rooms', theme: 'rooms', title: 'Phòng học ảo',
        value: numberFmt.format(numeric(kpis.rooms.active)), unit: 'phòng đang diễn ra',
        detail: [`Trực tuyến: ${numberFmt.format(numeric(kpis.rooms.onlineUsers))}`],
        loadPercent,
        loadLabel: LOAD_LABELS[String(kpis.rooms.loadStatus ?? 'normal')] ?? LOAD_LABELS['normal'],
      });
    }

    const actions = api.actions ?? {};
    const items: ActionItem[] = [];
    if (actions.payoutsPending !== undefined || actions.payoutsLargePending !== undefined) {
      items.push({
        key: 'payouts', title: 'Phê duyệt rút tiền', description: 'Yêu cầu vượt hạn mức (> 20M)',
        count: numeric(actions.payoutsLargePending ?? actions.payoutsPending), suffix: 'yêu cầu đang chờ',
        status: 'Cần phê duyệt', action: 'Xem & Duyệt', theme: 'pink', icon: '2-svg.svg', link: '/business/payouts',
      });
    }
    if (actions.courseApprovals !== undefined) {
      items.push({
        key: 'courseApprovals', title: 'Khóa học trễ hạn duyệt', description: 'Chờ duyệt quá hạn (> 2 tuần)',
        count: numeric(actions.courseApprovals), suffix: 'khóa học cần xử lý',
        status: 'Cần phê duyệt', action: 'Xử lý', theme: 'amber', icon: '2-svg2.svg', link: '/courses/approvals',
      });
    }
    if (actions.complaints !== undefined) {
      items.push({
        key: 'complaints', title: 'Khiếu nại tài khoản', description: 'Khiếu nại chưa xử lý xong',
        count: numeric(actions.complaints), suffix: 'khiếu nại đang mở',
        status: 'Ưu tiên cao', action: 'Xử lý ngay', theme: 'pink', icon: '2-svg4.svg', link: '/support/complaints',
      });
    }
    if (actions.alerts !== undefined) {
      items.push({
        key: 'alerts', title: 'Cảnh báo vận hành', description: 'Ticket/khiếu nại quá hạn xử lý',
        count: numeric(actions.alerts), suffix: 'sự cố ghi nhận',
        status: items.length && numeric(actions.alerts) === 0 ? 'Vận hành ổn định' : 'Cần kiểm tra',
        action: 'Kiểm tra', theme: 'blue', icon: '2-svg6.svg', link: '/system/audit',
      });
    }

    return {
      metrics,
      actions: items,
      revenue: {
        total: numeric(kpis.revenue?.total),
        pending: numeric(kpis.revenue?.pending),
        changePercent: kpis.revenue?.changePercent ?? null,
      },
    };
  }

  private mapAnalytics(api: ApiAnalytics): DashboardAnalytics {
    const rows = api.revenue?.rows ?? [];
    const bars: RevenuePoint[] = rows.map(row => ({
      month: periodLabel(row.period),
      original: Math.round(numeric(row.original) / 100_000) / 10,
      marketplace: Math.round(numeric(row.marketplace) / 100_000) / 10,
      payout: Math.round(numeric(row.payout) / 100_000) / 10,
    }));
    const courses: TopCourse[] = (api.topCourses ?? []).map(course => ({
      courseId: course.courseId ?? '',
      name: course.title ?? 'Khóa học',
      purchases: numeric(course.purchases),
      rating: course.rating === null || course.rating === undefined ? '—' : decimalFmt.format(course.rating),
    }));
    const learning = api.learning ?? {};
    const total = numeric(learning.totalEnrollments);
    const completed = numeric(learning.completed);
    const inProgress = numeric(learning.inProgress);
    const inactive = numeric(learning.inactive);
    return {
      bars,
      courses,
      learning: {
        totalEnrollments: total, completed, inProgress, inactive,
        percentages: {
          completed: numeric(learning.percentages?.completed),
          inProgress: numeric(learning.percentages?.inProgress),
          inactive: numeric(learning.percentages?.inactive),
        },
      },
      totals: {
        total: numeric(api.revenue?.total),
        original: numeric(api.revenue?.original),
        marketplace: numeric(api.revenue?.marketplace),
        payout: numeric(api.revenue?.payout),
        changePercent: api.revenue?.changePercent ?? null,
      },
    };
  }
}

function toAuditLog(row: ApiAuditLog): AuditLog {
  const actorName = row.actorName ?? row.actor_name ?? '';
  const roleLabel = ROLE_LABELS[String(row.role ?? '')] ?? String(row.role ?? 'Admin');
  return {
    id: String(row.id ?? `${row.at ?? ''}-${row.action ?? ''}`),
    time: formatLogTime(row.at),
    account: actorName || row.email || 'Hệ thống',
    role: roleLabel,
    action: ACTION_LABELS[String(row.action ?? '')] ?? String(row.action ?? ''),
    ip: row.ip ?? 'unknown',
    actor: actorName ? `${actorName} · ${roleLabel}` : undefined,
    actionCode: row.action,
    device: row.userAgent,
    entity: row.entity ? `[${row.entity}]` : undefined,
    previous: jsonText(row.before),
    current: jsonText(row.after),
  };
}

export { percentOf, moneyParts };
