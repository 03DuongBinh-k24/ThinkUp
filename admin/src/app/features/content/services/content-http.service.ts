import { collectAllPages } from '../../../shared/utils/api-paging';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ContentComment, ContentPost, ContentReport, ContentReview, ModerationLog, ReportSeverity } from '../models/content.models';
import { ContentList, ContentStore } from './content.store';

type ApiPage = { items?: Array<Record<string, unknown>>; pagination?: { total?: number; pages?: number } };

/** Base HTTP adapter for the content handoff. Blog UI remains intentionally incomplete while another developer revises it. */
@Injectable()
export class ContentHttpService extends ContentStore {
  override readonly requiresReportDecision = true;
  override readonly canApprovePendingReview = false;
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/content`;
  private readonly postState = signal<ContentPost[]>([]);
  private readonly commentState = signal<ContentComment[]>([]);
  private readonly reviewState = signal<ContentReview[]>([]);
  private readonly reportState = signal<ContentReport[]>([]);
  private readonly logState = signal<ModerationLog[]>([]);
  private readonly errorState = signal(false);
  readonly posts = this.postState.asReadonly(); readonly comments = this.commentState.asReadonly();
  readonly reviews = this.reviewState.asReadonly(); readonly reports = this.reportState.asReadonly();
  readonly logs = this.logState.asReadonly(); readonly loadError = this.errorState.asReadonly();

  private list: ContentList = 'posts';
  private revision = 0;

  override async open(list: ContentList): Promise<void> {
    this.list = list;
    await this.load();
  }

  retry(): void { void this.load(); }
  async load(): Promise<void> {
    const list = this.list;
    const revision = ++this.revision;
    this.errorState.set(false);
    try {
      const { items } = await collectAllPages(async (page, pageSize) => {
        const response = await firstValueFrom(this.http.get<ApiPage>(`${this.base}/${list}`, {
          params: new HttpParams().set('page', page).set('pageSize', pageSize)
        }));
        if (!Array.isArray(response.items)) throw new Error('Danh sách nội dung không hợp lệ.');
        return { items: response.items, page, pageSize, pages: response.pagination?.pages ?? 1,
          total: response.pagination?.total ?? response.items.length };
      }, 100, Number.MAX_SAFE_INTEGER, 4);
      if (revision !== this.revision) return;
      switch (list) {
        case 'posts': this.postState.set(items.map(toPost)); break;
        case 'comments': this.commentState.set(items.map(toComment)); break;
        case 'reviews': this.reviewState.set(items.map(toReview)); break;
        case 'reports': this.reportState.set(items.map(toReport)); break;
      }
    } catch {
      if (revision === this.revision) this.errorState.set(true);
    }
  }

  async updatePost(id: string, patch: Partial<ContentPost>, note: string): Promise<void> { await this.postAction(id, patch, note); }
  async createPost(post: ContentPost): Promise<void> { await this.request('posts', 'POST', postPayload(post)); await this.load(); }
  async removePosts(ids: string[]): Promise<void> { await Promise.all(ids.map(id => this.postAction(id, { status: 'archived' }, 'Xóa bài viết'))); }
  async updateComment(id: string, patch: Partial<ContentComment>, note: string, duration?: string): Promise<void> { await this.commentAction(id, { ...patch, duration }, note); }
  async removeComments(ids: string[]): Promise<void> { await Promise.all(ids.map(id => this.commentAction(id, { status: 'deleted' }, 'Xóa bình luận'))); }
  async replyComment(id: string, content: string): Promise<void> { await this.commentAction(id, { content }, 'Phản hồi bình luận'); }
  async updateReview(id: string, patch: Partial<ContentReview>, note: string): Promise<void> { await this.reviewAction(id, patch, note); }
  async replyReview(id: string, content: string): Promise<void> { await this.reviewAction(id, { content }, 'Phản hồi đánh giá'); }
  async removeReviews(ids: string[]): Promise<void> {
    try {
      for (const id of ids) {
        await this.request(`reviews/${encodeURIComponent(id)}/remove`, 'POST', { reason: 'Xóa đánh giá' });
      }
    } finally {
      await this.load();
    }
  }
  async updateReport(id: string, patch: Partial<ContentReport>, note: string, decision?: string): Promise<void> {
    const url = `reports/${encodeURIComponent(id)}`;
    if (patch.status === 'processing') {
      await this.request(`${url}/claim`, 'POST', {});
    } else if (patch.status === 'dismissed' && decision) {
      await this.request(`${url}/dismiss`, 'POST', { reasonCode: decision, note });
    } else if (patch.status === 'resolved' && decision) {
      const sanction = decision === 'restrict_comments' ? { type: decision, duration: '7d' } :
        { type: decision === 'remove_content' ? 'hide_content' : decision === 'warn' ? 'warning' : decision };
      await this.request(`${url}/resolve`, 'POST', { note, sanctions: [sanction] });
    } else {
      throw new Error('Mở chi tiết hồ sơ để chọn căn cứ hoặc chế tài.');
    }
    await this.load();
  }
  async transferComment(id: string, severity: ReportSeverity, note: string): Promise<Pick<ContentReport, 'code'> | null> {
    const comment = this.comments().find(item => item.id === id);
    if (!comment) return null;
    const result = await firstValueFrom(this.http.post<{ reportCode: string }>(
      `${this.base}/comments/${encodeURIComponent(id)}/handoff-report`,
      { source: comment.contextType, severity, reason: note.trim() }
    ));
    await this.load();
    return { code: result.reportCode };
  }
  reset(): void { void this.load(); }

  private async postAction(id: string, patch: Partial<ContentPost>, note: string): Promise<void> {
    const action = patch.body !== undefined ? null : patch.status === 'revision' ? 'request-revision' : patch['status'] === 'archived' ? 'archive' : patch['status'] === 'hidden' ? 'hide' : patch['status'] === 'published' ? 'approve' : null;
    if (action) await this.request(`posts/${encodeURIComponent(id)}/${action}`, 'POST', { reason: action === 'request-revision' ? patch.moderationNote : note });
    else await this.request(`posts/${encodeURIComponent(id)}`, 'PATCH', postPayload(patch));
    await this.load();
  }
  private async commentAction(id: string, patch: Record<string, unknown>, note: string): Promise<void> {
    const action = patch['status'] === 'deleted' ? 'remove' : patch['status'] === 'hidden' ? 'hide' : patch['content'] ? 'reply' : patch['status'] === 'spam' ? 'spam-restriction' : patch['status'] === 'visible' ? 'restore' : null;
    if (!action) throw new Error('Trạng thái bình luận chưa được hỗ trợ.');
    await this.request(`comments/${encodeURIComponent(id)}/${action}`, 'POST', { ...patch, reason: note, source: this.comments().find(item => item.id === id)?.contextType });
    await this.load();
  }
  private async reviewAction(id: string, patch: Record<string, unknown>, note: string): Promise<void> {
    const action = patch['status'] === 'hidden' ? 'hide' : patch['content'] ? 'reply' : patch['status'] === 'approved' ? 'restore' : null;
    if (!action) throw new Error('Trạng thái đánh giá chưa được hỗ trợ.');
    const review = this.reviews().find(item => item.id === id);
    if ((action === 'hide' && review?.status === 'hidden') || (action === 'restore' && review?.status === 'approved')) return;
    if (action === 'restore' && review?.status === 'pending') {
      throw new Error('API hiện chỉ hỗ trợ duyệt lại đánh giá đã ẩn hoặc bị từ chối.');
    }
    await this.request(`reviews/${encodeURIComponent(id)}/${action}`, 'POST', { ...patch, reason: patch['rejectionReason'] || note });
    await this.load();
  }
  private request(path: string, method: 'POST' | 'PATCH', body: unknown): Promise<unknown> {
    return firstValueFrom(method === 'POST' ? this.http.post(`${this.base}/${path}`, body) : this.http.patch(`${this.base}/${path}`, body));
  }
}

function postPayload(post: Partial<ContentPost>) {
  return { ...post, content: post.body?.join('\n'), coverImage: post.thumbnail,
    commentsEnabled: post.allowComments };
}

const text = (row: Record<string, unknown>, ...keys: string[]): string => String(keys.map(key => row[key]).find(value => value != null) ?? '');
const num = (row: Record<string, unknown>, ...keys: string[]): number => Number(keys.map(key => row[key]).find(value => value != null) ?? 0);
function reviewReply(value: unknown): ContentReview['reply'] {
  if (!value || typeof value !== 'object') return undefined;
  const row = value as Record<string, unknown>;
  const content = text(row, 'content');
  return content ? { content, by: text(row, 'byName', 'by'), at: text(row, 'at', 'created_at', 'createdAt') } : undefined;
}

function reviewStatus(value: unknown): ContentReview['status'] {
  switch (value) {
    case 'hidden': return 'hidden';
    case 'rejected':
    case 'declined': return 'rejected';
    case 'pending':
    case 'pending_review': return 'pending';
    default: return 'approved';
  }
}
function toPost(row: Record<string, unknown>): ContentPost { return { id: text(row, 'id'), title: text(row, 'title'), slug: text(row, 'slug'), category: text(row, 'category') as ContentPost['category'], author: text(row, 'author'), authorRole: 'Tác giả', tags: Array.isArray(row['tags']) ? row['tags'].map(String) : [], status: text(row, 'status') as ContentPost['status'] || 'published', excerpt: text(row, 'excerpt'), body: text(row, 'content').split('\n'), thumbnail: text(row, 'coverImage'), views: num(row, 'views'), commentCount: 0, createdAt: text(row, 'createdAt'), updatedAt: text(row, 'updatedAt'), featured: false, pinned: Boolean(row['pinned']), allowComments: row['allowComments'] !== false, loginRequired: Boolean(row['loginRequired']) }; }
function toComment(row: Record<string, unknown>): ContentComment { return { id: text(row, 'id'), transferredReportId: text(row, 'reportId', 'report_id') || undefined, postId: text(row, 'postId', 'post_id', 'blog_post_id', 'course_id', 'courseId'), postTitle: text(row, 'contextTitle', 'context_title', 'course_title', 'post_title'), contextTitle: text(row, 'contextTitle', 'context_title', 'course_title', 'post_title'), contextType: row['source'] === 'blog' ? 'blog' : 'course', author: text(row, 'author', 'authorName', 'author_name', 'reviewer_name') || 'Học viên', authorRole: 'Học viên', email: text(row, 'email', 'userEmail'), content: text(row, 'content'), status: text(row, 'status') as ContentComment['status'] || 'visible', safety: row['status'] === 'reported' ? 'reported' : 'clean', reportCount: num(row, 'reportCount', 'report_count', 'reports_count'), likeCount: num(row, 'likesCount', 'like_count'), replyCount: num(row, 'replyCount', 'reply_count'), createdAt: text(row, 'createdAt', 'created_at') }; }
function toReview(row: Record<string, unknown>): ContentReview { return { id: text(row, 'id'), courseId: text(row, 'courseId', 'course_id'), courseTitle: text(row, 'courseTitle', 'course_title') || 'Đang tải khóa học', instructor: text(row, 'instructor', 'instructorName', 'instructor_name') || 'Chưa có thông tin', learner: text(row, 'learner', 'reviewerName', 'reviewer_name') || 'Học viên', learnerEmail: text(row, 'learnerEmail', 'learner_email'), completion: num(row, 'completion'), learningProgress: row['learningProgress'] as ContentReview['learningProgress'], rating: num(row, 'rating'), nps: num(row, 'nps'), feedbackTags: Array.isArray(row['feedbackTags']) ? row['feedbackTags'].map(String) : [], title: text(row, 'title'), content: text(row, 'content'), status: reviewStatus(row['status']), helpfulCount: num(row, 'helpfulCount'), reportCount: num(row, 'reportCount'), createdAt: text(row, 'createdAt'), reply: reviewReply(row['reply']) }; }
function toReport(row: Record<string, unknown>): ContentReport { return { id: text(row, 'id'), code: text(row, 'code'), type: text(row, 'type') as ContentReport['type'], targetId: text(row, 'targetId'), targetTitle: text(row, 'targetTitle'), targetAuthor: text(row, 'targetAuthor'), priorOffenses: 0, reportedBy: text(row, 'reportedBy'), reason: text(row, 'reason'), description: text(row, 'description'), evidenceSnippet: text(row, 'evidenceSnippet'), severity: text(row, 'severity') as ContentReport['severity'] || 'medium', status: row['status'] === 'pending' ? 'new' : row['status'] === 'in_review' ? 'processing' : text(row, 'status') as ContentReport['status'] || 'new', createdAt: text(row, 'createdAt'), slaDueAt: text(row, 'slaDueAt'), assignee: text(row, 'assignee'), evidence: [] }; }
