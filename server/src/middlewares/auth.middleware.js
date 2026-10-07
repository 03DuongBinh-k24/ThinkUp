import { getTokenFromRequest, verifyToken } from '../utils/jwt.util.js';
import { apiError } from '../utils/response.util.js';
export function authenticate(req) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return {
        user: null,
        errorResponse: apiError('Chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.', 401),
      };
    }

    const user = verifyToken(token);
    return { user, errorResponse: null };
  } catch (err) {
    return {
      user: null,
      errorResponse: apiError(err.message || 'Token không hợp lệ.', 401),
    };
  }
}
export function authorize(user, allowedRoles = []) {
  if (!allowedRoles.length) return { authorized: true, errorResponse: null };

  if (!allowedRoles.includes(user.role)) {
    return {
      authorized: false,
      errorResponse: apiError('Bạn không có quyền truy cập tài nguyên này.', 403),
    };
  }

  return { authorized: true, errorResponse: null };
}
