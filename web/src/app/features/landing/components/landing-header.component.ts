import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommerceService } from '../../../core/services/commerce.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-landing-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './landing-header.component.html',
  styleUrl: './landing-header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingHeaderComponent {
  private readonly commerce = inject(CommerceService);
  private readonly auth = inject(AuthService);
  readonly cartCount = this.commerce.cartCount;
  readonly menuOpen = signal(false);
  readonly cartClick = output<void>();
  get isLoggedIn(): boolean {
    return this.auth.isAuthenticated();
  }

  readonly navItems = [
    { label: 'Trang chủ', href: '/main' },
    { label: 'Khóa học', href: '/main/courses' },
    { label: 'Phòng học ảo', href: '/learning/study-room' },
    { label: 'Roadmap', href: '/learning/roadmap' },
    { label: 'Bài viết', href: '/main/blog' },
    { label: 'Liên hệ', href: '/main/contact' },
  ];

  onCartClick(event: Event): void {
    if (!this.auth.isAuthenticated()) {
      event.preventDefault();
      event.stopPropagation();
      this.cartClick.emit();
    }
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
