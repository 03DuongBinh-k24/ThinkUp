import { Component, inject, signal, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommerceService } from '../../../core/services/commerce.service';
import { MOCK_LOGGED_IN_USER } from '../../../core/data/mock/mock-user';
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

  readonly cartCount = this.commerceService.cartCount;
  isMobileMenuOpen = signal(false);
  isNotificationOpen = signal(false);

  // TODO(pre-deploy): Nhớ xóa dữ liệu tài khoản mặc định mock khi dùng phiên đăng nhập thật.
  // Mặc định set trạng thái đã đăng nhập tài khoản mock
  isLoggedIn = signal(true);
  userName = signal(MOCK_LOGGED_IN_USER.name);
  userEmail = signal(MOCK_LOGGED_IN_USER.email);
  userAvatar = signal(MOCK_LOGGED_IN_USER.avatarUrl);
  userRole = signal(MOCK_LOGGED_IN_USER.roleLabel || 'Học viên');

  readonly navItems = [
    { label: 'Trang chủ', href: '/main/home' },
    { label: 'Khóa học', href: '/main/courses' },
    { label: 'Phòng học ảo', href: '/learning/study-room' },
    { label: 'Roadmap', href: '/learning/roadmap' },
    { label: 'Bài viết', href: '/main/blog' },
    { label: 'Liên hệ', href: '/main/contact' },
  ];

  ngOnInit(): void {
    this.persistMockSession();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', () => this.syncSession());
    }
  }

  // Đóng notification popup khi click bên ngoài
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.isNotificationOpen.set(false);
    }
  }

  private persistMockSession(): void {
    try {
      if (typeof window !== 'undefined') {
        const isLogged = localStorage.getItem('thinkup_user_logged_in') === 'true';
        this.isLoggedIn.set(isLogged);

        const storedUser = localStorage.getItem('thinkup_current_user');
        if (storedUser) {
          const u = JSON.parse(storedUser);
          this.userName.set(u.full_name || u.fullName || u.name || MOCK_LOGGED_IN_USER.name);
          this.userEmail.set(u.email || MOCK_LOGGED_IN_USER.email);
          this.userAvatar.set(u.avatar || u.avatarUrl || '');
        }
      }
    } catch {}
  }

  private syncSession(): void {
    try {
      const stored = localStorage.getItem('thinkup_current_user');
      if (stored) {
        const u = JSON.parse(stored);
        this.userName.set(u.full_name || u.fullName || u.name || MOCK_LOGGED_IN_USER.name);
        this.userEmail.set(u.email || MOCK_LOGGED_IN_USER.email);
        this.userAvatar.set(u.avatar || u.avatarUrl || '');
      }
    } catch {}
  }

  logout(): void {
    this.isMobileMenuOpen.set(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('thinkup_user_logged_in');
      localStorage.removeItem('thinkup_current_user');
      localStorage.removeItem('access_token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    this.isLoggedIn.set(false);
    this.router.navigate(['/main']);
  }
}
