import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  ElementRef,
  viewChildren,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

export interface VerifyOtpErrors {
  otp?: string;
  api?: string;
}

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './verify-otp.component.html',
  styleUrl: './verify-otp.component.css'
})
export class VerifyOtpComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly otpInputs = viewChildren<ElementRef<HTMLInputElement>>('otpInput');

  readonly email = signal('');
  readonly purpose = signal('reset_password');
  readonly otp = signal<string[]>(['', '', '', '', '', '']);
  readonly loading = signal(false);
  readonly errors = signal<VerifyOtpErrors>({});
  readonly resendSeconds = signal(59);
  readonly resending = signal(false);
  private countdown: ReturnType<typeof setInterval> | null = null;

  private verificationInFlight = false;

  readonly isComplete = computed(() => this.otp().join('').length === 6);

  readonly maskedEmail = computed(() => {
    const raw = this.email().trim();
    if (!raw || !raw.includes('@')) return '***';
    const [name, domain] = raw.split('@');
    return `${name.slice(0, 2)}***@${domain}`;
  });

  readonly title = computed(() => {
    return this.purpose() === 'register' ? 'Xác thực tài khoản' : 'Lấy lại mật khẩu';
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const emailParam = params['email'] || '';
      const purposeParam = params['purpose'] || 'reset_password';
      this.email.set(emailParam);
      this.purpose.set(purposeParam);
    });
    this.startCountdown();
  }

  ngOnDestroy(): void {
    if (this.countdown) clearInterval(this.countdown);
  }

  private startCountdown(): void {
    if (this.countdown) clearInterval(this.countdown);
    this.resendSeconds.set(59);
    this.countdown = setInterval(() => {
      this.resendSeconds.update(seconds => Math.max(0, seconds - 1));
      if (this.resendSeconds() === 0 && this.countdown) {
        clearInterval(this.countdown);
        this.countdown = null;
      }
    }, 1000);
  }

  resendCode(): void {
    if (this.resendSeconds() > 0 || this.resending() || !this.email()) return;
    this.resending.set(true);
    this.authService.resendOtp(this.email(), this.purpose()).subscribe({
      next: () => {
        this.otp.set(['', '', '', '', '', '']);
        this.errors.set({});
        this.resending.set(false);
        this.startCountdown();
        this.toastService.showToast({ type: 'success', message: 'Mã OTP mới đã được gửi!' });
      },
      error: (err) => {
        this.resending.set(false);
        this.errors.set({ api: err.message || 'Không thể gửi lại mã. Vui lòng thử lại.' });
      }
    });
  }

  handleChange(index: number, rawValue: string): void {
    const cleanValue = rawValue.replace(/\D/g, '');
    const char = cleanValue ? cleanValue.slice(-1) : '';

    const newOtp = [...this.otp()];
    newOtp[index] = char;
    this.otp.set(newOtp);

    if (this.errors().otp || this.errors().api) this.errors.set({});

    const inputElements = this.otpInputs();
    if (char && index < 5 && inputElements[index + 1]) {
      inputElements[index + 1].nativeElement.focus();
    }
  }

  handleKeyDown(index: number, event: KeyboardEvent): void {
    const inputElements = this.otpInputs();
    if (event.key === 'Backspace') {
      if (!this.otp()[index] && index > 0 && inputElements[index - 1]) {
        inputElements[index - 1].nativeElement.focus();
      }
    }
  }

  handlePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text')?.trim() || '';
    if (!/^\d{6}$/.test(pasted)) return;

    this.otp.set(pasted.split(''));
    this.errors.set({});

    const inputElements = this.otpInputs();
    if (inputElements[5]) {
      inputElements[5].nativeElement.focus();
    }
  }

  onSubmit(): void {
    if (this.verificationInFlight) return;

    const otpVal = this.otp().join('');
    if (otpVal.length < 6) {
      this.errors.set({ otp: 'Vui lòng nhập đầy đủ 6 chữ số' });
      return;
    }

    const emailVal = this.email();
    if (!emailVal) {
      this.errors.set({ api: 'Không tìm thấy email. Vui lòng thử lại từ đầu.' });
      return;
    }

    this.verificationInFlight = true;
    this.loading.set(true);

    this.authService.verifyOtp(emailVal, otpVal, this.purpose()).subscribe({
      next: (result) => {
        this.verificationInFlight = false;
        this.toastService.showToast({ type: 'success', message: 'Xác thực thành công!' });

        if (this.purpose() === 'register') {
          this.router.navigate(['/auth/login'], { queryParams: { verified: 1 } });
        } else {
          const resetToken = result?.resetToken;
          if (!resetToken) {
            this.loading.set(false);
            this.errors.set({ api: 'Không nhận được phiên đặt lại mật khẩu. Vui lòng yêu cầu mã mới.' });
            return;
          }
          this.router.navigate(['/auth/reset-password'], {
            queryParams: { token: resetToken }
          });
        }
      },
      error: (err) => {
        this.verificationInFlight = false;
        this.loading.set(false);
        const message = err.message || 'Mã xác thực không chính xác. Vui lòng thử lại.';
        this.errors.set({ otp: message });
        this.toastService.showToast({ type: 'error', message });
      }
    });
  }
}
