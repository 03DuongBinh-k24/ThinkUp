import { apiErrorMessage } from '../../../shared/utils/api-error';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Attachment, ComplaintCase, FaqItem, FaqStatus, SupportTicket, TicketStatus } from '../models/support.models';
import { SupportDemoService } from './support-demo.service';

/**
 * Hợp đồng Support Admin: `{ success, data: { items, pagination: { page, limit, total, totalPages } } }`.
 * FAQ summary/failed-searches trả `{ success, data }` với `data` là object/array.
 */
interface SupportPage<T> {
  items?: T[];
  pagination?: { total?: number; pages?: number; totalPages?: number };
  data?: { items?: T[]; pagination?: { total?: number; pages?: number; totalPages?: number } };
}


/** Base support API adapter. The demo class remains the local fallback and supplies unchanged UI-only helpers. */
@Injectable({ providedIn: 'root' })
export class SupportHttpService extends SupportDemoService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;
  // Không khởi tạo bằng mock: API lỗi thì danh sách rỗng, không hiển thị dữ liệu giả như thật.
  // TODO(admin-api): thêm khối lỗi 403/500 cho module Support (hiện chỉ dừng ở danh sách rỗng).
  override readonly tickets = signal<SupportTicket[]>([]);
  override readonly complaints = signal<ComplaintCase[]>([]);
  override readonly faqs = signal<FaqItem[]>([]);

  private page: 'faqs' | 'tickets' | 'complaints' = 'faqs';
  private revision = 0;
  override readonly failedSearches = signal<import('../models/support.models').FailedSearch[]>([]);

  private detailId?: string;
  override open(page: 'faqs' | 'tickets' | 'complaints', id?: string): void {
    this.detailId = id;
    this.page = page;
    void this.load();
  }

  async load(): Promise<void> {
    const page = this.page;
    const revision = ++this.revision;
    this.loading.set(true);
    this.loadError.set('');
    const url = `${this.base}/admin/support/${page}`;
    try {
      const id = this.detailId;
      let rows: Raw[];
      if (id) {
        const result = await firstValueFrom(this.http.get<{ data: Raw }>(`${url}/${encodeURIComponent(id)}`));
        if (!isRaw(result.data) || !result.data['id']) throw new Error('Chi tiết hồ sơ không hợp lệ.');
        rows = [result.data];
      } else {
        rows = await this.all<Raw>(url, 'limit');
      }
      if (revision !== this.revision) return;
      switch (page) {
        case 'tickets': this.tickets.set(rows.map(toTicket)); break;
        case 'complaints': this.complaints.set(rows.map(toComplaint)); break;
        case 'faqs': {
          this.faqs.set(rows.map(toFaq));
          const result = await firstValueFrom(this.http.get<{ data: Raw[] }>(`${url}/failed-searches`));
          if (revision === this.revision) this.failedSearches.set(result.data.map(row => ({
            keyword: text(row, 'keyword'), count: number(row, 'searchCount'), suggestedCategory: text(row, 'suggestedCategory')
          })));
        }
      }
    } catch (error) {
      if (revision === this.revision) this.loadError.set(apiErrorMessage(error));
    } finally {
      if (revision === this.revision) this.loading.set(false);
    }
  }

  private async all<T>(url: string, pageParam: 'limit'): Promise<T[]> {
    const result: T[] = []; let page = 1; let pages = 1;
    do {
      const response = await firstValueFrom(this.http.get<SupportPage<T>>(url, { params: new HttpParams().set('page', page).set(pageParam, 100) }));
      // Backend bọc danh sách trong `data`; giữ nhánh phẳng để adapter không vỡ nếu envelope đổi.
      const payload = response.data ?? response;
      if (!Array.isArray(payload.items)) throw new Error('Danh sách hỗ trợ không hợp lệ.');
      result.push(...payload.items);
      const pagination = payload.pagination;
      pages = pagination?.totalPages ?? pagination?.pages ?? 1; page += 1;
    } while (page <= pages);
    return result;
  }

  override acceptTicket(id: string): void { void this.post(`/admin/support/tickets/${encodeURIComponent(id)}/claim`, {}); }
  override reply(id: string, body: string, status: Extract<TicketStatus, 'processing' | 'waiting'>, attachments: Attachment[] = []): void { void this.post(`/admin/support/tickets/${encodeURIComponent(id)}/reply`, { body, status, attachments }); }
  override assignTicket(id: string, assignee: string, note: string): void { void this.post(`/admin/support/tickets/${encodeURIComponent(id)}/transfer`, { assignee, note }); }
  override resolveTicket(id: string, body: string, category: string, internalNote: string, sendCsat: boolean, attachments: Attachment[] = []): void { void this.post(`/admin/support/tickets/${encodeURIComponent(id)}/resolve`, { finalReplyBody: body, resolutionCategory: category, internalSolutionNote: internalNote, sendCsatSurvey: sendCsat, attachments }); }
  override requestInstructorExplanation(id: string, deadlineHours: 12 | 24, freezeCommission: boolean, directive: string): Promise<unknown> { return this.post(`/admin/support/complaints/${encodeURIComponent(id)}/request-explanation`, { deadlineHours, freezeInstructorWallet: freezeCommission, adminInstructionNote: directive }); }
  override approveComplaintRefund(id: string, amount: number, revokeAccess: boolean, revokeCertificate: boolean, conclusion: string): Promise<unknown> { return this.post(`/admin/support/complaints/${encodeURIComponent(id)}/resolve-refund`, { refundType: amount === this.complaints().find(item => item.id === id)?.amount ? 'full' : 'partial', refundAmount: amount, revokeAccess, revokeCertificate, conclusionNote: conclusion }); }
  override dismissComplaint(id: string, basis: string, explanation: string, giftVoucher: boolean): Promise<unknown> { return this.post(`/admin/support/complaints/${encodeURIComponent(id)}/dismiss`, { rejectionBasis: basis, explanationNote: explanation, grantVoucher: giftVoucher }); }
  override disciplineInstructor(id: string, sanctions: string[], decisionText: string): Promise<unknown> { return this.post(`/admin/support/complaints/${encodeURIComponent(id)}/discipline-instructor`, { sanctions, decisionText }); }
  override async saveFaq(value: FaqItem): Promise<void> {
    const exists = this.faqs().some(item => item.id === value.id);
    await this.request(exists ? 'PUT' : 'POST', `/admin/support/faqs${exists ? `/${encodeURIComponent(value.id)}` : ''}`, {
      question: value.question,
      answer: value.answer,
      categoryCode: this.categoryCodeFor(value),
      keywords: value.keywords,
      orderIndex: value.order, status: value.status
    });
  }
  // TODO(pre-deploy): Nhớ đối chiếu payload `reorder` với backend trước khi phát hành (handoff chỉ ghi nhận `orderIndex`).
  override async reorderFaq(id: string, order: number): Promise<void> { await this.request('PATCH', `/admin/support/faqs/${encodeURIComponent(id)}/reorder`, { orderIndex: order }); }
  override async setFaqStatus(id: string, status: FaqStatus): Promise<void> {
    const current = this.faqs().find(item => item.id === id);
    // `toggle-status` chỉ đảo trạng thái hiện tại, nên chỉ gọi khi trạng thái đích khác hiện tại.
    if (current && current.status === status) { return; }
    await this.request('PATCH', `/admin/support/faqs/${encodeURIComponent(id)}/toggle-status`, {});
  }
  override async deleteFaq(id: string): Promise<void> { await this.request('DELETE', `/admin/support/faqs/${encodeURIComponent(id)}`); }

  /** `categoryCode` suy ra từ tên chuyên mục đang hiển thị; người dùng đổi chuyên mục thì mã phải đổi theo. */
  private categoryCodeFor(value: FaqItem): string {
    const codes: Record<string, string> = {
      'Tài khoản và Bảo mật': 'account_security', 'Thanh toán và Hóa đơn': 'payment_invoice',
      'Khóa học và Học tập': 'course_learning', 'Chứng chỉ': 'certificate',
      'Kỹ thuật và Ứng dụng': 'technical_app', 'Chính sách và Điều khoản': 'policy_terms', 'Khác': 'other'
    };
    return codes[value.category.replace(' & ', ' và ')] ?? value.category;
  }

  private post(path: string, body: unknown): Promise<unknown> { return this.request('POST', path, body); }
  private request(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<unknown> {
    const url = `${this.base}${path}`;
    const request = method === 'POST' ? this.http.post(url, body)
      : method === 'PUT' ? this.http.put(url, body)
      : method === 'PATCH' ? this.http.patch(url, body)
      : this.http.delete(url);
    return firstValueFrom(request).then(result => { void this.load(); return result; });
  }
}

type Raw = Record<string, unknown>;
const isRaw = (value: unknown): value is Raw => !!value && typeof value === 'object' && !Array.isArray(value);
const obj = (value: unknown): Raw => (isRaw(value) ? value : {});
/** Đọc chuỗi đầu tiên không rỗng; bỏ qua object/array để không in ra `[object Object]`. */
const text = (row: Raw, ...keys: string[]): string => {
  for (const key of keys) {
    const value = row[key];
    if (value != null && typeof value !== 'object') { return String(value); }
  }
  return '';
};
const number = (row: Raw, ...keys: string[]): number => Number(keys.map(key => row[key]).find(value => value != null && typeof value !== 'object') ?? 0);

const TICKET_STATUSES: readonly string[] = ['unassigned', 'processing', 'waiting', 'reopened', 'closed'];
const COMPLAINT_STATUSES: readonly string[] = ['reviewing', 'waiting_instructor', 'ready', 'resolved', 'dismissed'];

/** API dùng `critical` cho mức cao nhất; model UI chỉ có high/medium/low. */
const toPriority = (value: unknown): SupportTicket['priority'] => value === 'critical' || value === 'high' ? 'high' : value === 'low' ? 'low' : 'medium';

const attachmentKind = (mime: string, name: string): Attachment['kind'] =>
  mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(name) ? 'image'
    : mime === 'application/pdf' || /\.pdf$/i.test(name) ? 'pdf' : 'document';

/** `evidence` là object `{ count, files[] }`; vẫn chấp nhận mảng phẳng nếu contract đổi. */
const attachments = (value: unknown): Attachment[] => {
  const files = Array.isArray(value) ? value : Array.isArray(obj(value)['files']) ? obj(value)['files'] as unknown[] : [];
  return files.map(item => {
    const row = obj(item);
    const name = text(row, 'name', 'filename');
    return { name, kind: attachmentKind(text(row, 'mimeType', 'mime_type'), name), url: text(row, 'url') || undefined };
  });
};

function toTicket(row: Raw): SupportTicket {
  const learner = obj(row['learner']);
  const assignee = obj(row['assignee']);
  const sla = obj(row['sla']);
  const status = text(row, 'status');
  const assigneeName = text(assignee, 'name');
  return {
    id: text(row, 'id', 'ticketCode'),
    code: text(row, 'ticketCode'),
    learner: text(learner, 'fullName', 'name') || text(row, 'learner'),
    requesterRole: learner['role'] === 'instructor' ? 'instructor' : 'learner',
    email: text(learner, 'email'),
    phone: text(learner, 'phone'),
    // `topic` là mã (`learning_advice`); UI hiển thị và lọc theo nhãn tiếng Việt.
    topic: text(row, 'topicLabel', 'topic'),
    summary: text(row, 'summary', 'message'),
    priority: toPriority(row['priority']),
    status: TICKET_STATUSES.includes(status) ? status as TicketStatus : 'unassigned',
    createdAt: text(row, 'createdAt', 'created_at'),
    dueAt: text(sla, 'dueAt') || text(row, 'responseDueAt', 'dueAt', 'response_due_at'),
    assignee: assigneeName && assigneeName !== 'Chưa gán' ? assigneeName : undefined,
    assigneeId: text(assignee, 'id') || undefined,
    attachments: attachments(row['attachments'] ?? row['evidence']),
    thread: Array.isArray(row['thread']) ? row['thread'].filter(isRaw).map(message => ({
      id: text(message, 'id'), sender: text(message, 'senderName'),
      role: message['role'] === 'agent' ? 'agent' : message['role'] === 'system' ? 'system' : 'learner',
      body: text(message, 'body'), sentAt: text(message, 'createdAt'), attachments: attachments(message['attachments']),
      internalOnly: message['internalOnly'] === true,
      source: message['internalOnly'] === true ? 'internal' : message['source'] === 'email' ? 'email' : 'web'
    })) : [],
    resolvedAt: text(row, 'resolvedAt') || undefined
  };
}

function toComplaint(row: Raw): ComplaintCase {
  const claimant = obj(row['claimant']);
  const respondent = obj(row['respondent']);
  const sla = obj(row['sla']);
  const status = text(row, 'status');
  return {
    id: text(row, 'id', 'complaintCode'),
    code: text(row, 'complaintCode'),
    sourceTicketId: text(row, 'sourceTicketId') || undefined,
    claimant: text(claimant, 'fullName') || text(row, 'claimant'),
    respondent: text(respondent, 'fullName') || text(row, 'respondent'),
    // UI gom nhóm/lọc theo `type`; dùng nhãn tiếng Việt để bộ lọc hiển thị đọc được.
    type: text(row, 'disputeTypeLabel', 'disputeType'),
    status: COMPLAINT_STATUSES.includes(status) ? status as ComplaintCase['status'] : 'reviewing',
    amount: number(row, 'amount'),
    createdAt: text(row, 'createdAt', 'created_at'),
    dueAt: text(sla, 'dueAt') || text(row, 'dueAt'),
    risk: text(row, 'riskLevel', 'risk') === 'high' || row['isHighRisk'] === true ? 'high' : 'standard',
    evidence: attachments(row['evidence']),
    learnerStatement: text(row, 'learnerStatement'),
    instructorStatement: text(row, 'instructorStatement') || undefined,
    course: text(obj(row['course']), 'name') || text(row, 'course'),
    orderId: text(row, 'orderId'),
    purchasedAt: text(obj(row['systemCheck']), 'orderDate') || text(row, 'purchasedAt'),
    progress: number(obj(row['systemCheck']), 'progressPercent'),
    refundEligibleUntil: text(row, 'refundEligibleUntil')
  };
}

function toFaq(row: Raw): FaqItem {
  const status = text(row, 'status');
  return {
    id: text(row, 'id', '_id'),
    question: text(row, 'question'),
    answer: text(row, 'answer'),
    category: text(row, 'categoryName', 'categoryCode', 'category').replace(' & ', ' và '),
    categoryCode: text(row, 'categoryCode') || undefined,
    keywords: Array.isArray(row['keywords']) ? row['keywords'].map(String) : [],
    views: number(row, 'viewsCount', 'views'),
    order: number(row, 'orderIndex', 'order'),
    status: status === 'hidden' ? 'hidden' : 'published',
    updatedAt: text(row, 'updatedAt', 'createdAt')
  };
}
