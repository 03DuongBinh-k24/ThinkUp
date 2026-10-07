import { Injectable, signal, computed } from '@angular/core';
import { BlogPost } from '../models/blog.model';
import { MOCK_BLOG_POSTS, BLOG_CATEGORIES } from '../data/mock-blog';

@Injectable({
  providedIn: 'root'
})
export class BlogService {
  private readonly postsSig = signal<BlogPost[]>(MOCK_BLOG_POSTS);

  readonly posts = computed(() => this.postsSig());
  readonly categories = BLOG_CATEGORIES;

  getPostBySlug(slug: string): BlogPost | null {
    return this.postsSig().find((p) => p.slug === slug) || null;
  }
}
