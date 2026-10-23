import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MOCK_ADMIN_BACKUP_CODES } from '../data/mock/admin-auth.mock';
import {
  AdminAuthError,
  AdminLoginRequest,
  AdminLoginResponse,
  AdminPasswordState,
  AdminRole,
  AdminTwoFactorChallenge,
  AdminUser,
  AdminVerifyTwoFactorResponse
} from '../models/admin-user.model';

const TOKEN_KEY = 'access_token';
const USER_KEY = 'thinkup_admin_user';
const CHALLENGE_KEY = 'thinkup_admin_2fa';
const REMINDER_KEY = 'thinkup_admin_password_reminder_dismissed';

/** Chính sách xoay vòng mật khẩu: 90 ngày, cảnh báo trước 7 ngày. */
const PASSWORD_LIFETIME_DAYS = 90;
const PASSWORD_WARNING_DAYS = 7;
/** TTL mặc định khi backend không trả `expiresInSeconds`. */
const CHALLENGE_TTL_SECONDS = 5 * 60;

/**
 * Quản lý phiên đăng nhập của phân hệ quản trị.
 *
 * Luồng đăng nhập dùng API riêng của Admin: thông tin đăng nhập tạo một token tạm,
 * sau đó OTP hoặc mã dự phòng đổi token tạm lấy access token.
 */
@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly userState = signal<AdminUser | null>(null);
  private readonly challengeState = signal<AdminTwoFactorChallenge | null>(null);

  private readonly issuedCodesState = signal<readonly string[]>([]);

  readonly currentUser = this.userState.asReadonly();
  readonly pendingChallenge = this.challengeState.asReadonly();
  /** Mã dự phòng vừa cấp sau khi hoàn tất thiết lập 2FA. */
  readonly issuedBackupCodes = this.issuedCodesState.asReadonly();

  readonly passwordState = computed<AdminPasswordState>(() => {
    const expiresAt = this.userState()?.passwordExpiresAt;
    if (!expiresAt) return 'ok';

    const daysLeft = this.daysUntil(expiresAt);
    if (daysLeft <= 0) return 'expired';
    return daysLeft <= PASSWORD_WARNING_DAYS ? 'expiring' : 'ok';
  });

  readonly daysUntilPasswordExpiry = computed<number | null>(() => {
    const expiresAt = this.userState()?.passwordExpiresAt;
    return expiresAt ? this.daysUntil(expiresAt) : null;
  });

  constructor() {
    this.restoreSession();
    this.restoreChallenge();
  }

  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.userState();
  }

  isTwoFactorPending(): boolean {
    return !!this.challengeState();
  }

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Đăng nhập bước 1. Phát ra `null` khi tài khoản cần xác thực 2 bước —
   * khi đó component chuyển sang `/auth/two-factor`.
   */
  login(credentials: AdminLoginRequest): Observable<AdminUser | null> {
    const payload = {
      email: (credentials.email ?? '').trim().toLowerCase(),
      password: credentials.password ?? ''
    };

    return this.http.post<AdminLoginResponse>(`${this.apiUrl}/admin/auth/login`, payload).pipe(
      map(response => {
        if (!response.success || !response.requires2FA || !response.twoFactorToken) {
          throw this.buildError('Phản hồi đăng nhập không hợp lệ. Vui lòng thử lại.', 500, 'INVALID_RESPONSE');
        }

        this.startChallenge(
          payload.email,
          response.twoFactorToken,
          response.expiresInSeconds ?? CHALLENGE_TTL_SECONDS,
          !!credentials.rememberMe
        );
        return null;
      }),
      catchError((error: unknown) => throwError(() => this.normalizeError(error)))
    );
  }

  /** Xác thực mã OTP 6 số của bước đăng nhập thứ hai. */
  verifyTwoFactorCode(code: string): Observable<AdminUser> {
    const challenge = this.challengeState();
    if (!challenge) {
      return throwError(() => this.buildError('Phiên xác thực đã hết hiệu lực. Vui lòng đăng nhập lại.', 401, '2FA_SESSION_EXPIRED'));
    }
    if (Date.now() > challenge.expiresAt) {
      this.clearChallenge();
      return throwError(() => this.buildError('Phiên xác thực đã hết hiệu lực. Vui lòng đăng nhập lại.', 401, '2FA_SESSION_EXPIRED'));
    }

    return this.verifyTwoFactor({ otp: code.trim() });
  }

  /** Xác thực bằng mã dự phòng (mỗi mã dùng đúng một lần). */
  verifyBackupCode(code: string): Observable<AdminUser> {
    if (!this.challengeState()) {
      return throwError(() => this.buildError('Phiên xác thực đã hết hiệu lực. Vui lòng đăng nhập lại.', 401, '2FA_SESSION_EXPIRED'));
    }

    return this.verifyTwoFactor({ backupCode: formatBackupCode(code) });
  }

  cancelChallenge(): void {
    this.clearChallenge();
  }

  /**
   * Đổi mật khẩu bắt buộc. OTP 2FA là bắt buộc theo đặc tả nghiệp vụ.
   * TODO(pre-deploy): thay bằng endpoint đổi mật khẩu của backend.
   */
  changePassword(input: { currentPassword: string; newPassword: string; otp: string }): Observable<void> {
    const user = this.userState();
    if (!user) {
      return throwError(() => this.buildError('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.', 401, 'NO_SESSION'));
    }

    if (environment.adminDemoAuthFlow.twoFactorEnabled && input.otp.trim() !== environment.adminDemoAuthFlow.twoFactorCode) {
      return throwError(() => this.buildError('Mã xác thực không chính xác hoặc đã hết hạn. Vui lòng thử lại.', 401, 'INVALID_OTP'));
    }

    const updatedUser: AdminUser = {
      ...user,
      passwordExpiresAt: this.addDays(new Date(), PASSWORD_LIFETIME_DAYS).toISOString()
    };

    this.persistUser(updatedUser);
    this.userState.set(updatedUser);
    this.clearReminderDismissal();
    return of(undefined);
  }

  /**
   * Kiểm tra mã 6 số ở bước cuối của quá trình thiết lập 2FA.
   * TODO(pre-deploy): thay bằng endpoint xác thực mã thiết lập của backend.
   */
  verifySetupCode(code: string): Observable<void> {
    if (environment.adminDemoAuthFlow.twoFactorEnabled && code.trim() !== environment.adminDemoAuthFlow.twoFactorCode) {
      return throwError(() => this.buildError('Mã xác thực không đúng hoặc đã hết hạn. Vui lòng thử lại.', 401, 'INVALID_OTP'));
    }

    return of(undefined);
  }

  /** Hoàn tất thiết lập 2FA, trả về danh sách mã dự phòng đã cấp. */
  completeTwoFactorSetup(): Observable<readonly string[]> {
    // TODO(pre-deploy): nhận bộ mã dự phòng từ backend thay vì dữ liệu mẫu.
    return of(MOCK_ADMIN_BACKUP_CODES).pipe(
      tap(codes => this.issuedCodesState.set(codes))
    );
  }

  passwordReminderDismissed(): boolean {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(REMINDER_KEY) === '1';
  }

  dismissPasswordReminder(): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(REMINDER_KEY, '1');
  }

  logout(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      localStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(CHALLENGE_KEY);
      sessionStorage.removeItem(REMINDER_KEY);
    }
    this.userState.set(null);
    this.challengeState.set(null);
  }

  private verifyTwoFactor(input: { otp: string } | { backupCode: string }): Observable<AdminUser> {
    const challenge = this.challengeState();
    if (!challenge) {
      return throwError(() => this.buildError('Phiên xác thực đã hết hiệu lực. Vui lòng đăng nhập lại.', 401, '2FA_SESSION_EXPIRED'));
    }

    return this.http.post<AdminVerifyTwoFactorResponse>(`${this.apiUrl}/admin/auth/verify-2fa`, {
      twoFactorToken: challenge.twoFactorToken,
      ...input
    }).pipe(
      map(response => this.completeChallenge(response, challenge)),
      catchError((error: unknown) => {
        const normalized = this.normalizeError(error);
        if (normalized.code === '2FA_SESSION_EXPIRED') this.clearChallenge();
        return throwError(() => normalized);
      })
    );
  }

  private completeChallenge(response: AdminVerifyTwoFactorResponse, challenge: AdminTwoFactorChallenge): AdminUser {
    if (!response.success || !response.accessToken || !response.admin) {
      throw this.buildError('Phản hồi xác thực không hợp lệ. Vui lòng thử lại.', 500, 'INVALID_RESPONSE');
    }

    if (response.admin.role.toUpperCase() !== 'ADMIN') {
      throw this.buildError('Tài khoản này không được phép truy cập trang quản trị.', 403, 'FORBIDDEN_ROLE');
    }

    const daysLeft = response.passwordStatus?.daysLeft;
    const passwordExpiresAt = typeof daysLeft === 'number'
      ? this.addDays(new Date(), response.passwordStatus?.isExpired ? -1 : daysLeft).toISOString()
      : null;
    const user: AdminUser = {
      id: response.admin.id,
      email: response.admin.email || challenge.email,
      fullName: response.admin.full_name || 'Quản trị viên',
      role: 'admin' as AdminRole,
      avatar: null,
      passwordExpiresAt
    };

    this.saveSession(response.accessToken, user, challenge.rememberMe);
    this.clearChallenge();
    return user;
  }

  private normalizeError(error: unknown): AdminAuthError {
    return error instanceof HttpErrorResponse ? this.toAuthError(error) : error as AdminAuthError;
  }

  private toAuthError(error: HttpErrorResponse): AdminAuthError {
    if (error.status === 0) {
      return this.buildError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền mạng.', 0, 'NETWORK_ERROR');
    }

    const body = error.error as { message?: string; code?: string; retryAfter?: number; remainingSeconds?: number } | null;
    const message = body?.message?.trim();
    const retryAfter = body?.remainingSeconds ?? body?.retryAfter;

    if (error.status === 401) {
      return this.buildError(message || 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!', 401, body?.code || 'INVALID_CREDENTIALS');
    }
    if (error.status === 403) {
      const code = body?.code || 'FORBIDDEN_ROLE';
      const authError = this.buildError(
        message || (code === 'ACCOUNT_LOCKED'
          ? 'Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau ít phút.'
          : 'Tài khoản của bạn không có quyền truy cập trang quản trị.'),
        403,
        code
      );
      authError.retryAfter = retryAfter;
      return authError;
    }
    if (error.status === 429) {
      const authError = this.buildError(message || 'Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau.', 429, body?.code || 'ACCOUNT_LOCKED');
      authError.retryAfter = retryAfter;
      return authError;
    }
    if (error.status >= 500) {
      return this.buildError('Máy chủ đang bận. Vui lòng thử lại sau ít phút.', error.status, 'SERVER_ERROR');
    }

    return this.buildError(message || 'Đăng nhập thất bại. Vui lòng thử lại.', error.status, body?.code || 'LOGIN_FAILED');
  }

  private buildError(message: string, status: number, code: string): AdminAuthError {
    const error = new Error(message) as AdminAuthError;
    error.status = status;
    error.code = code;
    return error;
  }

  private startChallenge(email: string, twoFactorToken: string, expiresInSeconds: number, rememberMe: boolean): void {
    const challenge: AdminTwoFactorChallenge = {
      email,
      twoFactorToken,
      expiresAt: Date.now() + Math.max(1, expiresInSeconds) * 1000,
      rememberMe
    };

    if (typeof window !== 'undefined') {
      sessionStorage.setItem(CHALLENGE_KEY, JSON.stringify(challenge));
    }

    this.challengeState.set(challenge);
  }

  private clearChallenge(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(CHALLENGE_KEY);
    }
    this.challengeState.set(null);
  }

  private saveSession(token: string, user: AdminUser, rememberMe: boolean): void {
    if (typeof window === 'undefined') return;

    const primary = rememberMe ? localStorage : sessionStorage;
    const secondary = rememberMe ? sessionStorage : localStorage;

    primary.setItem(TOKEN_KEY, token);
    primary.setItem(USER_KEY, JSON.stringify(user));
    secondary.removeItem(TOKEN_KEY);
    secondary.removeItem(USER_KEY);

    this.userState.set(user);
  }

  private persistUser(user: AdminUser): void {
    if (typeof window === 'undefined') return;

    const target = sessionStorage.getItem(USER_KEY) ? sessionStorage : localStorage;
    target.setItem(USER_KEY, JSON.stringify(user));
  }

  private restoreSession(): void {
    if (typeof window === 'undefined') return;

    const raw = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
    if (!raw || !this.getToken()) return;

    try {
      const user = JSON.parse(raw) as AdminUser;
      if (user?.role === 'admin') this.userState.set(user);
    } catch {
      sessionStorage.removeItem(USER_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }

  private restoreChallenge(): void {
    if (typeof window === 'undefined') return;

    const raw = sessionStorage.getItem(CHALLENGE_KEY);
    if (!raw) return;

    try {
      const challenge = JSON.parse(raw) as AdminTwoFactorChallenge;
      if (challenge?.email && challenge.twoFactorToken && challenge.expiresAt > Date.now()) {
        this.challengeState.set(challenge);
      } else {
        sessionStorage.removeItem(CHALLENGE_KEY);
      }
    } catch {
      sessionStorage.removeItem(CHALLENGE_KEY);
    }
  }

  private clearReminderDismissal(): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(REMINDER_KEY);
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private daysUntil(expiresAt: string): number {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.ceil(diff / 86_400_000);
  }
}

/** Chuẩn hoá mã dự phòng về định dạng backend `XXXX-XXXX`. */
function formatBackupCode(code: string): string {
  const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}`;
}
