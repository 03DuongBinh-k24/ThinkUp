import {
  loginWithCredentials,
  registerUser,
  verifyEmailToken,
  sendForgotPasswordOtp,
  verifyOtp,
  resendOtp,
  resendPendingRegistrationOtp,
  resetPassword,
  getCurrentUser,
} from '../services/auth.service.js';
import { apiSuccess, apiError, buildSetCookie, buildClearCookie } from '../utils/response.util.js';
import { getTokenFromRequest, verifyToken } from '../utils/jwt.util.js';
import { isDatabaseConnectionError } from '../../../src/lib/mysql-config.js';
export async function login(req) {
  try {
    const { email, password } = await req.json();

    if (!email?.trim() || !password) {
      return apiError('Vui lòng nhập email và mật khẩu.', 400);
    }

    const { token, user } = await loginWithCredentials(email, password);

    const res = apiSuccess({ user });
    res.headers.set('Set-Cookie', buildSetCookie(token));
    return res;
  } catch (err) {
    if (isDatabaseConnectionError(err) || err.message?.startsWith('Thiếu cấu hình MySQL')) {
      console.error('[Auth Login] Database unavailable:', err.message);
      return apiError('Máy chủ chưa kết nối được cơ sở dữ liệu. Vui lòng kiểm tra cấu hình MySQL trên Vercel.', 503, {
        code: 'DB_UNAVAILABLE',
      });
    }
    const status = err.code === 'ACCOUNT_PENDING' ? 403
      : err.code === 'ACCOUNT_LOCKED_TEMP' ? 403
      : err.code === 'ACCOUNT_LOCKED' ? 403
      : err.message.includes('không chính xác') ? 401
      : 400;

    return apiError(err.message, status, err.code ? { code: err.code, email: err.email } : {});
  }
}
export async function register(req) {
  try {
    const body = await req.json();
    const { fullName, phone, email, password } = body;

    const result = await registerUser({ fullName, email, phone, password });
    return apiSuccess(result, 201);
  } catch (err) {
    if (isDatabaseConnectionError(err) || err.message?.startsWith('Thiếu cấu hình MySQL')) {
      console.error('[Auth Register] Database unavailable:', err.message);
      return apiError('Máy chủ chưa kết nối được cơ sở dữ liệu. Vui lòng kiểm tra cấu hình MySQL trên Vercel.', 503, {
        code: 'DB_UNAVAILABLE',
      });
    }
    if (err.code === 'EMAIL_EXISTS') {
      return apiError(err.message, 409, { code: 'EMAIL_EXISTS' });
    }
    const status = err.message.includes('đã được sử dụng') ? 409 : 400;
    return apiError(err.message, status);
  }
}
export async function logout() {
  try {
    const res = apiSuccess({ message: 'Đăng xuất thành công.' });
    res.headers.set('Set-Cookie', buildClearCookie());
    return res;
  } catch (err) {
    console.error('[Logout]', err);
    return apiError('Đã có lỗi xảy ra.', 500);
  }
}
export async function getMe(req, nextAuthUserId) {
  try {
    let userId = nextAuthUserId;
    if (!userId) {
      const token = getTokenFromRequest(req);
      if (!token) return apiError('Chưa đăng nhập.', 401);
      const payload = verifyToken(token);
      userId = payload.sub;
    }

    const user = await getCurrentUser(userId);
    return apiSuccess({ user });
  } catch (err) {
    return apiError(err.message || 'Phiên đăng nhập không hợp lệ.', 401);
  }
}
export async function verifyEmail(req) {
  try {
    const { token } = await req.json();
    const result = await verifyEmailToken(token);
    return apiSuccess(result);
  } catch (err) {
    const status = err.message.includes('không tìm thấy') ? 404
      : err.message.includes('bị khóa') ? 403
      : 400;
    return apiError(err.message, status);
  }
}
export async function forgotPassword(req) {
  try {
    const { contact } = await req.json();
    const result = await sendForgotPasswordOtp(contact);
    return apiSuccess(result);
  } catch (err) {
    if (err.code === 'OAUTH_ACCOUNT') {
      return apiError(err.message, 400, { code: 'OAUTH_ACCOUNT', provider: err.provider });
    }
    const status = err.message.includes('chưa được đăng ký') ? 404
      : err.message.includes('bị khóa') ? 403
      : 400;
    return apiError(err.message, status);
  }
}
export async function verifyOtpCode(req) {
  try {
    const body = await req.json();
    const result = await verifyOtp(body);
    return apiSuccess(result);
  } catch (err) {
    const extra = err.code ? { code: err.code } : {};
    return apiError(err.message, 400, extra);
  }
}
export async function resendOtpCode(req) {
  try {
    const { email, purpose } = await req.json();
    const result = await resendOtp(email, purpose);
    return apiSuccess(result);
  } catch (err) {
    if (err.code === 'RATE_LIMITED') {
      return apiError(err.message, 429, { retryAfter: err.retryAfter });
    }
    const status = err.message.includes('chưa được đăng ký') ? 404 : 400;
    return apiError(err.message, status);
  }
}

export async function resendPendingRegistrationOtpCode(req) {
  try {
    const { email } = await req.json();
    const result = await resendPendingRegistrationOtp(email);
    return apiSuccess(result);
  } catch (err) {
    return apiError(err.message, err.code === 'ACCOUNT_NOT_PENDING' ? 400 : 400, err.code ? { code: err.code } : {});
  }
}
export async function resetPasswordHandler(req) {
  try {
    const body = await req.json();
    const result = await resetPassword(body);
    return apiSuccess(result);
  } catch (err) {
    const status = err.message.includes('không tồn tại') ? 404
      : err.message.includes('bị khóa') ? 403
      : 400;
    return apiError(err.message, status);
  }
}
