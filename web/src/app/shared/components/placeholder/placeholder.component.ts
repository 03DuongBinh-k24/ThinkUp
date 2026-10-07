import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-[60vh] bg-[#F9F9FF] flex items-center justify-center px-4 py-16">
      <div class="max-w-lg w-full bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-8 text-center">
        <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#EBF3FF] text-[#0088E8] flex items-center justify-center">
          <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-[#0F172B] mb-2">{{ title }}</h1>
        <p class="text-sm font-mono text-[#0088E8] bg-[#F0F7FF] py-1 px-3 rounded-md inline-block mb-4">
          Path: {{ currentPath }}
        </p>
        <p class="text-sm text-[#64748B] mb-6 leading-relaxed">
          Trang này đã được liên kết đường dẫn thành công. Giao diện và logic của module này sẽ được hoàn thiện trong các giai đoạn tiếp theo.
        </p>
        <div class="flex justify-center gap-3">
          <a routerLink="/main/courses" class="inline-flex items-center px-5 py-2.5 rounded-lg bg-[#006AB5] text-white text-sm font-semibold hover:bg-[#00528C] transition">
            ← Khám phá khóa học
          </a>
        </div>
      </div>
    </div>
  `
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
