import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { BLOG_DATA_SOURCE, BlogDataSource } from './blog-data-source';
import { BlogAuthor, BlogCategory, BlogComment, BlogDetailResponse, BlogListQuery, BlogListResponse, BlogPost, BlogReaction, BlogSaveRequest, BlogSaveResponse, BlogSidebarData, NewsletterResponse } from '../models/blog.model';

// Contract is taken from the reference project's /api/blog routes.
type BlogPostPayload = Omit<BlogPost, 'id' | 'views'> & { id: string | number; views: number | string; summary?: string; publishedDate?: string; };
function mapPost(post: BlogPostPayload): BlogPost {
  return { ...post, id: String(post.id), description: post.description ?? post.summary ?? '', date: post.date ?? post.publishedDate ?? '', views: typeof post.views === 'number' ? post.views : Number.parseInt(post.views, 10) || 0, coverImage: post.coverImage || '/assets/blog/article-1.jpg', tags: post.tags ?? [], content: post.content ?? '' };
}
@Injectable({ providedIn: 'root' })
export class HttpBlogDataSource implements BlogDataSource {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;
  list(query: BlogListQuery) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '') params = params.set(key, String(value));
    return this.http.get<Omit<BlogListResponse, 'posts'> & { posts: BlogPostPayload[] }>(`${this.base}/blog`, { params, withCredentials: true }).pipe(map(result => ({ ...result, posts: result.posts.map(mapPost) })));
  }
  categories() { return this.http.get<{ categories: BlogCategory[] }>(`${this.base}/blog/categories`).pipe(map(result => result.categories)); }
  sidebar() { return this.http.get<BlogSidebarData>(`${this.base}/blog/sidebar`).pipe(map(result => ({ ...result, mostViewedArticles: result.mostViewedArticles.map(post => ({ ...post, id: String(post.id) })) }))); }
  detail(id: string) { return this.http.get<Omit<BlogDetailResponse, 'post'> & { post: BlogPostPayload }>(`${this.base}/blog/${encodeURIComponent(id)}`, { withCredentials: true }).pipe(map(result => ({ ...result, post: mapPost(result.post) }))); }
  comments(id: string) { return this.http.get<{ comments: BlogComment[] }>(`${this.base}/blog/${encodeURIComponent(id)}/comments`).pipe(map(result => result.comments.map(comment => ({ ...comment, id: String(comment.id) })))); }
  addComment(id: string, authorName: string, content: string) { return this.http.post<{ comment: BlogComment }>(`${this.base}/blog/${encodeURIComponent(id)}/comments`, { authorName, content }, { withCredentials: true }).pipe(map(result => result.comment)); }
  react(id: string, action: BlogReaction) { return this.http.post(`${this.base}/blog/${encodeURIComponent(id)}/like`, { action }, { withCredentials: true }); }
  save(request: BlogSaveRequest) { return this.http.post<BlogSaveResponse>(`${this.base}/blog`, request, { withCredentials: true }).pipe(map(result => ({ ...result, id: String(result.id) }))); }
  upload(file: File) { const body = new FormData(); body.append('file', file); return this.http.post<{ url: string }>(`${this.base}/upload`, body, { withCredentials: true }).pipe(map(result => result.url)); }
  subscribe(email: string) { return this.http.post<NewsletterResponse>(`${this.base}/newsletter`, { email }); }
}
@Injectable({ providedIn: 'root' })
export class BlogService {
  private readonly source = inject(BLOG_DATA_SOURCE, { optional: true }) ?? inject(HttpBlogDataSource);
  list(query: BlogListQuery) { return this.source.list(query); }
  categories() { return this.source.categories(); }
  sidebar() { return this.source.sidebar(); }
  detail(id: string) { return this.source.detail(id); }
  comments(id: string) { return this.source.comments(id); }
  addComment(id: string, authorName: string, content: string) { return this.source.addComment(id, authorName, content); }
  react(id: string, action: BlogReaction) { return this.source.react(id, action); }
  save(request: BlogSaveRequest) { return this.source.save(request); }
  upload(file: File) { return this.source.upload(file); }
  subscribe(email: string) { return this.source.subscribe(email); }
  currentAuthor(): BlogAuthor | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const user: { email?: string; name?: string; fullName?: string; full_name?: string; displayName?: string } | null = JSON.parse(localStorage.getItem('thinkup_current_user') || localStorage.getItem('user') || 'null');
      return user?.email ? { email: user.email.toLowerCase(), name: user.name || user.fullName || user.full_name || user.displayName || user.email } : null;
    } catch { return null; }
  }
}
