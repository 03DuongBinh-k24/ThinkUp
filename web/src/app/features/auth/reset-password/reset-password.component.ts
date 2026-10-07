import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css',
})
export class ResetPasswordComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  token = '';
  password = signal('');
  confirmPassword = signal('');
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  loading = signal(false);
  errors = signal<{ password?: string; confirmPassword?: string; api?: string }>({});

  constructor() {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
    });
  }

  toggleShowPassword(): void { this.showPassword.update(v => !v); }
  toggleShowConfirm(): void { this.showConfirmPassword.update(v => !v); }

  onPasswordChange(value: string): void {
    this.password.set(value);
    if (this.errors().password) this.errors.update(e => ({ ...e, password: undefined }));
  }

  onConfirmChange(value: string): void {
    this.confirmPassword.set(value);
    if (this.errors().confirmPassword) this.errors.update(e => ({ ...e, confirmPassword: undefined }));
  }

  onSubmit(): void {
    const pw = this.password();
    const cpw = this.confirmPassword();
    const newErrors: any = {};

    if (!pw) newErrors.password = 'Vui lòng nhập mật khẩu mới';
    else if (pw.length < 8) newErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự';
    if (!cpw) newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    else if (pw !== cpw) newErrors.confirmPassword = 'Mật khẩu không khớp';

    if (Object.keys(newErrors).length > 0) {
      this.errors.set(newErrors);
      return;
    }
    if (!this.token) {
      this.errors.set({ api: 'Phiên đã hết hạn. Vui lòng thử lại từ đầu.' });
      return;
    }

    this.loading.set(true);
    this.authService.resetPassword(this.token, pw, cpw).subscribe({
      next: () => {
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        this.errors.set({ api: err.message });
        this.loading.set(false);
      }
    });
  }
}
