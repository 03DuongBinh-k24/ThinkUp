import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Guard ngăn chặn học viên đã đăng nhập truy cập vào các trang xác thực (login, sign-up...).
 * Nếu đã có phiên làm việc -> Tự động chuyển hướng về trang chủ / hoặc danh sách khóa học (EX-AUTH-05).
 */
export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  if (!auth.getToken()) return true;
  return auth.validateSession().pipe(
    map(valid => valid
      ? router.createUrlTree([auth.currentUser()?.role === 'student' && !auth.currentUser()?.onboarding_completed ? '/onboarding' : '/main/home'])
      : true),
    catchError(() => of(true))
  );
};
