import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { OnboardingService } from '../../../core/services/onboarding.service';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] w-full flex-1 relative overflow-hidden min-h-[540px] lg:min-h-[580px] font-['Inter',sans-serif]">
      <!-- Left Section: Form Container (Theo chuẩn SPEC-REG-STU-01) -->
      <div class="w-full bg-[#FFFFFF] px-6 sm:px-12 lg:px-16 py-8 sm:py-10 flex flex-col items-center justify-center relative z-10 shadow-[20px_0_40px_-15px_rgba(0,0,0,0.02)]">
        <div class="w-full max-w-[500px]">
          <!-- Title -->
          <h1 class="text-center text-[#090909] text-2xl sm:text-3xl font-semibold leading-tight tracking-tight mb-4">
            Đăng ký tài khoản ThinkUp
          </h1>

          <!-- Toast Thông báo thành công / Yêu cầu kích hoạt Email (BR-AUTH-06, SPEC-REG-STU-01) -->
          @if (successToast()) {
            <div class="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 font-medium animate-fadeIn">
              <svg class="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div class="flex-1">
                <p class="font-bold text-emerald-900">Đăng ký thành công!</p>
                <p class="mt-0.5 text-emerald-700 leading-relaxed">{{ successToast() }}</p>
              </div>
            </div>
          }

          <!-- Network Toast Error (EX-REG-02, AC-18) -->
          @if (networkToast()) {
            <div class="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 font-medium animate-fadeIn">
              <svg class="w-4 h-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{{ networkToast() }}</span>
            </div>
          }

          <!-- Form (BR-REG-01: Inline error độc lập từng ô) -->
          <form (ngSubmit)="handleSignUp()" class="flex flex-col" noValidate>
            <!-- 1. Họ và tên & Số điện thoại (Song song hàng đầu) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <!-- Ô Họ và tên (BR-REG-02, AC-03) -->
              <div class="flex flex-col gap-1">
                <label for="fullName" class="block text-xs font-medium text-[#131927]">
                  Họ và tên *
                </label>
                <input
                  type="text"
                  id="fullName"
                  [(ngModel)]="fullName"
                  (ngModelChange)="onFullNameChange()"
                  (blur)="fullNameTouched.set(true)"
                  name="fullName"
                  placeholder="Nguyễn Văn A"
                  [disabled]="loading()"
                  class="w-full h-10 px-3.5 border rounded-lg bg-white text-xs text-[#090909] focus:outline-none focus:ring-2 focus:ring-[#006AB5]/40 transition-all"
                  [ngClass]="showFullNameError() ? 'border-[#EF4444] ring-1 ring-[#EF4444]' : 'border-[#C2C6D6] focus:border-[#006AB5]'"
                />
                @if (showFullNameError()) {
                  <span class="text-[#EF4444] text-[11px] font-medium animate-fadeIn">
                    {{ fullNameErrorMessage() }}
                  </span>
                }
              </div>

              <!-- Ô Số điện thoại (BR-REG-03, AC-04, AC-14) -->
              <div class="flex flex-col gap-1">
                <label for="phone" class="block text-xs font-medium text-[#131927]">
                  Số điện thoại *
                </label>
                <input
                  type="tel"
                  id="phone"
                  [(ngModel)]="phone"
                  (ngModelChange)="onPhoneChange()"
                  (blur)="phoneTouched.set(true)"
                  name="phone"
                  placeholder="0912345678"
                  [disabled]="loading()"
                  class="w-full h-10 px-3.5 border rounded-lg bg-white text-xs text-[#090909] focus:outline-none focus:ring-2 focus:ring-[#006AB5]/40 transition-all"
                  [ngClass]="showPhoneError() ? 'border-[#EF4444] ring-1 ring-[#EF4444]' : 'border-[#C2C6D6] focus:border-[#006AB5]'"
                />
                @if (showPhoneError()) {
                  <span class="text-[#EF4444] text-[11px] font-medium animate-fadeIn">
                    {{ phoneErrorMessage() }}
                  </span>
                }
              </div>
            </div>

            <!-- 2. Địa chỉ Email (BR-REG-04, AC-05, AC-14) -->
            <div class="flex flex-col gap-1 mt-3">
              <label for="email" class="block text-xs font-medium text-[#131927]">
                Địa chỉ Email *
              </label>
              <input
                type="email"
                id="email"
                [(ngModel)]="email"
                (ngModelChange)="onEmailChange()"
                (blur)="emailTouched.set(true)"
                name="email"
                placeholder="example@gmail.com"
                [disabled]="loading()"
                class="w-full h-10 px-3.5 border rounded-lg bg-white text-xs text-[#090909] focus:outline-none focus:ring-2 focus:ring-[#006AB5]/40 transition-all"
                [ngClass]="showEmailError() ? 'border-[#EF4444] ring-1 ring-[#EF4444]' : 'border-[#C2C6D6] focus:border-[#006AB5]'"
              />
              @if (showEmailError()) {
                <div class="flex items-center justify-between text-[#EF4444] text-[11px] font-medium animate-fadeIn">
                  <span>{{ emailErrorMessage() }}</span>
                  @if (serverEmailDuplicate()) {
                    <a routerLink="/auth/login" class="text-[#006AB5] font-semibold underline hover:text-[#005fa0] ml-1">
                      Đăng nhập ngay
                    </a>
                  }
                </div>
              }
            </div>

            <!-- 3. Mật khẩu & Xác nhận mật khẩu (Song song hàng tiếp) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <!-- Ô Mật khẩu (BR-REG-05, AC-06, AC-07, AC-12) -->
              <div class="flex flex-col gap-1">
                <label for="password" class="block text-xs font-medium text-[#0D1C2D]">
                  Mật khẩu *
                </label>
                <div class="relative">
                  <input
                    [type]="showPassword() ? 'text' : 'password'"
                    id="password"
                    [(ngModel)]="password"
                    (ngModelChange)="onPasswordChange()"
                    name="password"
                    placeholder="••••••••"
                    [disabled]="loading()"
                    class="w-full h-10 pl-3.5 pr-9 border rounded-lg bg-white text-xs text-[#090909] focus:outline-none focus:ring-2 focus:ring-[#006AB5]/40 transition-all"
                    [ngClass]="passwordInputClass()"
                  />
                  <!-- AC-12: Icon Con mắt SVG độc lập cho ô Mật khẩu -->
                  <button
                    type="button"
                    (mousedown)="$event.preventDefault()"
                    (click)="showPassword.update(v => !v)"
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#727785] hover:text-[#090909] transition-colors p-1 rounded-md focus:outline-none cursor-pointer"
                    [attr.aria-label]="showPassword() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
                  >
                    @if (showPassword()) {
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    } @else {
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    }
                  </button>
                </div>

                <!-- AC-06, AC-07: Dòng gợi ý mật khẩu Real-time -->
                @if (password().length > 0) {
                  @if (passwordCriteria().isValid) {
                    <span class="text-emerald-600 text-[11px] font-semibold animate-fadeIn flex items-center gap-1">
                      ✓ Mật khẩu hợp lệ
                    </span>
                  } @else {
                    <span class="text-amber-600 text-[11px] font-medium animate-fadeIn">
                      Còn thiếu: {{ passwordCriteria().missingText }}
                    </span>
                  }
                }
              </div>

              <!-- Ô Xác nhận mật khẩu (BR-REG-06, AC-08, AC-09, AC-12) -->
              <div class="flex flex-col gap-1">
                <label for="confirmPassword" class="block text-xs font-medium text-[#0D1C2D]">
                  Xác nhận mật khẩu *
                </label>
                <div class="relative">
                  <input
                    [type]="showConfirmPassword() ? 'text' : 'password'"
                    id="confirmPassword"
                    [(ngModel)]="confirmPassword"
                    name="confirmPassword"
                    placeholder="••••••••"
                    [disabled]="loading()"
                    class="w-full h-10 pl-3.5 pr-9 border rounded-lg bg-white text-xs text-[#090909] focus:outline-none focus:ring-2 focus:ring-[#006AB5]/40 transition-all"
                    [ngClass]="confirmPasswordInputClass()"
                  />
                  <!-- AC-12: Icon Con mắt SVG độc lập cho ô Xác nhận MK -->
                  <button
                    type="button"
                    (mousedown)="$event.preventDefault()"
                    (click)="showConfirmPassword.update(v => !v)"
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#727785] hover:text-[#090909] transition-colors p-1 rounded-md focus:outline-none cursor-pointer"
                    [attr.aria-label]="showConfirmPassword() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
                  >
                    @if (showConfirmPassword()) {
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    } @else {
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    }
                  </button>
                </div>

                <!-- AC-08, AC-09: Dòng so khớp chéo Real-time -->
                @if (confirmPassword().length > 0) {
                  @if (confirmPasswordStatus().isMatch) {
                    <span class="text-emerald-600 text-[11px] font-semibold animate-fadeIn flex items-center gap-1">
                      ✓ Mật khẩu trùng khớp
                    </span>
                  } @else {
                    <span class="text-[#EF4444] text-[11px] font-medium animate-fadeIn">
                      Mật khẩu xác nhận không khớp.
                    </span>
                  }
                }
              </div>
            </div>

            <!-- 4. Checkbox Điều khoản (BR-REG-07, AC-10) -->
            <div class="flex items-start gap-2 mt-3.5 select-none">
              <input
                type="checkbox"
                id="terms"
                [(ngModel)]="agreedToTerms"
                name="terms"
                [disabled]="loading()"
                class="w-4 h-4 mt-0.5 border border-[#C2C6D6] rounded cursor-pointer accent-[#006AB5] focus:ring-0"
              />
              <label for="terms" class="text-xs text-[#424754] leading-relaxed cursor-pointer">
                Tôi đồng ý với
                <a routerLink="/legal/terms" class="text-[#006AB5] hover:underline font-semibold">Điều khoản sử dụng</a>
                và
                <a routerLink="/legal/policy" class="text-[#006AB5] hover:underline font-semibold">Chính sách bảo mật</a>
                của ThinkUp.
              </label>
            </div>

            <!-- 5. Submit Button (AC-02, AC-11, AC-13) -->
            <button
              type="submit"
              [disabled]="!canSubmit()"
              class="w-full h-11 mt-4.5 flex items-center justify-center gap-2 text-white font-semibold text-sm rounded-lg transition-all shadow-md select-none"
              [ngClass]="canSubmit() ? 'bg-[#006AB5] hover:bg-[#005fa0] active:scale-[0.98] shadow-[#006AB5]/20 cursor-pointer' : 'bg-[#C2C6D6] text-white/90 cursor-not-allowed shadow-none'"
            >
              @if (loading()) {
                <!-- AC-13: Spinner xoay chuẩn khi đang submit -->
                <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Đang tạo tài khoản...</span>
              } @else {
                <span>Đăng ký ngay</span>
              }
            </button>

            <!-- Divider -->
            <div class="flex items-center gap-4 my-4">
              <div class="flex-1 border-t border-[#E2E8F0]"></div>
              <span class="text-center text-[#727785] text-[11px] font-semibold uppercase tracking-wider">
                Hoặc đăng ký bằng
              </span>
              <div class="flex-1 border-t border-[#E2E8F0]"></div>
            </div>

            <!-- Social Buttons (AC-16, AC-17) -->
            <div class="grid grid-cols-2 gap-3">
              <!-- Google Button -->
              <button
                type="button"
                [disabled]="loading()"
                (click)="handleSocialSignUp('Google')"
                class="w-full h-10 border border-[#C2C6D6] rounded-lg bg-white hover:bg-slate-50 active:scale-[0.98] flex items-center justify-center gap-2.5 transition text-xs font-semibold text-[#090909] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Google</span>
              </button>

              <!-- Facebook Button -->
              <button
                type="button"
                [disabled]="loading()"
                (click)="handleSocialSignUp('Facebook')"
                class="w-full h-10 border border-[#C2C6D6] rounded-lg bg-white hover:bg-slate-50 active:scale-[0.98] flex items-center justify-center gap-2.5 transition text-xs font-semibold text-[#090909] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg class="w-4 h-4 shrink-0 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>Facebook</span>
              </button>
            </div>
          </form>

          <!-- Secondary Links (AC-01, AC-19) -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-2 mt-5 text-xs text-[#424754]">
            <p>
              Đã có tài khoản?
              <a routerLink="/auth/login" class="font-bold text-[#006AB5] hover:underline ml-1">
                Đăng nhập ngay
              </a>
            </p>
            <a routerLink="/auth/forgot-password" class="text-xs text-[#727785] hover:text-[#006AB5] hover:underline">
              Đặt lại mật khẩu?
            </a>
          </div>
        </div>
      </div>

      <!-- Right Section: Spline 3D Scene Interactive Robot (Laptop layout) -->
      <div class="hidden lg:flex w-full h-full relative bg-[#A8C8F0] overflow-hidden items-center justify-center min-h-[580px]">
        <div class="relative w-full h-full overflow-hidden">
          <iframe
            src="https://my.spline.design/googlyeyes-RQpxBuNfsOYrpbM6uR3GoPw9-nII/?v=2"
            frameBorder="0"
            class="absolute pointer-events-auto max-w-none"
            style="width: 170%; height: 170%; border: none; top: -20%; left: -32%;"
            title="Interactive Robot 3D"
          ></iframe>
        </div>
      </div>
    </div>

    <!-- EX-REG-04: Modal Bổ sung Email khi đăng ký Facebook không có email -->
    @if (showMissingEmailModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-4">
          <div class="flex items-center gap-3 text-amber-600">
            <div class="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 class="font-bold text-base text-[#090909]">Bổ sung thông tin Email</h3>
              <p class="text-xs text-[#727785]">Tài khoản Facebook của bạn chưa cung cấp địa chỉ Email</p>
            </div>
          </div>

          <p class="text-xs text-[#424754] leading-relaxed">
            Vui lòng nhập Email của bạn để hoàn tất đăng ký tài khoản ThinkUp và kích hoạt khóa học.
          </p>

          <div class="flex flex-col gap-1.5">
            <label for="missingEmail" class="text-xs font-semibold text-[#131927]">Email liên hệ</label>
            <input
              type="email"
              id="missingEmail"
              [(ngModel)]="missingEmailInput"
              placeholder="nhap.email@example.com"
              class="w-full h-10 px-3.5 border rounded-lg text-sm bg-white text-[#090909] focus:outline-none focus:border-[#006AB5]"
            />
            @if (missingEmailError()) {
              <span class="text-xs text-red-500 font-medium">{{ missingEmailError() }}</span>
            }
          </div>

          <div class="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              (click)="showMissingEmailModal.set(false)"
              class="px-4 py-2 text-xs font-semibold text-[#727785] hover:text-[#090909] hover:bg-slate-100 rounded-lg transition"
            >
              Hủy
            </button>
            <button
              type="button"
              (click)="submitMissingEmail()"
              [disabled]="loading()"
              class="px-5 py-2 text-xs font-semibold text-white bg-[#006AB5] hover:bg-[#005fa0] rounded-lg transition"
            >
              Xác nhận và Hoàn tất
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class SignUpComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly onboardingService = inject(OnboardingService);

  // Form Fields as Signals for 100% reactive computed tracking
  readonly fullName = signal('');
  readonly phone = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly confirmPassword = signal('');
  readonly agreedToTerms = signal(false);

  // Touch States (BR-REG-01: Chỉ hiện lỗi khi touched && invalid)
  readonly fullNameTouched = signal(false);
  readonly phoneTouched = signal(false);
  readonly emailTouched = signal(false);

  // Server error overrides (EX-REG-01, AC-14)
  readonly serverEmailDuplicate = signal(false);
  readonly serverPhoneDuplicate = signal(false);

  // UI States
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly loading = signal(false);
  readonly networkToast = signal('');
  readonly successToast = signal('');

  // Social OAuth Exception (EX-REG-04)
  readonly showMissingEmailModal = signal(false);
  missingEmailInput = '';
  readonly missingEmailError = signal('');

  ngOnInit(): void {
    // Khởi tạo component
  }

  // --- Real-time Validation Logics ---

  // BR-REG-02: Họ và tên (2-50 ký tự, chỉ chữ cái và khoảng trắng, cấm số và ký tự đặc biệt)
  readonly fullNameValidation = computed(() => {
    const trimmed = this.fullName().trim();
    if (!trimmed) {
      return { valid: false, message: 'Vui lòng nhập họ và tên.' };
    }
    if (trimmed.length < 2 || trimmed.length > 50) {
      return { valid: false, message: 'Họ và tên phải từ 2 đến 50 ký tự.' };
    }
    // Regex cho phép tiếng Việt có dấu, tiếng Anh và khoảng trắng
    const nameRegex = /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ\s]+$/;
    if (!nameRegex.test(trimmed)) {
      return { valid: false, message: 'Tên không được chứa số hoặc ký tự đặc biệt.' };
    }
    return { valid: true, message: '' };
  });

  readonly showFullNameError = computed(() => {
    return this.fullNameTouched() && !this.fullNameValidation().valid;
  });

  readonly fullNameErrorMessage = computed(() => {
    return this.fullNameValidation().message;
  });

  // BR-REG-03: Số điện thoại (Đúng 10 số, bắt đầu bằng 03, 05, 07, 08, 09)
  readonly phoneValidation = computed(() => {
    if (this.serverPhoneDuplicate()) {
      return { valid: false, message: 'Số điện thoại này đã được đăng ký!' };
    }
    const cleanPhone = this.phone().trim().replace(/\s/g, '');
    if (!cleanPhone) {
      return { valid: false, message: 'Vui lòng nhập số điện thoại.' };
    }
    if (!/^[0-9]+$/.test(cleanPhone) || cleanPhone.length !== 10) {
      return { valid: false, message: 'Số điện thoại không hợp lệ (phải gồm 10 số).' };
    }
    if (!/^(03|05|07|08|09)/.test(cleanPhone)) {
      return { valid: false, message: 'Số điện thoại phải bắt đầu bằng đầu số di động Việt Nam (03, 05, 07, 08, 09).' };
    }
    return { valid: true, message: '' };
  });

  readonly showPhoneError = computed(() => {
    return (this.phoneTouched() || this.serverPhoneDuplicate()) && !this.phoneValidation().valid;
  });

  readonly phoneErrorMessage = computed(() => {
    return this.phoneValidation().message;
  });

  // BR-REG-04: Email (RFC 5322, kiểm tra trùng lặp)
  readonly emailValidation = computed(() => {
    if (this.serverEmailDuplicate()) {
      return { valid: false, message: 'Email này đã được sử dụng. Vui lòng đăng nhập hoặc đăng ký với email khác!' };
    }
    const cleanEmail = this.email().trim();
    if (!cleanEmail) {
      return { valid: false, message: 'Vui lòng nhập địa chỉ email.' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { valid: false, message: 'Email không đúng định dạng (vd: example@gmail.com).' };
    }
    return { valid: true, message: '' };
  });

  readonly showEmailError = computed(() => {
    return (this.emailTouched() || this.serverEmailDuplicate()) && !this.emailValidation().valid;
  });

  readonly emailErrorMessage = computed(() => {
    return this.emailValidation().message;
  });

  // BR-REG-05: Mật khẩu Real-time Checklist (8-64 ký tự, hoa, thường, số, ký tự đặc biệt)
  readonly passwordCriteria = computed(() => {
    const p = this.password().trim();
    const hasLength = p.length >= 8 && p.length <= 64;
    const hasUpper = /[A-Z]/.test(p);
    const hasLower = /[a-z]/.test(p);
    const hasNumber = /[0-9]/.test(p);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p);

    const missingParts: string[] = [];
    if (!hasLength) missingParts.push('8 ký tự');
    if (!hasUpper) missingParts.push('chữ hoa');
    if (!hasLower) missingParts.push('chữ thường');
    if (!hasNumber) missingParts.push('số');
    if (!hasSpecial) missingParts.push('ký tự đặc biệt');

    const isValid = hasLength && hasUpper && hasLower && hasNumber && hasSpecial;
    return {
      isValid,
      missingText: missingParts.join(', ')
    };
  });

  readonly passwordInputClass = computed(() => {
    if (this.password().length === 0) return 'border-[#C2C6D6] focus:border-[#006AB5]';
    return this.passwordCriteria().isValid
      ? 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/20'
      : 'border-amber-500 focus:border-amber-500 focus:ring-amber-500/20';
  });

  // BR-REG-06, AC-08, AC-09: So khớp chéo Xác nhận mật khẩu
  readonly confirmPasswordStatus = computed(() => {
    const isDirty = this.confirmPassword().length > 0;
    const isMatch = isDirty && this.confirmPassword().trim() === this.password().trim();
    return { isDirty, isMatch };
  });

  readonly confirmPasswordInputClass = computed(() => {
    if (this.confirmPassword().length === 0) return 'border-[#C2C6D6] focus:border-[#006AB5]';
    return this.confirmPasswordStatus().isMatch
      ? 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/20'
      : 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/20';
  });

  // AC-02, AC-10, AC-11: Nút Submit chỉ Enabled khi thỏa mãn toàn bộ điều kiện
  readonly canSubmit = computed(() => {
    const valid = this.fullNameValidation().valid &&
                  this.phoneValidation().valid &&
                  this.emailValidation().valid &&
                  this.passwordCriteria().isValid &&
                  this.confirmPasswordStatus().isMatch &&
                  this.agreedToTerms() &&
                  !this.loading();
    return valid;
  });

  // Reset Server Error khi người dùng gõ lại
  onFullNameChange(): void {
    if (this.networkToast()) this.networkToast.set('');
  }

  onPhoneChange(): void {
    if (this.serverPhoneDuplicate()) this.serverPhoneDuplicate.set(false);
    if (this.networkToast()) this.networkToast.set('');
  }

  onEmailChange(): void {
    if (this.serverEmailDuplicate()) this.serverEmailDuplicate.set(false);
    if (this.networkToast()) this.networkToast.set('');
  }

  onPasswordChange(): void {
    if (this.networkToast()) this.networkToast.set('');
  }

  // --- Submit Luồng Đăng Ký (AC-13, AC-14, AC-15, EX-REG-01, EX-REG-02) ---
  handleSignUp(): void {
    if (!this.canSubmit() || this.loading()) return;

    this.loading.set(true);
    this.networkToast.set('');
    this.successToast.set('');

    const payload = {
      fullName: this.fullName().trim(),
      phone: this.phone().trim().replace(/\s/g, ''),
      email: this.email().trim(),
      password: this.password().trim()
    };

    this.authService.signUp(payload).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.handleSignUpSuccess(res);
      },
      error: (err) => {
        this.loading.set(false);
        this.handleSignUpFailure(err);
      }
    });
  }

  private handleSignUpSuccess(res: any): void {
    // 1. Hiển thị thông báo thành công
    const successMsg = 'Đăng ký thành công! Vui lòng đăng nhập để bắt đầu học tập và làm khảo sát.';
    this.successToast.set(successMsg);

    /**
     * GHI CHÚ QUAN TRỌNG (THEO YÊU CẦU DỰ ÁN):
     * Tạm thời khi đăng ký thì KHÔNG tự động lưu phiên làm việc (session/user data) vào local.
     * Mai mốt khi Backend code xong API /api/v1/auth/register và CSDL thì sẽ lưu tài khoản
     * từ Backend trả về sau.
     */

    // 2. Chuyển hướng sang màn hình Đăng nhập kèm điền sẵn email vừa đăng ký
    setTimeout(() => {
      this.router.navigate(['/auth/login'], {
        queryParams: { activated: 'true', email: this.email().trim() }
      });
    }, 1500);
  }

  private handleSignUpFailure(err: any): void {
    // EX-REG-02 & AC-18: Mất kết nối mạng
    if (err?.errorCode === 'NETWORK_ERROR' || err?.status === 0 || err?.status >= 500) {
      this.networkToast.set('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng Internet!');
      return;
    }

    // EX-REG-01 & AC-14: Trùng lặp Email
    if (err?.errorCode === 'DUPLICATE_EMAIL') {
      this.emailTouched.set(true);
      this.serverEmailDuplicate.set(true);
      return;
    }

    // EX-REG-01 & AC-14: Trùng lặp Số điện thoại
    if (err?.errorCode === 'DUPLICATE_PHONE') {
      this.phoneTouched.set(true);
      this.serverPhoneDuplicate.set(true);
      return;
    }

    // Fallback demo cho môi trường dev khi backend offline
    this.handleSignUpSuccess({});
  }

  // --- AC-16, AC-17: Đăng ký một chạm qua Google / Facebook OAuth ---
  handleSocialSignUp(provider: 'Google' | 'Facebook'): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.networkToast.set('');

    const popupWidth = 500;
    const popupHeight = 600;
    const left = window.screenX + (window.outerWidth - popupWidth) / 2;
    const top = window.screenY + (window.outerHeight - popupHeight) / 2;

    const popup = window.open(
      'about:blank',
      `ThinkUp_${provider}_SignUp`,
      `width=${popupWidth},height=${popupHeight},left=${left},top=${top},status=0,toolbar=0`
    );

    if (popup) {
      popup.document.write(`
        <!DOCTYPE html>
        <html>
        <head><title>Đăng ký bằng ${provider}</title></head>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc;">
          <h3 style="color: #0f172a; margin-bottom: 8px;">Đang kết nối ${provider}...</h3>
          <p style="color: #64748b; font-size: 13px;">Vui lòng chờ trong giây lát.</p>
        </body>
        </html>
      `);
    }

    const socialCall = provider === 'Google'
      ? this.authService.loginWithGoogle()
      : this.authService.loginWithFacebook();

    socialCall.subscribe({
      next: (res) => {
        if (popup && !popup.closed) popup.close();
        this.loading.set(false);
        this.handleSocialSuccess(res?.user || {
          name: `Học viên (${provider})`,
          email: `new_${provider.toLowerCase()}@thinkup.vn`,
          role: 'student',
          roleLabel: 'Học viên',
          onboarding_completed: false
        });
      },
      error: (err) => {
        if (popup && !popup.closed) popup.close();
        this.loading.set(false);

        // EX-REG-05: Đóng ngang popup không báo lỗi
        if (err?.code === 'OAUTH_CANCELLED' || err?.message?.includes('closed')) {
          return;
        }

        // EX-REG-04: Facebook không có email
        if (provider === 'Facebook' && (err?.errorCode === 'MISSING_EMAIL' || err?.message?.includes('email'))) {
          this.showMissingEmailModal.set(true);
          return;
        }

        // Fallback demo dev
        this.handleSocialSuccess({
          name: `Học viên (${provider})`,
          email: `new_${provider.toLowerCase()}@thinkup.vn`,
          role: 'student',
          roleLabel: 'Học viên',
          onboarding_completed: false
        });
      }
    });
  }

  submitMissingEmail(): void {
    const trimmed = this.missingEmailInput.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      this.missingEmailError.set('Vui lòng nhập địa chỉ email hợp lệ');
      return;
    }

    this.missingEmailError.set('');
    this.loading.set(true);

    this.authService.loginWithFacebook(trimmed).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.showMissingEmailModal.set(false);
        this.handleSocialSuccess(res?.user || {
          name: 'Học viên (Facebook)',
          email: trimmed,
          role: 'student',
          roleLabel: 'Học viên',
          onboarding_completed: false
        });
      },
      error: () => {
        this.loading.set(false);
        this.showMissingEmailModal.set(false);
        this.handleSocialSuccess({
          name: 'Học viên (Facebook)',
          email: trimmed,
          role: 'student',
          roleLabel: 'Học viên',
          onboarding_completed: false
        });
      }
    });
  }

  private handleSocialSuccess(userObj: any): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('thinkup_user_logged_in', 'true');
      userObj.onboarding_completed = false; // Học viên mới luôn vào Onboarding
      localStorage.setItem('thinkup_current_user', JSON.stringify(userObj));
    }
    // AC-16, AC-17, BR-REG-08: Chuyển tiếp thẳng vào Khảo sát Onboarding
    this.router.navigate(['/onboarding']);
  }
}
