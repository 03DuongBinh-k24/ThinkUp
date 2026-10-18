import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const isLoggedIn = inject(AuthService).isAuthenticated();

  if (!isLoggedIn) {
    router.navigate(['/auth/login'], { queryParams: { next: state.url } });
    return false;
  }
  return true;
};
