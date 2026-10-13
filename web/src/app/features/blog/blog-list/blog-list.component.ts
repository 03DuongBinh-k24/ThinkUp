import { BlogImageSrcsetPipe } from '../pipes/blog-image-srcset.pipe';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap } from 'rxjs';
import { BlogService } from '../services/blog.service';
import { BlogCategory, BlogPost } from '../models/blog.model';
import { BlogIconComponent } from '../components/blog-icon/blog-icon.component';
import { BlogSidebarComponent } from '../components/blog-sidebar/blog-sidebar.component';
import { BlogAuthModalComponent } from '../components/blog-auth-modal/blog-auth-modal.component';
import { AuthService } from '../../../core/services/auth.service';
@Component({ selector: 'app-blog-list', standalone: true, imports: [BlogImageSrcsetPipe, RouterLink, FormsModule, BlogIconComponent, BlogSidebarComponent, BlogAuthModalComponent], templateUrl: './blog-list.component.html', styleUrl: './blog-list.component.css' })
export class BlogListComponent {
  private readonly blog = inject(BlogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  readonly categories = signal<BlogCategory[]>([{id:'all',label:'Tất cả'}]);
  readonly articles = signal<BlogPost[]>([]);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal('');
  readonly total = signal(0);
  readonly hasMore = signal(false);
  readonly category = signal('all');
  readonly topic = signal('');
  readonly appliedSearch = signal('');
  readonly authModal = signal(false);
  searchQuery = '';
  private page = 1;
  constructor() {
    this.blog.categories().pipe(takeUntilDestroyed()).subscribe({next: categories => this.categories.set(categories), error: () => this.error.set('Không thể tải danh mục bài viết.')});
    this.route.queryParamMap.pipe(takeUntilDestroyed(), switchMap(params => {
      this.category.set(params.get('category') || 'all'); this.topic.set(params.get('topic') || ''); this.appliedSearch.set(params.get('search') || ''); this.searchQuery = this.appliedSearch();
      this.page = 1; this.articles.set([]); this.loading.set(true); this.error.set('');
      return this.blog.list(this.query(1)).pipe(catchError(() => { this.error.set('Không thể tải bài viết. Vui lòng thử lại.'); return of(null); }));
    })).subscribe(result => { if (result) { this.articles.set(result.posts); this.total.set(result.total); this.hasMore.set(result.hasMore); } this.loading.set(false); });
  }
  private query(page: number) { return { category: this.category(), topic: this.topic(), search: this.appliedSearch(), page, limit: 10 }; }
  search(): void { this.router.navigate([], {relativeTo:this.route, queryParams:{search:this.searchQuery.trim() || null}, queryParamsHandling:'merge'}); }
  retry(): void { this.loading.set(true); this.error.set(''); this.blog.list(this.query(1)).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next: result => {this.articles.set(result.posts);this.total.set(result.total);this.hasMore.set(result.hasMore);this.loading.set(false);},error:()=>{this.loading.set(false);this.error.set('Không thể tải bài viết. Vui lòng thử lại.');}}); }
  loadMore(): void {
    if (this.loadingMore()) return; this.loadingMore.set(true);
    this.blog.list(this.query(this.page+1)).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:result=>{this.page++;this.articles.update(posts=>[...posts,...result.posts]);this.hasMore.set(result.hasMore);this.loadingMore.set(false);},error:()=>{this.loadingMore.set(false);this.error.set('Không thể tải thêm bài viết. Vui lòng thử lại.');}});
  }
  createPost(): void { if (!this.auth.isAuthenticated()) this.authModal.set(true); else this.router.navigateByUrl('/main/blog/create'); }
}
