import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAuditChecksum,
  verifyAuditChecksum,
  determineRiskLevel,
} from '../audit.admin.js';
import { DEFAULT_SYSTEM_SETTINGS, getSystemSettings } from '../settings.admin.js';

test('Audit Log Checksum: Tính toán và kiểm tra sai lệch toàn vẹn', () => {
  const logCode = 'LOG-2026-123456';
  const actorId = '507f1f77bcf86cd799439011';
  const targetId = 'PO-2026-001';
  const timestamp = new Date('2026-06-25T14:30:15Z');
  const diff = { before: { status: 'pending' }, after: { status: 'approved' } };

  const checksum = calculateAuditChecksum({
    log_code: logCode,
    actor_id: actorId,
    target_id: targetId,
    timestamp,
    diff,
  });

  assert.ok(typeof checksum === 'string' && checksum.length === 64);

  const doc = {
    log_code: logCode,
    actor: { admin_id: actorId },
    target: { id: targetId },
    timestamp,
    diff,
    checksum,
  };

  assert.equal(verifyAuditChecksum(doc), true, 'Bản ghi gốc phải hợp lệ checksum');

  // Thử can thiệp sửa đổi trường diff
  const tamperedDoc = {
    ...doc,
    diff: { before: { status: 'pending' }, after: { status: 'rejected' } },
  };
  assert.equal(verifyAuditChecksum(tamperedDoc), false, 'Bản ghi bị sửa dữ liệu phải bị phát hiện sai lệch checksum');
});

test('Risk Matrix: Phân loại rủi ro chuẩn quy tắc BA', () => {
  assert.equal(determineRiskLevel({ module: 'payout', amount: 25_000_000 }), 'high', 'Duyệt rút >= 20tr phải là high');
  assert.equal(determineRiskLevel({ module: 'payout', amount: 5_000_000 }), 'attention', 'Duyệt rút < 20tr phải là attention');
  assert.equal(determineRiskLevel({ module: 'rbac', action: 'change_role' }), 'high', 'Đổi vai trò phải là high');
  assert.equal(determineRiskLevel({ module: 'system_settings', action: 'update_settings' }), 'high', 'Đổi cấu hình sàn phải là high');
  assert.equal(determineRiskLevel({ action: 'lock_account', isPermanentLock: true }), 'high', 'Khóa vĩnh viễn là high');
  assert.equal(determineRiskLevel({ module: 'report', action: 'view' }), 'normal', 'Xem thông thường là normal');
});

test('System settings: trả giá trị đã lưu kèm mặc định cho trường còn thiếu', async () => {
  const doc = { general: { site_name: 'Integration Test' }, parameters: { test_pass_score: 90 } };
  const db = { collection(name) {
    assert.equal(name, 'system_settings');
    return { findOne: async query => query._id === 'global_config' ? doc : null };
  } };
  const result = await getSystemSettings(db);
  assert.equal(result.general.site_name, 'Integration Test');
  assert.equal(result.general.timezone, DEFAULT_SYSTEM_SETTINGS.general.timezone);
  assert.equal(result.parameters.test_pass_score, 90);
  assert.equal(result.parameters.tax_rate, DEFAULT_SYSTEM_SETTINGS.parameters.tax_rate);
});

