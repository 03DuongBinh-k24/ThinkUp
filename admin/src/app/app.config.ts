import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { provideUserManagementDataSource } from './features/users/data/user-management.providers';
import { provideBusinessStore } from './features/business/services/business.providers';
import { provideDashboardStore } from './features/dashboard/services/dashboard.providers';
import { SupportDemoService } from './features/support/services/support-demo.service';
import { SupportHttpService } from './features/support/services/support-http.service';
import { environment } from '../environments/environment';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideUserManagementDataSource(),
    provideBusinessStore(),
    provideDashboardStore(),
    { provide: SupportDemoService, useClass: environment.adminDataSource === 'http' ? SupportHttpService : SupportDemoService }
  ]
};
