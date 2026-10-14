import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../../server.js';
import { closeMongoDb } from '../db.js';

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await closeMongoDb();
});

test('HTTP Server & API Routes Integration Test', async (t) => {
  await t.test('GET /: Server health & status', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'ok');
  });

  await t.test('GET /health: Health check endpoint', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'ok');
  });

  await t.test('POST /api/auth/register: Báo lỗi 400 khi thiếu thông tin', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid_format' }),
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.message);
  });

  await t.test('POST /api/auth/login: Báo lỗi 401 khi sai mật khẩu', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent_user@thinkup.vn',
        password: 'WrongPassword123!',
      }),
    });
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.code, 'INVALID_CREDENTIALS');
  });

  await t.test('POST /api/auth/forgot-password: Trả về 200 an toàn chống dò quét tài khoản', async () => {
    const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'probe_test@thinkup.vn' }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.maskedEmail);
  });

  await t.test('POST /api/auth/verify-otp (alias): Báo lỗi 400 khi mã OTP không hợp lệ', async () => {
    const res = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'probe_test@thinkup.vn', otp: '000000' }),
    });
    assert.strictEqual(res.status, 400);
  });

  await t.test('GET /api/auth/session: Trả về isAuthenticated: false khi không có token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/session`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.isAuthenticated, false);
    assert.strictEqual(data.user, null);
  });
});
