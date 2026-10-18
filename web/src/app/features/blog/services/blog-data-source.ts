import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { BlogCategory, BlogComment, BlogDetailResponse, BlogListQuery, BlogListResponse, BlogReaction, BlogSaveRequest, BlogSaveResponse, BlogSidebarData, NewsletterResponse } from '../models/blog.model';
export interface BlogDataSource {
  list(query: BlogListQuery): Observable<BlogListResponse>;
  categories(): Observable<BlogCategory[]>;
  sidebar(): Observable<BlogSidebarData>;
  detail(id: string): Observable<BlogDetailResponse>;
  comments(id: string): Observable<BlogComment[]>;
  addComment(id: string, authorName: string, content: string): Observable<BlogComment>;
  react(id: string, action: BlogReaction): Observable<unknown>;
  save(request: BlogSaveRequest): Observable<BlogSaveResponse>;
  upload(file: File, type?: 'thumbnail' | 'content'): Observable<string>;
  subscribe(email: string): Observable<NewsletterResponse>;
}
export const BLOG_DATA_SOURCE = new InjectionToken<BlogDataSource>('BLOG_DATA_SOURCE');
