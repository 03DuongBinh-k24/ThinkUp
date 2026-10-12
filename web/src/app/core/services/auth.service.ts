import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthResponse } from '../models/user.model';

import { mockLogin, mockLoginWithFacebook, mockLoginWithGoogle, mockSignUp, mockForgotPassword, mockVerifyOtp, mockResendOtp, mockResetPassword } from '../data/mock/mock-auth.api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  isAuthenticated(): boolean {
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const user = localStorage.getItem('user');
      // TODO(pre-deploy): Nhớ xóa cách nhận diện phiên mock khi dùng token backend thật.
      const mockSession = localStorage.getItem('thinkup_user_logged_in') === 'true' &&
        !!localStorage.getItem('thinkup_current_user');
      return !!(token || user || mockSession);
    }
    return false;
  }

  // TODO(pre-deploy): Nhớ thay các lời gọi mock dưới đây bằng API auth thật.
  login(credentials: { email: string; password: string; rememberMe?: boolean }): Observable<AuthResponse> {
    return mockLogin(credentials).pipe(catchError(this.handleError.bind(this)));
  }

  loginWithGoogle(): Observable<AuthResponse> {
    return mockLoginWithGoogle().pipe(catchError(this.handleError.bind(this)));
  }

  loginWithFacebook(additionalEmail?: string): Observable<AuthResponse> {
    return mockLoginWithFacebook(additionalEmail).pipe(catchError(this.handleError.bind(this)));
  }

  signUp(data: { fullName: string; phone: string; email: string; password: string }): Observable<AuthResponse> {
    return mockSignUp(data).pipe(catchError(this.handleError.bind(this)));
  }

  // TODO(pre-deploy): Nhớ xóa fallback mockForgotPassword khi kết nối backend thật.
  forgotPassword(contact: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/forgot-password`, { contact }).pipe(
      catchError(err => {
        if (err.status === 0 || err.status === 404) {
          return mockForgotPassword(contact);
        }
        return this.handleError(err);
      })
    );
  }

  // TODO(pre-deploy): Nhớ xóa fallback mockVerifyOtp khi kết nối backend thật.
  verifyOtp(email: string, otp: string, purpose: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/verify-otp`, { email, otp, purpose }).pipe(
      catchError(err => {
        if (err.status === 0 || err.status === 404) {
          return mockVerifyOtp(email, otp, purpose);
        }
        return this.handleError(err);
      })
    );
  }

  // TODO(pre-deploy): Nhớ xóa fallback mockResendOtp khi kết nối backend thật.
  resendOtp(email: string, purpose: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/resend-otp`, { email, purpose }).pipe(
      catchError(err => {
        if (err.status === 0 || err.status === 404) {
          return mockResendOtp(email, purpose);
        }
        return this.handleError(err);
      })
    );
  }

  // TODO(pre-deploy): Nhớ xóa fallback mockResetPassword khi kết nối backend thật.
  resetPassword(token: string, password: string, confirmPassword: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/reset-password`, { token, password, confirmPassword }).pipe(
      catchError(err => {
        if (err.status === 0 || err.status === 404) {
          return mockResetPassword(token, password, confirmPassword);
        }
        return this.handleError(err);
      })
    );
  }

  getMe(): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(`${this.apiUrl}/auth/me`, { withCredentials: true }).pipe(
      catchError(this.handleError)
    );
  }

  logout(): Observable<any> {
    this.clearSession();
    return this.http.post(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true });
  }

  clearSession(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('thinkup_user_logged_in');
      localStorage.removeItem('thinkup_current_user');
      localStorage.removeItem('access_token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('thinkup_onboarding_draft');
      sessionStorage.removeItem('thinkup_login_lock_until');
      sessionStorage.removeItem('thinkup_post_onboarding_return');
    }
  }

  private handleError(error: any) {
    const status = error?.status;
    let errorCode: string = error?.error?.errorCode || error?.error?.code || '';
    let message = error?.error?.message || '';
    const retryAfter = error?.error?.retryAfter || (status === 429 ? 900 : undefined);

    if (status === 0) {
      errorCode = 'NETWORK_ERROR';
      message = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền mạng!';
    } else if (status === 429) {
      errorCode = 'BRUTE_FORCE';
    } else if (status === 403) {
      errorCode = 'ACCOUNT_LOCKED';
      message = 'Tài khoản của bạn đang bị tạm khóa. Vui lòng liên hệ support@thinkup.vn để được hỗ trợ';
    } else if (status === 401) {
      errorCode = 'INVALID_CREDENTIALS';
      message = 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!';
    } else if (status === 409) {
      const errDetail = (error?.error?.message || '').toLowerCase();
      if (errDetail.includes('email')) {
        errorCode = 'DUPLICATE_EMAIL';
        message = 'Email này đã được sử dụng. Vui lòng đăng nhập hoặc sử dụng email khác để đăng ký!';
      } else if (errDetail.includes('phone') || errDetail.includes('thoại') || errDetail.includes('sđt')) {
        errorCode = 'DUPLICATE_PHONE';
        message = 'Số điện thoại này đã được đăng ký!';
      } else {
        errorCode = error?.error?.errorCode || 'DUPLICATE_DATA';
      }
    }

    const customErr: any = new Error(message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    customErr.status = status;
    customErr.errorCode = errorCode;
    customErr.code = errorCode;
    customErr.provider = error?.error?.provider;
    customErr.retryAfter = retryAfter;
    return throwError(() => customErr);
  }
}
