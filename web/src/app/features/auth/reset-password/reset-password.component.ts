import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

export interface ResetPasswordErrors {
  password?: string;
  confirmPassword?: string;
  api?: string;
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly token = signal('');
  readonly password = signal('');
  readonly confirmPassword = signal('');
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly loading = signal(false);
  readonly successOpen = signal(false);
  readonly errors = signal<ResetPasswordErrors>({});

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.token.set(params['token'] || '');
    });
  }

  onPasswordChange(val: string): void {
    this.password.set(val);
    if (this.errors().password) {
      this.errors.update(prev => ({ ...prev, password: undefined }));
    }
  }

  onConfirmChange(val: string): void {
    this.confirmPassword.set(val);
    if (this.errors().confirmPassword) {
      this.errors.update(prev => ({ ...prev, confirmPassword: undefined }));
    }
  }

  toggleShowPassword(): void {
    this.showPassword.update(v => !v);
  }

  toggleShowConfirm(): void {
    this.showConfirmPassword.update(v => !v);
  }

  validate(): ResetPasswordErrors {
    const newErrors: ResetPasswordErrors = {};
    const pw = this.password();
    const cpw = this.confirmPassword();

    if (!pw) {
      newErrors.password = 'Vui lòng nhập mật khẩu mới';
    } else if (pw.length < 8) {
      newErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự';
    }

    if (!cpw) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    } else if (pw !== cpw) {
      newErrors.confirmPassword = 'Mật khẩu không khớp';
    }

    return newErrors;
  }

  onSubmit(): void {
    const validationErrors = this.validate();
    if (Object.keys(validationErrors).length > 0) {
      this.errors.set(validationErrors);
      return;
    }

    const tokenVal = this.token();
    if (!tokenVal) {
      this.errors.set({ api: 'Phiên đã hết hạn. Vui lòng thử lại từ đầu.' });
      return;
    }

    this.loading.set(true);

    this.authService.resetPassword(tokenVal, this.password(), this.confirmPassword()).subscribe({
      next: () => {
        this.loading.set(false);
        this.successOpen.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        const message = err.message || 'Đổi mật khẩu thất bại. Vui lòng thử lại.';
        this.errors.set({ api: message });
        this.toastService.showToast({ type: 'error', message });
      }
    });
  }

  returnToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
