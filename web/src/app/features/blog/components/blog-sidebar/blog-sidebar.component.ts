import { BlogImageSrcsetPipe } from '../../pipes/blog-image-srcset.pipe';
import { Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BlogService } from '../../services/blog.service';
import { BlogRelatedArticle, BlogSidebarData } from '../../models/blog.model';
import { NewsletterSubscribeComponent } from '../newsletter-subscribe/newsletter-subscribe.component';
@Component({ selector: 'app-blog-sidebar', standalone: true, imports: [BlogImageSrcsetPipe, RouterLink, NewsletterSubscribeComponent], templateUrl: './blog-sidebar.component.html', styleUrl: './blog-sidebar.component.css' })
export class BlogSidebarComponent {
  private readonly blog = inject(BlogService);
  readonly detail = input(false);
  readonly related = input<BlogRelatedArticle[]>([]);
  readonly data = signal<BlogSidebarData>({ popularTopics: [], mostViewedArticles: [] });
  readonly loading = signal(true);
  readonly error = signal(false);
  constructor() { this.blog.sidebar().subscribe({ next: data => { this.data.set(data); this.loading.set(false); }, error: () => { this.loading.set(false); this.error.set(true); } }); }
  formatViews(views: number | string): string { if (typeof views === 'string') return views; return `${views.toLocaleString('vi-VN')} lượt xem`; }
}
