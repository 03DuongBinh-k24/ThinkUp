import { HttpErrorResponse } from '@angular/common/http';

/**
 * Lỗi API đã chuẩn hoá để mọi màn hình hiển thị cùng một kiểu thông điệp.
 *
 * TODO(api-contract): danh sách `code` lấy từ handoff trong `docs/handoff` và
 * `server/src/server.js` (error handler). Khi backend thêm mã mới, bổ sung ở đây
 * thay vì rải chuỗi thông điệp trong component.
 */
export interface AdminApiError {
  status: number;
  code: string;
  message: string;
  /** Có thể bấm "Thử lại" — lỗi mạng, 429, 5xx. */
  retryable: boolean;
}

const CODE_MESSAGES: Readonly<Record<string, string>> = {
  ADMIN_FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  NETWORK_ERROR: 'Không kết nối được máy chủ. Vui lòng kiểm tra đường truyền và thử lại.',
  AUDIT_UNAVAILABLE: 'Không ghi được nhật ký kiểm toán nên thao tác bị huỷ. Vui lòng thử lại.',
  PROFILE_BUSY: 'Hồ sơ đang được Admin khác xử lý. Vui lòng thử lại sau.',
  PROFILE_LEASE_EXPIRED: 'Phiên giữ hồ sơ đã hết hạn. Vui lòng mở lại hồ sơ.',
  VOUCHER_DUPLICATE: 'Mã voucher đã tồn tại.',
  VOUCHER_CHANGED: 'Voucher vừa được người khác cập nhật. Dữ liệu đã được tải lại, vui lòng kiểm tra lại.',
  VOUCHER_STATE: 'Trạng thái voucher không cho phép thao tác này.',
  VOUCHER_NOT_FOUND: 'Không tìm thấy voucher.',
  VOUCHER_UNAVAILABLE: 'Voucher không còn khả dụng.',
  ORDER_NOT_FOUND: 'Không tìm thấy đơn hàng.',
  ORDER_QUERY_INVALID: 'Bộ lọc đơn hàng không hợp lệ.',
  PAYOUT_NOT_FOUND: 'Không tìm thấy yêu cầu rút tiền.',
  PAYOUT_STATE_CONFLICT: 'Trạng thái yêu cầu rút tiền đã thay đổi. Vui lòng tải lại.',
  PAYOUT_SUPER_ADMIN_REQUIRED: 'Khoản từ 20 triệu trở lên chỉ Super Admin được duyệt.',
  PAYOUT_HOLD_UNVERIFIED: 'Yêu cầu thật chưa có khoản giữ được xác minh.',
  PAYOUT_BALANCE_UNAVAILABLE: 'Số dư ví giảng viên không khả dụng.',
  PAYOUT_TAX_POLICY_UNVERIFIED: 'Hồ sơ thuế chưa được xác minh.',
  PAYOUT_STORAGE_UNAVAILABLE: 'Không ghi được dữ liệu chi trả. Vui lòng thử lại.',
  USER_NOT_FOUND: 'Không tìm thấy tài khoản.',
  STUDENT_NOT_FOUND: 'Không tìm thấy học viên.',
  LECTURER_PROFILE_NOT_FOUND: 'Không tìm thấy hồ sơ giảng viên.',
  LECTURER_STATE_CONFLICT: 'Trạng thái hồ sơ giảng viên không cho phép thao tác này.',
  LEGAL_REQUIREMENTS_INCOMPLETE: 'Hồ sơ pháp lý chưa đủ điều kiện để kích hoạt.',
  COURSE_SCOPE_INVALID: 'Danh sách khoá học không thuộc giảng viên này.',
  EVIDENCE_INVALID: 'Tệp minh chứng không hợp lệ (chỉ nhận PNG, JPG, PDF).',
  EVIDENCE_TOO_LARGE: 'Tệp minh chứng vượt quá dung lượng cho phép.',
  EVIDENCE_NOT_FOUND: 'Không tìm thấy minh chứng.',
  AUDIT_LOG_NOT_FOUND: 'Không tìm thấy bản ghi kiểm toán.',
  DASHBOARD_INVALID: 'Tham số dashboard không hợp lệ.',
  ADMIN_FORBIDDEN_ROLE: 'Vai trò của bạn không được phép truy cập phân hệ này.'
};

interface ApiErrorBody {
  message?: string;
  code?: string;
  error?: { message?: string; code?: string } | string;
}

/** Chuyển mọi lỗi HttpClient/lạ thành `AdminApiError`. */
export function toAdminApiError(error: unknown, fallback = 'Không tải được dữ liệu. Vui lòng thử lại.'): AdminApiError {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return {
        status: 0,
        code: 'NETWORK_ERROR',
        message: CODE_MESSAGES['NETWORK_ERROR'],
        retryable: true
      };
    }

    const body = (typeof error.error === 'string' ? null : error.error) as ApiErrorBody | null;
    const nested = body && typeof body.error === 'object' ? body.error : null;
    const code = body?.code || nested?.code || `HTTP_${error.status}`;
    const message = CODE_MESSAGES[code]
      || body?.message
      || nested?.message
      || (typeof error.error === 'string' && error.error.trim() ? error.error.trim() : '')
      || fallback;

    return {
      status: error.status,
      code,
      message,
      retryable: error.status === 0 || error.status === 429 || error.status >= 500
    };
  }

  if (error instanceof Error && error.message) {
    return { status: 0, code: 'UNKNOWN', message: error.message, retryable: false };
  }

  return { status: 0, code: 'UNKNOWN', message: fallback, retryable: false };
}

/** Tiện dụng cho component: chỉ cần chuỗi thông điệp. */
export function apiErrorMessage(error: unknown, fallback?: string): string {
  return toAdminApiError(error, fallback).message;
}
