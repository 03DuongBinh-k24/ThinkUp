import test from 'node:test';
import assert from 'node:assert/strict';
import { getMongoDb, closeMongoDb } from '../../db.js';
import {
  registerUser,
  verifyEmailVerificationToken,
  resendVerificationLink,
  registerWithGoogle,
  registerWithFacebook,
  validateFullName,
  validatePhone,
  validateEmail,
  validatePassword,
} from '../signup.user.js';

test('TestSuite: Đăng Ký Học Viên với Database Thật (MongoDB Atlas)', async (t) => {
  let db;

  t.before(async () => {
    db = await getMongoDb();
    // Dọn dẹp các bản ghi test cũ nếu có
    await db.collection('users').deleteMany({ email: /^test_signup_/ });
    await db.collection('otps').deleteMany({ email: /^test_signup_/ });
  });

  t.after(async () => {
    // Dọn dẹp sạch sẽ toàn bộ bản ghi test trên MongoDB Atlas
    if (db) {
      await db.collection('users').deleteMany({ email: /^test_signup_/ });
      await db.collection('otps').deleteMany({ email: /^test_signup_/ });
    }
    await closeMongoDb();
  });

  await t.test('AC-03: Kiểm tra quy chuẩn Họ và tên (BR-REG-02)', () => {
    assert.strictEqual(validateFullName('Nguyễn Văn A').valid, true);
    assert.strictEqual(validateFullName('A').valid, false); // < 2 ký tự
    assert.strictEqual(validateFullName('Nguyễn Văn 123').valid, false); // chứa số
    assert.strictEqual(validateFullName('Nguyễn @ Văn').valid, false); // chứa ký tự đặc biệt
  });

  await t.test('AC-04: Kiểm tra quy chuẩn Số điện thoại Việt Nam (BR-REG-03)', () => {
    assert.strictEqual(validatePhone('0912345678').valid, true);
    assert.strictEqual(validatePhone('0388999888').valid, true);
    assert.strictEqual(validatePhone('0123456789').valid, false); // sai đầu số
    assert.strictEqual(validatePhone('091234567').valid, false); // thiếu số (< 10)
    assert.strictEqual(validatePhone('09123456789').valid, false); // thừa số (> 10)
    assert.strictEqual(validatePhone('091234567a').valid, false); // chứa chữ
  });

  await t.test('AC-05: Kiểm tra định dạng Email chuẩn RFC (BR-REG-04)', () => {
    assert.strictEqual(validateEmail('student@thinkup.vn').valid, true);
    assert.strictEqual(validateEmail('student @thinkup.vn').valid, false); // chứa khoảng trắng
    assert.strictEqual(validateEmail('invalid-email').valid, false);
  });

  await t.test('AC-06: Kiểm tra độ phức tạp Mật khẩu (BR-REG-05)', () => {
    assert.strictEqual(validatePassword('Password123!').valid, true);
    assert.strictEqual(validatePassword('short1!').valid, false); // < 8 ký tự
    assert.strictEqual(validatePassword('password123!').valid, false); // thiếu chữ hoa
    assert.strictEqual(validatePassword('PASSWORD123!').valid, false); // thiếu chữ thường
    assert.strictEqual(validatePassword('PasswordABC!').valid, false); // thiếu số
    assert.strictEqual(validatePassword('Password1234').valid, false); // thiếu ký tự đặc biệt
  });

  await t.test('AC-08 & AC-10: Kiểm tra Cross-field so khớp mật khẩu và Checkbox Điều khoản', async () => {
    // Chưa tích Điều khoản
    await assert.rejects(
      async () => {
        await registerUser(
          {
            fullName: 'Trần Văn B',
            phone: '0987654321',
            email: 'test_signup_terms@thinkup.vn',
            password: 'Password123!',
            confirmPassword: 'Password123!',
            termsAccepted: false,
          },
          { db, skipEmail: true }
        );
      },
      (err) => err.field === 'terms' && err.status === 400
    );

    // Mật khẩu xác nhận không khớp
    await assert.rejects(
      async () => {
        await registerUser(
          {
            fullName: 'Trần Văn B',
            phone: '0987654321',
            email: 'test_signup_diffpass@thinkup.vn',
            password: 'Password123!',
            confirmPassword: 'DifferentPassword123!',
            termsAccepted: true,
          },
          { db, skipEmail: true }
        );
      },
      (err) => err.field === 'confirmPassword' && err.status === 400
    );
  });

  await t.test('AC-14: Kiểm tra trùng lặp Email và Số điện thoại trên DB thật (HTTP 409)', async () => {
    const testEmail = 'test_signup_dup1@thinkup.vn';
    const testPhone = '0911222333';

    await db.collection('users').deleteOne({ email: testEmail });
    await db.collection('users').deleteOne({ phone: testPhone });

    // Đăng ký người dùng 1
    await registerUser(
      {
        fullName: 'Người Dùng Một',
        phone: testPhone,
        email: testEmail,
        password: 'Password123!',
        termsAccepted: true,
      },
      { db, skipEmail: true }
    );

    // Trùng Email -> Phải ném HTTP 409 EMAIL_EXISTS
    await assert.rejects(
      async () => {
        await registerUser(
          {
            fullName: 'Người Khác',
            phone: '0944555666',
            email: testEmail,
            password: 'Password123!',
            termsAccepted: true,
          },
          { db, skipEmail: true }
        );
      },
      (err) => err.status === 409 && err.code === 'EMAIL_EXISTS'
    );

    // Trùng Số điện thoại -> Phải ném HTTP 409 PHONE_EXISTS
    await assert.rejects(
      async () => {
        await registerUser(
          {
            fullName: 'Người Khác Hai',
            phone: testPhone,
            email: 'test_signup_dup2@thinkup.vn',
            password: 'Password123!',
            termsAccepted: true,
          },
          { db, skipEmail: true }
        );
      },
      (err) => err.status === 409 && err.code === 'PHONE_EXISTS'
    );
  });

  await t.test('AC-15 & BR-AUTH-06: Đăng ký thành công, tạo token 12 giờ và kích hoạt email trên DB thật', async () => {
    const testEmail = 'test_signup_success@thinkup.vn';
    const testPhone = '0977888999';

    await db.collection('users').deleteOne({ email: testEmail });
    await db.collection('users').deleteOne({ phone: testPhone });

    const res = await registerUser(
      {
        fullName: 'Học Viên Thành Công',
        phone: testPhone,
        email: testEmail,
        password: 'Password123!',
        termsAccepted: true,
      },
      { db, skipEmail: true }
    );

    assert.match(res.message, /link xác thực được gửi qua email/);
    assert.ok(res.verificationToken);
    assert.ok(res.verificationLink);

    // Kiểm tra bản ghi trong DB thật: vai trò student, onboarding_completed = false
    const userInDb = await db.collection('users').findOne({ email: testEmail });
    assert.strictEqual(userInDb.role, 'student');
    assert.strictEqual(userInDb.onboarding_completed, false);
    assert.strictEqual(userInDb.status, 'pending');

    // Kích hoạt qua verificationToken
    const verifyRes = await verifyEmailVerificationToken(
      { token: res.verificationToken },
      { db }
    );
    assert.match(verifyRes.message, /Kích hoạt tài khoản thành công/);

    const activeUser = await db.collection('users').findOne({ email: testEmail });
    assert.strictEqual(activeUser.status, 'active');
    assert.strictEqual(activeUser.email_verified, true);
  });

  await t.test('AC-16 & AC-17: Đăng ký mạng xã hội Google / Facebook (Just-In-Time Provisioning) trên DB thật', async () => {
    const ggEmail = 'test_signup_gg@thinkup.vn';
    await db.collection('users').deleteOne({ email: ggEmail });

    // Google: tự tạo tài khoản vai trò student, onboarding_completed = false
    const ggRes = await registerWithGoogle(
      { email: ggEmail, name: 'Google Student', providerId: 'gg_live_001' },
      { db }
    );
    assert.strictEqual(ggRes.user.email, ggEmail);
    assert.strictEqual(ggRes.user.role, 'student');
    assert.strictEqual(ggRes.user.onboarding_completed, false);

    // Facebook thiếu email -> Báo lỗi MISSING_EMAIL
    await assert.rejects(
      async () => {
        await registerWithFacebook(
          { providerId: 'fb_no_email_live', name: 'Facebook User' },
          { db }
        );
      },
      (err) => err.code === 'MISSING_EMAIL' && err.status === 400
    );

    // Facebook đủ email -> Thành công
    const fbEmail = 'test_signup_fb@thinkup.vn';
    await db.collection('users').deleteOne({ email: fbEmail });

    const fbRes = await registerWithFacebook(
      { providerId: 'fb_live_002', email: fbEmail, name: 'Facebook Student' },
      { db }
    );
    assert.strictEqual(fbRes.user.email, fbEmail);
    assert.strictEqual(fbRes.user.onboarding_completed, false);
  });

  await t.test('Gửi lại liên kết xác thực (resendVerificationLink): Thành công, Cooldown và chặn khi đã active trên DB thật', async () => {
    const testEmail = 'test_signup_pending@thinkup.vn';
    const testPhone = '0933444555';

    await db.collection('users').deleteOne({ email: testEmail });
    await db.collection('users').deleteOne({ phone: testPhone });

    // 1. Đăng ký tài khoản (chưa kích hoạt)
    await registerUser(
      {
        fullName: 'Chưa Kích Hoạt',
        phone: testPhone,
        email: testEmail,
        password: 'Password123!',
        termsAccepted: true,
      },
      { db, skipEmail: true }
    );

    // 2. Yêu cầu gửi lại liên kết xác thực ngay -> Bị chặn 429 do Cooldown 60s
    await assert.rejects(
      async () => {
        await resendVerificationLink({ email: testEmail }, { db, skipEmail: true });
      },
      (err) => err.status === 429 && err.message.includes('Vui lòng chờ')
    );

    // Giả lập thời gian đã trôi qua hơn 60s trong DB thật
    await db.collection('users').updateOne(
      { email: testEmail },
      { $set: { last_verification_sent_at: new Date(Date.now() - 65 * 1000) } }
    );

    // 3. Gửi lại sau khi hết cooldown -> Thành công
    const resendRes = await resendVerificationLink(
      { email: testEmail },
      { db, skipEmail: true }
    );
    assert.match(resendRes.message, /Liên kết kích hoạt mới đã được gửi/);
    assert.ok(resendRes.verificationToken);

    // 4. Kích hoạt tài khoản
    await verifyEmailVerificationToken({ token: resendRes.verificationToken }, { db });

    // 5. Yêu cầu gửi lại khi tài khoản ĐÃ kích hoạt -> Bị từ chối 400
    await assert.rejects(
      async () => {
        await resendVerificationLink({ email: testEmail }, { db, skipEmail: true });
      },
      (err) => err.status === 400 && err.message.includes('đã được kích hoạt trước đó')
    );
  });
});
