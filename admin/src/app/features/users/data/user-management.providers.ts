import { Provider } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { USER_DATA_SOURCE } from './user-management.data-source';
import { HttpUserManagementDataSource } from './user-management.http-data-source';
import { MockUserManagementDataSource } from './user-management.mock-data-source';

/**
 * Nguồn dữ liệu của module quản lý người dùng.
 *
 * `environment.adminDataSource` quyết định dùng Admin API thật hay dữ liệu demo; component
 * không biết và không phụ thuộc vào lựa chọn này. Mock chỉ được xoá khi chủ dự án duyệt
 * dọn dẹp trước deploy.
 */
export function provideUserManagementDataSource(): Provider {
  return {
    provide: USER_DATA_SOURCE,
    useFactory: () => environment.adminDataSource === 'http'
      ? new HttpUserManagementDataSource()
      : new MockUserManagementDataSource()
  };
}
