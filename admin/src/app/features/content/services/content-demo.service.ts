import { Injectable, signal } from '@angular/core';
import {
  MOCK_CONTENT_COMMENTS,
  MOCK_CONTENT_LOGS,
  MOCK_CONTENT_POSTS,
  MOCK_CONTENT_REPORTS,
  MOCK_CONTENT_REVIEWS
} from '../../../core/data/mock/content.mock';
import { ContentComment, ContentPost, ContentReport, ContentReview, ModerationLog, ReportSeverity } from '../models/content.models';
import { CommentSummary, ContentStore, ReviewPageFilters, ReviewPageResult, ReviewSummary } from './content.store';

// TODO(pre-deploy): Nhớ thay ContentDemoService bằng adapter HTTP khi backend cung cấp API quản lý nội dung.
@Injectable()
export class ContentDemoService extends ContentStore {
  private readonly postState = signal<ContentPost[]>(clone(MOCK_CONTENT_POSTS));
  private readonly commentState = signal<ContentComment[]>(clone(MOCK_CONTENT_COMMENTS));
  private readonly reviewState = signal<ContentReview[]>(clone(MOCK_CONTENT_REVIEWS));
  private readonly reportState = signal<ContentReport[]>(clone(MOCK_CONTENT_REPORTS));
  private readonly logState = signal<ModerationLog[]>(clone(MOCK_CONTENT_LOGS));
  private readonly errorState = signal(readDemoLoadError());
  readonly reviewSummary=signal<ReviewSummary>(summarizeReviews(MOCK_CONTENT_REVIEWS));
  readonly commentsSummary=signal<CommentSummary>(summarizeComments(MOCK_CONTENT_COMMENTS));

  readonly posts = this.postState.asReadonly();
  readonly comments = this.commentState.asReadonly();
  readonly reviews = this.reviewState.asReadonly();
  readonly reports = this.reportState.asReadonly();
  readonly logs = this.logState.asReadonly();
  readonly loadError = this.errorState.asReadonly();

  retry(): void {
    this.errorState.set(false);
  }
  override async loadReviewPage(filters: ReviewPageFilters): Promise<ReviewPageResult> {
    let rows=clone(MOCK_CONTENT_REVIEWS);
    if(filters.q){const q=filters.q.toLowerCase();rows=rows.filter(item=>[item.learner,item.learnerEmail,item.title,item.content,item.courseTitle,item.instructor].some(value=>value.toLowerCase().includes(q)));}
    if(filters.status)rows=rows.filter(item=>item.status===filters.status);
    if(filters.rating)rows=rows.filter(item=>filters.rating==='negative'?item.rating<=2:item.rating===Number(filters.rating));
    if(filters.nps==='promoter')rows=rows.filter(item=>item.nps>=9);else if(filters.nps==='passive')rows=rows.filter(item=>item.nps>=7&&item.nps<=8);else if(filters.nps==='detractor')rows=rows.filter(item=>item.nps<=6);
    if(filters.response)rows=rows.filter(item=>filters.response==='replied'?!!item.reply:!item.reply);
    if(filters.timeRange&&filters.timeRange!=='all'){const days=Number(filters.timeRange.replace('d','')),cutoff=Date.now()-days*86400000;rows=rows.filter(item=>Date.parse(item.createdAt)>=cutoff);}
    const total=rows.length,pages=Math.max(1,Math.ceil(total/filters.pageSize));this.reviewState.set(rows.slice((filters.page-1)*filters.pageSize,filters.page*filters.pageSize));this.reviewSummary.set(summarizeReviews(MOCK_CONTENT_REVIEWS));return{total,pages,page:filters.page};
  }
  override async loadCommentPage(filters: import('./content.store').CommentPageFilters):Promise<ReviewPageResult>{let rows=clone(MOCK_CONTENT_COMMENTS);if(filters.q){const q=filters.q.toLowerCase();rows=rows.filter(x=>[x.author,x.content,x.contextTitle].some(v=>v.toLowerCase().includes(q)));}if(filters.status)rows=rows.filter(x=>x.status===filters.status);const total=rows.length,pages=Math.max(1,Math.ceil(total/filters.pageSize));this.commentState.set(rows.slice((filters.page-1)*filters.pageSize,filters.page*filters.pageSize));this.commentsSummary.set(summarizeComments(MOCK_CONTENT_COMMENTS));return{total,pages,page:filters.page};}

  updatePost(id: string, patch: Partial<ContentPost>, note: string): void {
    this.postState.update(items => items.map(item => item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item));
    this.log(`Bài viết ${id}`, patch.status ? statusAction(patch.status) : 'Cập nhật', note);
  }
  restorePost(id: string): Promise<void> { this.updatePost(id, { status: 'published' }, 'Khôi phục xuất bản bài viết.'); return Promise.resolve(); }

  createPost(post: ContentPost): void {
    this.postState.update(items => [post, ...items]);
    this.log(`Bài viết ${post.id}`, 'Tạo mới', 'Tạo bài viết ở trạng thái ' + statusAction(post.status) + '.');
  }

  removePosts(ids: string[]): void {
    this.postState.update(items => items.filter(item => !ids.includes(item.id)));
    ids.forEach(id => this.log(`Bài viết ${id}`, 'Xóa', 'Xóa vĩnh viễn bài viết khỏi hệ thống.'));
  }

  archivePostWithEmail(_id: string, _reason: string, _note: string): Promise<void> {
    return Promise.reject(new Error('Chức năng gửi email chỉ khả dụng khi kết nối máy chủ thật.'));
  }
  requestPostRevision(_id: string, _reason: string): Promise<void> {
    return Promise.reject(new Error('Chức năng gửi email chỉ khả dụng khi kết nối máy chủ thật.'));
  }

  updateComment(id: string, patch: Partial<ContentComment>, note: string): void {
    this.commentState.update(items => items.map(item => item.id === id ? { ...item, ...patch } : item));
    this.log(`Bình luận ${id}`, patch.status === 'hidden' ? 'Ẩn' : patch.status === 'visible' ? 'Hiện lại' : 'Cập nhật', note);
  }
  moderateComment(id: string, status: 'visible' | 'hidden', reason: string): Promise<void> { this.updateComment(id, { status }, reason); return Promise.resolve(); }

  removeComments(ids: string[], reason: string): void {
    this.commentState.update(items => items.filter(item => !ids.includes(item.id)));
    ids.forEach(id => this.log(`Bình luận ${id}`, 'Xóa', `Xóa vĩnh viễn: ${reason}`));
  }

  replyComment(id: string, content: string, actor: string): void {
    this.commentState.update(items => items.map(item => item.id === id ? { ...item, replyCount: item.replyCount + 1 } : item));
    this.log(`Bình luận ${id}`, 'Phản hồi', `${actor}: ${content}`);
  }

  updateReview(id: string, patch: Partial<ContentReview>, note: string): void {
    this.reviewState.update(items => items.map(item => item.id === id ? { ...item, ...patch } : item));
    this.log(`Đánh giá ${id}`, patch.status ? statusAction(patch.status) : 'Cập nhật', note);
  }

  replyReview(id: string, content: string, actor: string): void {
    this.reviewState.update(items => items.map(item => item.id === id
      ? { ...item, reply: { content, by: actor, at: new Date().toISOString() } }
      : item));
    this.log(`Đánh giá ${id}`, 'Phản hồi', `${actor}: ${content}`);
  }

  removeReviews(ids: string[]): void {
    this.reviewState.update(items => items.filter(item => !ids.includes(item.id)));
    ids.forEach(id => this.log(`Đánh giá ${id}`, 'Xóa', 'Xóa đánh giá vi phạm tiêu chuẩn.'));
  }

  updateReport(id: string, patch: Partial<ContentReport>, note: string): void {
    const resolved = patch.status === 'resolved' || patch.status === 'dismissed';
    this.reportState.update(items => items.map(item => item.id === id
      ? {
          ...item,
          ...patch,
          resolutionNote: resolved ? note : item.resolutionNote,
          resolvedAt: resolved ? new Date().toISOString() : item.resolvedAt
        }
      : item));
    this.log(`Báo cáo ${id}`, patch.status ? statusAction(patch.status) : 'Cập nhật', note);
  }

  // TODO(pre-deploy): Nhớ thay bàn giao demo bằng API tạo hồ sơ và chuyển hàng đợi nguyên tử.
  transferComment(id: string, severity: ReportSeverity, note: string): ContentReport | null {
    const comment = this.commentState().find(item => item.id === id);
    if (!comment || note.trim().length < 15 || note.trim().length > 500) return null;
    if (comment.transferredReportId) {
      return this.reportState().find(item => item.id === comment.transferredReportId) ?? null;
    }
    const now = new Date();
    let sequence = Math.max(0, ...this.reportState().map(item => Number(item.code.split('-').at(-1)) || 0)) + 1;
    while (this.reportState().some(item => item.id === `VP-${sequence}`)) sequence += 1;
    const report: ContentReport = {
      id: `VP-${sequence}`, code: `RP-${now.getFullYear()}-${String(sequence).padStart(4, '0')}`,
      type: comment.contextType === 'course' ? 'Bình luận khóa học' : 'Bình luận Blog',
      targetId: comment.id, targetTitle: comment.contextTitle, targetAuthor: comment.author,
      priorOffenses: 0, reportedBy: 'Quản trị viên', reason: 'Chuyển từ kiểm duyệt bình luận',
      description: note.trim(), evidenceSnippet: comment.content, severity, status: 'new',
      createdAt: now.toISOString(), slaDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
      assignee: 'Chưa phân công', evidence: []
    };
    this.reportState.update(items => [report, ...items]);
    this.commentState.update(items => items.map(item => item.id === id
      ? { ...item, status: 'flagged', transferredReportId: report.id, moderationNote: note.trim() } : item));
    this.log(`Báo cáo ${report.id}`, 'Chuyển hồ sơ', `${comment.id} → ${report.code}: ${note.trim()}`);
    return report;
  }

  reset(): void {
    this.postState.set(clone(MOCK_CONTENT_POSTS));
    this.commentState.set(clone(MOCK_CONTENT_COMMENTS));
    this.reviewState.set(clone(MOCK_CONTENT_REVIEWS));
    this.reportState.set(clone(MOCK_CONTENT_REPORTS));
    this.logState.set(clone(MOCK_CONTENT_LOGS));
  }

  private log(entity: string, action: string, note: string): void {
    this.logState.update(items => [{
      id: `LOG-${Date.now()}-${items.length}`,
      entity,
      action,
      actor: 'Quản trị viên',
      at: new Date().toISOString(),
      note
    }, ...items].slice(0, 40));
  }
}

function statusAction(status: string): string {
  const map: Record<string, string> = {
    published: 'Xuất bản', draft: 'Lưu nháp', pending: 'Gửi duyệt', rejected: 'Từ chối',
    scheduled: 'Lên lịch', hidden: 'Ẩn', archived: 'Lưu trữ', visible: 'Hiện lại',
    approved: 'Duyệt', resolved: 'Xử lý xong', dismissed: 'Bỏ qua', escalated: 'Leo thang',
    processing: 'Tiếp nhận', new: 'Mở lại', deleted: 'Xóa'
  };
  return map[status] ?? 'Cập nhật';
}

// TODO(pre-deploy): Nhớ xóa cờ demo ?contentError=1 khi nối API thật, lỗi sẽ lấy từ HTTP response.
function readDemoLoadError(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('contentError') === '1';
}

function clone<T>(value: T): T {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}
function summarizeReviews(rows:readonly ContentReview[]):ReviewSummary{const visible=rows.filter(x=>x.status==='approved'),promoters=visible.filter(x=>x.nps>=9).length,detractors=visible.filter(x=>x.nps<=6).length,replied=visible.filter(x=>!!x.reply).length;return{total:rows.length,average:visible.length?visible.reduce((a,x)=>a+x.rating,0)/visible.length:0,negative:visible.filter(x=>x.rating<=2).length,nps:visible.length?Math.round((promoters-detractors)*100/visible.length):0,responseRate:visible.length?Math.round(replied*100/visible.length):0,pending:rows.filter(x=>x.status==='pending').length,approved:visible.length};}
function summarizeComments(rows:readonly ContentComment[]):CommentSummary{return{total:rows.length,visible:rows.filter(x=>x.status==='visible').length,pending:rows.filter(x=>x.status==='pending').length,flagged:rows.filter(x=>x.status==='flagged').length,hidden:rows.filter(x=>x.status==='hidden'||x.status==='spam').length};}
