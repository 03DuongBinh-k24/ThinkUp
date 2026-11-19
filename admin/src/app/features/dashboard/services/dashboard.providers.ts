import { Provider } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { DashboardDemoService } from './dashboard-demo.service';
import { DashboardHttpService } from './dashboard-http.service';
import { DASHBOARD_STORE } from './dashboard.store';

/**
 * Nguồn dữ liệu Dashboard.
 *
 * `environment.adminDataSource` chọn Admin API thật hoặc dữ liệu demo; component chỉ inject
 * `DASHBOARD_STORE` nên không phụ thuộc lựa chọn này.
 */
export function provideDashboardStore(): Provider {
  return {
    provide: DASHBOARD_STORE,
    useFactory: () => environment.adminDataSource === 'http'
      ? new DashboardHttpService()
      : new DashboardDemoService()
  };
}
