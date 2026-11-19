import { Provider } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { BUSINESS_STORE } from './business.store';
import { BusinessDemoService } from './business-demo.service';
import { BusinessHttpService } from './business-http.service';

/**
 * Nguồn dữ liệu module kinh doanh.
 *
 * `environment.adminDataSource` quyết định dùng Admin API thật hay dữ liệu demo; component chỉ
 * inject `BUSINESS_STORE` nên không phụ thuộc lựa chọn này. Payouts dùng API thật trong chế độ HTTP
 * và dữ liệu demo trong chế độ mock.
 */
export function provideBusinessStore(): Provider {
  return {
    provide: BUSINESS_STORE,
    useFactory: () => environment.adminDataSource === 'http'
      ? new BusinessHttpService()
      : new BusinessDemoService()
  };
}
