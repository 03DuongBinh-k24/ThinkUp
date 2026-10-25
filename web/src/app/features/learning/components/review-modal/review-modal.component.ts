import { DecimalPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LucidePenLine, LucideStar, LucideThumbsUp, LucideX } from '@lucide/angular';
import { CourseReview, CourseReviewSummary } from '../../models/learning.model';

type ReviewFilter = 'all' | '5' | '4' | '3' | '12';

@Component({
  selector: 'app-review-modal',
  standalone: true,
  imports: [DecimalPipe, LucidePenLine, LucideStar, LucideThumbsUp, LucideX],
  templateUrl: './review-modal.component.html',
})
export class ReviewModalComponent {
  @Input({ required: true }) courseTitle = '';
  @Input({ required: true }) summary!: CourseReviewSummary;
  @Output() closed = new EventEmitter<void>();
  @Output() editRequested = new EventEmitter<void>();

  filter: ReviewFilter = 'all';
  visibleCount = 4;
  liked = new Set<string>();

  readonly filters: { id: ReviewFilter; label: string }[] = [
    { id: 'all', label: 'Tất cả' },
    { id: '5', label: '5 Sao' },
    { id: '4', label: '4 Sao' },
    { id: '3', label: '3 Sao' },
    { id: '12', label: '1 - 2 Sao' },
  ];

  get reviews(): CourseReview[] {
    return this.summary.reviews.filter((review) => {
      if (this.filter === 'all') return true;
      if (this.filter === '12') return review.rating <= 2;
      return review.rating === Number(this.filter);
    });
  }

  get visibleReviews(): CourseReview[] {
    return this.reviews.slice(0, this.visibleCount);
  }

  get hasMore(): boolean {
    return this.reviews.length > this.visibleCount;
  }

  stars(rating: number): number[] {
    return Array.from({ length: 5 }, (_, index) => (index < Math.round(rating) ? 1 : 0));
  }

  selectFilter(filter: ReviewFilter): void {
    this.filter = filter;
    this.visibleCount = 4;
  }

  loadMore(): void {
    this.visibleCount += 4;
  }

  toggleLike(review: CourseReview): void {
    if (this.liked.has(review.id)) this.liked.delete(review.id);
    else this.liked.add(review.id);
  }

  isLiked(review: CourseReview): boolean {
    return this.liked.has(review.id);
  }
}
