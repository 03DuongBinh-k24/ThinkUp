import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { OnboardingService } from '../services/onboarding.service';

/**
 * Route Guard ép buộc hoàn thành khảo sát (AC-ONB-01):
 * Nếu người dùng đã đăng nhập và chưa hoàn thành Onboarding (onboarding_completed == false),
 * tự động chuyển hướng về trang /onboarding.
 */
export const onboardingRequiredGuard: CanActivateFn = () => {
  const router = inject(Router);
  const onboardingService = inject(OnboardingService);

  const isLoggedIn = typeof localStorage !== 'undefined' && localStorage.getItem('thinkup_user_logged_in') === 'true';

  // Khách vãng lai xem bình thường (không ép buộc)
  if (!isLoggedIn) {
    return true;
  }

  // Học viên đã đăng nhập nhưng chưa hoàn thành khảo sát
  if (!onboardingService.isOnboardingCompleted()) {
    router.navigate(['/onboarding']);
    return false;
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

  if (onboardingService.isOnboardingCompleted()) {
    router.navigate(['/main/home']);
    return false;
  }

  return true;
};
