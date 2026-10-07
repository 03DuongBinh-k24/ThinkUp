import bcrypt from 'bcryptjs';
import {
  findUserByEmail,
  findUserById,
  findUserByPhone,
  createLocalUser,
  updateFailedLoginAttempts,
  resetLoginAttempts,
  activateUserByEmail,
  updatePassword,
  upsertOAuthUser,
} from '../models/user.model.js';
import {
  findValidOtp,
  markOtpUsed,
  deleteOtpByEmailPurpose,
  createOtp,
  findRecentOtp,
  findLatestActiveOtp,
} from '../models/otp.model.js';
import { signToken, signResetToken, verifyToken, verifyResetToken } from '../utils/jwt.util.js';
import { validatePassword, containsPersonalInfo, generateOtp, maskEmail, maskPhone } from '../utils/auth.util.js';
import { sendVerificationEmail, sendWelcomeEmail, sendOtpEmail, sendPasswordChangedEmail, sendEmailUpdatedConfirmation } from './email.service.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;
const OTP_EXPIRE_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
export async function loginWithCredentials(email, password) {
  const user = await findUserByEmail(email.toLowerCase().trim(), 'local');

  if (!user) {
    throw new Error('Email hoặc mật khẩu không chính xác.');
  }
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const minutesLeft = Math.ceil((new Date(user.locked_until) - Date.now()) / 60000);
    const err = new Error(`Tài khoản đã bị khóa tạm thời. Vui lòng thử lại sau ${minutesLeft} phút.`);
    err.code = 'ACCOUNT_LOCKED_TEMP';
    throw err;
  }

  if (user.status === 'locked') {
    const err = new Error('Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.');
    err.code = 'ACCOUNT_LOCKED';
    throw err;
  }
  const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordCorrect) {
    const newFailedAttempts = user.failed_login_attempts + 1;

    if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
      await updateFailedLoginAttempts(user.id, newFailedAttempts, lockedUntil);
      const err = new Error(
        `Đăng nhập sai quá ${MAX_FAILED_ATTEMPTS} lần. Tài khoản bị khóa ${LOCK_DURATION_MINUTES} phút.`
      );
      err.code = 'ACCOUNT_LOCKED_TEMP';
      throw err;
    }

    await updateFailedLoginAttempts(user.id, newFailedAttempts);
    const remaining = MAX_FAILED_ATTEMPTS - newFailedAttempts;
    throw new Error(`Email hoặc mật khẩu không chính xác. Còn ${remaining} lần thử.`);
  }
  if (user.status === 'pending') {
    const err = new Error('Tài khoản chưa được xác thực.');
    err.code = 'ACCOUNT_PENDING';
    err.email = user.email;
    throw err;
  }
  await resetLoginAttempts(user.id);

  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.full_name,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.full_name,
      email: user.email,
      role: user.role,
      avatar: user.avatar_url,
    },
  };
}
export async function registerUser({ fullName, email, phone, password }) {
  if (!fullName?.trim() || !email?.trim() || !password) {
    throw new Error('Vui lòng cung cấp đầy đủ thông tin.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Email không hợp lệ.');
  }

  if (phone) {
    const phoneRegex = /^[0-9]{9,11}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      throw new Error('Số điện thoại không hợp lệ.');
    }
  }
  const pwValidation = validatePassword(password);
  if (!pwValidation.valid) {
    throw new Error(pwValidation.errors[0]);
  }

  if (containsPersonalInfo(password, { name: fullName, email, phone: phone || '' })) {
    throw new Error('Mật khẩu không được chứa thông tin cá nhân (tên, email, SĐT).');
  }
  const existingByEmail = await findUserByEmail(email.toLowerCase());
  if (existingByEmail) {
    const err = new Error('Email này đã được đăng ký. Nếu bạn quên mật khẩu, hãy sử dụng chức năng khôi phục mật khẩu.');
    err.code = 'EMAIL_EXISTS';
    throw err;
  }

  if (phone) {
    const existingByPhone = await findUserByPhone(phone.replace(/\s/g, ''));
    if (existingByPhone) {
      throw new Error('Email hoặc số điện thoại này đã được sử dụng.');
    }
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const normalizedEmail = email.toLowerCase();
  const normalizedPhone = phone?.replace(/\s/g, '') || null;

  await createLocalUser({ fullName: fullName.trim(), email: normalizedEmail, phone: normalizedPhone, passwordHash });
  // Một email/chức năng chỉ có một OTP đang hiệu lực. Dọn mã còn lại để
  // không thể xác thực nhầm bằng email được gửi trước đó.
  await deleteOtpByEmailPurpose(normalizedEmail, 'register');
  const otp = generateOtp();
  await createOtp(normalizedEmail, otp, 'register', OTP_EXPIRE_MINUTES);

  // Chỉ điều hướng người dùng sang màn hình nhập mã sau khi SMTP đã nhận yêu cầu.
  // Tránh trường hợp giao diện báo đã gửi nhưng hộp thư chỉ có mã cũ.
  await sendOtpEmail(normalizedEmail, otp, 'register');

  return {
    message: 'Đăng ký thành công. Vui lòng kiểm tra email để nhận mã OTP.',
    email: normalizedEmail,
  };
}
export async function verifyEmailToken(token) {
  if (!token) throw new Error('Thiếu token xác thực.');

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new Error('Link xác thực không hợp lệ hoặc đã hết hạn.');
  }

  if (payload.purpose !== 'verify_email') {
    throw new Error('Token không hợp lệ.');
  }

  const email = payload.email.toLowerCase();

  const updated = await activateUserByEmail(email);

  const user = await findUserByEmail(email);
  if (!user) throw new Error('Không tìm thấy tài khoản.');
  if (user.status === 'locked') throw new Error('Tài khoản của bạn đã bị khóa.');
  if (updated.affectedRows > 0) {
    sendWelcomeEmail(email, user.full_name).catch((err) =>
      console.error('[Email] Welcome email thất bại:', err.message)
    );
  }

  const autoLoginToken = signToken({ email, purpose: 'auto_login' }, '5m');

  return { message: 'Xác thực thành công', autoLoginToken };
}
export async function sendForgotPasswordOtp(contact) {
  if (!contact?.trim()) {
    throw new Error('Vui lòng nhập email hoặc số điện thoại.');
  }

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim());
  const isPhone = /^[0-9]{9,11}$/.test(contact.replace(/\s/g, ''));

  if (!isEmail && !isPhone) {
    throw new Error('Vui lòng nhập đúng định dạng email hoặc số điện thoại.');
  }

  const user = isEmail
    ? await findUserByEmail(contact.toLowerCase().trim())
    : await findUserByPhone(contact.replace(/\s/g, ''));

  if (!user) throw new Error('Email/SĐT này chưa được đăng ký.');
  if (user.status === 'locked') throw new Error('Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.');
  if (user.provider && user.provider !== 'local') {
    const providerName = user.provider === 'google' ? 'Google' : user.provider === 'facebook' ? 'Facebook' : user.provider;
    const err = new Error(
      `Email này được liên kết với tài khoản ${providerName}. Vui lòng đăng nhập bằng ${providerName} thay vì sử dụng mật khẩu.`
    );
    err.code = 'OAUTH_ACCOUNT';
    err.provider = user.provider;
    throw err;
  }
  await deleteOtpByEmailPurpose(user.email, 'reset_password');

  const otp = generateOtp();
  await createOtp(user.email, otp, 'reset_password', OTP_EXPIRE_MINUTES);

  await sendOtpEmail(user.email, otp, 'reset_password');

  return {
    message: 'Mã OTP đã được gửi về email của bạn.',
    email: user.email,
    maskedEmail: maskEmail(user.email),
    maskedPhone: user.phone ? maskPhone(user.phone) : null,
  };
}
export async function verifyOtp({ email, otp, purpose }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedOtp = String(otp || '').replace(/\s|[\u200B-\u200D\uFEFF]/g, '');
  if (!normalizedEmail || !normalizedOtp || !purpose) {
    throw new Error('Thiếu thông tin xác thực.');
  }

  if (!['register', 'reset_password'].includes(purpose)) {
    throw new Error('Mục đích không hợp lệ.');
  }

  if (!/^\d{6}$/.test(normalizedOtp)) {
    const err = new Error('Mã OTP phải gồm đúng 6 chữ số.');
    err.code = 'OTP_INVALID_FORMAT';
    throw err;
  }

  const otpRecord = await findValidOtp(normalizedEmail, normalizedOtp, purpose);

  if (!otpRecord) {
    const latestOtp = await findLatestActiveOtp(normalizedEmail, purpose);
    const err = new Error(
      latestOtp
        ? 'Mã OTP không khớp. Vui lòng chỉ sử dụng mã trong email mới nhất.'
        : 'Mã OTP đã hết hạn hoặc không còn hiệu lực. Vui lòng yêu cầu một mã mới.'
    );
    err.code = latestOtp ? 'OTP_INVALID' : 'OTP_EXPIRED';
    throw err;
  }

  const consumed = await markOtpUsed(otpRecord.id);
  if (!consumed.affectedRows) {
    const err = new Error('Mã OTP này đã được sử dụng hoặc không còn hiệu lực.');
    err.code = 'OTP_ALREADY_USED';
    throw err;
  }

  if (purpose === 'register') {
    const updated = await activateUserByEmail(normalizedEmail);
    if (updated.affectedRows === 0) {
      throw new Error('Tài khoản không tìm thấy hoặc đã được kích hoạt.');
    }

    const user = await findUserByEmail(normalizedEmail);
    if (user) {
      sendWelcomeEmail(normalizedEmail, user.full_name).catch((err) =>
        console.error('[Email] Welcome email thất bại:', err.message)
      );
    }

    const autoLoginToken = signToken({ email: normalizedEmail, purpose: 'auto_login' }, '5m');
    return { message: 'Xác thực thành công! Tài khoản đã được kích hoạt.', autoLoginToken };
  }

  if (purpose === 'reset_password') {
    const resetToken = signResetToken(normalizedEmail, 'reset_password');
    return { message: 'Xác thực OTP thành công.', resetToken };
  }
}
export async function resendOtp(email, purpose) {
  if (!email?.trim() || !purpose) throw new Error('Thiếu thông tin.');
  if (!['register', 'reset_password'].includes(purpose)) throw new Error('Mục đích không hợp lệ.');

  const user = await findUserByEmail(email.toLowerCase());
  if (!user) throw new Error('Email này chưa được đăng ký.');
  const recentOtp = await findRecentOtp(email.toLowerCase(), purpose);
  if (recentOtp) {
    const secondsSinceCreated = (Date.now() - new Date(recentOtp.created_at).getTime()) / 1000;
    const secondsLeft = Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceCreated);
    if (secondsLeft > 0) {
      const err = new Error(`Vui lòng đợi ${secondsLeft} giây trước khi gửi lại mã.`);
      err.code = 'RATE_LIMITED';
      err.retryAfter = secondsLeft;
      throw err;
    }
  }
  await deleteOtpByEmailPurpose(email.toLowerCase(), purpose);

  const otp = generateOtp();
  await createOtp(email.toLowerCase(), otp, purpose, OTP_EXPIRE_MINUTES);

  await sendOtpEmail(email.toLowerCase(), otp, purpose);

  return { message: 'Mã OTP mới đã được gửi vào email của bạn.' };
}

export async function resendPendingRegistrationOtp(email) {
  const user = await findUserByEmail(String(email || '').toLowerCase().trim(), 'local');
  if (!user || user.status !== 'pending') {
    const err = new Error('Tài khoản này không cần xác thực lại.');
    err.code = 'ACCOUNT_NOT_PENDING';
    throw err;
  }
  try {
    return await resendOtp(user.email, 'register');
  } catch (error) {
    if (error.code === 'RATE_LIMITED') {
      return { message: 'Mã xác thực trước đó vẫn còn hiệu lực. Vui lòng kiểm tra email.' };
    }
    throw error;
  }
}
export async function resetPassword({ token, password, confirmPassword }) {
  if (!token || !password || !confirmPassword) {
    throw new Error('Thiếu thông tin. Vui lòng thử lại từ đầu.');
  }
  let payload;
  try {
    payload = verifyResetToken(token, 'reset_password');
  } catch {
    throw new Error('Liên kết đặt lại mật khẩu đã hết hạn hoặc không hợp lệ. Vui lòng thử lại.');
  }

  if (password !== confirmPassword) {
    throw new Error('Mật khẩu xác nhận không khớp.');
  }

  const pwValidation = validatePassword(password);
  if (!pwValidation.valid) throw new Error(pwValidation.errors[0]);

  const user = await findUserByEmail(payload.email);
  if (!user) throw new Error('Tài khoản không tồn tại.');
  if (user.status === 'locked') throw new Error('Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.');

  if (containsPersonalInfo(password, { name: user.full_name, email: user.email, phone: user.phone || '' })) {
    throw new Error('Mật khẩu không được chứa thông tin cá nhân (tên, email, SĐT).');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await updatePassword(user.id, passwordHash);

  sendPasswordChangedEmail(payload.email, user.full_name).catch((err) =>
    console.error('[Email] Password changed email thất bại:', err.message)
  );

  return { message: 'Mật khẩu đã được cập nhật thành công.' };
}
export async function getCurrentUser(userId) {

  const user = await findUserById(userId);
  if (!user) throw new Error('Tài khoản không tồn tại.');
  if (user.status === 'locked') throw new Error('Tài khoản đã bị khóa.');

  return {
    id: user.id,
    name: user.full_name,
    email: user.email,
    role: user.role,
    avatar: user.avatar_url,
  };
}
export async function handleOAuthSignIn({ email, name, provider, providerId, avatar }) {
  await upsertOAuthUser({ email, name, provider, providerId, avatar });
}
export async function autoLoginAfterVerification(autoLoginToken) {
  const payload = verifyToken(autoLoginToken);
  if (payload.purpose !== 'auto_login') throw new Error('Token không hợp lệ.');

  const user = await findUserByEmail(payload.email);
  if (!user) throw new Error('Tài khoản không tồn tại.');
  if (user.status !== 'active') throw new Error('Tài khoản chưa được kích hoạt hoặc đã bị khóa.');

  return {
    id: user.id,
    name: user.full_name,
    email: user.email,
    role: user.role,
    status: user.status,
    image: user.avatar_url,
  };
}
