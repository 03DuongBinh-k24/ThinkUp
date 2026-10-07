import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BlogService } from '../../core/services/blog.service';
import { BlogPost } from '../../core/models/blog.model';

@Component({
  selector: 'app-blog-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-[#F9F9FF] text-[#0F172B] font-sans">
      <main class="mx-auto w-full max-w-[1480px] px-5 py-10 sm:px-8">
        <!-- Hero Section -->
        <header class="mb-10 text-center max-w-2xl mx-auto">
          <span class="rounded-full bg-[#E6F4FF] px-4 py-1.5 text-xs font-semibold text-[#0088E8] border border-[#0088E8]/20">
            ✍️ ThinkUp Knowledge Hub
          </span>
          <h1 class="mt-4 text-3xl font-extrabold text-[#0F172B] sm:text-5xl tracking-tight">
            Blog & Tin Tức Công Nghệ
          </h1>
          <p class="mt-3 text-base text-[#62748E]">
            Khám phá các bài viết chuyên sâu về lập trình, thiết kế, kỹ năng phỏng vấn và lộ trình phát triển sự nghiệp trong ngành công nghệ.
          </p>

          <!-- Search Bar -->
          <div class="mt-6 flex justify-center">
            <div class="relative w-full max-w-md">
              <input
                type="text"
                [(ngModel)]="searchKeyword"
                placeholder="Tìm kiếm bài viết, tác giả, tag..."
                class="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0088E8] focus:ring-2 focus:ring-[#8ACEFF]/30"
              />
            </div>
          </div>
        </header>

        <!-- Categories Filter Tabs -->
        <div class="mb-8 flex flex-wrap items-center justify-center gap-2">
          @for (cat of categories; track cat) {
            <button
              type="button"
              (click)="selectedCategory.set(cat)"
              class="rounded-full px-5 py-2 text-xs font-medium transition"
              [ngClass]="{
                'bg-[#0088E8] text-white shadow-sm': selectedCategory() === cat,
                'bg-white text-slate-600 border border-slate-200 hover:border-slate-300': selectedCategory() !== cat
              }"
            >
              {{ cat }}
            </button>
          }
        </div>

        <!-- Articles Grid -->
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          @for (post of filteredPosts(); track post.id) {
            <article class="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:shadow-md">
              <div class="flex items-center justify-between mb-3">
                <span class="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#0088E8]">
                  {{ post.category }}
                </span>
                <span class="text-xs text-slate-400">⏱ {{ post.readTimeMinutes }} phút đọc</span>
              </div>

              <h2 class="text-lg font-bold text-slate-900 line-clamp-2 mb-2 hover:text-[#0088E8] cursor-pointer transition">
                {{ post.title }}
              </h2>
              <p class="text-xs text-slate-500 line-clamp-3 mb-5 flex-1">
                {{ post.summary }}
              </p>

              <!-- Tags -->
              <div class="flex flex-wrap gap-1.5 mb-5">
                @for (tag of post.tags; track tag) {
                  <span class="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    #{{ tag }}
                  </span>
                }
              </div>

              <!-- Author & Published Date -->
              <div class="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
                <div class="flex items-center gap-2">
                  <div class="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                    {{ post.author.name.charAt(0) }}
                  </div>
                  <div>
                    <h3 class="text-xs font-semibold text-slate-800">{{ post.author.name }}</h3>
                    <p class="text-[10px] text-slate-400">{{ post.publishedAt }}</p>
                  </div>
                </div>

                <div class="flex items-center gap-2 text-xs text-slate-400">
                  <span>👁 {{ post.viewsCount }}</span>
                  <span>❤️ {{ post.likesCount }}</span>
                </div>
              </div>
            </article>
          } @empty {
            <div class="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white p-16 text-center text-slate-500">
              <p class="text-base font-medium">Không tìm thấy bài viết nào phù hợp.</p>
              <button (click)="selectedCategory.set('Tất cả'); searchKeyword = ''" class="mt-3 text-sm text-[#0088E8] underline font-semibold">
                Xem toàn bộ bài viết
              </button>
            </div>
          }
        </div>
      </main>
    </div>
  `
})
export class BlogComponent {
  private readonly blogService = inject(BlogService);

  readonly categories = this.blogService.categories;
  readonly selectedCategory = signal<string>('Tất cả');
  searchKeyword = '';

  readonly allPosts = this.blogService.posts;

  readonly filteredPosts = computed(() => {
    const list = this.allPosts();
    const cat = this.selectedCategory();
    const query = this.searchKeyword.trim().toLowerCase();

    return list.filter((p) => {
      const matchCat = cat === 'Tất cả' || p.category === cat;
      const matchQuery =
        !query ||
        p.title.toLowerCase().includes(query) ||
        p.summary.toLowerCase().includes(query) ||
        p.author.name.toLowerCase().includes(query) ||
        p.tags.some((t) => t.toLowerCase().includes(query));
      return matchCat && matchQuery;
    });
  });
}
