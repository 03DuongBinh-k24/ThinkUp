import jwt from 'jsonwebtoken';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET bắt buộc phải được cấu hình trong production.');
  }
  return 'thinkup-secret-development-only';
}
export function signToken(payload, expiresIn = JWT_EXPIRES_IN) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
}
export function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
    throw new Error('Token không hợp lệ.');
  }
}
export function getTokenFromRequest(req) {
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)thinkup_token=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}
export function signResetToken(email, purpose = 'reset_password') {
  return jwt.sign({ email, purpose }, getJwtSecret(), { expiresIn: '15m' });
}
export function verifyResetToken(token, expectedPurpose) {
  const payload = verifyToken(token);
  if (payload.purpose !== expectedPurpose) {
    throw new Error('Token không hợp lệ.');
  }
  return payload;
}
