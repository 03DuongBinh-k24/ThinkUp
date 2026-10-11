import bcrypt from 'bcryptjs';
import { getMongoDb, signJwt, verifyJwt, sendEmail } from './db.js';

const VERIFICATION_TOKEN_EXPIRE = '12h'; // BR-AUTH-06: thời hạn tối đa 12 giờ


export function validateFullName(name) {
  if (!name || typeof name !== 'string') return { valid: false, message: 'Vui lòng nhập họ và tên.' };
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 50) {
    return { valid: false, message: 'Họ và tên phải từ 2 đến 50 ký tự.' };
  }
  // Chỉ cho phép chữ cái tiếng Việt/tiếng Anh và khoảng trắng. Cấm chữ số và ký tự đặc biệt (@, #, $, %...).
  const regex = /^[a-zA-ZÀ-ỹ\s]+$/;
  if (!regex.test(trimmed)) {
    return { valid: false, message: 'Tên không được chứa số hoặc ký tự đặc biệt.' };
  }
  return { valid: true, value: trimmed };
}

export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return { valid: false, message: 'Vui lòng nhập số điện thoại.' };
  const trimmed = phone.trim().replace(/\s/g, '');
  if (!/^[0-9]{10}$/.test(trimmed)) {
    return { valid: false, message: 'Số điện thoại không hợp lệ (phải gồm 10 số).' };
  }
  // Bắt đầu bằng đầu số di động hợp lệ tại Việt Nam (03, 05, 07, 08, 09)
  if (!/^(03|05|07|08|09)/.test(trimmed)) {
    return { valid: false, message: 'Đầu số di động không hợp lệ (phải bắt đầu bằng 03, 05, 07, 08, 09).' };
  }
  return { valid: true, value: trimmed };
}

export function validateEmail(email) {
  if (!email || typeof email !== 'string') return { valid: false, message: 'Vui lòng nhập địa chỉ email.' };
  const trimmed = email.trim();
  if (/\s/.test(trimmed)) return { valid: false, message: 'Email không được chứa khoảng trắng.' };
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(trimmed)) {
    return { valid: false, message: 'Email không đúng định dạng (vd: example@gmail.com).' };
  }
  return { valid: true, value: trimmed.toLowerCase() };
}

export function validatePassword(password) {
  if (!password || typeof password !== 'string') return { valid: false, message: 'Vui lòng nhập mật khẩu.' };
  const trimmed = password.trim();
  if (trimmed.length < 8 || trimmed.length > 64) {
    return { valid: false, message: 'Độ dài mật khẩu phải từ 8 đến 64 ký tự.' };
  }
  if (!/[A-Z]/.test(trimmed)) return { valid: false, message: 'Mật khẩu phải chứa ít nhất 1 chữ hoa (A-Z).' };
  if (!/[a-z]/.test(trimmed)) return { valid: false, message: 'Mật khẩu phải chứa ít nhất 1 chữ thường (a-z).' };
  if (!/[0-9]/.test(trimmed)) return { valid: false, message: 'Mật khẩu phải chứa ít nhất 1 chữ số (0-9).' };
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(trimmed)) {
    return { valid: false, message: 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (!@#$%...).' };
  }
  return { valid: true, value: trimmed };
}

// ─── Xử lý Đăng Ký Tài Khoản Học Viên (Luồng Chính) ───────────────────────────

/**
 * Đăng ký tài khoản học viên qua form 5 trường thông tin + Điều khoản.
 */
export async function registerUser(
  { fullName, phone, email, password, confirmPassword, termsAccepted = true },
  options = {}
) {
  const db = options.db || await getMongoDb();

  // 1. Checkbox Điều khoản (BR-REG-07)
  if (termsAccepted !== true) {
    const err = new Error('Bạn cần đồng ý với Điều khoản và Chính sách để tiếp tục.');
    err.status = 400;
    err.field = 'terms';
    throw err;
  }

  // 2. Họ và tên (BR-REG-02)
  const nameCheck = validateFullName(fullName);
  if (!nameCheck.valid) {
    const err = new Error(nameCheck.message);
    err.status = 400;
    err.field = 'fullName';
    throw err;
  }

  // 3. Số điện thoại (BR-REG-03)
  const phoneCheck = validatePhone(phone);
  if (!phoneCheck.valid) {
    const err = new Error(phoneCheck.message);
    err.status = 400;
    err.field = 'phone';
    throw err;
  }

  // 4. Email (BR-REG-04)
  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) {
    const err = new Error(emailCheck.message);
    err.status = 400;
    err.field = 'email';
    throw err;
  }

  // 5. Mật khẩu (BR-REG-05)
  const pwCheck = validatePassword(password);
  if (!pwCheck.valid) {
    const err = new Error(pwCheck.message);
    err.status = 400;
    err.field = 'password';
    throw err;
  }

  // 6. So khớp chéo Xác nhận mật khẩu (BR-REG-06)
  if (confirmPassword !== undefined && confirmPassword.trim() !== pwCheck.value) {
    const err = new Error('Mật khẩu xác nhận không khớp.');
    err.status = 400;
    err.field = 'confirmPassword';
    throw err;
  }

  // 7. Kiểm tra trùng lặp Email (EX-REG-01, HTTP 409)
  const existingEmail = await db.collection('users').findOne({ email: emailCheck.value });
  if (existingEmail) {
    const err = new Error('Email này đã được sử dụng. Vui lòng đăng nhập hoặc sử dụng email khác để đăng ký!');
    err.status = 409;
    err.code = 'EMAIL_EXISTS';
    err.field = 'email';
    throw err;
  }

  // 8. Kiểm tra trùng lặp Số điện thoại (EX-REG-01, HTTP 409)
  const existingPhone = await db.collection('users').findOne({ phone: phoneCheck.value });
  if (existingPhone) {
    const err = new Error('Số điện thoại này đã được đăng ký!');
    err.status = 409;
    err.code = 'PHONE_EXISTS';
    err.field = 'phone';
    throw err;
  }

  // 9. Băm mật khẩu (bcrypt) và tạo bản ghi Học viên (Vai trò STUDENT, onboarding_completed = false)
  const passwordHash = await bcrypt.hash(pwCheck.value, 12);
  const newUser = {
    full_name: nameCheck.value,
    phone: phoneCheck.value,
    email: emailCheck.value,
    password_hash: passwordHash,
    provider: 'local',
    provider_id: null,
    avatar_url: null,
    role: 'student',                    // Vai trò STUDENT
    status: 'pending',                  // Chờ kích hoạt
    is_active: false,
    email_verified: false,
    email_verified_at: null,
    onboarding_completed: false,        // BR-REG-08: onboarding_completed = false
    failed_login_attempts: 0,
    locked_until: null,
    last_verification_sent_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const insertResult = await db.collection('users').insertOne(newUser);
  const userId = insertResult.insertedId.toString();

  // 10. Tạo Verification Token hiệu lực 12 giờ (BR-AUTH-06)
  const verificationToken = signJwt(
    { sub: userId, email: emailCheck.value, purpose: 'verify_email' },
    VERIFICATION_TOKEN_EXPIRE
  );

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:4200';
  const verificationLink = `${clientUrl}/auth/verify?token=${encodeURIComponent(verificationToken)}`;

  // 11. Gửi email kích hoạt
  if (!options.skipEmail) {
    await sendEmail({
      to: emailCheck.value,
      subject: '[ThinkUp] Xác thực tài khoản học viên của bạn',
      html: `
        <h3>Chào mừng ${nameCheck.value} đến với ThinkUp!</h3>
        <p>Vui lòng bấm vào liên kết bên dưới để kích hoạt tài khoản của bạn (liên kết có hiệu lực trong vòng 12 giờ):</p>
        <p><a href="${verificationLink}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Kích hoạt tài khoản</a></p>
        <p>Hoặc truy cập liên kết: ${verificationLink}</p>
      `,
      text: `Vui lòng truy cập đường link sau để kích hoạt tài khoản ThinkUp: ${verificationLink}`,
    }).catch((e) => console.error('[SMTP Send Error]:', e.message));
  }

  return {
    message: 'Vui lòng bấm vào link xác thực được gửi qua email để kích hoạt tài khoản',
    email: emailCheck.value,
    verificationToken,
    verificationLink,
  };
}

/**
 * Xác nhận liên kết xác thực (Verification Link) để kích hoạt tài khoản.
 */
export async function verifyEmailVerificationToken({ token }, options = {}) {
  const db = options.db || await getMongoDb();
  const payload = verifyJwt(token);

  if (payload.purpose !== 'verify_email') {
    const err = new Error('Mã liên kết xác thực không hợp lệ.');
    err.status = 400;
    throw err;
  }

  const user = await db.collection('users').findOne({ email: payload.email });
  if (!user) {
    const err = new Error('Tài khoản không tồn tại.');
    err.status = 404;
    throw err;
  }

  await db.collection('users').updateOne(
    { _id: user._id },
    {
      $set: {
        status: 'active',
        is_active: true,
        email_verified: true,
        email_verified_at: new Date(),
        updated_at: new Date(),
      },
    }
  );

  return {
    message: 'Kích hoạt tài khoản thành công! Vui lòng đăng nhập để bắt đầu học tập.',
    email: user.email,
  };
}

/**
 * Gửi lại liên kết xác thực tài khoản (Verification Link 12 giờ) khi link cũ hết hạn hoặc thất lạc.
 * Có cơ chế Cooldown 60 giây chống spam.
 */
export async function resendVerificationLink({ email }, options = {}) {
  const db = options.db || await getMongoDb();
  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) {
    const err = new Error(emailCheck.message);
    err.status = 400;
    throw err;
  }

  const user = await db.collection('users').findOne({ email: emailCheck.value });
  if (!user) {
    const err = new Error('Email chưa được đăng ký trong hệ thống.');
    err.status = 404;
    throw err;
  }

  if (user.status === 'active' || user.email_verified === true) {
    const err = new Error('Tài khoản này đã được kích hoạt trước đó. Vui lòng đăng nhập.');
    err.status = 400;
    throw err;
  }

  // Cooldown chống spam 60 giây
  const COOLDOWN_MS = 60 * 1000;
  if (user.last_verification_sent_at) {
    const timePassed = Date.now() - new Date(user.last_verification_sent_at).getTime();
    if (timePassed < COOLDOWN_MS) {
      const secondsLeft = Math.ceil((COOLDOWN_MS - timePassed) / 1000);
      const err = new Error(`Vui lòng chờ ${secondsLeft > 0 ? secondsLeft : 1} giây trước khi yêu cầu gửi lại email kích hoạt.`);
      err.status = 429;
      throw err;
    }
  }

  // Cấp verificationToken mới hiệu lực 12 giờ
  const verificationToken = signJwt(
    { sub: user._id.toString(), email: user.email, purpose: 'verify_email' },
    VERIFICATION_TOKEN_EXPIRE
  );
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:4200';
  const verificationLink = `${clientUrl}/auth/verify?token=${encodeURIComponent(verificationToken)}`;

  await db.collection('users').updateOne(
    { _id: user._id },
    { $set: { last_verification_sent_at: new Date(), updated_at: new Date() } }
  );

  if (!options.skipEmail) {
    await sendEmail({
      to: user.email,
      subject: '[ThinkUp] Gửi lại liên kết kích hoạt tài khoản',
      html: `
        <p>Xin chào ${user.full_name},</p>
        <p>Bạn đã yêu cầu gửi lại liên kết kích hoạt tài khoản ThinkUp:</p>
        <p><a href="${verificationLink}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Kích hoạt tài khoản</a></p>
        <p>Liên kết có hiệu lực trong vòng 12 giờ.</p>
      `,
      text: `Truy cập liên kết sau để kích hoạt tài khoản ThinkUp: ${verificationLink}`,
    }).catch((e) => console.error('[SMTP Send Error]:', e.message));
  }

  return {
    message: 'Liên kết kích hoạt mới đã được gửi về email của bạn. Vui lòng kiểm tra hộp thư (hiệu lực 12 giờ).',
    email: user.email,
    verificationToken,
    verificationLink,
  };
}

// ─── Đăng ký nhanh qua Mạng xã hội (Google / Facebook OAuth) ───────────────────

/**
 * Đăng ký nhanh Google - Just-In-Time Provisioning (vai trò STUDENT, email_verified = true, onboarding_completed = false)
 */
export async function registerWithGoogle({ email, name, avatar, providerId }, options = {}) {
  const db = options.db || await getMongoDb();

  if (!email?.trim() || !providerId) {
    const err = new Error('Thông tin xác thực Google không đầy đủ.');
    err.status = 400;
    throw err;
  }

  const normalizedEmail = email.trim().toLowerCase();
  let user = await db.collection('users').findOne({
    $or: [{ provider: 'google', provider_id: providerId }, { email: normalizedEmail }],
  });

  if (!user) {
    const newUser = {
      full_name: name || 'Học viên Google',
      phone: null,
      email: normalizedEmail,
      password_hash: null,
      provider: 'google',
      provider_id: providerId,
      google_id: providerId,
      avatar_url: avatar || null,
      role: 'student',
      status: 'active',
      is_active: true,
      email_verified: true,
      email_verified_at: new Date(),
      onboarding_completed: false, // BR-REG-08
      failed_login_attempts: 0,
      locked_until: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    const insertResult = await db.collection('users').insertOne(newUser);
    user = { ...newUser, _id: insertResult.insertedId };
  }

  const token = signJwt(
    { sub: user._id.toString(), email: user.email, role: user.role, name: user.full_name },
    '24h'
  );

  return {
    message: 'Đăng ký Google thành công!',
    token,
    user: {
      id: user._id.toString(),
      name: user.full_name,
      email: user.email,
      role: user.role,
      avatar: user.avatar_url,
      onboarding_completed: Boolean(user.onboarding_completed),
      email_verified: true,
    },
  };
}

/**
 * Đăng ký nhanh Facebook - EX-REG-04: Xử lý tài khoản Facebook không trả email
 */
export async function registerWithFacebook({ providerId, email, name, avatar }, options = {}) {
  const db = options.db || await getMongoDb();

  if (!providerId) {
    const err = new Error('Thiếu ID định danh Facebook.');
    err.status = 400;
    throw err;
  }

  // EX-REG-04: Facebook không có email -> Yêu cầu bổ sung email
  if (!email?.trim()) {
    const err = new Error('Vui lòng nhập Email của bạn để hoàn tất đăng ký tài khoản ThinkUp');
    err.status = 400;
    err.code = 'MISSING_EMAIL';
    err.providerId = providerId;
    throw err;
  }

  const normalizedEmail = email.trim().toLowerCase();
  let user = await db.collection('users').findOne({
    $or: [{ provider: 'facebook', provider_id: providerId }, { email: normalizedEmail }],
  });

  if (!user) {
    const newUser = {
      full_name: name || 'Học viên Facebook',
      phone: null,
      email: normalizedEmail,
      password_hash: null,
      provider: 'facebook',
      provider_id: providerId,
      facebook_id: providerId,
      avatar_url: avatar || null,
      role: 'student',
      status: 'active',
      is_active: true,
      email_verified: true,
      email_verified_at: new Date(),
      onboarding_completed: false, // BR-REG-08
      failed_login_attempts: 0,
      locked_until: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    const insertResult = await db.collection('users').insertOne(newUser);
    user = { ...newUser, _id: insertResult.insertedId };
  }

  const token = signJwt(
    { sub: user._id.toString(), email: user.email, role: user.role, name: user.full_name },
    '24h'
  );

  return {
    message: 'Đăng ký Facebook thành công!',
    token,
    user: {
      id: user._id.toString(),
      name: user.full_name,
      email: user.email,
      role: user.role,
      avatar: user.avatar_url,
      onboarding_completed: Boolean(user.onboarding_completed),
      email_verified: true,
    },
  };
}
