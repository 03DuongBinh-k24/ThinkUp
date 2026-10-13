import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';
import { MOCK_GOOGLE_USER, createMockFacebookUser } from '../../../core/data/mock/mock-users';
import { getMockSocialUser } from '../../../core/data/mock/mock-auth.store';
import { openMockOAuthPopup } from '../../../core/data/mock/mock-oauth-popup';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './sign-up.component.html',
  styleUrl: './sign-up.component.css'
})
export class SignUpComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

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

    // TODO(pre-deploy): Nhớ xóa đăng ký mock khi backend hoạt động ổn định.
    // Fallback demo cho môi trường dev khi backend offline
    this.handleSignUpSuccess({});
  }

  // --- AC-16, AC-17: Đăng ký một chạm qua Google / Facebook OAuth ---
  handleSocialSignUp(provider: 'Google' | 'Facebook'): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.networkToast.set('');

    // TODO(pre-deploy): Nhớ xóa popup thử nghiệm khi có OAuth thật.
    const popup = openMockOAuthPopup(provider, 'SignUp');

    const socialCall = provider === 'Google'
      ? this.authService.loginWithGoogle()
      : this.authService.loginWithFacebook();

    socialCall.subscribe({
      next: (res) => {
        if (popup && !popup.closed) popup.close();
        this.loading.set(false);
        this.handleSocialSuccess(res.user ?? getMockSocialUser(MOCK_GOOGLE_USER));
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

        // TODO(pre-deploy): Nhớ xóa fallback đăng ký mock khi backend hoạt động ổn định.
        // Fallback demo dev
        const fallback = provider === 'Google'
          ? MOCK_GOOGLE_USER
          : createMockFacebookUser(`new_${provider.toLowerCase()}@thinkup.vn`);
        this.handleSocialSuccess(getMockSocialUser(fallback));
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
        this.handleSocialSuccess(res.user ?? getMockSocialUser(createMockFacebookUser(trimmed)));
      },
      error: () => {
        this.loading.set(false);
        this.showMissingEmailModal.set(false);
        this.handleSocialSuccess(getMockSocialUser(createMockFacebookUser(trimmed)));
      }
    });
  }

  private handleSocialSuccess(userObj: User): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('thinkup_user_logged_in', 'true');
      localStorage.setItem('thinkup_current_user', JSON.stringify(userObj));
    }
    // Tài khoản mới vào khảo sát; tài khoản đã hoàn tất không khảo sát lại.
    this.router.navigate([userObj.onboarding_completed ? '/main/home' : '/onboarding']);
  }
}
