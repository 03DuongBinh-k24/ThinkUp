import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './placeholder.component.html',
  styleUrl: './placeholder.component.css'
})
export class PlaceholderComponent {
  private route = inject(ActivatedRoute);

  get currentPath(): string {
    return window.location.pathname;
  }

  get title(): string {
    const path = this.currentPath;
    if (path.includes('study-room')) return 'Phòng học ảo (Study Room)';
    if (path.includes('roadmap')) return 'Lộ trình nghề nghiệp (Roadmap)';
    if (path.includes('blog')) return 'Bài viết & Blog';
    if (path.includes('contact')) return 'Liên hệ ThinkUp';
    if (path.includes('help-center')) return 'Trung tâm trợ giúp';
    if (path.includes('terms')) return 'Điều khoản dịch vụ';
    if (path.includes('policy')) return 'Chính sách bảo mật';
    if (path.includes('instructors')) return 'Đội ngũ Giảng viên';
    if (path.includes('sign_up')) return 'Đăng ký tài khoản';
    if (path.includes('my-courses')) return 'Khóa học của tôi';
    if (path.includes('profile')) return 'Trang cá nhân';
    if (path.includes('home')) return 'Trang chủ';
    return 'Tính năng đang hoàn thiện';
  }
}
