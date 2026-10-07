import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CourseFilters } from '../../../../core/models/course.model';

@Component({
  selector: 'app-filter-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <aside class="w-full flex flex-col gap-5 bg-white border border-[#E2E8F0] rounded-[8px] p-5 shadow-sm text-[#0F172B]">
      <!-- Header -->
      <div class="flex items-center justify-between pb-1">
        <h2 class="text-[16px] font-bold text-[#0F172B]">Bộ lọc</h2>
        <button
          type="button"
          (click)="clearFilters.emit()"
          class="flex items-center gap-1 text-[12px] font-medium text-[#62748E] hover:text-[#0088E8] transition-colors"
        >
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
          </svg>
          <span>Xóa bộ lọc</span>
        </button>
      </div>

      <!-- Danh mục -->
      <div class="border-t border-[#F1F5F9] pt-4">
        <h3 class="text-[14px] font-semibold text-[#0F172B] mb-3">Danh mục</h3>
        <div class="flex flex-col gap-2.5">
          @for (cat of getVisibleCategories(); track cat) {
            <label class="flex items-center gap-2.5 text-[13px] text-[#475569] cursor-pointer hover:text-[#0F172B]">
              <input
                type="checkbox"
                [checked]="filters.categories?.includes(cat)"
                (change)="toggleCategory(cat)"
                class="w-4 h-4 rounded border-[#CBD5E1] text-[#006AB5] focus:ring-[#006AB5]"
              />
              <span>{{ cat }}</span>
            </label>
          }
          @if (categories.length > 5) {
            <button
              type="button"
              (click)="showAllCategories.update(v => !v)"
              class="text-left text-[12px] font-medium text-[#0088E8] hover:underline pt-1"
            >
              {{ showAllCategories() ? 'Thu gọn' : 'Xem thêm' }}
            </button>
          }
        </div>
      </div>

      <!-- Trình độ -->
      <div class="border-t border-[#F1F5F9] pt-4">
        <h3 class="text-[14px] font-semibold text-[#0F172B] mb-3">Trình độ</h3>
        <div class="flex flex-col gap-2.5">
          @for (level of levels; track level) {
            <label class="flex items-center gap-2.5 text-[13px] text-[#475569] cursor-pointer hover:text-[#0F172B]">
              <input
                type="checkbox"
                [checked]="filters.levels?.includes(level)"
                (change)="toggleLevel(level)"
                class="w-4 h-4 rounded border-[#CBD5E1] text-[#006AB5] focus:ring-[#006AB5]"
              />
              <span>{{ level }}</span>
            </label>
          }
        </div>
      </div>

      <!-- Đánh giá -->
      <div class="border-t border-[#F1F5F9] pt-4">
        <h3 class="text-[14px] font-semibold text-[#0F172B] mb-3">Đánh giá</h3>
        <div class="flex flex-col gap-2.5">
          @for (rating of ratings; track rating.id) {
            <label class="flex items-center gap-2.5 text-[13px] text-[#475569] cursor-pointer hover:text-[#0F172B]">
              <input
                type="radio"
                name="rating"
                [checked]="filters.ratings === rating.id"
                (change)="setRating(rating.id)"
                class="w-4 h-4 text-[#006AB5] focus:ring-[#006AB5]"
              />
              <span class="flex items-center gap-1">
                <span>{{ rating.label }}</span>
                <span class="text-[#F59E0B]">★</span>
              </span>
            </label>
          }
        </div>
      </div>

      <!-- Thời lượng -->
      <div class="border-t border-[#F1F5F9] pt-4">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-[14px] font-semibold text-[#0F172B]">Thời lượng tối đa</h3>
          <span class="text-[12px] font-medium text-[#0088E8]">{{ filters.maxDuration || 120 }} giờ</span>
        </div>
        <input
          type="range"
          min="1"
          max="120"
          [value]="filters.maxDuration || 120"
          (input)="setDuration($any($event.target).value)"
          class="w-full h-1.5 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#006AB5]"
        />
      </div>

      <!-- Giá -->
      <div class="border-t border-[#F1F5F9] pt-4">
        <h3 class="text-[14px] font-semibold text-[#0F172B] mb-3">Giá</h3>
        <div class="flex flex-col gap-2.5">
          @for (pt of priceTypes; track pt.id) {
            <label class="flex items-center gap-2.5 text-[13px] text-[#475569] cursor-pointer hover:text-[#0F172B]">
              <input
                type="radio"
                name="priceType"
                [checked]="(filters.priceType || 'all') === pt.id"
                (change)="setPriceType(pt.id)"
                class="w-4 h-4 text-[#006AB5] focus:ring-[#006AB5]"
              />
              <span>{{ pt.label }}</span>
            </label>
          }
        </div>
      </div>
    </aside>
  `
})
export class FilterSidebarComponent {
  @Input() filters: CourseFilters = {};
  @Input() categories: string[] = [];
  @Output() filterChange = new EventEmitter<CourseFilters>();
  @Output() clearFilters = new EventEmitter<void>();

  showAllCategories = signal(false);

  readonly levels = ['Cơ bản', 'Trung cấp', 'Nâng cao'];
  readonly ratings = [
    { id: '4.5', label: 'Từ 4.5 sao trở lên' },
    { id: '4.0', label: 'Từ 4 sao trở lên' },
    { id: '3.5', label: 'Từ 3.5 sao trở lên' },
  ];
  readonly priceTypes = [
    { id: 'all', label: 'Tất cả' },
    { id: 'paid', label: 'Có trả phí' },
    { id: 'free', label: 'Miễn phí' },
  ];

  getVisibleCategories(): string[] {
    return this.showAllCategories() ? this.categories : this.categories.slice(0, 6);
  }

  toggleCategory(cat: string): void {
    const current = this.filters.categories || [];
    const next = current.includes(cat) ? current.filter(c => c !== cat) : [...current, cat];
    this.filterChange.emit({ ...this.filters, categories: next });
  }

  toggleLevel(lvl: string): void {
    const current = this.filters.levels || [];
    const next = current.includes(lvl) ? current.filter(l => l !== lvl) : [...current, lvl];
    this.filterChange.emit({ ...this.filters, levels: next });
  }

  setRating(ratingId: string): void {
    const next = this.filters.ratings === ratingId ? '' : ratingId;
    this.filterChange.emit({ ...this.filters, ratings: next });
  }

  setDuration(duration: string): void {
    this.filterChange.emit({ ...this.filters, maxDuration: parseInt(duration, 10) });
  }

  setPriceType(pt: string): void {
    this.filterChange.emit({ ...this.filters, priceType: pt });
  }
}
