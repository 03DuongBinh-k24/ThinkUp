import bcrypt from 'bcryptjs';
import { getMongoDb, signJwt, verifyJwt, maskEmail, sendEmail } from './db.js';

const OTP_EXPIRE_DURATION_MS = 5 * 60 * 1000;       // BR-FGT-02: Hạn 5 phút
const RESEND_COOLDOWN_MS = 60 * 1000;               // BR-FGT-02: Cooldown 60s
const MAX_OTP_FAILED_ATTEMPTS = 5;                  // BR-FGT-03: Nhập sai 5 lần hủy OTP

export function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Bước 1: Yêu cầu mã OTP khôi phục mật khẩu.
 * BR-FGT-01: Chống dò tài khoản (Account Enumeration) - Không báo lỗi nếu email không tồn tại.
 */
export async function sendForgotPasswordOtp({ email }, options = {}) {
  const db = options.db || await getMongoDb();

  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    const err = new Error('Email không đúng định dạng (vd: example@gmail.com).');
    err.status = 400;
    throw err;
  }

  const user = await db.collection('users').findOne({ email: normalizedEmail });

  // Kiểm tra thời gian đếm ngược 60s (Cooldown)
  const recentOtp = await db.collection('otps').findOne({
    email: normalizedEmail,
    purpose: 'reset_password',
    created_at: { $gt: new Date(Date.now() - RESEND_COOLDOWN_MS) },
  });

  if (recentOtp) {
    const secondsLeft = Math.ceil((new Date(recentOtp.created_at).getTime() + RESEND_COOLDOWN_MS - Date.now()) / 1000);
    const err = new Error(`Vui lòng chờ ${secondsLeft > 0 ? secondsLeft : 1} giây trước khi yêu cầu gửi lại mã.`);
    err.status = 429;
    throw err;
  }

  const otpCode = generateOtp();
  const masked = maskEmail(normalizedEmail);

  if (user) {
    // Chỉ tạo OTP và gửi email nếu user thực sự có trong hệ thống
    await db.collection('otps').deleteMany({ email: normalizedEmail, purpose: 'reset_password' });
    await db.collection('otps').insertOne({
      email: normalizedEmail,
      otp: otpCode,
      purpose: 'reset_password',
      expires_at: new Date(Date.now() + OTP_EXPIRE_DURATION_MS), // Hạn 5 phút
      attempts: 0,
      used: false,
      created_at: new Date(),
    });

    if (!options.skipEmail) {
      await sendEmail({
        to: normalizedEmail,
        subject: '[ThinkUp] Mã xác thực đặt lại mật khẩu',
        html: `
          <h3>Yêu cầu đặt lại mật khẩu ThinkUp</h3>
          <p>Mã xác thực của bạn gồm 6 chữ số: <b style="font-size:20px;letter-spacing:4px;">${otpCode}</b></p>
          <p>Mã có hiệu lực trong vòng <b>5 phút</b>. Vui lòng không cung cấp mã này cho người khác.</p>
        `,
        text: `Mã xác thực đặt lại mật khẩu của bạn là: ${otpCode}. Hiệu lực 5 phút.`,
      }).catch((e) => console.error('[SMTP Send Error]:', e.message));
    }
  }

  // BR-FGT-01 & AC-02: Phản hồi an toàn trung tính
  return {
    message: 'Nếu email tồn tại trên hệ thống, bạn sẽ nhận được mã xác thực.',
    email: normalizedEmail,
    maskedEmail: masked,
    ...(options.exposeOtp && user ? { testOtp: otpCode } : {}),
  };
}

/**
 * Bước 2: Xác thực mã OTP đặt lại mật khẩu (6 chữ số).
 * BR-FGT-03: Nhập sai tối đa 5 lần. Sai lần 5 -> Hủy OTP và khóa phiên.
 */
export async function verifyForgotPasswordOtp({ email, otp }, options = {}) {
  const db = options.db || await getMongoDb();

  const normalizedEmail = (email || '').trim().toLowerCase();
  const normalizedOtp = (otp || '').trim();

  if (!normalizedEmail || !normalizedOtp) {
    const err = new Error('Vui lòng cung cấp đầy đủ email và mã OTP.');
    err.status = 400;
    throw err;
  }

  const otpRecord = await db.collection('otps').findOne({
    email: normalizedEmail,
    purpose: 'reset_password',
    used: false,
  });

  if (!otpRecord) {
    const err = new Error('Mã xác thực không tồn tại hoặc đã hết hạn.');
    err.status = 400;
    throw err;
  }

  // Kiểm tra thời hạn 5 phút
  if (new Date(otpRecord.expires_at) < new Date()) {
    await db.collection('otps').deleteOne({ _id: otpRecord._id });
    const err = new Error('Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.');
    err.status = 400;
    throw err;
  }

  // So khớp mã OTP
  if (otpRecord.otp !== normalizedOtp) {
    const failedAttempts = (otpRecord.attempts || 0) + 1;
    if (failedAttempts >= MAX_OTP_FAILED_ATTEMPTS) {
      // Hủy OTP sau 5 lần sai (BR-FGT-03)
      await db.collection('otps').deleteOne({ _id: otpRecord._id });
      const err = new Error('Bạn đã nhập sai mã xác thực quá 5 lần. Phiên yêu cầu đã bị hủy, vui lòng thực hiện lại từ đầu.');
      err.status = 403;
      err.code = 'OTP_MAX_ATTEMPTS_EXCEEDED';
      throw err;
    }

    await db.collection('otps').updateOne(
      { _id: otpRecord._id },
      { $set: { attempts: failedAttempts } }
    );

    const err = new Error('Mã xác thực không chính xác. Vui lòng thử lại.');
    err.status = 400;
    err.code = 'OTP_INVALID';
    throw err;
  }

  // Đánh dấu OTP đã xác thực
  await db.collection('otps').updateOne({ _id: otpRecord._id }, { $set: { used: true } });

  // Cấp reset_token tạm thời hạn 10 phút (Bước 3 trong Workflow PDF)
  const resetToken = signJwt(
    { email: normalizedEmail, purpose: 'reset_password_step' },
    '10m'
  );

  return {
    message: 'Xác thực OTP thành công.',
    resetToken,
  };
}

/**
 * Gửi lại mã OTP (Resend OTP).
 */
export async function resendForgotPasswordOtp({ email }, options = {}) {
  return await sendForgotPasswordOtp({ email }, options);
}

/**
 * Bước 3: Thay đổi mật khẩu mới.
 * BR-FGT-04: Mật khẩu tối thiểu 8 ký tự, khớp nhau 100%.
 */
export async function resetPasswordWithToken({ resetToken, newPassword, confirmPassword }, options = {}) {
  const db = options.db || await getMongoDb();

  const payload = verifyJwt(resetToken);
  if (payload.purpose !== 'reset_password_step') {
    const err = new Error('Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
    err.status = 400;
    throw err;
  }

  if (!newPassword || newPassword.length < 8) {
    const err = new Error('Mật khẩu mới bắt buộc tối thiểu từ 8 ký tự trở lên.');
    err.status = 400;
    throw err;
  }

  if (confirmPassword !== undefined && confirmPassword !== newPassword) {
    const err = new Error('Mật khẩu xác nhận không khớp.');
    err.status = 400;
    throw err;
  }

  const newHash = await bcrypt.hash(newPassword.trim(), 12);
  const email = payload.email.toLowerCase();

  await db.collection('users').updateOne(
    { email },
    {
      $set: {
        password_hash: newHash,
        failed_login_attempts: 0,
        locked_until: null,
        status: 'active',
        is_active: true,
        updated_at: new Date(),
      },
    }
  );

  // Hủy các OTP còn lại
  await db.collection('otps').deleteMany({ email, purpose: 'reset_password' });

  return {
    message: 'Thay đổi mật khẩu thành công.',
  };
}
