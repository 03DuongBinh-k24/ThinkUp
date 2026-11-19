import { Signal } from '@angular/core';
import { ContentComment, ContentPost, ContentReport, ContentReview, ModerationLog, ReportSeverity } from '../models/content.models';

/** Replaceable contract so the demo data source can be swapped for the real content API. */
export type ContentList = 'posts' | 'comments' | 'reviews' | 'reports';
export interface ReviewPageFilters { page:number; pageSize:number; q?:string; status?:string; rating?:string; nps?:string; response?:string; timeRange?:string; }
export interface ReviewPageResult { total:number; pages:number; page:number; }
export interface ReviewSummary { total:number; average:number; negative:number; nps:number; responseRate:number; pending:number; approved:number; }
export interface CommentSummary { total:number; visible:number; pending:number; flagged:number; hidden:number; }
export interface CommentPageFilters { page:number; pageSize:number; q?:string; status?:string; role?:string; timeRange?:string; }

export abstract class ContentStore {
  readonly requiresReportDecision: boolean = false;
  readonly canApprovePendingReview: boolean = true;
  async open(_list: ContentList): Promise<void> {}
  async loadReviewPage(_filters: ReviewPageFilters): Promise<ReviewPageResult> { return {total:this.reviews().length,pages:1,page:1}; }
  async loadCommentPage(_filters: CommentPageFilters): Promise<ReviewPageResult> { return {total:this.comments().length,pages:1,page:1}; }
  abstract readonly reviewSummary: Signal<ReviewSummary>;
  abstract readonly commentsSummary: Signal<CommentSummary>;

  abstract readonly posts: Signal<readonly ContentPost[]>;
  abstract readonly comments: Signal<readonly ContentComment[]>;
  abstract readonly reviews: Signal<readonly ContentReview[]>;
  abstract readonly reports: Signal<readonly ContentReport[]>;
  abstract readonly logs: Signal<readonly ModerationLog[]>;
  abstract readonly loadError: Signal<boolean>;

  abstract retry(): void;
  abstract updatePost(id: string, patch: Partial<ContentPost>, note: string): void | Promise<void>;
  abstract restorePost(id: string): Promise<void>;
  abstract createPost(post: ContentPost): void | Promise<void>;
  abstract removePosts(ids: string[]): void | Promise<void>;
  abstract archivePostWithEmail(id: string, reason: string, note: string): Promise<void>;
  abstract requestPostRevision(id: string, reason: string): Promise<void>;
  abstract updateComment(id: string, patch: Partial<ContentComment>, note: string, duration?: string): void | Promise<void>;
  abstract moderateComment(id: string, status: 'visible' | 'hidden', reason: string): Promise<void>;
  abstract removeComments(ids: string[], reason: string): void | Promise<void>;
  abstract replyComment(id: string, content: string, actor: string): void | Promise<void>;
  abstract updateReview(id: string, patch: Partial<ContentReview>, note: string): void | Promise<void>;
  abstract replyReview(id: string, content: string, actor: string): void | Promise<void>;
  abstract removeReviews(ids: string[]): void | Promise<void>;
  abstract updateReport(id: string, patch: Partial<ContentReport>, note: string, decision?: string): void | Promise<void>;
  abstract transferComment(id: string, severity: ReportSeverity, note: string): Pick<ContentReport, 'code'> | null | Promise<Pick<ContentReport, 'code'> | null>;
  abstract reset(): void;
}
