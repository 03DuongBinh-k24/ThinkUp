import { Signal } from '@angular/core';
import { ContentComment, ContentPost, ContentReport, ContentReview, ModerationLog, ReportSeverity } from '../models/content.models';

/** Replaceable contract so the demo data source can be swapped for the real content API. */
export type ContentList = 'posts' | 'comments' | 'reviews' | 'reports';

export abstract class ContentStore {
  readonly requiresReportDecision: boolean = false;
  readonly canApprovePendingReview: boolean = true;
  async open(_list: ContentList): Promise<void> {}

  abstract readonly posts: Signal<readonly ContentPost[]>;
  abstract readonly comments: Signal<readonly ContentComment[]>;
  abstract readonly reviews: Signal<readonly ContentReview[]>;
  abstract readonly reports: Signal<readonly ContentReport[]>;
  abstract readonly logs: Signal<readonly ModerationLog[]>;
  abstract readonly loadError: Signal<boolean>;

  abstract retry(): void;
  abstract updatePost(id: string, patch: Partial<ContentPost>, note: string): void | Promise<void>;
  abstract createPost(post: ContentPost): void | Promise<void>;
  abstract removePosts(ids: string[]): void | Promise<void>;
  abstract updateComment(id: string, patch: Partial<ContentComment>, note: string, duration?: string): void | Promise<void>;
  abstract removeComments(ids: string[], reason: string): void | Promise<void>;
  abstract replyComment(id: string, content: string, actor: string): void | Promise<void>;
  abstract updateReview(id: string, patch: Partial<ContentReview>, note: string): void | Promise<void>;
  abstract replyReview(id: string, content: string, actor: string): void | Promise<void>;
  abstract removeReviews(ids: string[]): void | Promise<void>;
  abstract updateReport(id: string, patch: Partial<ContentReport>, note: string, decision?: string): void | Promise<void>;
  abstract transferComment(id: string, severity: ReportSeverity, note: string): Pick<ContentReport, 'code'> | null | Promise<Pick<ContentReport, 'code'> | null>;
  abstract reset(): void;
}
