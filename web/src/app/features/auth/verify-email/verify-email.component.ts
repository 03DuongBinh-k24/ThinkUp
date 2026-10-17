import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AuthApiError } from '../../../core/models/user.model';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.css',
})
export class VerifyEmailComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly verifying = signal(true);
  readonly resending = signal(false);
  readonly message = signal('');
  readonly email = signal('');
  readonly cooldownSeconds = signal(0);
  private cooldownTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.verifying.set(false);
      this.message.set('Liên kết kích hoạt không hợp lệ. Hãy nhập email để nhận liên kết mới.');
      return;
    }
    this.auth.verifyEmail(token).subscribe({
      next: result => {
        void this.router.navigate(['/auth/login'], {
          queryParams: { activated: 'true', email: result.email },
          replaceUrl: true,
        });
      },
      error: (error: AuthApiError) => {
        this.verifying.set(false);
        this.message.set(error.message || 'Không thể kích hoạt tài khoản. Hãy thử gửi lại liên kết.');
      },
    });
  }

  ngOnDestroy(): void {
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);
  }

  resend(): void {
    const email = this.email().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || this.resending() || this.cooldownSeconds() > 0) {
      this.message.set('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    this.resending.set(true);
    this.auth.resendVerification(email).subscribe({
      next: result => {
        this.resending.set(false);
        this.message.set(result.message);
        this.startCooldown(60);
      },
      error: (error: AuthApiError) => {
        this.resending.set(false);
        this.message.set(error.message);
        if (error.status === 429) {
          const seconds = Number(error.message.match(/(\d+)\s*giây/)?.[1]);
          this.startCooldown(Number.isFinite(seconds) && seconds > 0 ? seconds : 60);
        }
      },
    });
  }

  private startCooldown(seconds: number): void {
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);
    this.cooldownSeconds.set(seconds);
    this.cooldownTimer = setInterval(() => {
      this.cooldownSeconds.update(remaining => Math.max(0, remaining - 1));
      if (this.cooldownSeconds() === 0 && this.cooldownTimer) {
        clearInterval(this.cooldownTimer);
        this.cooldownTimer = null;
      }
    }, 1000);
  }
}
