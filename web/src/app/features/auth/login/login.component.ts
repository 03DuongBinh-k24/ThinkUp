import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { OnboardingService } from '../../../core/services/onboarding.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] w-full flex-1 relative overflow-hidden min-h-[540px] lg:min-h-[580px] font-['Inter',sans-serif]">
      <!-- Left Section: Form Container (Theo chuẩn SPEC-AUTH-STU-01) -->
      <div class="w-full bg-[#FFFFFF] px-6 sm:px-12 lg:px-16 py-8 sm:py-12 flex flex-col items-center justify-center relative z-10 shadow-[20px_0_40px_-15px_rgba(0,0,0,0.02)]">
        <div class="w-full max-w-[500px]">
          <!-- Title -->
          <h1 class="text-center text-[#090909] text-2xl sm:text-3xl font-semibold leading-tight mb-4 tracking-tight">
            Chào mừng trở lại!
          </h1>



          <!-- Activated Account Toast Notification (SPEC-REG-STU-01 Bước 4) -->
          @if (activatedToast()) {
            <div class="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 font-medium animate-fadeIn">
              <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{{ activatedToast() }}</span>
            </div>
          }

          <!-- Network / General Toast Notification (EX-AUTH-01) -->
          @if (networkToast()) {
            <div class="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 font-medium animate-fadeIn">
              <svg class="w-4 h-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{{ networkToast() }}</span>
            </div>
          }

          <!-- Form (BR-AUTH-01: Không kiểm tra lỗi khi đang gõ, chỉ validate post-submit) -->
          <form (ngSubmit)="handleLogin()" class="flex flex-col" noValidate>
            <!-- Email Field -->
            <div class="flex flex-col gap-1.5">
              <label for="email" class="block text-xs sm:text-sm font-medium text-[#131927]">
                Địa chỉ Email
              </label>
              <input
                type="email"
                id="email"
                [(ngModel)]="email"
                (ngModelChange)="onInputChange()"
                name="email"
                required
                [disabled]="isLockedOut() || loading()"
                placeholder="example@gmail.com"
                class="w-full h-11 px-4 py-2 border rounded-lg bg-white text-[#090909] placeholder-[#727785] focus:outline-none focus:ring-2 focus:ring-[#006AB5]/40 font-medium text-sm transition-all"
                [ngClass]="hasAuthError() ? 'border-[#EF4444] ring-1 ring-[#EF4444]' : 'border-[#C2C6D6] focus:border-[#006AB5]'"
              />
            </div>

            <!-- Password Field -->
            <div class="flex flex-col gap-1.5 mt-3.5">
              <label for="password" class="block text-xs sm:text-sm font-medium text-[#0D1C2D]">
                Mật khẩu
              </label>
              <div class="relative">
                <input
                  #passwordInput
                  [type]="showPassword() ? 'text' : 'password'"
                  id="password"
                  [(ngModel)]="password"
                  (ngModelChange)="onInputChange()"
                  name="password"
                  required
                  [disabled]="isLockedOut() || loading()"
                  placeholder="••••••••"
                  class="w-full h-11 pl-4 pr-11 py-2 border rounded-lg bg-white text-[#090909] placeholder-[#6D717F] focus:outline-none focus:ring-2 focus:ring-[#006AB5]/40 font-medium text-sm transition-all"
                  [ngClass]="hasAuthError() ? 'border-[#EF4444] ring-1 ring-[#EF4444]' : 'border-[#C2C6D6] focus:border-[#006AB5]'"
                />
                <!-- AC-05: Icon Con mắt SVG chuẩn, không làm mất focus input -->
                <button
                  type="button"
                  (mousedown)="$event.preventDefault()"
                  (click)="togglePasswordVisibility()"
                  class="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#727785] hover:text-[#090909] transition-colors p-1 rounded-md focus:outline-none cursor-pointer"
                  [attr.aria-label]="showPassword() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
                >
                  @if (showPassword()) {
                    <!-- Mắt Mở SVG -->
                    <svg class="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  } @else {
                    <!-- Mắt Đóng SVG -->
                    <svg class="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  }
                </button>
              </div>

              <!-- AC-07 & AC-08: Dòng thông báo lỗi xuất hiện ngay dưới ô Mật khẩu khi submit sai -->
              @if (errorMessage()) {
                <div class="mt-1 flex items-start gap-1.5 text-[#EF4444] text-[12px] font-medium animate-fadeIn">
                  <svg class="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{{ errorMessage() }}</span>
                </div>
              }

              <!-- BR-03, AC-09: Cảnh báo Brute-force kèm đồng hồ đếm ngược -->
              @if (isLockedOut()) {
                <div class="mt-1.5 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[12px] font-medium flex items-center justify-between">
                  <span>Bạn đã nhập sai 5 lần liên tiếp.</span>
                  <span class="font-bold text-amber-900">Mở khóa sau: {{ lockoutRemainingFormatted() }}</span>
                </div>
              }
            </div>

            <!-- Remember Me & Forgot Password -->
            <div class="flex items-center justify-between mt-3.5">
              <label class="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  [(ngModel)]="rememberMe"
                  name="rememberMe"
                  [disabled]="isLockedOut() || loading()"
                  class="w-4 h-4 border border-[#C2C6D6] rounded cursor-pointer accent-[#006AB5] focus:ring-0"
                />
                <span class="text-xs font-medium text-[#424754]">Ghi nhớ đăng nhập</span>
              </label>
              <a routerLink="/auth/forgot-password" class="text-xs font-medium text-[#006AB5] hover:underline">
                Quên mật khẩu?
              </a>
            </div>

            <!-- Submit Button (AC-02, AC-03, AC-06) -->
            <button
              type="submit"
              [disabled]="!canSubmit()"
              class="w-full h-11 mt-5 flex items-center justify-center gap-2 text-white font-semibold text-sm rounded-lg transition-all shadow-md select-none"
              [ngClass]="canSubmit() ? 'bg-[#006AB5] hover:bg-[#005fa0] active:scale-[0.98] shadow-[#006AB5]/20 cursor-pointer' : 'bg-[#C2C6D6] text-white/90 cursor-not-allowed shadow-none'"
            >
              @if (loading()) {
                <!-- Spinner xoay chuẩn (AC-06) -->
                <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Đang xử lý...</span>
              } @else {
                <span>Đăng nhập</span>
              }
            </button>

            <!-- Divider -->
            <div class="flex items-center gap-4 my-5">
              <div class="flex-1 border-t border-[#E2E8F0]"></div>
              <span class="text-center text-[#727785] text-[11px] font-semibold uppercase tracking-wider">
                Hoặc đăng nhập bằng
              </span>
              <div class="flex-1 border-t border-[#E2E8F0]"></div>
            </div>

            <!-- Social Login Buttons (AC-10, AC-11, AC-12) -->
            <div class="grid grid-cols-2 gap-3">
              <!-- Google Button -->
              <button
                type="button"
                [disabled]="loading() || isLockedOut()"
                (click)="handleSocialLogin('Google')"
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
                [disabled]="loading() || isLockedOut()"
                (click)="handleSocialLogin('Facebook')"
                class="w-full h-10 border border-[#C2C6D6] rounded-lg bg-white hover:bg-slate-50 active:scale-[0.98] flex items-center justify-center gap-2.5 transition text-xs font-semibold text-[#090909] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg class="w-4 h-4 shrink-0 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>Facebook</span>
              </button>
            </div>
          </form>

          <!-- Sign Up Link (AC-18) -->
          <p class="text-center mt-6 text-xs text-[#424754]">
            Chưa có tài khoản?
            <a routerLink="/auth/sign-up" class="font-bold text-[#006AB5] hover:underline ml-1">
              Tạo tài khoản
            </a>
          </p>
        </div>
      </div>

      <!-- Right Section: Spline 3D Scene Interactive Robot (Laptop resolution) -->
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

    <!-- EX-AUTH-04 & AC-13: Modal Bổ sung Email khi đăng nhập Facebook bằng SĐT -->
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
            Vui lòng nhập Email của bạn để ThinkUp gửi thông tin tài khoản và kích hoạt khóa học của bạn.
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
              Xác nhận và Đăng nhập
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class LoginComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly onboardingService = inject(OnboardingService);

  readonly email = signal('');
  readonly password = signal('');
  readonly rememberMe = signal(false);

  readonly showPassword = signal(false);
  readonly loading = signal(false);
  readonly hasAuthError = signal(false);
  readonly errorMessage = signal('');
  readonly networkToast = signal('');
  readonly activatedToast = signal('');

  // BR-AUTH-03 & AC-09: Quản lý Brute-force 5 lần sai
  readonly failedAttempts = signal(0);
  readonly lockoutRemainingSeconds = signal(0);
  private timerInterval: any = null;

  // EX-AUTH-04 & AC-13: Quản lý Facebook thiếu email
  readonly showMissingEmailModal = signal(false);
  missingEmailInput = '';
  readonly missingEmailError = signal('');

  // BR-AUTH-01, AC-02, AC-03: Realtime computed checking
  readonly isEmailValid = computed(() => {
    const trimmed = this.email().trim();
    // RFC 5322 regex cơ bản
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  });

  readonly isPasswordValid = computed(() => {
    return this.password().trim().length >= 8;
  });

  readonly isLockedOut = computed(() => this.lockoutRemainingSeconds() > 0);

  readonly canSubmit = computed(() => {
    return this.isEmailValid() && this.isPasswordValid() && !this.isLockedOut() && !this.loading();
  });

  readonly lockoutRemainingFormatted = computed(() => {
    const totalSec = this.lockoutRemainingSeconds();
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  });

  ngOnInit(): void {
    // SPEC-REG-STU-01 Bước 4: Kiểm tra queryParams kích hoạt tài khoản
    const qParams = this.route.snapshot.queryParams;
    if (qParams['activated'] === 'true') {
      this.activatedToast.set('Kích hoạt tài khoản thành công! Vui lòng đăng nhập để bắt đầu học tập.');
      if (qParams['email']) {
        this.email.set(qParams['email']);
      }
    }

    // Phục hồi lockout timer nếu trước đó đã bị khóa (lưu trong sessionStorage)
    if (typeof sessionStorage !== 'undefined') {
      const lockUntil = sessionStorage.getItem('thinkup_login_lock_until');
      if (lockUntil) {
        const remaining = Math.max(0, Math.floor((parseInt(lockUntil, 10) - Date.now()) / 1000));
        if (remaining > 0) {
          this.startLockoutTimer(remaining);
        } else {
          sessionStorage.removeItem('thinkup_login_lock_until');
        }
      }
    }
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  fillStudentCredentials(): void {
    this.email.set('hocvien.moi@thinkup.edu.vn');
    this.password.set('Hocvien@2026');
    // Đảm bảo cờ onboarding_completed được reset để bạn test được màn khảo sát Onboarding
    this.onboardingService.resetOnboardingState();
    this.clearErrors();
  }

  fillInstructorCredentials(): void {
    this.email.set('anhmai12312315@gmail.com');
    this.password.set('Engineer@7654');
    this.clearErrors();
  }

  onInputChange(): void {
    // BR-AUTH-01: Không hiện lỗi khi đang gõ. Nếu trước đó có viền đỏ submit sai, người dùng gõ lại thì reset viền đỏ.
    if (this.hasAuthError()) {
      this.hasAuthError.set(false);
      this.errorMessage.set('');
    }
    if (this.networkToast()) {
      this.networkToast.set('');
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  clearErrors(): void {
    this.hasAuthError.set(false);
    this.errorMessage.set('');
    this.networkToast.set('');
  }

  handleLogin(): void {
    if (!this.canSubmit() || this.loading()) return;

    this.loading.set(true);
    this.clearErrors();

    const cleanEmail = this.email().trim();
    const cleanPassword = this.password().trim();

    this.authService.login({
      email: cleanEmail,
      password: cleanPassword,
      rememberMe: this.rememberMe()
    }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.failedAttempts.set(0);
        this.handleLoginSuccess(res.user);
      },
      error: (err) => {
        this.loading.set(false);
        this.handleLoginFailure(err);
      }
    });
  }

  private handleLoginSuccess(apiUser?: any): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('thinkup_user_logged_in', 'true');

      const isInstructor = this.email().includes('anhmai');
      const isNewStudent = this.email().includes('hocvien.moi') || !this.onboardingService.isOnboardingCompleted();
      const userObj = apiUser || {
        name: isInstructor ? 'Mai Diệu Thương' : 'Học viên ThinkUp',
        email: this.email().trim(),
        roleLabel: isInstructor ? 'Giảng viên' : 'Học viên',
        role: isInstructor ? 'instructor' : 'student',
        onboarding_completed: isInstructor ? true : (isNewStudent ? false : true)
      };

      localStorage.setItem('thinkup_current_user', JSON.stringify(userObj));
    }

    this.navigateAfterLogin();
  }

  private handleLoginFailure(err: any): void {
    // BR-AUTH-08 & AC-17: Tài khoản bị khóa (is_active = false / 403)
    if (err?.errorCode === 'ACCOUNT_LOCKED' || err?.status === 403) {
      this.hasAuthError.set(true);
      this.errorMessage.set('Tài khoản của bạn đang bị tạm khóa. Vui lòng liên hệ support@thinkup.vn để được hỗ trợ');
      return;
    }

    // EX-AUTH-01 & AC-16: Mất mạng hoặc Server Timeout
    if (err?.errorCode === 'NETWORK_ERROR' || err?.status === 0 || err?.status >= 500) {
      // Giữ nguyên form, không xóa dữ liệu
      this.networkToast.set('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền mạng!');
      return;
    }

    // BR-AUTH-03 & AC-09: Tăng số lần đăng nhập sai
    const attempts = this.failedAttempts() + 1;
    this.failedAttempts.set(attempts);

    if (attempts >= 5 || err?.errorCode === 'BRUTE_FORCE' || err?.status === 429) {
      const lockSeconds = err?.retryAfter || 900; // 15 phút
      this.startLockoutTimer(lockSeconds);
      this.hasAuthError.set(true);
      this.errorMessage.set('Bạn đã nhập sai 5 lần. Vui lòng thử lại sau 15 phút hoặc sử dụng Quên mật khẩu!');
      return;
    }

    // BR-AUTH-02, AC-07, AC-08: Thông báo trung tính an toàn, viền đỏ cả 2 ô
    this.hasAuthError.set(true);
    this.errorMessage.set('Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!');
  }

  private startLockoutTimer(seconds: number): void {
    this.lockoutRemainingSeconds.set(seconds);
    const lockUntil = Date.now() + seconds * 1000;
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('thinkup_login_lock_until', lockUntil.toString());
    }

    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      const cur = this.lockoutRemainingSeconds();
      if (cur <= 1) {
        clearInterval(this.timerInterval);
        this.lockoutRemainingSeconds.set(0);
        this.failedAttempts.set(0);
        this.clearErrors();
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem('thinkup_login_lock_until');
        }
      } else {
        this.lockoutRemainingSeconds.set(cur - 1);
      }
    }, 1000);
  }

  /**
   * AC-10, AC-11, AC-12: Xử lý Đăng nhập mạng xã hội (Google / Facebook)
   */
  handleSocialLogin(provider: 'Google' | 'Facebook'): void {
    if (this.loading() || this.isLockedOut()) return;

    this.loading.set(true);
    this.clearErrors();

    // Giả lập mở Popup ủy quyền OAuth (AC-10, AC-11)
    const popupWidth = 500;
    const popupHeight = 600;
    const left = window.screenX + (window.outerWidth - popupWidth) / 2;
    const top = window.screenY + (window.outerHeight - popupHeight) / 2;

    const popup = window.open(
      'about:blank',
      `ThinkUp_${provider}_Login`,
      `width=${popupWidth},height=${popupHeight},left=${left},top=${top},status=0,toolbar=0`
    );

    if (popup) {
      popup.document.write(`
        <!DOCTYPE html>
        <html>
        <head><title>Đăng nhập bằng ${provider}</title></head>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc;">
          <h3 style="color: #0f172a; margin-bottom: 8px;">Đang kết nối ${provider}...</h3>
          <p style="color: #64748b; font-size: 13px;">Vui lòng chờ trong giây lát.</p>
        </body>
        </html>
      `);
    }

    // Gọi API hoặc xử lý callback từ popup
    const socialCall = provider === 'Google'
      ? this.authService.loginWithGoogle()
      : this.authService.loginWithFacebook();

    socialCall.subscribe({
      next: (res) => {
        if (popup && !popup.closed) popup.close();
        this.loading.set(false);
        this.handleLoginSuccess(res.user);
      },
      error: (err) => {
        if (popup && !popup.closed) popup.close();
        this.loading.set(false);

        // EX-AUTH-03 & AC-12: Người dùng tự đóng popup hoặc hủy ủy quyền -> KHÔNG hiện lỗi đỏ
        if (err?.code === 'OAUTH_CANCELLED' || err?.message?.includes('closed')) {
          return;
        }

        // EX-AUTH-04 & AC-13: Facebook thiếu email
        if (provider === 'Facebook' && (err?.errorCode === 'MISSING_EMAIL' || err?.message?.includes('email'))) {
          this.showMissingEmailModal.set(true);
          return;
        }

        // Fallback demo cho dev khi chưa có OAuth Server client_id
        if (typeof window !== 'undefined') {
          localStorage.setItem('thinkup_user_logged_in', 'true');
          const mockSocialUser = {
            name: `Học viên (${provider})`,
            email: `student_${provider.toLowerCase()}@thinkup.vn`,
            roleLabel: 'Học viên',
            role: 'student',
            onboarding_completed: this.onboardingService.isOnboardingCompleted()
          };
          localStorage.setItem('thinkup_current_user', JSON.stringify(mockSocialUser));
        }
        this.navigateAfterLogin();
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
        this.handleLoginSuccess(res.user);
      },
      error: () => {
        // Fallback demo
        this.loading.set(false);
        this.showMissingEmailModal.set(false);
        if (typeof window !== 'undefined') {
          localStorage.setItem('thinkup_user_logged_in', 'true');
          localStorage.setItem('thinkup_current_user', JSON.stringify({
            name: 'Học viên (Facebook)',
            email: trimmed,
            roleLabel: 'Học viên',
            role: 'student',
            onboarding_completed: this.onboardingService.isOnboardingCompleted()
          }));
        }
        this.navigateAfterLogin();
      }
    });
  }

  private navigateAfterLogin(): void {
    // BR-AUTH-05 & AC-15: Ưu tiên Return URL (hoặc queryParam 'next')
    const queryReturn = this.route.snapshot.queryParams['returnUrl'] || this.route.snapshot.queryParams['next'];

    // Nếu học viên chưa hoàn thành khảo sát Onboarding: Ép chuyển hướng về /onboarding
    if (!this.onboardingService.isOnboardingCompleted()) {
      // Bảo lưu returnUrl sau khi hoàn tất khảo sát
      if (queryReturn && typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('thinkup_post_onboarding_return', queryReturn);
      }
      this.router.navigate(['/onboarding']);
      return;
    }

    const destination = queryReturn || '/main/courses';
    this.router.navigateByUrl(destination);
  }
}
