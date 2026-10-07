import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-legal-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-[#F9F9FF] text-[#0F172B] font-sans">
      <main class="mx-auto w-full max-w-[960px] px-5 py-12 sm:px-8">
        <header class="mb-10 text-center">
          <span class="rounded-full bg-slate-100 px-3.5 py-1 text-xs font-semibold text-slate-600">
            Pháp Lý & Chính Sách
          </span>
          <h1 class="mt-4 text-3xl font-extrabold text-[#0F172B] sm:text-4xl">
            {{ isPolicy() ? 'Chính Sách Bảo Mật Quyền Riêng Tư' : 'Điều Khoản Dịch Vụ & Sử Dụng' }}
          </h1>
          <p class="mt-2 text-xs text-[#62748E]">
            Cập nhật lần cuối: Ngày 01 tháng 10 năm 2026
          </p>
        </header>

        <article class="prose prose-slate max-w-none rounded-2xl border border-slate-200/80 bg-white p-8 sm:p-12 shadow-sm leading-relaxed text-sm text-slate-700 space-y-6">
          @if (isPolicy()) {
            <section>
              <h2 class="text-lg font-bold text-slate-900 mb-2">1. Thu Thập Thông Tin Cá Nhân</h2>
              <p>
                ThinkUp tôn trọng và cam kết bảo mật quyền riêng tư của bạn. Khi bạn đăng ký tài khoản, chúng tôi thu thập tên, địa chỉ email, số điện thoại và dữ liệu tiến độ học tập nhằm mục đích tối ưu hóa trải nghiệm giáo dục cá nhân hóa.
              </p>
            </section>

            <section>
              <h2 class="text-lg font-bold text-slate-900 mb-2">2. Sử Dụng Thông Tin</h2>
              <p>
                Dữ liệu của học viên chỉ được sử dụng cho việc xác thực tài khoản, xử lý thanh toán, cấp chứng chỉ hoàn thành khóa học và gửi thông báo quan trọng liên quan đến quá trình học tập. Chúng tôi tuyệt đối không bán hay chia sẻ dữ liệu cho bên thứ ba vì mục đích thương mại độc lập.
              </p>
            </section>

            <section>
              <h2 class="text-lg font-bold text-slate-900 mb-2">3. Bảo Mật Thanh Toán</h2>
              <p>
                Mọi thông tin giao dịch thẻ và thanh toán điện tử đều được mã hóa bằng chuẩn SSL/TLS tiên tiến và xử lý qua các cổng thanh toán đạt chứng nhận bảo mật quốc tế.
              </p>
            </section>
          } @else {
            <section>
              <h2 class="text-lg font-bold text-slate-900 mb-2">1. Quy Định Về Tài Khoản</h2>
              <p>
                Người dùng chịu trách nhiệm bảo mật mật khẩu và tài khoản của mình. Không được chia sẻ quyền truy cập tài khoản học tập cho người khác nhằm mục đích trục lợi hoặc sao chép trái phép tài nguyên bài giảng.
              </p>
            </section>

            <section>
              <h2 class="text-lg font-bold text-slate-900 mb-2">2. Bản Quyền & Sở Hữu Trí Tuệ</h2>
              <p>
                Tất cả tài liệu, video bài học, bài tập thực hành và mã nguồn trên ThinkUp thuộc quyền sở hữu trí tuệ của ThinkUp và các giảng viên đối tác. Mọi hành vi tải xuống, ghi hình phát tán trái phép sẽ bị khóa tài khoản vĩnh viễn và xử lý theo pháp luật.
              </p>
            </section>

            <section>
              <h2 class="text-lg font-bold text-slate-900 mb-2">3. Chính Sách Hoàn Tiền</h2>
              <p>
                ThinkUp áp dụng chính sách bảo đảm hoàn tiền 100% trong vòng 30 ngày nếu khóa học không đáp ứng kỳ vọng chất lượng và học viên chưa hoàn thành quá 30% nội dung chương trình học.
              </p>
            </section>
          }

          <div class="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-[#0088E8]">
            <a routerLink="/" class="font-semibold hover:underline">← Về trang chủ ThinkUp</a>
            <a routerLink="/main/contact" class="hover:underline">Liên hệ bộ phận pháp lý</a>
          </div>
        </article>
      </main>
    </div>
  `
})
export class LegalComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);

  readonly isPolicy = signal<boolean>(false);

  ngOnInit(): void {
    this.route.url.subscribe((segments) => {
      const path = segments.map((s) => s.path).join('/');
      this.isPolicy.set(path.includes('policy'));
    });
  }
}
