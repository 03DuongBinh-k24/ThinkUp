import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { getMongoDb, closeMongoDb, maskEmail } from '../../db.js';
import {
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetPasswordWithToken,
} from '../forgot-password.user.js';

test('TestSuite: Quên Mật Khẩu & Đặt Lại Mật Khẩu với Database Thật (MongoDB Atlas)', async (t) => {
  let db;
  const testEmail = 'test_forgot_user@thinkup.vn';

  t.before(async () => {
    db = await getMongoDb();
    await db.collection('users').deleteMany({ email: /^test_forgot_/ });
    await db.collection('otps').deleteMany({ email: /^test_forgot_/ });
  });

  t.after(async () => {
    if (db) {
      await db.collection('users').deleteMany({ email: /^test_forgot_/ });
      await db.collection('otps').deleteMany({ email: /^test_forgot_/ });
    }
    await closeMongoDb();
  });

  t.beforeEach(async () => {
    await db.collection('users').deleteMany({ email: /^test_forgot_/ });
    await db.collection('otps').deleteMany({ email: /^test_forgot_/ });

    const hash = await bcrypt.hash('OldPassword123!', 12);
    await db.collection('users').insertOne({
      full_name: 'Nguyễn Văn Forgot Test',
      email: testEmail,
      password_hash: hash,
      status: 'active',
      is_active: true,
      email_verified: true,
      failed_login_attempts: 0,
      locked_until: null,
      created_at: new Date(),
    });
  });

  await t.test('AC-02: Kiểm tra hàm maskEmail che giấu địa chỉ email', () => {
    assert.strictEqual(maskEmail('nguyenvana@gmail.com'), 'n***@gmail.com');
    assert.strictEqual(maskEmail('test@thinkup.vn'), 't***@thinkup.vn');
  });

  await t.test('BR-FGT-01 & AC-01: Bảo mật chống dò tài khoản trên DB thật', async () => {
    // 1. Email KHÔNG tồn tại -> Vẫn trả thông báo thành công chung
    const resNonExistent = await sendForgotPasswordOtp(
      { email: 'test_forgot_nonexistent@gmail.com' },
      { db, skipEmail: true }
    );
    assert.match(resNonExistent.message, /Nếu email tồn tại trên hệ thống, bạn sẽ nhận được mã xác thực/);
    assert.strictEqual(resNonExistent.maskedEmail, 't***@gmail.com');

    // Không có bản ghi OTP nào trong DB thật
    const noOtp = await db.collection('otps').findOne({ email: 'test_forgot_nonexistent@gmail.com' });
    assert.strictEqual(noOtp, null);

    // 2. Email CÓ tồn tại -> Tạo OTP hạn 5 phút trong DB thật
    const resExisting = await sendForgotPasswordOtp(
      { email: testEmail },
      { db, skipEmail: true, exposeOtp: true }
    );
    assert.ok(resExisting.testOtp);
    assert.strictEqual(resExisting.testOtp.length, 6);

    const otpInDb = await db.collection('otps').findOne({ email: testEmail });
    assert.ok(otpInDb);
    assert.strictEqual(otpInDb.otp, resExisting.testOtp);
  });

  await t.test('BR-FGT-02: Kiểm tra giới hạn thời gian gửi lại (Cooldown 60s) trên DB thật', async () => {
    // Gửi lần 1
    await sendForgotPasswordOtp({ email: testEmail }, { db, skipEmail: true });

    // Gửi lại ngay lập tức -> Bị chặn 429 do cooldown
    await assert.rejects(
      async () => {
        await sendForgotPasswordOtp({ email: testEmail }, { db, skipEmail: true });
      },
      (err) => err.status === 429 && err.message.includes('Vui lòng chờ')
    );
  });

  await t.test('BR-FGT-03 & AC-05: Chống Brute-force OTP trên DB thật (sai 5 lần thì hủy OTP)', async () => {
    await sendForgotPasswordOtp(
      { email: testEmail },
      { db, skipEmail: true, exposeOtp: true }
    );

    // Nhập sai 4 lần -> Báo mã không chính xác
    for (let i = 1; i <= 4; i++) {
      await assert.rejects(
        async () => {
          await verifyForgotPasswordOtp(
            { email: testEmail, otp: '000000' },
            { db }
          );
        },
        (err) => err.status === 400 && err.code === 'OTP_INVALID'
      );
    }

    // Nhập sai lần thứ 5 -> Hủy OTP, khóa phiên (403 OTP_MAX_ATTEMPTS_EXCEEDED)
    await assert.rejects(
      async () => {
        await verifyForgotPasswordOtp(
          { email: testEmail, otp: '000000' },
          { db }
        );
      },
      (err) =>
        err.status === 403 &&
        err.code === 'OTP_MAX_ATTEMPTS_EXCEEDED' &&
        err.message.includes('Bạn đã nhập sai mã xác thực quá 5 lần')
    );

    // Kiểm tra bản ghi OTP trong DB thật đã bị xóa hoàn toàn
    const deletedOtp = await db.collection('otps').findOne({ email: testEmail });
    assert.strictEqual(deletedOtp, null);
  });

  await t.test('AC-08 & BR-FGT-04: Xác thực OTP thành công và Đổi mật khẩu mới trên DB thật', async () => {
    // 1. Gửi OTP
    const otpRes = await sendForgotPasswordOtp(
      { email: testEmail },
      { db, skipEmail: true, exposeOtp: true }
    );

    // 2. Xác thực đúng OTP -> Cấp resetToken
    const verifyRes = await verifyForgotPasswordOtp(
      { email: testEmail, otp: otpRes.testOtp },
      { db }
    );
    assert.ok(verifyRes.resetToken);

    // 3. Đổi mật khẩu mới không hợp lệ
    await assert.rejects(
      async () => {
        await resetPasswordWithToken(
          { resetToken: verifyRes.resetToken, newPassword: 'short', confirmPassword: 'short' },
          { db }
        );
      },
      (err) => err.status === 400 && err.message.includes('tối thiểu từ 8 ký tự')
    );

    await assert.rejects(
      async () => {
        await resetPasswordWithToken(
          { resetToken: verifyRes.resetToken, newPassword: 'NewPassword123!', confirmPassword: 'NotMatching123!' },
          { db }
        );
      },
      (err) => err.status === 400 && err.message.includes('Mật khẩu xác nhận không khớp')
    );

    // 4. Đổi mật khẩu thành công
    const resetSuccess = await resetPasswordWithToken(
      { resetToken: verifyRes.resetToken, newPassword: 'BrandNewPassword123!', confirmPassword: 'BrandNewPassword123!' },
      { db }
    );
    assert.strictEqual(resetSuccess.message, 'Thay đổi mật khẩu thành công.');

    // 5. Kiểm tra mật khẩu trong DB thật đã được cập nhật hash mới
    const updatedUser = await db.collection('users').findOne({ email: testEmail });
    const isNewPasswordValid = await bcrypt.compare('BrandNewPassword123!', updatedUser.password_hash);
    assert.strictEqual(isNewPasswordValid, true);
  });
});
