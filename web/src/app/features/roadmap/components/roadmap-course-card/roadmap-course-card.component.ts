import { Component, computed, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideHeart, LucideShoppingCart, LucideStar, LucideUserRound } from '@lucide/angular';
import { Course } from '../../../../core/models/course.model';
import { ToastService } from '../../../../core/services/toast.service';
import { FavoritesService } from '../../../../core/services/favorites.service';
import { InstructorTriggerDirective } from '../../../../shared/directives/instructor-trigger.directive';
import { AuthService } from '../../../../core/services/auth.service';
import { AuthRequiredModalComponent } from '../../../../shared/components/auth-required-modal/auth-required-modal.component';

@Component({
  selector: 'app-roadmap-course-card',
  standalone: true,
  imports: [DecimalPipe, RouterLink, LucideHeart, LucideShoppingCart, LucideStar, LucideUserRound, InstructorTriggerDirective, AuthRequiredModalComponent],
  templateUrl: './roadmap-course-card.component.html',
  styleUrls: ['../../styles/roadmap-ui.css', './roadmap-course-card.component.css']
})
export class RoadmapCourseCardComponent {
  private readonly favoritesService = inject(FavoritesService);
  private readonly toastService = inject(ToastService);
  private readonly auth = inject(AuthService);

  readonly course = input.required<Course>();
  readonly addToCart = output<string>();
  readonly authModalOpen = signal(false);

  readonly coverTitle = computed(() => this.course().title.split(' - ')[0]);
  readonly failedThumbnail = signal<string | undefined>(undefined);
  readonly thumbnail = computed(() => {
    const url = this.course().thumbnailUrl;
    return url && url !== this.failedThumbnail() ? url : null;
  });
  readonly isFavorite = computed(() => this.favoritesService.isFavorite(this.course().id));
  readonly isLoggedIn = computed(() => this.auth.isAuthenticated());
  readonly badge = computed(() => this.course().badge ?? 'HOT');
  readonly tags = computed(() => (this.course().tags ?? []).slice(0, 3));

  formatPrice(value: number): string {
    return `${value.toLocaleString('vi-VN')}đ`;
  }

  toggleFavorite(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isLoggedIn()) {
      this.authModalOpen.set(true);
      return;
    }

    this.favoritesService.toggleFavorite(this.course()).subscribe((result) => {
      this.toastService.showToast({
        type: 'success',
        message: result.isFavorite ? 'Đã thêm khóa học vào yêu thích.' : 'Đã bỏ khóa học khỏi yêu thích.'
      });
    });
  }

  onAddToCart(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isLoggedIn()) {
      this.authModalOpen.set(true);
      return;
    }
    this.addToCart.emit(this.course().id);
  }
}
