import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard ngăn chặn học viên đã đăng nhập truy cập vào các trang xác thực (login, sign-up...).
 * Nếu đã có phiên làm việc -> Tự động chuyển hướng về trang chủ / hoặc danh sách khóa học (EX-AUTH-05).
 */
export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);

  const isLoggedIn = inject(AuthService).isAuthenticated();

  if (isLoggedIn) {
    // Đã đăng nhập -> Điều hướng về /main/courses hoặc /
    router.navigate(['/main/courses']);
    return false;
  }

  return true;
};
