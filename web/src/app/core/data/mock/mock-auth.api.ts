// TODO(pre-deploy): Nhớ xóa API xác thực giả lập này và thay bằng API backend thật.
import { Observable } from 'rxjs';
import { AuthResponse } from '../../models/user.model';
import { MOCK_GOOGLE_USER, createMockFacebookUser, MockUser } from './mock-users';
import { addMockUser, getMockSocialUser, getMockUsers, toMockLoginUser } from './mock-auth.store';

export function mockLogin(credentials: { email: string; password: string }): Observable<AuthResponse> {
  return new Observable<AuthResponse>(observer => {
    setTimeout(() => {
      const found = getMockUsers().find(user => user.email === credentials.email);
      if (!found) {
        observer.error({ status: 401, error: { message: 'Tài khoản không tồn tại' } });
        return;
      }
      if (found.password !== credentials.password) {
        observer.error({ status: 401, error: { message: 'Mật khẩu không đúng' } });
        return;
      }
      observer.next({ success: true, message: 'Đăng nhập thành công', user: toMockLoginUser(found), token: 'mock-jwt-token' });
      observer.complete();
    }, 800);
  });
}

export function mockLoginWithGoogle(): Observable<AuthResponse> {
  return new Observable<AuthResponse>(observer => {
    setTimeout(() => {
      observer.next({ success: true, message: 'Đăng nhập thành công', user: getMockSocialUser(MOCK_GOOGLE_USER), token: 'mock-jwt-token' });
      observer.complete();
    }, 800);
  });
}

export function mockLoginWithFacebook(email?: string): Observable<AuthResponse> {
  return new Observable<AuthResponse>(observer => {
    setTimeout(() => {
      if (!email) {
        observer.error({ status: 400, error: { errorCode: 'MISSING_EMAIL', message: 'Tài khoản Facebook chưa có email' } });
        return;
      }
      observer.next({ success: true, message: 'Đăng nhập thành công', user: getMockSocialUser(createMockFacebookUser(email)), token: 'mock-jwt-token' });
      observer.complete();
    }, 800);
  });
}

export function mockSignUp(data: { fullName: string; phone: string; email: string; password: string }): Observable<AuthResponse> {
  return new Observable<AuthResponse>(observer => {
    setTimeout(() => {
      if (getMockUsers().some(user => user.email === data.email) || data.email === 'test@gmail.com') {
        observer.error({ status: 409, error: { message: 'Email đã tồn tại' } });
        return;
      }
      const user: MockUser = {
        id: `mock-id-new-${Date.now()}`,
        full_name: data.fullName,
        email: data.email,
        password: data.password,
        phone: data.phone,
        role: 'student',
        onboarding_completed: false,
      };
      addMockUser(user);
      observer.next({ success: true, message: 'Đăng ký thành công', user: toMockLoginUser(user), token: 'mock-jwt-token' });
      observer.complete();
    }, 800);
  });
}

// TODO(pre-deploy): Nhớ xóa các mock API khôi phục mật khẩu này trước khi release và thay bằng backend thật.
export function mockForgotPassword(contact: string): Observable<AuthResponse> {
  return new Observable<AuthResponse>(observer => {
    setTimeout(() => {
      const trimmed = contact.trim().toLowerCase();
      // Giả lập nhận diện tài khoản OAuth demo
      if (trimmed === 'oauth@gmail.com' || trimmed === 'google@gmail.com') {
        observer.error({
          status: 400,
          error: {
            code: 'OAUTH_ACCOUNT',
            provider: 'google',
            message: 'Email này được liên kết với tài khoản Google. Vui lòng đăng nhập bằng Google thay vì sử dụng mật khẩu.'
          }
        });
        return;
      }
      observer.next({
        success: true,
        message: 'Mã OTP đã được gửi về email của bạn.',
        email: contact
      });
      observer.complete();
    }, 600);
  });
}

// TODO(pre-deploy): Nhớ xóa mock xác thực OTP này trước khi release.
export function mockVerifyOtp(email: string, otp: string, purpose: string): Observable<AuthResponse> {
  return new Observable<AuthResponse>(observer => {
    setTimeout(() => {
      if (otp === '000000') {
        observer.error({
          status: 400,
          error: {
            code: 'OTP_EXPIRED',
            message: 'Mã OTP đã hết hạn hoặc không còn hiệu lực. Vui lòng yêu cầu một mã mới.'
          }
        });
        return;
      }
      observer.next({
        success: true,
        message: 'Xác thực OTP thành công.',
        resetToken: 'mock-reset-token-' + Date.now()
      });
      observer.complete();
    }, 600);
  });
}

// TODO(pre-deploy): Nhớ xóa mock gửi lại OTP này trước khi release.
export function mockResendOtp(email: string, purpose: string): Observable<AuthResponse> {
  return new Observable<AuthResponse>(observer => {
    setTimeout(() => {
      observer.next({
        success: true,
        message: 'Mã OTP mới đã được gửi vào email của bạn.'
      });
      observer.complete();
    }, 500);
  });
}

// TODO(pre-deploy): Nhớ xóa mock đặt lại mật khẩu này trước khi release.
export function mockResetPassword(token: string, password: string, confirmPassword: string): Observable<AuthResponse> {
  return new Observable<AuthResponse>(observer => {
    setTimeout(() => {
      if (password !== confirmPassword) {
        observer.error({
          status: 400,
          error: { message: 'Mật khẩu xác nhận không khớp.' }
        });
        return;
      }
      observer.next({
        success: true,
        message: 'Mật khẩu đã được cập nhật thành công.'
      });
      observer.complete();
    }, 700);
  });
}
