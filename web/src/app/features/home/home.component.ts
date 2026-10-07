import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CourseService } from '../../core/services/course.service';
import { CommerceService } from '../../core/services/commerce.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { OnboardingService } from '../../core/services/onboarding.service';
import { Course } from '../../core/models/course.model';
import {
  HERO_SLIDES,
  MY_LEARNING_COURSES,
  ROADMAP_BANNER,
  BENEFITS,
  STREAK_DAYS,
  HEATMAP_STATS,
  HeroSlide,
  MyLearningItem,
  BenefitItem
} from '../../core/data/mock-home';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-[#F8F9FF] py-6 sm:py-8 font-sans text-[#0D1C2D]">
      <!-- Toast Notification -->
      @if (toastMessage()) {
        <div class="fixed bottom-6 right-6 z-50 bg-[#0D1C2D] text-white px-5 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-3 animate-bounce">
          <svg class="w-5 h-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span class="text-sm font-medium">{{ toastMessage() }}</span>
        </div>
      }

      <div class="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
        <!-- 1. Hero Greeting Banner -->
        <section class="bg-gradient-to-r from-[#071737] via-[#0A2252] to-[#0A1A3A] rounded-3xl p-6 sm:p-10 lg:p-12 text-white relative overflow-hidden shadow-sm">
          <div class="absolute -top-20 -right-20 w-80 h-80 bg-[#0058BE]/30 rounded-full blur-3xl pointer-events-none"></div>

          <div class="relative z-10 max-w-2xl space-y-4">
            <div class="inline-flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/15 rounded-full text-xs font-semibold text-cyan-300">
              <span>✦</span> Nền tảng học tập công nghệ thông minh
            </div>

            <h1 class="text-2xl sm:text-4xl lg:text-5xl font-extrabold leading-tight">
              {{ greeting() }} <br class="hidden sm:inline" />
              <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#3898EC] to-[#60A5FA]">
                {{ userName() }}
              </span>
            </h1>

            <p class="text-sm sm:text-base text-slate-300 leading-relaxed pt-1">
              {{ heroSlide().question }} Tiếp tục hành trình nâng cao năng lực và phát triển sự nghiệp vững chắc cùng ThinkUP.
            </p>

            <div class="flex flex-wrap items-center gap-3.5 pt-4">
              <a
                routerLink="/learning/study-room"
                class="px-5 py-3 bg-[#0058BE] hover:bg-[#004da6] active:scale-[0.98] text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-[#0058BE]/30 flex items-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
                Vào phòng học ảo
              </a>

              <a
                routerLink="/main/courses"
                class="px-5 py-3 bg-white/10 hover:bg-white/15 active:scale-[0.98] text-white border border-white/20 font-bold text-sm rounded-xl transition-all flex items-center gap-2"
              >
                Khám phá khóa học
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                </svg>
              </a>
            </div>
          </div>
        </section>

        <!-- 2. Benefits Highlights -->
        <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          @for (b of benefits(); track b.id) {
            <div class="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex items-start gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div class="w-12 h-12 rounded-xl bg-blue-50 text-[#0058BE] flex items-center justify-center shrink-0">
                @switch (b.id) {
                  @case ('devices') {
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                  }
                  @case ('instructors') {
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 14l9-5-9-5-9 5 9 5z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"></path>
                    </svg>
                  }
                  @case ('community') {
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                    </svg>
                  }
                  @default {
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
                    </svg>
                  }
                }
              </div>
              <div class="space-y-0.5 min-w-0">
                <h3 class="font-bold text-sm text-[#0D1C2D]">{{ b.title }}</h3>
                <p class="text-xs text-[#62748E]">{{ b.subtitle }}</p>
              </div>
            </div>
          }
        </section>

        <!-- 3. My Learning (Tiếp tục học tập) -->
        <section class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl sm:text-2xl font-bold text-[#0D1C2D]">Khóa học đang tiếp tục</h2>
              <p class="text-xs sm:text-sm text-[#62748E]">Duy trì tiến độ học tập để hoàn thành mục tiêu</p>
            </div>
            <a routerLink="/main/my-courses" class="text-xs sm:text-sm font-semibold text-[#0058BE] hover:underline flex items-center gap-1">
              Xem tất cả
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path>
              </svg>
            </a>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            @for (item of myLearning(); track item.id) {
              <div class="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-[11px] font-bold text-[#0058BE] bg-blue-50 px-2.5 py-0.5 rounded-full">
                      {{ item.category }}
                    </span>
                    <span class="text-xs font-bold text-[#0D1C2D]">{{ item.progress }}%</span>
                  </div>

                  <div class="flex items-start gap-3">
                    <div class="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-base shrink-0">
                      {{ item.icon }}
                    </div>
                    <div class="min-w-0">
                      <h3 class="font-bold text-sm text-[#0D1C2D] truncate">{{ item.title }}</h3>
                      <p class="text-xs text-[#62748E] truncate">{{ item.subtitle }}</p>
                    </div>
                  </div>

                  <!-- Progress Bar -->
                  <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div class="bg-[#0058BE] h-full rounded-full transition-all" [style.width.%]="item.progress"></div>
                  </div>

                  <p class="text-[11px] text-[#62748E] truncate">
                    {{ item.nextLesson }}
                  </p>
                </div>

                <a
                  [routerLink]="item.href"
                  class="w-full h-10 bg-[#EBF3FF] hover:bg-[#D8E8FF] text-[#0058BE] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"></path>
                  </svg>
                  Tiếp tục học
                </a>
              </div>
            }
          </div>
        </section>

        <!-- 4. Personalized Roadmap Banner -->
        <section class="bg-gradient-to-r from-[#1E1B4B] via-[#2E1065] to-[#1E1B4B] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-sm">
          <div class="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div class="space-y-2 max-w-xl">
              <span class="inline-block px-3 py-1 bg-white/10 text-amber-300 text-xs font-bold rounded-full mb-1">
                {{ roadmap().badge }}
              </span>
              <h2 class="text-xl sm:text-2xl font-bold">{{ roadmap().title }}</h2>
              <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">{{ roadmap().description }}</p>
              <div class="text-xs text-indigo-300 font-medium pt-1">
                {{ roadmap().meta }}
              </div>
            </div>

            <a
              [routerLink]="roadmap().href"
              class="px-6 py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-sm rounded-xl transition-all shadow-md shrink-0"
            >
              {{ roadmap().primaryAction }} →
            </a>
          </div>
        </section>

        <!-- 5. Featured Courses Grid -->
        <section class="space-y-6">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl sm:text-2xl font-bold text-[#0D1C2D]">Khóa học nổi bật dành cho bạn</h2>
              <p class="text-xs sm:text-sm text-[#62748E]">Tuyển chọn các khóa học được đánh giá cao nhất</p>
            </div>
            <a routerLink="/main/courses" class="text-xs sm:text-sm font-semibold text-[#0058BE] hover:underline flex items-center gap-1">
              Xem tất cả khóa học
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path>
              </svg>
            </a>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            @for (c of featuredCourses(); track c.id) {
              <div class="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <!-- Card Header Banner -->
                  <div
                    class="h-36 relative flex items-center justify-center p-4 text-white text-center"
                    [style.background]="c.bgGradient || 'linear-gradient(135deg, #0A1535 0%, #1A2A5E 100%)'"
                  >
                    @if (c.badge) {
                      <span class="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold bg-[#FB2C36] text-white shadow-sm">
                        {{ c.badge }}
                      </span>
                    }
                    <button
                      type="button"
                      (click)="toggleWishlist(c)"
                      class="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors"
                      aria-label="Wishlist"
                    >
                      <svg class="w-4 h-4" [class.fill-rose-500]="isFav(c.id)" [class.text-rose-500]="isFav(c.id)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                      </svg>
                    </button>

                    <div class="text-3xl font-black opacity-90">{{ c.icon || 'TU' }}</div>
                  </div>

                  <!-- Card Body -->
                  <div class="p-4 space-y-2">
                    <div class="flex items-center gap-1.5 text-xs text-amber-500 font-bold">
                      <span>★ {{ c.rating }}</span>
                      <span class="text-slate-400 font-normal">({{ c.ratingCount }})</span>
                    </div>

                    <a [routerLink]="['/main/courses', c.id]" class="block font-bold text-sm text-[#0D1C2D] hover:text-[#0058BE] transition-colors line-clamp-2">
                      {{ c.title }}
                    </a>

                    <p class="text-xs text-[#62748E]">Giảng viên: {{ c.instructor }}</p>
                  </div>
                </div>

                <!-- Card Footer (Price & Actions) -->
                <div class="p-4 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div class="text-base font-extrabold text-[#0D1C2D]">
                      {{ formatPrice(c.salePrice) }}
                    </div>
                    @if (c.originalPrice && c.originalPrice > c.salePrice) {
                      <div class="text-[11px] text-slate-400 line-through">
                        {{ formatPrice(c.originalPrice) }}
                      </div>
                    }
                  </div>

                  <button
                    type="button"
                    (click)="addToCart(c)"
                    class="p-2.5 rounded-xl bg-[#EBF3FF] hover:bg-[#0058BE] text-[#0058BE] hover:text-white transition-all"
                    aria-label="Thêm vào giỏ"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                    </svg>
                  </button>
                </div>
              </div>
            }
          </div>
        </section>

        <!-- 6. Streak & Study Activity -->
        <section class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center font-bold text-xl">
                🔥
              </div>
              <div>
                <h2 class="text-lg sm:text-xl font-bold text-[#0D1C2D]">Chuỗi học tập liên tục</h2>
                <p class="text-xs sm:text-sm text-[#62748E]">Học ít nhất 15 phút mỗi ngày để giữ lửa đam mê</p>
              </div>
            </div>

            <!-- Days of Week -->
            <div class="flex items-center gap-2">
              @for (d of streakDays(); track d.label) {
                <div class="flex flex-col items-center gap-1">
                  <div
                    class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                    [class.bg-orange-500]="d.active"
                    [class.text-white]="d.active"
                    [class.bg-slate-100]="!d.active"
                    [class.text-slate-400]="!d.active"
                  >
                    {{ d.label }}
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Heatmap Stats Row -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            @for (stat of stats(); track stat.label) {
              <div class="bg-slate-50 rounded-2xl p-4 text-center">
                <div class="text-xl font-black text-[#0D1C2D]">{{ stat.value }}</div>
                <div class="text-xs text-[#62748E] mt-0.5">{{ stat.label }}</div>
              </div>
            }
          </div>
        </section>
      </div>
    </div>
  `
})
export class HomeComponent implements OnInit {
  private courseService = inject(CourseService);
  private commerceService = inject(CommerceService);
  private favoritesService = inject(FavoritesService);
  private onboardingService = inject(OnboardingService);

  heroSlide = signal<HeroSlide>(HERO_SLIDES[0]);
  myLearning = signal<MyLearningItem[]>(MY_LEARNING_COURSES);
  benefits = signal<BenefitItem[]>(BENEFITS);
  featuredCourses = signal<Course[]>([]);
  roadmap = signal(ROADMAP_BANNER);
  streakDays = signal(STREAK_DAYS);
  stats = signal(HEATMAP_STATS);
  toastMessage = signal<string>('');

  greeting = signal<string>('Chào buổi sáng,');
  userName = signal<string>('Học viên ThinkUP! 👋');

  ngOnInit(): void {
    this.updateGreetingTime();
    this.loadUserSession();
    this.loadCourses();
  }

  private updateGreetingTime(): void {
    const hour = new Date().getHours();
    if (hour < 12) this.greeting.set('Chào buổi sáng,');
    else if (hour < 18) this.greeting.set('Chào buổi chiều,');
    else this.greeting.set('Chào buổi tối,');
  }

  private loadUserSession(): void {
    try {
      const saved = localStorage.getItem('thinkup_current_user');
      if (saved) {
        const user = JSON.parse(saved);
        if (user.full_name || user.fullName || user.name) {
          this.userName.set(`${user.full_name || user.fullName || user.name}! 👋`);
        }
      }
    } catch {}
  }

  private loadCourses(): void {
    this.courseService.getCourses().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const preferences = this.onboardingService.getPreferences();
          const recommended = this.courseService.filterByPreferences(res.data, preferences);
          this.featuredCourses.set(recommended.slice(0, 4));
        }
      }
    });
  }

  addToCart(course: Course): void {
    this.commerceService.addToCart(course.id).subscribe({
      next: () => {
        this.showToast(`Đã thêm "${course.title}" vào giỏ hàng!`);
      }
    });
  }

  toggleWishlist(course: Course): void {
    this.favoritesService.toggleFavorite(course).subscribe({
      next: (res) => {
        const msg = res.isFavorite
          ? `Đã lưu "${course.title}" vào danh sách yêu thích!`
          : `Đã xóa khỏi danh sách yêu thích!`;
        this.showToast(msg);
      }
    });
  }

  isFav(courseId: string): boolean {
    return this.favoritesService.isFavorite(courseId);
  }

  formatPrice(price: number): string {
    if (!price) return 'Miễn phí';
    return `${new Intl.NumberFormat('vi-VN').format(price)}đ`;
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      this.toastMessage.set('');
    }, 3000);
  }
}
