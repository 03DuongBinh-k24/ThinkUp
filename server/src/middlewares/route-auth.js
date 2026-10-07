import { getServerSession } from 'next-auth/next';
import { authOptions } from '../config/auth.config.js';
import { getTokenFromRequest, verifyToken } from '../utils/jwt.util.js';
import { apiError } from '../utils/response.util.js';

export async function getRequestUser(request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    return {
      id: String(session.user.id),
      email: session.user.email || '',
      role: session.user.role || 'student',
    };
  }

  const token = getTokenFromRequest(request);
  if (!token) return null;
  const payload = verifyToken(token);
  return {
    id: String(payload.sub),
    email: payload.email || '',
    role: payload.role || 'student',
  };
}

export async function requireRequestUser(request, allowedRoles = []) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return { user: null, errorResponse: apiError('Chưa đăng nhập.', 401) };
    }
    if (allowedRoles.length && !allowedRoles.includes(user.role)) {
      return { user: null, errorResponse: apiError('Bạn không có quyền truy cập tài nguyên này.', 403) };
    }
    return { user, errorResponse: null };
  } catch (error) {
    return { user: null, errorResponse: apiError(error.message || 'Phiên đăng nhập không hợp lệ.', 401) };
  }
}

export const requireInstructor = (request) => requireRequestUser(request, ['instructor']);
