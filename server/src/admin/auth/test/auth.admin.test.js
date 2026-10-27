import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import {
  base32Encode,
  base32Decode,
  generateTOTP,
  verifyTOTP,
  generateBackupCodes,
  validateAdminPassword,
  setupAdminPassword,
  confirmAdmin2FASetup,
  completeAdminOnboarding,
  loginAdminCredentials,
  verifyAdmin2FA,
  checkPasswordExpiry,
  rotateAdminPassword,
  getAdminProfile,
} from '../auth.admin.js';

// Mock DB InMemory tối giản để chạy test độc lập
class MockCollection {
  constructor(data = []) {
    this.data = data;
  }
  async findOne(query, options = {}) {
    return (
      this.data.find((item) => {
        for (const key of Object.keys(query)) {
          if (key === '_id') {
            if (String(item._id) !== String(query._id)) return false;
          } else if (item[key] !== query[key]) {
            return false;
          }
        }
        return true;
      }) || null
    );
  }
  async insertOne(doc) {
    const item = { _id: doc._id || String(Date.now() + Math.random()), ...doc };
    this.data.push(item);
    return { insertedId: item._id };
  }
  async updateOne(query, update) {
    const item = await this.findOne(query);
    if (!item) return { modifiedCount: 0 };
    if (update.$set) {
      Object.assign(item, update.$set);
    }
    if (update.$push) {
      for (const [field, val] of Object.entries(update.$push)) {
        if (!item[field]) item[field] = [];
        if (val.$each) {
          item[field].push(...val.$each);
          if (val.$slice) {
            item[field] = item[field].slice(val.$slice);
          }
        } else {
          item[field].push(val);
        }
      }
    }
    return { modifiedCount: 1 };
  }
}

class MockDb {
  constructor() {
    this.admins = new MockCollection();
    this.auditLogs = new MockCollection();
  }
  collection(name) {
    if (name === 'admins') return this.admins;
    if (name === 'admin_audit_logs') return this.auditLogs;
    return new MockCollection();
  }
}

test('ADMIN AUTH SUITE: RFC 6238 TOTP, Base32 & Backup Codes Utils', async (t) => {
  await t.test('Base32 Encode & Decode khớp dữ liệu', () => {
    const original = Buffer.from('ThinkUp Enterprise Security Admin 2026');
    const encoded = base32Encode(original);
    const decoded = base32Decode(encoded);
    assert.strictEqual(original.toString('hex'), decoded.toString('hex'));
  });

  await t.test('Sinh và xác thực mã TOTP 6 số', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const otp = generateTOTP(secret);
    assert.strictEqual(otp.length, 6);
    assert.match(otp, /^\d{6}$/);
    assert.strictEqual(verifyTOTP(otp, secret), true);
    assert.strictEqual(verifyTOTP('000000', secret), false);
  });

  await t.test('Sinh 10 mã dự phòng định dạng 16 ký tự XXXX-XXXX-XXXX-XXXX', () => {
    const codes = generateBackupCodes(10);
    assert.strictEqual(codes.length, 10);
    codes.forEach((code) => {
      assert.match(code, /^[2-9A-Z]{4}-[2-9A-Z]{4}-[2-9A-Z]{4}-[2-9A-Z]{4}$/);
    });
  });

  await t.test('Kiểm tra chính sách mật khẩu (Password Policy)', () => {
    // Quá ngắn (< 12 ký tự)
    assert.throws(() => validateAdminPassword('Short1!'), /từ 12 đến 32 ký tự/);
    // Thiếu ký tự hoa/thường/số/đặc biệt
    assert.throws(() => validateAdminPassword('thinkuppassword12345'), /ít nhất 1 chữ hoa/);
    // Mật khẩu phổ biến bị cấm
    assert.throws(() => validateAdminPassword('admin123456@'), /quá phổ biến/);
    // Mật khẩu hợp lệ
    assert.strictEqual(validateAdminPassword('SuperSecure@ThinkUp2026'), true);
  });
});

test('ADMIN AUTH SUITE: Luồng 1 - Kích hoạt tài khoản Onboarding (3 Bước)', async (t) => {
  const mockDb = new MockDb();
  const testAdminId = '65f123456789abcdef012345';
  await mockDb.admins.insertOne({
    _id: testAdminId,
    email: 'admin.lead@thinkup.vn',
    full_name: 'Lead Admin',
    role: 'SUPER_ADMIN',
    status: 'INVITED',
    invite_token: 'valid_invite_token_123',
    invite_expires_at: new Date(Date.now() + 24 * 3600 * 1000),
  });

  let onboardingTokenStep2;
  let secretKey;

  await t.test('Bước 1: Thiết lập mật khẩu mới lần đầu', async () => {
    const res = await setupAdminPassword(
      {
        inviteToken: 'valid_invite_token_123',
        newPassword: 'StrongAdminPassword@2026',
        confirmPassword: 'StrongAdminPassword@2026',
      },
      { db: mockDb }
    );
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.step, '2FA_SETUP');
    assert.ok(res.onboardingToken);
    assert.ok(res.secretKey);
    assert.ok(res.qrUri.startsWith('otpauth://totp/'));

    onboardingTokenStep2 = res.onboardingToken;
    secretKey = res.secretKey;
  });

  let onboardingTokenStep3;
  let receivedBackupCodes;

  await t.test('Bước 2: Cài đặt và xác nhận 2FA với mã OTP', async () => {
    const currentOtp = generateTOTP(secretKey);
    const res = await confirmAdmin2FASetup(
      {
        onboardingToken: onboardingTokenStep2,
        otp: currentOtp,
      },
      { db: mockDb }
    );
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.step, 'BACKUP_CODES');
    assert.strictEqual(res.backupCodes.length, 10);

    onboardingTokenStep3 = res.onboardingToken;
    receivedBackupCodes = res.backupCodes;
  });

  await t.test('Bước 3: Cam kết lưu mã dự phòng & Hoàn tất Onboarding', async () => {
    // Nếu chưa tick checkbox -> Báo lỗi
    await assert.rejects(
      async () => {
        await completeAdminOnboarding(
          { onboardingToken: onboardingTokenStep3, confirmedSaved: false },
          { db: mockDb }
        );
      },
      /bắt buộc phải xác nhận đã lưu các mã/
    );

    // Xác nhận đã lưu
    const res = await completeAdminOnboarding(
      { onboardingToken: onboardingTokenStep3, confirmedSaved: true },
      { db: mockDb }
    );
    assert.strictEqual(res.success, true);
    assert.ok(res.accessToken);
    assert.strictEqual(res.admin.email, 'admin.lead@thinkup.vn');

    const updated = await mockDb.admins.findOne({ _id: testAdminId });
    assert.strictEqual(updated.status, 'ACTIVE');
    assert.strictEqual(updated.is_2fa_enabled, true);
    assert.strictEqual(updated.invite_token, null);
  });
});

test('ADMIN AUTH SUITE: Luồng 2 - Đăng nhập, Brute-force lockout & 2FA', async (t) => {
  const mockDb = new MockDb();
  const testAdminId = '65f123456789abcdef012399';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('StrongAdminPassword@2026', salt);
  const secret = 'JBSWY3DPEHPK3PXP';
  const backupCodePlain = 'A8F9-3B2C';
  const backupCodeHash = await bcrypt.hash(backupCodePlain, salt);

  await mockDb.admins.insertOne({
    _id: testAdminId,
    email: 'security.admin@thinkup.vn',
    full_name: 'Security Admin',
    role: 'ADMIN',
    status: 'ACTIVE',
    is_active: true,
    is_2fa_enabled: true,
    password_hash: passwordHash,
    two_factor_secret: secret,
    failed_login_attempts: 0,
    password_changed_at: new Date(),
    backup_codes: [{ code_hash: backupCodeHash, is_used: false, used_at: null }],
  });

  await t.test('Đăng nhập sai quá 5 lần sẽ kích hoạt khóa 15 phút (Brute-force lockout)', async () => {
    for (let i = 1; i <= 4; i++) {
      await assert.rejects(
        async () => {
          await loginAdminCredentials(
            { email: 'security.admin@thinkup.vn', password: 'WrongPassword@123' },
            { db: mockDb }
          );
        },
        /Email công vụ hoặc mật khẩu không chính xác/
      );
    }

    // Lần thứ 5 bị khóa cứng
    await assert.rejects(
      async () => {
        await loginAdminCredentials(
          { email: 'security.admin@thinkup.vn', password: 'WrongPassword@123' },
          { db: mockDb }
        );
      },
      /Bạn đã nhập sai 5 lần. Tài khoản bị tạm khóa 15 phút/
    );

    // Thử lại ngay cả khi gõ đúng mật khẩu vẫn bị chặn
    await assert.rejects(
      async () => {
        await loginAdminCredentials(
          { email: 'security.admin@thinkup.vn', password: 'StrongAdminPassword@2026' },
          { db: mockDb }
        );
      },
      /Tài khoản tạm thời bị khóa do nhập sai nhiều lần/
    );
  });

  await t.test('Đăng nhập Bước 1 đúng mật khẩu (sau khi mở khóa) -> Yêu cầu 2FA TTL 5 phút', async () => {
    // Reset khóa để kiểm tra luồng thành công
    await mockDb.admins.updateOne({ _id: testAdminId }, { $set: { locked_until: null, failed_login_attempts: 0 } });

    const step1 = await loginAdminCredentials(
      { email: 'security.admin@thinkup.vn', password: 'StrongAdminPassword@2026' },
      { db: mockDb }
    );
    assert.strictEqual(step1.success, true);
    assert.strictEqual(step1.requires2FA, true);
    assert.strictEqual(step1.expiresInSeconds, 300);
    assert.ok(step1.twoFactorToken);

    // Bước 2a: Xác thực bằng OTP 6 số
    const otp = generateTOTP(secret);
    const step2Otp = await verifyAdmin2FA(
      {
        twoFactorToken: step1.twoFactorToken,
        otp,
      },
      { db: mockDb }
    );
    assert.strictEqual(step2Otp.success, true);
    assert.ok(step2Otp.accessToken);

    // Bước 2b: Xác thực bằng Backup Code (Mã dự phòng)
    const step1Backup = await loginAdminCredentials(
      { email: 'security.admin@thinkup.vn', password: 'StrongAdminPassword@2026' },
      { db: mockDb }
    );
    const step2Backup = await verifyAdmin2FA(
      {
        twoFactorToken: step1Backup.twoFactorToken,
        backupCode: backupCodePlain,
      },
      { db: mockDb }
    );
    assert.strictEqual(step2Backup.success, true);
    assert.ok(step2Backup.accessToken);

    // Thử dùng lại mã dự phòng đó lần 2 -> Bị từ chối vì đã bị đốt
    const step1Retry = await loginAdminCredentials(
      { email: 'security.admin@thinkup.vn', password: 'StrongAdminPassword@2026' },
      { db: mockDb }
    );
    await assert.rejects(
      async () => {
        await verifyAdmin2FA(
          {
            twoFactorToken: step1Retry.twoFactorToken,
            backupCode: backupCodePlain,
          },
          { db: mockDb }
        );
      },
      /Mã dự phòng không chính xác hoặc đã được sử dụng/
    );
  });
});

test('ADMIN AUTH SUITE: Luồng 3 - Password Rotation & Password History', async (t) => {
  const mockDb = new MockDb();
  const testAdminId = '65f123456789abcdef012388';
  const salt = await bcrypt.genSalt(10);
  const currentPassword = 'CurrentAdminPassword@2026';
  const oldPassword = 'OldPasswordUsedPreviously@2025';
  const secret = 'JBSWY3DPEHPK3PXP';

  await mockDb.admins.insertOne({
    _id: testAdminId,
    email: 'rotation.admin@thinkup.vn',
    password_hash: await bcrypt.hash(currentPassword, salt),
    two_factor_secret: secret,
    password_history: [{ password_hash: await bcrypt.hash(oldPassword, salt), changed_at: new Date() }],
  });

  await t.test('Kiểm tra hàm tính toán ngày hết hạn (Grace Period & Hard Block)', () => {
    // Còn 85 ngày (> 7 ngày) -> Bình thường
    const statusOk = checkPasswordExpiry(new Date(Date.now() - 5 * 24 * 3600 * 1000));
    assert.strictEqual(statusOk.isExpired, false);
    assert.strictEqual(statusOk.isWarning, false);

    // Còn 4 ngày (trong vòng 7 ngày) -> Cảnh báo mềm
    const statusWarn = checkPasswordExpiry(new Date(Date.now() - 86 * 24 * 3600 * 1000));
    assert.strictEqual(statusWarn.isExpired, false);
    assert.strictEqual(statusWarn.isWarning, true);

    // Đã qua 91 ngày -> Hết hạn cứng (Hard Block)
    const statusExpired = checkPasswordExpiry(new Date(Date.now() - 91 * 24 * 3600 * 1000));
    assert.strictEqual(statusExpired.isExpired, true);
    assert.strictEqual(statusExpired.isWarning, true);
    assert.strictEqual(statusExpired.daysLeft, 0);
  });

  await t.test('Đổi mật khẩu: Bắt buộc OTP 2FA và chặn trùng 5 lần gần nhất', async () => {
    const validOtp = generateTOTP(secret);

    // 1. Sai OTP 2FA -> Chặn
    await assert.rejects(
      async () => {
        await rotateAdminPassword(
          {
            adminId: testAdminId,
            currentPassword,
            newPassword: 'BrandNewPassword@2026',
            confirmPassword: 'BrandNewPassword@2026',
            otp: '000000',
          },
          { db: mockDb }
        );
      },
      /Mã OTP 2FA không chính xác/
    );

    // 2. Trùng mật khẩu trong lịch sử -> Chặn
    await assert.rejects(
      async () => {
        await rotateAdminPassword(
          {
            adminId: testAdminId,
            currentPassword,
            newPassword: oldPassword,
            confirmPassword: oldPassword,
            otp: validOtp,
          },
          { db: mockDb }
        );
      },
      /Không được sử dụng lại mật khẩu đã dùng trong 5 lần gần nhất/
    );

    // 3. Đổi mật khẩu mới hợp lệ
    const res = await rotateAdminPassword(
      {
        adminId: testAdminId,
        currentPassword,
        newPassword: 'BrandNewPassword@2026',
        confirmPassword: 'BrandNewPassword@2026',
        otp: validOtp,
      },
      { db: mockDb }
    );
    assert.strictEqual(res.success, true);
    assert.ok(res.accessToken);

    // Kiểm tra hồ sơ Admin sau khi đổi
    const profile = await getAdminProfile(testAdminId, { db: mockDb });
    assert.strictEqual(profile.admin.passwordStatus.isExpired, false);
  });
});
