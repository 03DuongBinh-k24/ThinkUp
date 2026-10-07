import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const isLoggedIn = localStorage.getItem('thinkup_user_logged_in') === 'true';

  if (!isLoggedIn) {
    router.navigate(['/auth/login'], { queryParams: { next: state.url } });
    return false;
  }
  return true;
};
