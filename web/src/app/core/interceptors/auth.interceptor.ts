import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = typeof window === 'undefined' ? null :
    sessionStorage.getItem('access_token') || localStorage.getItem('access_token');
  if (token && req.url.startsWith(`${environment.apiUrl}/`)) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }
  return next(req);
};
