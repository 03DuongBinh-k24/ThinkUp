import { Component, inject, signal, ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

function maskEmail(email: string): string {
  if (!email) return '***';
  const parts = email.split('@');
  if (parts.length < 2) return '***';
  return `${parts[0].slice(0, 2)}***@${parts[1]}`;
}

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './verify-otp.component.html',
  styleUrl: './verify-otp.component.css',
})
export class VerifyOtpComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = '';
  purpose = '';
  maskedEmail = '';
  otp = signal<string[]>(['', '', '', '', '', '']);
  loading = signal(false);
  errors = signal<{ otp?: string; api?: string }>({});

  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  constructor() {
    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || '';
      this.purpose = params['purpose'] || '';
      this.maskedEmail = maskEmail(this.email);
    });
  }

  get title(): string {
    return this.purpose === 'register' ? 'Xác thực tài khoản' : 'Lấy lại mật khẩu';
  }

  get isComplete(): boolean {
    return this.otp().join('').length === 6;
  }

  onInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    if (isNaN(Number(value))) { input.value = ''; return; }

    const newOtp = [...this.otp()];
    newOtp[index] = value;
    this.otp.set(newOtp);
    this.errors.update(e => ({ ...e, otp: undefined }));

    if (value && index < 5) {
      const inputs = this.otpInputs.toArray();
      inputs[index + 1]?.nativeElement.focus();
    }
  }

  onKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && index > 0 && !this.otp()[index]) {
      const inputs = this.otpInputs.toArray();
      inputs[index - 1]?.nativeElement.focus();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text')?.trim() || '';
    if (!/^\d{6}$/.test(pasted)) return;
    this.otp.set(pasted.split(''));
    const inputs = this.otpInputs.toArray();
    inputs[5]?.nativeElement.focus();
  }

  onSubmit(): void {
    const otpValue = this.otp().join('');
    if (otpValue.length < 6) {
      this.errors.set({ otp: 'Vui lòng nhập đầy đủ 6 chữ số' });
      return;
    }
    if (!this.email) {
      this.errors.set({ api: 'Không tìm thấy email. Vui lòng thử lại từ đầu.' });
      return;
    }

    this.loading.set(true);
    this.authService.verifyOtp(this.email, otpValue, this.purpose).subscribe({
      next: (result) => {
        if (this.purpose === 'register') {
          this.router.navigate(['/auth/login'], { queryParams: { verified: '1' } });
        } else {
          this.router.navigate(['/auth/reset-password'], {
            queryParams: { token: result.resetToken }
          });
        }
      },
      error: (err) => {
        this.errors.set({ api: err.message });
        this.loading.set(false);
      }
    });
  }
}
