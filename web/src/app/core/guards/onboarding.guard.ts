import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { OnboardingService } from '../services/onboarding.service';
import { AuthService } from '../services/auth.service';

/**
 * Route Guard ép buộc hoàn thành khảo sát (AC-ONB-01):
 * Nếu người dùng đã đăng nhập và chưa hoàn thành Onboarding (onboarding_completed == false),
 * tự động chuyển hướng về trang /onboarding.
 */
export const onboardingRequiredGuard: CanActivateChildFn = () => {
  const router = inject(Router);
  const onboardingService = inject(OnboardingService);

  const isLoggedIn = inject(AuthService).isAuthenticated();
  const user = onboardingService.getCurrentUser();

  // Khách vãng lai xem bình thường (không ép buộc)
  if (!isLoggedIn || !user || user.role !== 'student') {
    return true;
  }

  // Học viên đã đăng nhập nhưng chưa hoàn thành khảo sát
  if (!onboardingService.isOnboardingCompleted()) {
    return router.createUrlTree(['/onboarding']);
  }

  return true;
};

/**
 * Route Guard ngăn học viên truy cập lặp lại trang khảo sát (AC-ONB-02):
 * Nếu học viên đã hoàn thành khảo sát (onboarding_completed == true),
 * khi tự gõ link /onboarding sẽ tự động bị chuyển hướng về /main/home.
 */
export const onboardingCompletedGuard: CanActivateFn = () => {
  const router = inject(Router);
  const onboardingService = inject(OnboardingService);

  const isLoggedIn = inject(AuthService).isAuthenticated();
  const user = onboardingService.getCurrentUser();
  if (!isLoggedIn || !user) {
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: '/onboarding' } });
  }

  if (user.role !== 'student' || onboardingService.isOnboardingCompleted()) {
    return router.createUrlTree(['/main/home']);
  }

  return true;
};
