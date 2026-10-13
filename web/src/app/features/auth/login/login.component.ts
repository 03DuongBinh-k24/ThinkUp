import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { OnboardingService } from '../../../core/services/onboarding.service';
import { User } from '../../../core/models/user.model';
import { MOCK_GOOGLE_USER, createMockFacebookUser } from '../../../core/data/mock/mock-users';
import { getMockSocialUser } from '../../../core/data/mock/mock-auth.store';
import { openMockOAuthPopup } from '../../../core/data/mock/mock-oauth-popup';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
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

  private handleLoginSuccess(apiUser?: User): void {
    if (!apiUser) {
      this.hasAuthError.set(true);
      this.errorMessage.set('Không thể xác định tài khoản đăng nhập. Vui lòng thử lại.');
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('thinkup_user_logged_in', 'true');
      localStorage.setItem('thinkup_current_user', JSON.stringify(apiUser));
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

    // TODO(pre-deploy): Nhớ xóa popup thử nghiệm khi có OAuth thật.
    const popup = openMockOAuthPopup(provider, 'Login');

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

        // TODO(pre-deploy): Nhớ xóa tài khoản mạng xã hội mock khi có OAuth thật.
        // Fallback demo cho dev khi chưa có OAuth Server client_id
        const fallback = provider === 'Google'
          ? MOCK_GOOGLE_USER
          : createMockFacebookUser(`student_${provider.toLowerCase()}@thinkup.vn`);
        this.handleLoginSuccess(getMockSocialUser(fallback));
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
        // TODO(pre-deploy): Nhớ xóa fallback đăng nhập Facebook mock khi có OAuth thật.
        // Fallback demo
        this.loading.set(false);
        this.showMissingEmailModal.set(false);
        this.handleLoginSuccess(getMockSocialUser(createMockFacebookUser(trimmed)));
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
