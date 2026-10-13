// TODO(pre-deploy): Nhớ xóa adapter Blog demo và provider của nó khi API Blog thật sẵn sàng; HttpBlogDataSource là adapter thay thế.
import { Injectable, Provider } from '@angular/core';
import { defer, of, throwError } from 'rxjs';
import { BLOG_DATA_SOURCE, BlogDataSource } from '../../../features/blog/services/blog-data-source';
import { BLOG_CATEGORIES, MOCK_BLOG_POSTS } from './mock-blog';
import { BlogComment, BlogListQuery, BlogPost, BlogReaction, BlogSaveRequest } from '../../../features/blog/models/blog.model';
import { createBlogSlug, countBlogWords } from '../../../features/blog/utils/blog-content';

@Injectable()
export class MockBlogDataSource implements BlogDataSource {
  private readonly storageKey = 'thinkup_angular_blog_demo_v1';
  private readonly commentsKey = 'thinkup_angular_blog_comments_demo_v1';
  private read<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } }
  private posts(): BlogPost[] { return [...this.read<BlogPost[]>(this.storageKey, []), ...MOCK_BLOG_POSTS.map(post => ({ ...post, status: 'published' as const }))]; }
  list(query: BlogListQuery) {
    return defer(() => {
      const search = query.search?.trim().toLocaleLowerCase('vi') || '';
      const posts = this.posts().filter(post => (query.ownerEmail ? post.ownerEmail === query.ownerEmail : post.status !== 'draft') && (!query.category || query.category === 'all' || post.categoryId === query.category) && (!query.topic || (post.topics || post.tags).includes(query.topic) || post.categoryId === query.topic) && (!search || `${post.title} ${post.slug} ${post.category} ${post.author} ${post.tags.join(' ')}`.toLocaleLowerCase('vi').includes(search)));
      const offset = (query.page - 1) * query.limit;
      return of({ posts: posts.slice(offset, offset + query.limit), total: posts.length, hasMore: offset + query.limit < posts.length });
    });
  }
  categories() { return of(BLOG_CATEGORIES); }
  sidebar() { return defer(() => of({ popularTopics: BLOG_CATEGORIES.filter(category => category.id !== 'all').map(category => ({ ...category, count: this.posts().filter(post => post.categoryId === category.id && post.status !== 'draft').length })).filter(topic => topic.count > 0), mostViewedArticles: this.posts().filter(post => post.status !== 'draft').sort((a,b) => b.views - a.views).slice(0,3) })); }
  detail(id: string) {
    return defer(() => {
      const post = this.posts().find(item => item.id === id);
      if (!post) return throwError(() => new Error('Bài viết không tồn tại hoặc đã bị xóa.'));
      const publicPosts = this.posts().filter(item => item.status !== 'draft');
      const index = publicPosts.findIndex(item => item.id === id);
      const interaction = this.read<Record<string, BlogReaction>>('thinkup_angular_blog_reactions_demo_v1', {})[id] || null;
      return of({ post, prevPost: publicPosts[index - 1] || null, nextPost: publicPosts[index + 1] || null, relatedPosts: publicPosts.filter(item => item.id !== id).slice(0,3), userInteraction: interaction });
    });
  }
  comments(id: string) { return defer(() => of(this.read<Record<string, BlogComment[]>>(this.commentsKey, {})[id] || [])); }
  addComment(id: string, authorName: string, content: string) {
    return defer(() => {
      const all = this.read<Record<string, BlogComment[]>>(this.commentsKey, {});
      const comment: BlogComment = { id: crypto.randomUUID(), authorName, content, createdAt: new Date().toISOString(), likesCount: 0 };
      all[id] = [comment, ...(all[id] || [])]; localStorage.setItem(this.commentsKey, JSON.stringify(all)); return of(comment);
    });
  }
  react(id: string, action: BlogReaction) { return defer(() => { const all = this.read<Record<string, BlogReaction>>('thinkup_angular_blog_reactions_demo_v1', {}); all[id] = action; localStorage.setItem('thinkup_angular_blog_reactions_demo_v1', JSON.stringify(all)); return of({ success: true }); }); }
  save(request: BlogSaveRequest) {
    return defer(() => {
      const posts = this.read<BlogPost[]>(this.storageKey, []);
      if (request.id && !posts.some(post => post.id === request.id && post.ownerEmail === request.ownerEmail)) return throwError(() => new Error('Không tìm thấy bài viết thuộc tài khoản này.'));
      const id = request.id || crypto.randomUUID();
      const category = request.categories[0] || 'Web Development';
      const categoryId = BLOG_CATEGORIES.find(item => item.label.toLocaleLowerCase('vi') === category.toLocaleLowerCase('vi'))?.id || createBlogSlug(category);
      const post: BlogPost = { ...request, id, description: request.summary, category, categoryId, topics: request.categories.map(createBlogSlug), date: new Date().toLocaleDateString('vi-VN'), updatedAt: new Date().toISOString(), readTime: `${Math.max(1,Math.ceil(countBlogWords(request.content)/200))} phút đọc`, views: posts.find(item => item.id === id)?.views || 0 };
      localStorage.setItem(this.storageKey, JSON.stringify([post, ...posts.filter(item => item.id !== id)]));
      return of({ id, status: request.status });
    });
  }
  upload(file: File) { return defer(() => new Promise<string>((resolve,reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Không thể đọc ảnh')); reader.onerror = () => reject(new Error('Không thể đọc ảnh')); reader.readAsDataURL(file); })); }
  subscribe(_email: string) { return of({ success: false, message: 'Chưa có kết nối dịch vụ bản tin. Vui lòng thử lại sau.' }); }
}
export const BLOG_MOCK_PROVIDERS: Provider[] = [MockBlogDataSource, { provide: BLOG_DATA_SOURCE, useExisting: MockBlogDataSource }];
