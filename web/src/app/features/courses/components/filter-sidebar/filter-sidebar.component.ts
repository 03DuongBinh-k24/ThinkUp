import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CourseFilters } from '../../../../core/models/course.model';

@Component({
  selector: 'app-filter-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filter-sidebar.component.html',
  styleUrl: './filter-sidebar.component.css'
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
