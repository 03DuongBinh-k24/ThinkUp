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
} from '../../core/data/mock/mock-home';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
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
    // TODO(pre-deploy): Nhớ nối GET /api/user/onboarding/courses để Home hiển thị khóa học theo thuật toán sau khảo sát; thay danh sách mock hiện tại khi triển khai trang Home.
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
