import { ObjectId } from 'mongodb';
import { createAuditRecord } from './audit.admin.js';
import { verifySuperAdminOtp } from './security.admin.js';

export const SETTINGS_COLLECTION = 'system_settings';
export const CONFIG_DOC_ID = 'global_config';

/** Chỉ giữ cấu hình chung và các tham số vận hành của hệ thống. */
export const DEFAULT_SYSTEM_SETTINGS = Object.freeze({
  _id: CONFIG_DOC_ID,
  general: {
    site_name: 'ThinkUp Vietnam',
    timezone: 'GMT+07:00',
    language: 'vi',
    hotline: '0901234567',
    address: 'Toà nhà ThinkUp, TP. Hồ Chí Minh',
    logo_url: '/assets/logo.png',
    favicon_url: '/assets/favicon.ico',
  },
  parameters: {
    tax_threshold: 2000000,
    tax_rate: 0.10,
    platform_revenue_share_percent: 60,
    instructor_revenue_share_percent: 40,
    super_admin_threshold: 20000000,
    minimum_payout_amount: 500000,
    maximum_weekly_payout_requests: 2,
    payment_timeout_minutes: 15,
    orders_per_page: 20,
    course_review_hours: 48,
    s_match_threshold: 70,
    roadmap_mastery_threshold: 70,
    roadmap_knowledge_gap_threshold: 60,
    min_courses_per_milestone: 3,
    test_pass_score: 80,
    student_lock_min_chars: 10,
    lecturer_discipline_min_chars: 15,
    course_reject_min_chars: 20,
  },
});

const ALLOWED_SECTIONS = Object.freeze(['general', 'parameters']);

function settingsError(message) {
  return Object.assign(new Error(message), { status: 400, code: 'SETTINGS_INVALID' });
}

const INT_RANGES = Object.freeze({
  super_admin_threshold: [1, Number.MAX_SAFE_INTEGER],
  minimum_payout_amount: [100000, Number.MAX_SAFE_INTEGER],
  maximum_weekly_payout_requests: [1, 100],
  payment_timeout_minutes: [1, 10080],
  orders_per_page: [1, 500],
  course_review_hours: [1, 8760],
  s_match_threshold: [0, 100],
  roadmap_mastery_threshold: [0, 100],
  roadmap_knowledge_gap_threshold: [0, 100],
  min_courses_per_milestone: [1, 100],
  test_pass_score: [0, 100],
  student_lock_min_chars: [1, 1000],
  lecturer_discipline_min_chars: [1, 1000],
  course_reject_min_chars: [1, 1000],
});

function validateSettings(settings) {
  const { general, parameters } = settings;
  if (!general || typeof general !== 'object' || Array.isArray(general)
    || !parameters || typeof parameters !== 'object' || Array.isArray(parameters)) {
    throw settingsError('Cấu hình chung và tham số hệ thống phải là đối tượng.');
  }
  const generalKeys = new Set(Object.keys(DEFAULT_SYSTEM_SETTINGS.general));
  const parameterKeys = new Set(Object.keys(DEFAULT_SYSTEM_SETTINGS.parameters));
  if (Object.keys(general).some(key => !generalKeys.has(key))
    || Object.keys(parameters).some(key => !parameterKeys.has(key))) {
    throw settingsError('Cấu hình chứa trường không được hỗ trợ.');
  }
  for (const [key, value] of Object.entries(general)) {
    if (typeof value !== 'string' || value.length > 500) throw settingsError(`Trường ${key} phải là chuỗi tối đa 500 ký tự.`);
  }
  const merged = {
    general: { ...DEFAULT_SYSTEM_SETTINGS.general, ...general },
    parameters: { ...DEFAULT_SYSTEM_SETTINGS.parameters, ...parameters },
  };
  for (const [key, [min, max]] of Object.entries(INT_RANGES)) {
    const value = merged.parameters[key];
    if (!Number.isSafeInteger(value) || value < min || value > max) {
      throw settingsError(`Tham số ${key} phải là số nguyên trong khoảng ${min}–${max}.`);
    }
  }
  const taxRate = merged.parameters.tax_rate;
  if (typeof taxRate !== 'number' || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 1) {
    throw settingsError('Thuế suất phải nằm trong khoảng 0–1.');
  }
  if (!Number.isSafeInteger(merged.parameters.tax_threshold) || merged.parameters.tax_threshold < 0) {
    throw settingsError('Ngưỡng thuế phải là số nguyên không âm.');
  }
  const platform = merged.parameters.platform_revenue_share_percent;
  const instructor = merged.parameters.instructor_revenue_share_percent;
  if (!Number.isSafeInteger(platform) || platform < 0 || platform > 100
    || !Number.isSafeInteger(instructor) || instructor < 0 || instructor > 100
    || platform + instructor !== 100) {
    throw settingsError('Tỷ lệ chia doanh thu phải là số nguyên từ 0–100 và tổng bằng 100%.');
  }
  try {
    const timezone = String(merged.general.timezone);
    const match = /^GMT([+-])(\d\d):(\d\d)$/.exec(timezone);
    const normalized = match
      ? match[2] === '00' && match[3] === '00' ? 'UTC'
        : match[1] === '+' ? `Etc/GMT-${Number(match[2])}` : `Etc/GMT+${Number(match[2])}`
      : timezone;
    if (match && (Number(match[2]) > 14 || Number(match[3]) > 59 || (Number(match[2]) === 14 && Number(match[3]) !== 0))) throw new Error('invalid offset');
    new Intl.DateTimeFormat('en', { timeZone: normalized });
  } catch {
    throw settingsError('Múi giờ hệ thống không hợp lệ.');
  }
  if (merged.parameters.roadmap_knowledge_gap_threshold > merged.parameters.roadmap_mastery_threshold) {
    throw settingsError('Ngưỡng cảnh báo lỗ hổng không được vượt ngưỡng mastery.');
  }
  return merged;
}

function pickAllowedSections(updates = {}) {
  const result = {};
  for (const section of ALLOWED_SECTIONS) {
    if (updates[section] === undefined) continue;
    if (!updates[section] || typeof updates[section] !== 'object' || Array.isArray(updates[section])) {
      throw settingsError(`Mục ${section} phải là đối tượng.`);
    }
    result[section] = updates[section];
  }
  return result;
}

/** Đọc duy nhất Cài đặt chung và Tham số hệ thống. */
export async function getSystemSettings(db) {
  const collection = db.collection(SETTINGS_COLLECTION);
  const doc = await collection.findOne({ _id: CONFIG_DOC_ID }) || DEFAULT_SYSTEM_SETTINGS;

  return {
    general: { ...DEFAULT_SYSTEM_SETTINGS.general, ...(doc.general || {}) },
    parameters: { ...DEFAULT_SYSTEM_SETTINGS.parameters, ...(doc.parameters || {}) },
  };
}

/** Cập nhật giới hạn ở Cài đặt chung và Tham số hệ thống. */
export async function updateSystemSettings(db, {
  saActor,
  updates = {},
  saOtp,
  client_context = {},
}) {
  await verifySuperAdminOtp(db, saActor.admin_id, saOtp);

  const collection = db.collection(SETTINGS_COLLECTION);
  const existing = await collection.findOne({ _id: CONFIG_DOC_ID });
  const currentDoc = existing || DEFAULT_SYSTEM_SETTINGS;
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)
    || Object.keys(updates).some(key => !ALLOWED_SECTIONS.includes(key))) {
    throw settingsError('Payload cấu hình không hợp lệ.');
  }
  const allowedUpdates = pickAllowedSections(updates);
  const updateFields = {
    updated_at: new Date(),
    updated_by: new ObjectId(saActor.admin_id),
  };

  for (const section of ALLOWED_SECTIONS) {
    if (allowedUpdates[section]) {
      updateFields[section] = {
        ...DEFAULT_SYSTEM_SETTINGS[section],
        ...(currentDoc[section] || {}),
        ...allowedUpdates[section],
      };
    }
  }

  const merged = validateSettings({
    general: updateFields.general || currentDoc.general || DEFAULT_SYSTEM_SETTINGS.general,
    parameters: updateFields.parameters || currentDoc.parameters || DEFAULT_SYSTEM_SETTINGS.parameters,
  });
  updateFields.general = merged.general;
  updateFields.parameters = merged.parameters;

  const filter = { _id: CONFIG_DOC_ID };
  for (const section of ALLOWED_SECTIONS) {
    filter[section] = existing?.[section] ?? { $exists: false };
  }
  let saved;
  try {
    saved = await collection.findOneAndUpdate(filter,
      { $set: updateFields, $setOnInsert: { created_at: new Date() } },
      { upsert: !existing, returnDocument: 'after', projection: { general: 1, parameters: 1 } }
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
  if (!saved) {
    throw Object.assign(new Error('Cấu hình đã thay đổi. Vui lòng tải lại trước khi lưu.'), {
      status: 409, code: 'SETTINGS_CONFLICT',
    });
  }

  await createAuditRecord(db, {
    actor: saActor,
    module: 'system_settings',
    module_label: 'Cấu hình sàn',
    action: 'update_settings',
    action_label: 'Lưu cài đặt chung và tham số hệ thống',
    outcome: 'success',
    risk_level: 'high',
    target: {
      id: 'SYS-CONFIG',
      entity_type: 'system_settings',
      name: 'Cài đặt chung và tham số hệ thống',
      meta: 'Cập nhật cấu hình được hỗ trợ',
    },
    client_context,
    basis: { reason: 'Cập nhật cài đặt chung hoặc tham số hệ thống bởi Quản trị tối cao' },
    diff: { before: { general: currentDoc.general, parameters: currentDoc.parameters },
      after: { general: updateFields.general, parameters: updateFields.parameters } },
  });

  return {
    success: true,
    message: 'Đã lưu cấu hình thành công.',
    settings: { general: saved.general, parameters: saved.parameters },
  };
}

export async function resetSystemSettings(db, { saActor, saOtp, client_context = {} }) {
  await verifySuperAdminOtp(db, saActor.admin_id, saOtp);
  const collection = db.collection(SETTINGS_COLLECTION);
  const currentDoc = await collection.findOne({ _id: CONFIG_DOC_ID }) || DEFAULT_SYSTEM_SETTINGS;
  const now = new Date();
  const reset = {
    general: { ...DEFAULT_SYSTEM_SETTINGS.general },
    parameters: { ...DEFAULT_SYSTEM_SETTINGS.parameters },
  };
  await collection.updateOne({ _id: CONFIG_DOC_ID }, { $set: {
    ...reset, updated_at: now, updated_by: new ObjectId(saActor.admin_id),
  } }, { upsert: true });
  await createAuditRecord(db, {
    actor: saActor, module: 'system_settings', module_label: 'Cấu hình sàn',
    action: 'reset_settings', action_label: 'Đặt lại toàn bộ cấu hình sàn',
    outcome: 'success', risk_level: 'high',
    target: { id: CONFIG_DOC_ID, entity_type: 'system_settings', name: 'Toàn bộ cấu hình sàn', meta: 'Khôi phục giá trị mặc định' },
    client_context, basis: { reason: 'Đặt lại toàn bộ cấu hình về mặc định bởi Super Admin' },
    diff: { before: { general: currentDoc.general, parameters: currentDoc.parameters }, after: reset },
  });
  return { success: true, message: 'Đã đặt lại toàn bộ cấu hình về mặc định.' };
}
