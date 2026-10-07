import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthResponse } from '../models/user.model';

import { INITIAL_MOCK_USERS } from '../data/mock-users';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // --- MOCK DB LOGIC ---
  private getMockUsers(): any[] {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('thinkup_mock_db_users');
      if (stored) return JSON.parse(stored);
      
      // Khởi tạo từ file mock nếu chưa có
      localStorage.setItem('thinkup_mock_db_users', JSON.stringify(INITIAL_MOCK_USERS));
    }
    return INITIAL_MOCK_USERS;
  }

  private addMockUser(user: any): void {
    if (typeof localStorage !== 'undefined') {
      const users = this.getMockUsers();
      users.push(user);
      localStorage.setItem('thinkup_mock_db_users', JSON.stringify(users));
    }
  }
  // ---------------------

  isAuthenticated(): boolean {
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const user = localStorage.getItem('user');
      return !!(token || user);
    }
    return false;
  }

  // TODO: Xóa các Mock này và mở lại HTTP khi Backend đã sẵn sàng
  login(credentials: { email: string; password: string; rememberMe?: boolean }): Observable<AuthResponse> {
    return new Observable<AuthResponse>(observer => {
      setTimeout(() => {
        const users = this.getMockUsers();
        const foundUser = users.find(u => u.email === credentials.email);

        if (!foundUser) {
          observer.error({ status: 401, error: { message: 'Tài khoản không tồn tại' } });
          return;
        }

        if (foundUser.password !== credentials.password) {
          observer.error({ status: 401, error: { message: 'Mật khẩu không đúng' } });
          return;
        }

        observer.next({
          success: true,
          message: 'Đăng nhập thành công',
          user: {
            id: foundUser.id,
            full_name: foundUser.full_name,
            email: foundUser.email,
            role: foundUser.role,
            onboarding_completed: foundUser.onboarding_completed
          },
          token: 'mock-jwt-token'
        });
        observer.complete();
      }, 800);
    }).pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Đăng nhập thông qua Google OAuth 2.0 (G1-G3, AC-10, EX-AUTH-03)
   */
  loginWithGoogle(): Observable<AuthResponse> {
    return new Observable<AuthResponse>(observer => {
      setTimeout(() => {
        observer.next({
          success: true,
          message: 'Đăng nhập thành công',
          user: {
            id: 'mock-id-gg',
            full_name: 'Học viên (Google)',
            email: 'student_google@thinkup.vn',
            role: 'student',
            onboarding_completed: false
          },
          token: 'mock-jwt-token'
        });
        observer.complete();
      }, 800);
    }).pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Đăng nhập thông qua Facebook (F1-F3, AC-11, EX-AUTH-03, EX-AUTH-04)
   */
  loginWithFacebook(additionalEmail?: string): Observable<AuthResponse> {
    return new Observable<AuthResponse>(observer => {
      setTimeout(() => {
        if (!additionalEmail) {
          // Giả lập lỗi thiếu email
          observer.error({ status: 400, error: { errorCode: 'MISSING_EMAIL', message: 'Tài khoản Facebook chưa có email' } });
          return;
        }
        observer.next({
          success: true,
          message: 'Đăng nhập thành công',
          user: {
            id: 'mock-id-fb',
            full_name: 'Học viên (Facebook)',
            email: additionalEmail,
            role: 'student',
            onboarding_completed: false
          },
          token: 'mock-jwt-token'
        });
        observer.complete();
      }, 800);
    }).pipe(catchError(this.handleError.bind(this)));
  }

  signUp(data: { fullName: string; phone: string; email: string; password: string }): Observable<AuthResponse> {
    return new Observable<AuthResponse>(observer => {
      setTimeout(() => {
        const users = this.getMockUsers();
        if (users.find(u => u.email === data.email) || data.email === 'test@gmail.com') {
          observer.error({ status: 409, error: { message: 'Email đã tồn tại' } });
          return;
        }

        const newUser = {
          id: 'mock-id-new-' + Date.now(),
          full_name: data.fullName,
          email: data.email,
          password: data.password, // Lưu tạm mock pass để test login
          phone: data.phone,
          role: 'student',
          onboarding_completed: false
        };

        this.addMockUser(newUser);

        observer.next({
          success: true,
          message: 'Đăng ký thành công',
          user: {
            id: newUser.id,
            full_name: newUser.full_name,
            email: newUser.email,
            role: newUser.role as any,
            onboarding_completed: newUser.onboarding_completed
          },
          token: 'mock-jwt-token'
        });
        observer.complete();
      }, 800);
    }).pipe(catchError(this.handleError.bind(this)));
  }

  forgotPassword(contact: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/forgot-password`, { contact }).pipe(
      catchError(this.handleError)
    );
  }

  verifyOtp(email: string, otp: string, purpose: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/verify-otp`, { email, otp, purpose }).pipe(
      catchError(this.handleError)
    );
  }

  resendOtp(email: string, purpose: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/resend-otp`, { email, purpose }).pipe(
      catchError(this.handleError)
    );
  }

  resetPassword(token: string, password: string, confirmPassword: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/reset-password`, { token, password, confirmPassword }).pipe(
      catchError(this.handleError)
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
    customErr.retryAfter = retryAfter;
    return throwError(() => customErr);
  }
}
