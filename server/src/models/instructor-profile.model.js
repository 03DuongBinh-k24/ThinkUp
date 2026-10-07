import { getPool } from '../config/db.config.js';
import { query } from './user.model.js'; // Reuse query helper

/**
 * Lấy profile giảng viên theo userId.
 * @param {number} userId
 * @returns {Promise<object|null>}
 */
export async function getProfileByUserId(userId) {
  await ensureSettingsColumns();
  const rows = await query(
    'SELECT * FROM instructor_profiles WHERE instructor_id = ? LIMIT 1',
    [userId]
  );
  return rows[0] || null;
}

/**
 * Upsert instructor profile (Cập nhật nếu đã có, thêm mới nếu chưa có).
 * @param {number} userId
 * @param {object} payload
 */
export async function upsertInstructorProfile(userId, payload) {
  await ensureSettingsColumns();
  const existing = await getProfileByUserId(userId);
  
  if (existing) {
    // Update
    const updates = [];
    const values = [];
    
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (updates.length === 0) return true; // Nothing to update
    
    values.push(userId);
    return query(
      `UPDATE instructor_profiles SET ${updates.join(', ')} WHERE instructor_id = ?`,
      values
    );
  } else {
    // Insert
    const keys = ['instructor_id'];
    const placeholders = ['?'];
    const values = [userId];
    
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined) {
        keys.push(key);
        placeholders.push('?');
        values.push(value);
      }
    }
    
    return query(
      `INSERT INTO instructor_profiles (${keys.join(', ')}) VALUES (${placeholders.join(', ')})`,
      values
    );
  }
}

async function ensureSettingsColumns() {
  const pool = await getPool();
  const columns = {
    title: 'VARCHAR(200) NULL', website: 'VARCHAR(500) NULL', facebook: 'VARCHAR(500) NULL', youtube: 'VARCHAR(500) NULL', instagram: 'VARCHAR(500) NULL',
    payout_method: "VARCHAR(30) DEFAULT 'bank'", bank_name: 'VARCHAR(120) NULL', bank_account_name: 'VARCHAR(200) NULL', bank_account_number: 'VARCHAR(100) NULL',
    bank_branch: 'VARCHAR(200) NULL', paypal_email: 'VARCHAR(255) NULL', auto_payout_threshold: 'DECIMAL(14,2) DEFAULT 5000000', auto_payout_enabled: 'TINYINT(1) DEFAULT 1'
    , paypal_link_email: 'VARCHAR(255) NULL', paypal_link_status: "VARCHAR(20) DEFAULT ''"
  };
  for (const [name, definition] of Object.entries(columns)) {
    const [rows] = await pool.query('SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?', ['instructor_profiles', name]);
    if (!rows.length) await pool.query(`ALTER TABLE instructor_profiles ADD COLUMN ${name} ${definition}`);
  }
}
