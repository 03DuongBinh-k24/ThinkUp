import { collectAllPages } from '../../../shared/utils/api-paging';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ContentComment, ContentPost, ContentReport, ContentReview, ModerationLog, ReportSeverity } from '../models/content.models';
import { CommentPageFilters, CommentSummary, ContentList, ContentStore, ReviewPageFilters, ReviewPageResult, ReviewSummary } from './content.store';

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
  private readonly reviewSummaryState=signal<ReviewSummary>({total:0,average:0,negative:0,nps:0,responseRate:0,pending:0,approved:0});
  private readonly commentsSummaryState=signal<CommentSummary>({total:0,visible:0,pending:0,flagged:0,hidden:0});
  readonly posts = this.postState.asReadonly(); readonly comments = this.commentState.asReadonly();
  readonly reviews = this.reviewState.asReadonly(); readonly reports = this.reportState.asReadonly();
  readonly logs = this.logState.asReadonly(); readonly loadError = this.errorState.asReadonly();
  readonly reviewSummary=this.reviewSummaryState.asReadonly();
  readonly commentsSummary=this.commentsSummaryState.asReadonly();

  private list: ContentList = 'posts';
  private revision = 0;
  private reviewRevision = 0;
  private reviewTotal = 0;
  private commentRevision=0;

  override async open(list: ContentList): Promise<void> {
    this.list = list;
    if(list==='reviews'||list==='comments')return;
    await this.load();
  }

  retry(): void { void this.load(); }
  override async loadReviewPage(filters: ReviewPageFilters): Promise<ReviewPageResult> {
    const revision=++this.reviewRevision;
    const params=new HttpParams({fromObject:{page:String(filters.page),pageSize:String(filters.pageSize),...(filters.q?{q:filters.q}:{}),...(filters.status?{status:filters.status}:{}),...(filters.rating?{rating:filters.rating}:{}),...(filters.nps?{nps:filters.nps}:{}),...(filters.response?{response:filters.response}:{}),...(filters.timeRange&&filters.timeRange!=='all'?{timeRange:filters.timeRange}:{})}});
    const [response,summaryResponse]=await Promise.all([firstValueFrom(this.http.get<ApiPage>(`${this.base}/reviews`,{params})),firstValueFrom(this.http.get<{summary:ReviewSummary}&ReviewSummary>(`${this.base}/reviews/summary`))]);
    if(!Array.isArray(response.items))throw new Error('Danh sách đánh giá không hợp lệ.');
    if(revision===this.reviewRevision){this.reviewState.set(response.items.map(toReview));this.reviewTotal=Number(response.pagination?.total??0);this.reviewSummaryState.set(summaryResponse.summary??summaryResponse);}
    return{page:filters.page,total:Number(response.pagination?.total??0),pages:Number(response.pagination?.pages??1)};
  }
  override async loadCommentPage(filters:CommentPageFilters):Promise<ReviewPageResult>{const revision=++this.commentRevision;const status=filters.status;const params=new HttpParams({fromObject:{page:String(filters.page),pageSize:String(filters.pageSize),...(filters.q?{q:filters.q}:{}),...(status?{status}:{}),...(filters.timeRange&&filters.timeRange!=='all'?{timeRange:filters.timeRange}:{})}});const [response,summary]=await Promise.all([firstValueFrom(this.http.get<ApiPage>(`${this.base}/comments`,{params})),firstValueFrom(this.http.get<{summary:CommentSummary}>(`${this.base}/comments/summary`))]);if(!Array.isArray(response.items))throw new Error('Danh sách bình luận không hợp lệ.');if(revision===this.commentRevision){this.commentState.set(response.items.map(toComment));this.commentsSummaryState.set(summary.summary);}return{page:filters.page,total:Number(response.pagination?.total??0),pages:Number(response.pagination?.pages??1)};}
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
  async restorePost(id: string): Promise<void> { await this.request(`posts/${encodeURIComponent(id)}/restore`, 'POST', {}); await this.load(); }
  async createPost(post: ContentPost): Promise<void> { await this.request('posts', 'POST', postPayload(post)); await this.load(); }
  async removePosts(ids: string[]): Promise<void> {
    throw new Error('Hãy xóa từng bài để gửi email giải trình cho đúng tác giả.');
  }
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
    const action = patch.body !== undefined ? null : patch.status === 'revision' ? 'request-revision' : patch['status'] === 'archived' ? 'archive' : patch['status'] === 'hidden' ? 'hide' : patch['status'] === 'published' ? (this.postState().find(post=>post.id===id)?.status==='hidden'?'restore':'approve') : null;
    if (action) await this.request(`posts/${encodeURIComponent(id)}/${action}`, 'POST', { reason: action === 'request-revision' ? patch.moderationNote : note, note: patch['status'] === 'archived' ? patch.moderationNote?.split(' — ').slice(1).join(' — ') : undefined });
    else await this.request(`posts/${encodeURIComponent(id)}`, 'PATCH', postPayload(patch));
    await this.load();
  }
  private async commentAction(id: string, patch: Record<string, unknown>, note: string): Promise<void> {
    const action = patch['status'] === 'deleted' ? 'remove' : patch['status'] === 'hidden' ? 'hide' : patch['content'] ? 'reply' : patch['status'] === 'spam' ? 'spam-restriction' : patch['status'] === 'visible' ? 'restore' : null;
    if (!action) throw new Error('Trạng thái bình luận chưa được hỗ trợ.');
    await this.request(`comments/${encodeURIComponent(id)}/${action}`, 'POST', { ...patch, reason: note, source: this.comments().find(item => item.id === id)?.contextType });
    await this.load();
  }

  async moderateComment(id: string, status: 'visible' | 'hidden', reason: string): Promise<void> {
    await this.commentAction(id, { status }, reason);
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

  async archivePostWithEmail(id: string, reason: string, note: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.base}/posts/${encodeURIComponent(id)}`, { body: { reason, note } }));
    await this.load();
  }
  async requestPostRevision(id: string, reason: string): Promise<void> {
    await this.request(`posts/${encodeURIComponent(id)}/request-revision`, 'POST', { reason });
    await this.load();
  }
}

function postPayload(post: Partial<ContentPost>) {
  return { ...post, content: post.body?.join('\n'), coverImage: post.thumbnail,
    commentsEnabled: post.allowComments };
}

const text = (row: Record<string, unknown>, ...keys: string[]): string => String(keys.map(key => row[key]).find(value => value != null) ?? '');
function plainComment(value: string): string {
  return value
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<\s*(p|div|li|h[1-6])\b[^>]*>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]*\n[ \t]*/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
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
function toPost(row: Record<string, unknown>): ContentPost { const htmlContent = text(row, 'content'); return { id: text(row, 'id'), title: text(row, 'title'), slug: text(row, 'slug'), category: text(row, 'category') as ContentPost['category'], author: text(row, 'author'), authorRole: 'Tác giả', tags: Array.isArray(row['tags']) ? row['tags'].map(String) : [], status: text(row, 'status') as ContentPost['status'] || 'published', excerpt: text(row, 'excerpt'), body: htmlContent.split('\n'), htmlContent, thumbnail: text(row, 'coverImage'), views: num(row, 'views'), commentCount: 0, createdAt: text(row, 'createdAt'), updatedAt: text(row, 'updatedAt'), featured: false, pinned: Boolean(row['pinned']), allowComments: row['allowComments'] !== false, loginRequired: Boolean(row['loginRequired']) }; }
function toComment(row: Record<string, unknown>): ContentComment { const rawStatus=text(row,'status');const status:ContentComment['status']=rawStatus==='hidden'?'hidden':rawStatus==='flagged'?'flagged':rawStatus==='pending'?'pending':rawStatus==='spam'?'spam':'visible';return { id: text(row, 'id'), transferredReportId: text(row, 'reportId', 'report_id') || undefined, postId: text(row, 'postId', 'post_id', 'blog_post_id', 'course_id', 'courseId'), postTitle: text(row, 'contextTitle', 'context_title', 'course_title', 'post_title'), contextTitle: text(row, 'contextTitle', 'context_title', 'course_title', 'post_title') || 'Chưa có thông tin ngữ cảnh', contextType: row['source'] === 'blog' ? 'blog' : 'course', author: text(row, 'author', 'authorName', 'author_name', 'reviewer_name') || 'Học viên', authorRole: 'Học viên', email: text(row, 'email', 'userEmail'), content: plainComment(text(row, 'content')), status, safety: status==='flagged'||Number(row['reportCount']??row['report_count']??0)>0 ? 'reported' : 'clean', reportCount: num(row, 'reportCount', 'report_count', 'reports_count'), likeCount: num(row, 'likesCount', 'like_count'), replyCount: num(row, 'replyCount', 'reply_count'), createdAt: text(row, 'createdAt', 'created_at') }; }
function defaultNpsForRating(r: number): number {
  const n = Math.round(Number(r) || 0);
  if (n >= 5) return 10;
  if (n === 4) return 8;
  if (n === 3) return 7;
  if (n === 2) return 5;
  if (n === 1) return 2;
  return 0;
}
function toReview(row: Record<string, unknown>): ContentReview {
  const rating = num(row, 'rating');
  const rawNps = row['nps'] != null ? num(row, 'nps') : (row['nps_score'] != null ? num(row, 'nps_score') : null);
  const nps = rawNps != null && rawNps > 0 ? rawNps : defaultNpsForRating(rating);
  return { id: text(row, 'id'), courseId: text(row, 'courseId', 'course_id'), courseTitle: text(row, 'courseTitle', 'course_title') || 'Đang tải khóa học', instructor: text(row, 'instructor', 'instructorName', 'instructor_name') || 'Chưa có thông tin', learner: text(row, 'learner', 'reviewerName', 'reviewer_name') || 'Học viên', learnerEmail: text(row, 'learnerEmail', 'learner_email'), completion: num(row, 'completion'), learningProgress: row['learningProgress'] as ContentReview['learningProgress'], rating, nps, feedbackTags: Array.isArray(row['feedbackTags']) ? row['feedbackTags'].map(String) : [], title: text(row, 'title'), content: text(row, 'content'), status: reviewStatus(row['status']), helpfulCount: num(row, 'helpfulCount'), reportCount: num(row, 'reportCount'), createdAt: text(row, 'createdAt'), reply: row['reply'] && typeof row['reply']==='object' ? reviewReply(row['reply']) : undefined };
}
function toReport(row: Record<string, unknown>): ContentReport { return { id: text(row, 'id'), code: text(row, 'code'), type: text(row, 'type') as ContentReport['type'], targetId: text(row, 'targetId'), targetTitle: text(row, 'targetTitle'), targetAuthor: text(row, 'targetAuthor'), priorOffenses: 0, reportedBy: text(row, 'reportedBy'), reason: text(row, 'reason'), description: text(row, 'description'), evidenceSnippet: text(row, 'evidenceSnippet'), severity: text(row, 'severity') as ContentReport['severity'] || 'medium', status: row['status'] === 'pending' ? 'new' : row['status'] === 'in_review' ? 'processing' : text(row, 'status') as ContentReport['status'] || 'new', createdAt: text(row, 'createdAt'), slaDueAt: text(row, 'slaDueAt'), assignee: text(row, 'assignee'), evidence: [] }; }
