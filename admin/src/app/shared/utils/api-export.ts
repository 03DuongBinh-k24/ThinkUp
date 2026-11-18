import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { downloadBlobFile, ExportFormat } from './export-formats';

export interface ServerExportRequest {
  /** URL tuyệt đối của endpoint export, ví dụ `${environment.apiUrl}/admin/business/orders/export`. */
  url: string;
  /** Bộ lọc đang áp dụng trên màn hình. */
  params?: Record<string, string | number | boolean | null | undefined>;
  /** Tên file dự phòng khi backend không trả `Content-Disposition`. */
  fallbackFilename: string;
  format: ExportFormat;
}

/**
 * Gọi endpoint export của backend và lưu file.
 *
 * Ghi chú hợp đồng: các endpoint `/export` nhận `format=csv|excel`.
 * `excel` trả Excel 2003 XML (`.xls`), không phải `.xlsx`.
 * UI vẫn hiển thị lựa chọn `xlsx` nên adapter map `xlsx → excel` và giữ đuôi `.xls`
 * để Excel mở được; đổi nhãn menu nếu BA yêu cầu đúng `.xlsx`.
 */
export async function downloadServerExport(http: HttpClient, request: ServerExportRequest): Promise<void> {
  const params: Record<string, string> = {
    format: request.format === 'csv' ? 'csv' : 'excel'
  };

  for (const [key, value] of Object.entries(request.params ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    params[key] = String(value);
  }

  const response: HttpResponse<Blob> = await firstValueFrom(
    http.get(request.url, {
      params: new HttpParams({ fromObject: params }),
      observe: 'response',
      responseType: 'blob'
    })
  );

  const disposition = response.headers.get('content-disposition') || '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  let filename = match ? decodeURIComponent(match[1]) : '';
  if (!filename) {
    const extension = (response.headers.get('content-type') || '').includes('csv') ? 'csv' : 'xls';
    filename = `${request.fallbackFilename}.${extension}`;
  }

  downloadBlobFile(filename, response.body ?? new Blob());
}

/** Đường dẫn API tương đối trong response (ví dụ `/api/admin/...`) → URL tuyệt đối của backend. */
export function absoluteApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const origin = environment.apiUrl.replace(/\/api\/?$/i, '');
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Tải tệp riêng tư (bằng chứng kỷ luật, tài liệu hồ sơ giảng viên).
 *
 * URL do backend trả về đã nằm trong nhóm `/api/admin/...` nên interceptor auth tự gắn bearer token.
 * Nếu backend không trả `Content-Disposition`, dùng `fallbackFilename`.
 */
export async function downloadPrivateFile(http: HttpClient, url: string, fallbackFilename: string): Promise<void> {
  const response = await firstValueFrom(http.get(absoluteApiUrl(url), {
    observe: 'response',
    responseType: 'blob'
  }));

  const disposition = response.headers.get('content-disposition') || '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  let filename = match ? decodeURIComponent(match[1]) : '';
  if (!filename) {
    const type = response.headers.get('content-type') || '';
    const extension = type.includes('pdf') ? 'pdf' : type.includes('png') ? 'png' : type.includes('jpeg') ? 'jpg' : 'bin';
    filename = `${fallbackFilename}.${extension}`;
  }

  downloadBlobFile(filename, response.body ?? new Blob());
}
