import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthApiError, AuthResponse, User } from '../models/user.model';

interface BackendUser {
  id: string;
  name?: string;
  full_name?: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  role: User['role'];
  onboarding_completed?: boolean;
  email_verified?: boolean;
}

interface BackendLoginResponse {
  message: string;
  accessToken: string;
  user: BackendUser;
}

interface BackendMessageResponse {
  message: string;
  email?: string;
  resetToken?: string;
}

interface BackendSessionResponse {
  isAuthenticated: boolean;
  user: BackendUser | null;
}

const TOKEN_KEY = 'access_token';
const USER_KEY = 'thinkup_current_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly userState = signal<User | null>(null);
  readonly currentUser = this.userState.asReadonly();

  constructor() {
    this.restoreSession();
  }

  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.userState();
  }

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  }

  login(credentials: { email: string; password: string; rememberMe?: boolean }): Observable<AuthResponse> {
    return this.http.post<BackendLoginResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      map(response => this.mapLoginResponse(response)),
      tap(response => this.saveSession(response, !!credentials.rememberMe)),
      catchError(error => this.handleError(error))
    );
  }

  signUp(data: { fullName: string; phone: string; email: string; password: string; confirmPassword: string; termsAccepted: boolean }): Observable<AuthResponse> {
    return this.http.post<BackendMessageResponse>(`${this.apiUrl}/auth/register`, data).pipe(
      map(response => ({ success: true, message: response.message, email: response.email })),
      catchError(error => this.handleError(error))
    );
  }

  resendVerification(email: string): Observable<AuthResponse> {
    return this.http.post<BackendMessageResponse>(`${this.apiUrl}/auth/resend-verification`, { email }).pipe(
      map(response => ({ success: true, message: response.message, email })),
      catchError(error => this.handleError(error))
    );
  }

  forgotPassword(email: string): Observable<AuthResponse> {
    return this.http.post<BackendMessageResponse>(`${this.apiUrl}/auth/forgot-password`, { email }).pipe(
      map(response => ({ success: true, message: response.message, email: response.email || email })),
      catchError(error => this.handleError(error))
    );
  }

  verifyOtp(email: string, otp: string): Observable<AuthResponse> {
    return this.http.post<BackendMessageResponse>(`${this.apiUrl}/auth/verify-forgot-otp`, { email, otp }).pipe(
      map(response => ({ success: true, message: response.message, resetToken: response.resetToken })),
      catchError(error => this.handleError(error))
    );
  }

  resendOtp(email: string): Observable<AuthResponse> {
    return this.http.post<BackendMessageResponse>(`${this.apiUrl}/auth/resend-forgot-otp`, { email }).pipe(
      map(response => ({ success: true, message: response.message })),
      catchError(error => this.handleError(error))
    );
  }

  resetPassword(resetToken: string, newPassword: string, confirmPassword: string): Observable<AuthResponse> {
    return this.http.post<BackendMessageResponse>(`${this.apiUrl}/auth/reset-password`, { resetToken, newPassword, confirmPassword }).pipe(
      map(response => ({ success: true, message: response.message })),
      catchError(error => this.handleError(error))
    );
  }

  getMe(): Observable<User> {
    return this.http.get<{ user: BackendUser }>(`${this.apiUrl}/auth/me`).pipe(
      map(response => this.mapUser(response.user)),
      tap(user => this.updateUser(user)),
      catchError(error => this.handleError(error))
    );
  }

  validateSession(): Observable<boolean> {
    if (!this.getToken()) {
      this.clearSession();
      return of(false);
    }
    return this.http.get<BackendSessionResponse>(`${this.apiUrl}/auth/session`).pipe(
      map(response => {
        if (!response.isAuthenticated || !response.user) {
          this.clearSession();
          return false;
        }
        this.updateUser(this.mapUser(response.user));
        return true;
      }),
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 401) this.clearSession();
        return this.handleError(error);
      })
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/logout`, {}).pipe(
      tap(() => this.clearSession()),
      catchError(error => {
        this.clearSession();
        return this.handleError(error);
      })
    );
  }

  updateUser(user: User): void {
    this.userState.set(user);
    if (typeof localStorage !== 'undefined') localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  syncFromStorage(): void {
    this.restoreSession();
  }

  clearSession(): void {
    this.userState.set(null);
    if (typeof localStorage !== 'undefined') {
      for (const key of [TOKEN_KEY, USER_KEY, 'thinkup_user_logged_in', 'thinkup_token', 'token', 'user', 'thinkup_mock_db_users', 'thinkup_mock_social_users']) {
        localStorage.removeItem(key);
      }
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem('thinkup_login_lock_until');
      sessionStorage.removeItem('thinkup_post_onboarding_return');
    }
  }

  private restoreSession(): void {
    if (typeof localStorage === 'undefined') return;
    if (!this.getToken()) {
      // Một tab mới không có sessionStorage riêng; đừng xóa hồ sơ dùng chung của tab đã đăng nhập.
      this.userState.set(null);
      return;
    }
    try {
      const raw = localStorage.getItem(USER_KEY);
      const user = raw ? JSON.parse(raw) as User : null;
      if (!user?.id) {
        this.clearSession();
        return;
      }
      this.userState.set(user);
    } catch {
      this.clearSession();
    }
  }

  private saveSession(response: AuthResponse, rememberMe: boolean): void {
    if (!response.token || !response.user || typeof window === 'undefined') return;
    this.clearSession();
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, response.token);
    this.updateUser(response.user);
  }

  private mapLoginResponse(response: BackendLoginResponse): AuthResponse {
    if (!response.accessToken || !response.user?.id) throw new Error('Phản hồi đăng nhập không hợp lệ.');
    return { success: true, message: response.message, token: response.accessToken, user: this.mapUser(response.user) };
  }

  private mapUser(user: BackendUser): User {
    return {
      id: user.id,
      full_name: user.full_name || user.name || '',
      email: user.email,
      phone: user.phone || undefined,
      avatar: user.avatar || undefined,
      role: user.role,
      onboarding_completed: !!user.onboarding_completed,
      email_verified: user.email_verified,
    };
  }

  private handleError(error: unknown): Observable<never> {
    if (!(error instanceof HttpErrorResponse)) {
      return throwError(() => error);
    }
    const backend = error.error && typeof error.error === 'object' ? error.error as Record<string, unknown> : {};
    const originalCode = typeof backend['code'] === 'string' ? backend['code'] : '';
    const field = typeof backend['field'] === 'string' ? backend['field'] : undefined;
    const authError = new Error(
      error.status === 0
        ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền mạng!'
        : typeof backend['message'] === 'string' ? backend['message'] : 'Đã xảy ra lỗi. Vui lòng thử lại.'
    ) as AuthApiError;
    authError.status = error.status;
    authError.field = field;
    authError.errorCode = originalCode === 'EMAIL_EXISTS' ? 'DUPLICATE_EMAIL'
      : originalCode === 'PHONE_EXISTS' ? 'DUPLICATE_PHONE'
      : originalCode || (error.status === 0 ? 'NETWORK_ERROR' : '');
    authError.retryAfter = typeof backend['retryAfter'] === 'number' ? backend['retryAfter'] : undefined;
    authError.provider = typeof backend['provider'] === 'string' ? backend['provider'] : undefined;
    return throwError(() => authError);
  }
}
