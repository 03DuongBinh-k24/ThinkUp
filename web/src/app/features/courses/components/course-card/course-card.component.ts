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
  templateUrl: './course-card.component.html',
  styleUrl: './course-card.component.css'
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
