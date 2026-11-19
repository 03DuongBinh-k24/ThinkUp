/**
 * Chế độ nguồn dữ liệu nghiệp vụ của Admin.
 *
 * - `http`: gọi Admin API thật (`/api/admin/...`), dùng mapper trong
 *   `features/<module>/data|services/*-http*`.
 * - `mock`: dùng adapter demo trong `core/data/mock` để dựng UI khi backend không chạy.
 *
 * Đổi cờ này là đủ để chuyển toàn bộ app; component không phụ thuộc trực tiếp vào cờ.
 */
export type AdminDataSourceMode = 'http' | 'mock';

const dataSource = 'http' as AdminDataSourceMode;

export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api',
  /** Nguồn dữ liệu nghiệp vụ — xem `AdminDataSourceMode`. */
  adminDataSource: dataSource,
  // TODO(pre-deploy): tắt cờ này khi backend đã cấp tài khoản role 'admin' thật.
  adminDemoLogin: dataSource === 'mock',
  /**
   * TODO(pre-deploy): xoá nhánh demo khi backend hỗ trợ 2FA và hạn xoay vòng mật khẩu.
   * Chỉ dùng để dựng/kiểm thử luồng thiết kế ở môi trường local.
   */
  adminDemoAuthFlow: {
    twoFactorEnabled: true,
    twoFactorCode: '123456',
    /** Số ngày còn lại tới khi mật khẩu hết hạn; null = không hiện thông báo. */
    passwordDaysLeft: 5 as number | null,
    setupRequired: false
  }
};
