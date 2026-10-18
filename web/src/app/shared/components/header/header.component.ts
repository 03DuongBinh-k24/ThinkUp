import { Component, computed, effect, inject, input, signal, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommerceService } from '../../../core/services/commerce.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService, UserNotification } from '../../../core/services/notification.service';
import { AccountMenuComponent } from './account-menu/account-menu.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, AccountMenuComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  host: { '[class.liquid-glass]': "appearance() === 'liquid-glass'" },
})
export class HeaderComponent implements OnInit {
  readonly audience = input<'guest' | 'member'>('guest');
  readonly appearance = input<'standard' | 'liquid-glass'>('standard');
  private commerceService = inject(CommerceService);
  private router = inject(Router);
  private el = inject(ElementRef);
  private authService = inject(AuthService);
  readonly notifications = inject(NotificationService);

  readonly cartCount = this.commerceService.cartCount;
  isMobileMenuOpen = signal(false);
  isNotificationOpen = signal(false);

  isLoggedIn = computed(() => this.audience() === 'member' && this.authService.isAuthenticated());
  userName = computed(() => this.authService.currentUser()?.full_name || 'Học viên');
  userEmail = computed(() => this.authService.currentUser()?.email || '');
  userAvatar = computed(() => this.authService.currentUser()?.avatar || '');
  userRole = computed(() => this.authService.currentUser()?.role === 'instructor' ? 'Giảng viên' : 'Học viên');

  readonly navItems = [
    { label: 'Trang chủ', href: '/main/home' },
    { label: 'Khóa học', href: '/main/courses' },
    { label: 'Phòng học ảo', href: '/learning/study-room' },
    { label: 'Roadmap', href: '/learning/roadmap' },
    { label: 'Bài viết', href: '/main/blog' },
    { label: 'Liên hệ', href: '/main/contact' },
  ];

  constructor() {
    effect(() => this.notifications.setUser(this.isLoggedIn() ? this.authService.currentUser()?.id ?? null : null));
  }

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.authService.validateSession().subscribe({ error: () => { /* Giữ phiên để thử lại nếu mạng tạm mất. */ } });
    }
  }

  @HostListener('window:storage')
  onStorage(): void {
    this.authService.syncFromStorage();
    this.notifications.syncFromStorage();
  }

  // Đóng notification popup khi click bên ngoài
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target;
    if (target instanceof Node && !this.el.nativeElement.querySelector('[data-notification-root]')?.contains(target)) {
      this.isNotificationOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  closeNotifications(): void {
    this.isNotificationOpen.set(false);
  }

  toggleNotifications(): void {
    this.isNotificationOpen.update(open => !open);
  }

  openNotification(notification: UserNotification): void {
    this.notifications.markRead(notification.id);
    this.isNotificationOpen.set(false);
    if (notification.href) this.router.navigateByUrl(notification.href);
  }

  logout(): void {
    this.isMobileMenuOpen.set(false);
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/main']),
      error: () => this.router.navigate(['/main'])
    });
  }
}
