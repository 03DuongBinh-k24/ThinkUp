import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { OnboardingService } from '../services/onboarding.service';
import { AuthService } from '../services/auth.service';
import { catchError, map, of } from 'rxjs';

/**
 * Route Guard ép buộc hoàn thành khảo sát (AC-ONB-01):
 * Nếu người dùng đã đăng nhập và chưa hoàn thành Onboarding (onboarding_completed == false),
 * tự động chuyển hướng về trang /onboarding.
 */
export const onboardingRequiredGuard: CanActivateChildFn = () => {
  const router = inject(Router);
  const onboardingService = inject(OnboardingService);
  const auth = inject(AuthService);
  if (!auth.getToken()) return true;
  return auth.validateSession().pipe(
    map(valid => valid && onboardingService.getCurrentUser()?.role === 'student' && !onboardingService.isOnboardingCompleted()
      ? router.createUrlTree(['/onboarding']) : true),
    catchError(() => of(true))
  );
};

/**
 * Route Guard ngăn học viên truy cập lặp lại trang khảo sát (AC-ONB-02):
 * Nếu học viên đã hoàn thành khảo sát (onboarding_completed == true),
 * khi tự gõ link /onboarding sẽ tự động bị chuyển hướng về /main/home.
 */
export const onboardingCompletedGuard: CanActivateFn = () => {
  const router = inject(Router);
  const onboardingService = inject(OnboardingService);
  const auth = inject(AuthService);
  const loginUrl = router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: '/onboarding' } });
  if (!auth.getToken()) return loginUrl;
  return auth.validateSession().pipe(
    map(valid => {
      if (!valid || !onboardingService.getCurrentUser()) return loginUrl;
      if (onboardingService.getCurrentUser()?.role !== 'student' || onboardingService.isOnboardingCompleted()) {
        return router.createUrlTree(['/main/home']);
      }
      return true;
    }),
    catchError(() => of(auth.isAuthenticated() ? true : loginUrl))
  );
};
