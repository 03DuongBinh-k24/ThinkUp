import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Guard ngăn chặn học viên đã đăng nhập truy cập vào các trang xác thực (login, sign-up...).
 * Nếu đã có phiên làm việc -> Tự động chuyển hướng về trang chủ / hoặc danh sách khóa học (EX-AUTH-05).
 */
export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);

  if (typeof localStorage === 'undefined') return true;

  const isLoggedIn = localStorage.getItem('thinkup_user_logged_in') === 'true' ||
                     !!localStorage.getItem('access_token') ||
                     !!localStorage.getItem('token');

  if (isLoggedIn) {
    // Đã đăng nhập -> Điều hướng về /main/courses hoặc /
    router.navigate(['/main/courses']);
    return false;
  }

  return true;
};
