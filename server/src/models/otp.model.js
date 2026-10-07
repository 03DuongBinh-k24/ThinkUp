import { getPool } from '../config/db.config.js';

async function query(sql, params = []) {
  const pool = await getPool();
  const [results] = await pool.execute(sql, params);
  return results;
}
export async function findValidOtp(email, code, purpose) {
  const rows = await query(
    `SELECT * FROM otp_codes
     WHERE email = ? AND code = ? AND purpose = ? AND used = 0 AND expires_at > NOW()
       AND id = (
         SELECT id FROM (
           SELECT id FROM otp_codes
           WHERE email = ? AND purpose = ? AND used = 0 AND expires_at > NOW()
           ORDER BY created_at DESC, id DESC
           LIMIT 1
         ) AS newest_otp
       )
     LIMIT 1`,
    [email, code, purpose, email, purpose]
  );
  return rows[0] || null;
}

export async function findLatestActiveOtp(email, purpose) {
  const rows = await query(
    `SELECT id FROM otp_codes
     WHERE email = ? AND purpose = ? AND used = 0 AND expires_at > NOW()
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [email, purpose]
  );
  return rows[0] || null;
}
export async function markOtpUsed(otpId) {
  // Điều kiện này giúp hai lần bấm xác thực cùng lúc chỉ có đúng một lần thành công.
  return query(
    'UPDATE otp_codes SET used = 1 WHERE id = ? AND used = 0 AND expires_at > NOW()',
    [otpId]
  );
}
export async function deleteOtpByEmailPurpose(email, purpose) {
  return query(
    'DELETE FROM otp_codes WHERE email = ? AND purpose = ?',
    [email, purpose]
  );
}
export async function createOtp(email, code, purpose, expiresInMinutes) {
  return query(
    `INSERT INTO otp_codes (email, code, purpose, expires_at)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
    [email, code, purpose, expiresInMinutes]
  );
}
export async function findRecentOtp(email, purpose) {
  const rows = await query(
    `SELECT created_at FROM otp_codes
     WHERE email = ? AND purpose = ? AND used = 0 AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [email, purpose]
  );
  return rows[0] || null;
}
