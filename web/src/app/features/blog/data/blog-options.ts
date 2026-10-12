import { BlogDraft, BlogStatus } from '../models/blog.model';
export const EDITOR_CATEGORIES = ['Lập trình cơ bản', 'JavaScript', 'Web Development', 'Backend', 'Kinh nghiệm', 'Tài nguyên'];
export const BLOG_STATUS_LABELS: Record<BlogStatus, string> = { draft: 'Bản nháp', published: 'Đã đăng', updated: 'Đã cập nhật' };
export const EMPTY_BLOG_DRAFT: BlogDraft = { title: '', slug: '', content: '', featuredContent: '', seoTitle: '', seoDescription: '', keywords: [], categories: ['Lập trình cơ bản'], tags: [], summary: '', status: 'draft', commentsEnabled: true, pinned: false, showOnHome: false };
