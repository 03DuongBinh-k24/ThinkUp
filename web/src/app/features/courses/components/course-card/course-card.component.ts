import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Course } from '../../../../core/models/course.model';
import { FavoritesService } from '../../../../core/services/favorites.service';
import { CommerceService } from '../../../../core/services/commerce.service';

@Component({
  selector: 'app-course-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article
      role="link"
      tabindex="0"
      (click)="navigateToDetail()"
      (keydown.enter)="navigateToDetail()"
      class="group flex h-full min-h-[410px] cursor-pointer flex-col justify-between overflow-hidden rounded-[8px] border border-[#EEF0F3] bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006AB5]"
      [attr.aria-label]="'Xem chi tiết khóa học ' + course.title"
    >
      <div>
        <!-- Course Visual Banner -->
        <div
          class="relative h-[160px] w-full overflow-hidden px-3 py-3"
          [style.background]="getBackgroundStyle()"
        >
          @if (course.badge) {
            <span class="rounded-[7px] px-2 py-1 text-[10px] font-bold leading-[15px] text-white"
                  [ngClass]="getBadgeColor(course.badge)">
              {{ course.badge }}
            </span>
          }

          <!-- Wishlist Heart Button -->
          <button
            type="button"
            (click)="$event.stopPropagation(); toggleWishlist()"
            class="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-[8px] bg-white/90 text-[#64748B] transition-all hover:scale-105 active:scale-95"
            [attr.aria-label]="isWishlisted() ? 'Bỏ khỏi khóa học yêu thích' : 'Thêm vào khóa học yêu thích'"
          >
            <svg class="w-4 h-4 transition-colors" [class.fill-red-500]="isWishlisted()" [class.text-red-500]="isWishlisted()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </button>

          <!-- Icon & Short Title -->
          <div class="mt-5 flex items-center gap-5">
            @if (course.icon) {
              <div class="grid h-20 w-20 shrink-0 place-items-center rounded-full border-2 text-[24px] font-extrabold"
                   [class]="isDarkText() ? 'border-[#0D111C]/20 text-[#0D111C]' : 'border-cyan-400 text-cyan-300'">
                {{ course.icon }}
              </div>
            }
            <div class="min-w-0">
              <p class="whitespace-pre-line text-[22px] font-extrabold leading-7"
                 [class]="isDarkText() ? 'text-[#0D111C]' : 'text-white'">
                {{ getShortTitle() }}
              </p>
            </div>
          </div>
        </div>

        <!-- Course Meta Info -->
        <div class="p-4">
          <h3 class="min-h-[42px] line-clamp-2 text-[14px] font-bold leading-5 text-[#111827] transition-colors group-hover:text-[#0088E8]">
            {{ course.title }}
          </h3>

          <div class="mt-3 flex items-center justify-between gap-3 text-[12px] leading-4 text-[#64748B]">
            <div class="flex min-w-0 items-center gap-2">
              <span class="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#F1F5F9] text-[#94A3B8]">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              <span class="truncate">{{ course.instructor }}</span>
            </div>
            @if (course.level) {
              <span class="shrink-0 rounded-[4px] bg-[#F1F5F9] px-2 py-1 text-[10px] font-medium leading-[15px] text-[#64748B]">
                {{ course.level }}
              </span>
            }
          </div>

          <div class="mt-2 flex items-center gap-4 text-[12px] leading-4 text-[#64748B]">
            <div class="flex items-center gap-1 text-[#F59E0B]">
              <svg class="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" viewBox="0 0 24 24">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span class="font-bold text-[#111827]">{{ course.rating }}</span>
              <span class="text-[#94A3B8]">({{ formatCompactCount(course.ratingCount) }})</span>
            </div>
            @if (course.duration) {
              <div class="flex items-center gap-1">
                <svg class="w-3.5 h-3.5 text-[#94A3B8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>{{ course.duration }}</span>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Price & Actions Footer -->
      <div class="p-4 pt-0">
        <div class="flex items-center justify-between border-t border-[#EEF0F3] pt-3">
          <div>
            <div class="flex items-baseline gap-1.5">
              <span class="text-[16px] font-extrabold text-[#0088E8]">
                {{ course.salePrice === 0 ? "Miễn phí" : formatPrice(course.salePrice) }}
              </span>
              @if (course.originalPrice > course.salePrice) {
                <span class="text-[12px] text-[#94A3B8] line-through">
                  {{ formatPrice(course.originalPrice) }}
                </span>
              }
            </div>
          </div>

          <div class="flex items-center gap-1.5">
            <!-- Add to cart button -->
            <button
              type="button"
              (click)="$event.stopPropagation(); addToCart()"
              class="flex h-8 w-8 items-center justify-center rounded-[8px] transition-all"
              [class]="isInCart() ? 'bg-[#0088E8] text-white' : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#0088E8] hover:text-white'"
              [attr.aria-label]="isInCart() ? 'Đã có trong giỏ hàng' : 'Thêm vào giỏ hàng'"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </article>
  `
})
export class CourseCardComponent {
  @Input({ required: true }) course!: Course;

  private router = inject(Router);
  private favoritesService = inject(FavoritesService);
  private commerceService = inject(CommerceService);

  isWishlisted(): boolean {
    return this.favoritesService.isFavorite(this.course.id);
  }

  isInCart(): boolean {
    return this.commerceService.cartItems().some(i => i.id === this.course.id);
  }

  toggleWishlist(): void {
    this.favoritesService.toggleFavorite(this.course).subscribe();
  }

  addToCart(): void {
    if (this.isInCart()) {
      this.router.navigate(['/main/cart']);
    } else {
      this.commerceService.addToCart(this.course.id).subscribe();
    }
  }

  navigateToDetail(): void {
    this.router.navigate(['/main/courses', this.course.id]);
  }

  getBackgroundStyle(): string {
    if (this.course.bgGradient) return this.course.bgGradient;
    switch (this.course.id) {
      case 'uiux-design':
        return 'linear-gradient(165deg, rgba(15, 118, 110, 1) 0%, rgba(13, 148, 136, 1) 100%)';
      case 'nodejs':
        return 'linear-gradient(165deg, rgba(30, 58, 138, 1) 0%, rgba(55, 48, 163, 1) 100%)';
      case 'docker':
        return 'linear-gradient(165deg, rgba(30, 27, 75, 1) 0%, rgba(49, 46, 129, 1) 100%)';
      case 'flutter':
        return 'linear-gradient(165deg, rgba(247, 201, 72, 1) 0%, rgba(253, 184, 106, 1) 100%)';
      default:
        return 'linear-gradient(164deg, #0A1535 0%, #1A2A5E 100%)';
    }
  }

  getShortTitle(): string {
    switch (this.course.id) {
      case 'reactjs': return 'ReactJS\nToàn tập';
      case 'javascript-es6': return 'JavaScript ES6+\nToàn tập';
      case 'python-data': return 'Python for Data\nScience';
      case 'angular': return 'Angular\nToàn tập';
      case 'uiux-design': return 'UI/UX Design\nToàn tập';
      case 'vuejs-3': return 'Vue.js 3\nToàn tập';
      case 'nextjs': return 'Next.js\nToàn tập';
      case 'flutter': return 'Flutter\nToàn tập';
      case 'ai-ml': return 'AI & Machine\nLearning';
      case 'sql-data': return 'Data Analysis\nwith SQL';
      default: return this.course.title;
    }
  }

  isDarkText(): boolean {
    return this.course.id === 'flutter' || this.course.id === 'javascript-es6';
  }

  getBadgeColor(badge: string): string {
    switch (badge.toUpperCase()) {
      case 'HOT': return 'bg-[#DC2626]';
      case 'NEW': return 'bg-[#16A34A]';
      case 'SALE': return 'bg-[#E11D48]';
      case 'BEST SELLER': return 'bg-[#D97706]';
      default: return 'bg-[#4B5563]';
    }
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
  }

  formatCompactCount(value: any): string {
    const num = Number(value);
    if (!num) return String(value || '');
    if (num >= 1000) {
      const compact = num / 1000;
      return `${Number.isInteger(compact) ? compact : compact.toFixed(1)}k`;
    }
    return String(num);
  }
}
