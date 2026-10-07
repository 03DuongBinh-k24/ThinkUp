import { getPool } from '../config/db.config.js';

async function ensureTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS course_instructor_settings (
      course_id VARCHAR(255) PRIMARY KEY,
      owner_user_id VARCHAR(255) NOT NULL,
      settings JSON NOT NULL,
      certificate_signer_id VARCHAR(255),
      signature_file_name VARCHAR(255),
      signature_mime_type VARCHAR(100),
      signature_data LONGBLOB,
      signature_updated_at TIMESTAMP NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_course_settings_owner (owner_user_id)
    )
  `);
  const requiredColumns = [
    ['certificate_signer_id', 'VARCHAR(255) NULL'],
    ['signature_file_name', 'VARCHAR(255) NULL'],
    ['signature_mime_type', 'VARCHAR(100) NULL'],
    ['signature_data', 'LONGBLOB NULL'],
    ['signature_updated_at', 'TIMESTAMP NULL'],
  ];
  for (const [name, definition] of requiredColumns) {
    const [[column]] = await pool.query(`SELECT COUNT(*) count FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='course_instructor_settings' AND COLUMN_NAME=?`, [name]);
    if (!Number(column.count)) await pool.query(`ALTER TABLE course_instructor_settings ADD COLUMN ${name} ${definition}`);
  }
}

const parseSettings = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return null; }
};

async function getRecord(courseId) {
  const pool = await getPool();
  await ensureTable(pool);
  const [rows] = await pool.query(
    `SELECT course_id, owner_user_id, settings, certificate_signer_id, signature_file_name,
            signature_mime_type, signature_updated_at
     FROM course_instructor_settings WHERE course_id = ? LIMIT 1`,
    [courseId]
  );
  if (!rows[0]) return null;
  return { ...rows[0], settings: parseSettings(rows[0].settings) };
}

export async function getOwnedCourseSettings(courseId, ownerUserId) {
  const record = await getRecord(courseId);
  if (!record) return { found: false, owned: true, data: null };
  if (String(record.owner_user_id) !== String(ownerUserId)) return { found: true, owned: false, data: null };
  return { found: true, owned: true, data: record.settings };
}

export async function saveOwnedCourseSettings(courseId, ownerUserId, settings) {
  const pool = await getPool();
  await ensureTable(pool);
  await pool.query(
    `INSERT INTO course_instructor_settings (course_id, owner_user_id, settings)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       settings = IF(owner_user_id = VALUES(owner_user_id), VALUES(settings), settings)`,
    [courseId, String(ownerUserId), JSON.stringify(settings)]
  );
  return getOwnedCourseSettings(courseId, ownerUserId);
}

export async function saveOwnedCourseSignature(courseId, ownerUserId, signerId, file) {
  const pool = await getPool();
  await ensureTable(pool);
  const data = Buffer.from(await file.arrayBuffer());
  await pool.query(
    `INSERT INTO course_instructor_settings
       (course_id, owner_user_id, settings, certificate_signer_id, signature_file_name, signature_mime_type, signature_data, signature_updated_at)
     VALUES (?, ?, JSON_OBJECT('certificateSignerInstructorId', ?, 'certificateSignatureAssetId', CONCAT('signature-', ?), 'certificateSignatureFileName', ?), ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       certificate_signer_id = IF(owner_user_id = VALUES(owner_user_id), VALUES(certificate_signer_id), certificate_signer_id),
       signature_file_name = IF(owner_user_id = VALUES(owner_user_id), VALUES(signature_file_name), signature_file_name),
       signature_mime_type = IF(owner_user_id = VALUES(owner_user_id), VALUES(signature_mime_type), signature_mime_type),
       signature_data = IF(owner_user_id = VALUES(owner_user_id), VALUES(signature_data), signature_data),
       signature_updated_at = IF(owner_user_id = VALUES(owner_user_id), NOW(), signature_updated_at),
       settings = IF(owner_user_id = VALUES(owner_user_id),
         JSON_SET(
           JSON_REMOVE(settings, '$.certificateSignatureDataUrl', '$.certificateSignatureUrl'),
           '$.certificateSignerInstructorId', VALUES(certificate_signer_id),
           '$.certificateSignatureAssetId', CONCAT('signature-', VALUES(course_id)),
           '$.certificateSignatureFileName', VALUES(signature_file_name)
         ), settings)`,
    [courseId, String(ownerUserId), String(signerId), String(courseId), file.name, String(signerId), file.name, file.type, data]
  );
  return getRecord(courseId);
}

export async function deleteOwnedCourseSignature(courseId, ownerUserId) {
  const pool = await getPool();
  await ensureTable(pool);
  const [result] = await pool.query(
    `UPDATE course_instructor_settings
     SET signature_file_name = NULL, signature_mime_type = NULL,
         signature_data = NULL, signature_updated_at = NULL,
         settings = JSON_SET(
           JSON_REMOVE(settings, '$.certificateSignatureDataUrl', '$.certificateSignatureUrl'),
           '$.certificateSignatureAssetId', '', '$.certificateSignatureFileName', ''
         )
     WHERE course_id = ? AND owner_user_id = ?`,
    [courseId, String(ownerUserId)]
  );
  const record = await getRecord(courseId);
  return { found: Boolean(record), owned: Boolean(result.affectedRows) || String(record?.owner_user_id) === String(ownerUserId) };
}
