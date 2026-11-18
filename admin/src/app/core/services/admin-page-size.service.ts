import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Số dòng mỗi trang mặc định khi chưa đọc được cấu hình hệ thống. */
export const DEFAULT_LIST_PAGE_SIZE = 8;

interface SystemSettingsResponse {
  parameters?: { orders_per_page?: number };
}

/**
 * Số dòng mỗi trang của bảng Admin, đọc từ cấu hình hệ thống thật.
 *
 * Backend lưu tham số `parameters.orders_per_page` trong `GET /admin/system/settings`
 * (`server/src/admin/system/settings.admin.js`). Đây là tham số vận hành duy nhất liên quan
 * tới số dòng hiển thị, nên dùng nó cho page size của các bảng danh sách thay vì hard-code.
 *
 * Lưu ý:
 * - Endpoint settings chỉ cho vai trò SA. Vai trò khác nhận 403 → giữ mặc định 8 và không chặn
 *   trang; đây là fallback cấu hình, không phải fallback dữ liệu nghiệp vụ.
 * - Preferences cá nhân (`/admin/preferences`) không có trường page size.
 */
@Injectable({ providedIn: 'root' })
export class AdminPageSizeService {
  private readonly http = inject(HttpClient);
  private readonly state = signal(DEFAULT_LIST_PAGE_SIZE);
  private readonly loaded = signal(false);

  /** Page size hiện hành; template dùng trực tiếp giá trị này. */
  readonly pageSize = this.state.asReadonly();
  readonly isLoaded = this.loaded.asReadonly();

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      const settings = await firstValueFrom(
        this.http.get<SystemSettingsResponse>(`${environment.apiUrl}/admin/system/settings`)
      );
      const value = Number(settings?.parameters?.orders_per_page);
      if (Number.isInteger(value) && value >= 1 && value <= 100) this.state.set(value);
    } catch {
      // 403 với CA/FA/CS hoặc lỗi mạng: giữ mặc định 8, không chặn bảng.
    } finally {
      this.loaded.set(true);
    }
  }
}
