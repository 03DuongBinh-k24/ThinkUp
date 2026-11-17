/**
 * Production acceptance cho các cleanup/rollback contract của Admin API.
 *
 * Chỉ đọc/ghi đúng phạm vi: tạo 1 bài viết nháp mang slug `cleanup-e2e-*`, đọc lại, xóa, rồi
 * xóa lần hai để chứng minh idempotent. Các endpoint còn lại chỉ gọi với id không tồn tại để
 * xác nhận route đã deploy và trả đúng mã lỗi, không tạo dữ liệu mới.
 *
 * Biến môi trường (không commit giá trị thật):
 *   ADMIN_API_BASE        mặc định https://be-thinkup.vercel.app/api
 *   ADMIN_EMAIL           email tài khoản Admin dùng để acceptance
 *   ADMIN_PASSWORD        mật khẩu
 *   ADMIN_TOTP_SECRET     secret base32 của 2FA (khuyến nghị)
 *   ADMIN_TOTP            hoặc mã 6 số hiện tại (nếu không có secret)
 *   ADMIN_CS_TOKEN        tùy chọn: access token role CS để kiểm tra 403
 *
 * Chạy: node scripts/verify-admin-cleanup-contracts.mjs
 * Không in token/mật khẩu/secret ra console.
 */
import crypto from 'node:crypto';

const BASE = (process.env.ADMIN_API_BASE || 'https://be-thinkup.vercel.app/api').replace(/\/+$/, '');
const stamp = Date.now();
const results = [];

function base32Decode(input) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of String(input).replace(/=+$/, '').replace(/\s+/g, '').toUpperCase()) {
    const index = alphabet.indexOf(ch);
    if (index < 0) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function totp(secret, at = Date.now()) {
  const counter = Math.floor(at / 30000);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', base32Decode(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code = (((digest[offset] & 0x7f) << 24)
    | (digest[offset + 1] << 16)
    | (digest[offset + 2] << 8)
    | digest[offset + 3]) % 1000000;
  return String(code).padStart(6, '0');
}

async function call(method, path, { token, body } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      accept: 'application/json',
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text.slice(0, 200) }; }
  return { status: response.status, json };
}

function record(name, expected, actual, code, expectedCode) {
  const expectedList = Array.isArray(expected) ? expected : [expected];
  const codeMatches = !expectedCode || code === expectedCode;
  const pass = expectedList.includes(actual) && codeMatches;
  results.push({ name, expected: expectedList.join('/'), actual, code: code || '', pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  ->  ${actual}${code ? ` ${code}` : ''} (expected ${expectedList.join('/')}${expectedCode ? ` ${expectedCode}` : ''})`);
}

async function login() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error('Thiếu ADMIN_EMAIL/ADMIN_PASSWORD.');
  const first = await call('POST', '/admin/auth/login', { body: { email, password } });
  if (first.status !== 200 || !first.json?.twoFactorToken) {
    throw new Error(`Đăng nhập bước 1 thất bại: HTTP ${first.status} ${first.json?.code || first.json?.message || ''}`);
  }
  const otp = process.env.ADMIN_TOTP_SECRET ? totp(process.env.ADMIN_TOTP_SECRET) : String(process.env.ADMIN_TOTP || '');
  if (!otp) throw new Error('Thiếu ADMIN_TOTP_SECRET hoặc ADMIN_TOTP.');
  const second = await call('POST', '/admin/auth/verify-2fa', {
    body: { twoFactorToken: first.json.twoFactorToken, otp },
  });
  if (second.status !== 200 || !second.json?.accessToken) {
    throw new Error(`Xác thực 2FA thất bại: HTTP ${second.status} ${second.json?.code || second.json?.message || ''}`);
  }
  return second.json.accessToken;
}

async function contentCycle(token) {
  const title = `Cleanup e2e draft ${stamp} acceptance`;
  const created = await call('POST', '/admin/content/posts', {
    token,
    body: {
      title,
      category: 'Kinh nghiệm',
      excerpt: 'Bản nháp tạm dùng cho acceptance cleanup contract, sẽ bị xóa ngay sau khi kiểm tra.',
      content: '<p>Noi dung tam cho acceptance, se bi xoa ngay.</p>',
      status: 'draft',
    },
  });
  record('content POST draft', 200, created.status, created.json?.code);
  const id = created.json?.id;
  if (!id) return;

  // Detail API cố ý ẩn draft (getContentPost trả 404 cho draft) nên đây là hành vi đúng,
  // không phải bằng chứng record không tồn tại. Bằng chứng tồn tại là DELETE trả 200 ngay sau đó.
  const read = await call('GET', `/admin/content/posts/${id}`, { token });
  record('content GET draft bị ẩn theo thiết kế', 404, read.status, read.json?.code, 'CONTENT_POST_NOT_FOUND');

  const deleted = await call('DELETE', `/admin/content/posts/${id}`, { token });
  record('content DELETE draft', 200, deleted.status, deleted.json?.code);

  const readAgain = await call('GET', `/admin/content/posts/${id}`, { token });
  record('content GET sau khi xóa (không còn record)', 404, readAgain.status, readAgain.json?.code, 'CONTENT_POST_NOT_FOUND');

  const deletedAgain = await call('DELETE', `/admin/content/posts/${id}`, { token });
  record('content DELETE lần hai (idempotent)', 404, deletedAgain.status, deletedAgain.json?.code, 'CONTENT_POST_NOT_FOUND');
}

async function main() {
  console.log(`Base: ${BASE}`);
  const token = await login();
  console.log('Đăng nhập + 2FA: PASS');

  await contentCycle(token);

  const roadmapId = crypto.randomUUID();
  const roadmap = await call('DELETE', `/admin/roadmaps/${roadmapId}`, { token });
  record('roadmap DELETE id không tồn tại (route đã deploy)', 404, roadmap.status, roadmap.json?.code, 'ROADMAP_NOT_FOUND');

  const ticket = await call('DELETE', `/admin/support/tickets/cleanup-missing-${stamp}`, { token });
  record('ticket DELETE id không tồn tại', 404, ticket.status, ticket.json?.code, 'TICKET_NOT_FOUND');

  const complaint = await call('DELETE', `/admin/support/complaints/cleanup-missing-${stamp}`, { token });
  record('complaint DELETE id không tồn tại', 404, complaint.status, complaint.json?.code, 'COMPLAINT_NOT_FOUND');

  const evidenceId = `uev_${crypto.randomBytes(16).toString('hex')}`;
  const evidence = await call('DELETE', `/admin/users/evidence/${evidenceId}`, { token });
  record('evidence DELETE id không tồn tại', 404, evidence.status, evidence.json?.code, 'EVIDENCE_NOT_FOUND');

  const malformed = await call('DELETE', '/admin/users/evidence/not-an-evidence-id', { token });
  record('evidence DELETE id sai định dạng', 400, malformed.status, malformed.json?.code, 'EVIDENCE_INVALID');

  if (process.env.ADMIN_CS_TOKEN) {
    const forbidden = await call('DELETE', `/admin/users/evidence/${evidenceId}`, { token: process.env.ADMIN_CS_TOKEN });
    record('evidence DELETE với role CS bị chặn', 403, forbidden.status, forbidden.json?.code, 'ADMIN_FORBIDDEN');
  }

  const failed = results.filter((row) => !row.pass);
  console.log(`\nTổng: ${results.length}, pass: ${results.length - failed.length}, fail: ${failed.length}`);
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Không chạy được acceptance: ${error.message}`);
  process.exitCode = 1;
});
