import { Component, computed, inject, signal, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommerceService } from '../../../core/services/commerce.service';
import { AuthService } from '../../../core/services/auth.service';
import { AccountMenuComponent } from './account-menu/account-menu.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, AccountMenuComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {
  private commerceService = inject(CommerceService);
  private router = inject(Router);
  private el = inject(ElementRef);
  private authService = inject(AuthService);

  readonly cartCount = this.commerceService.cartCount;
  isMobileMenuOpen = signal(false);
  isNotificationOpen = signal(false);

  isLoggedIn = computed(() => this.authService.isAuthenticated());
  userName = computed(() => this.authService.currentUser()?.full_name || 'Học viên');
  userEmail = computed(() => this.authService.currentUser()?.email || '');
  userAvatar = computed(() => this.authService.currentUser()?.avatar || '/assets/profile/overview-avatar.png');
  userRole = computed(() => this.authService.currentUser()?.role === 'instructor' ? 'Giảng viên' : 'Học viên');

  readonly navItems = [
    { label: 'Trang chủ', href: '/main/home' },
    { label: 'Khóa học', href: '/main/courses' },
    { label: 'Phòng học ảo', href: '/learning/study-room' },
    { label: 'Roadmap', href: '/learning/roadmap' },
    { label: 'Bài viết', href: '/main/blog' },
    { label: 'Liên hệ', href: '/main/contact' },
  ];

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.authService.validateSession().subscribe({ error: () => { /* Giữ phiên để thử lại nếu mạng tạm mất. */ } });
    }
  }

  @HostListener('window:storage')
  onStorage(): void {
    this.authService.syncFromStorage();
  }

  // Đóng notification popup khi click bên ngoài
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.isNotificationOpen.set(false);
    }
  }

  logout(): void {
    this.isMobileMenuOpen.set(false);
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/main']),
      error: () => this.router.navigate(['/main'])
    });
  }
}
