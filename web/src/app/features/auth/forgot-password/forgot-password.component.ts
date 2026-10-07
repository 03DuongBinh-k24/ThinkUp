import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css',
})
export class ForgotPasswordComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = signal('');
  loading = signal(false);
  errors = signal<{ email?: string; api?: string; code?: string; provider?: string }>({});

  constructor() {
    // Pre-fill email from query params
    this.route.queryParams.subscribe(params => {
      if (params['email']) this.email.set(params['email']);
    });
  }

  onEmailChange(value: string): void {
    this.email.set(value);
    if (this.errors().email) {
      this.errors.update(e => ({ ...e, email: undefined }));
    }
  }

  onSubmit(): void {
    const emailVal = this.email().trim();
    // Validate
    if (!emailVal) {
      this.errors.set({ email: 'Vui lòng nhập email' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      this.errors.set({ email: 'Email không hợp lệ' });
      return;
    }

    this.loading.set(true);
    this.authService.forgotPassword(emailVal).subscribe({
      next: (result) => {
        const emailToVerify = result.email || emailVal;
        this.router.navigate(['/auth/verify-otp'], {
          queryParams: { email: emailToVerify, purpose: 'reset_password' }
        });
      },
      error: (err) => {
        this.errors.set({ api: err.message });
        this.loading.set(false);
      }
    });
  }
}
