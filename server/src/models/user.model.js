import { getPool } from '../config/db.config.js';
export async function query(sql, params = []) {
  try {
    const pool = await getPool();
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (err) {
    console.error('[MySQL Query Error]:', err.message);
    throw err;
  }
}
export async function findUserByEmail(email, provider = null) {
  const sql = provider
    ? 'SELECT * FROM users WHERE email = ? AND provider = ? LIMIT 1'
    : 'SELECT * FROM users WHERE email = ? LIMIT 1';
  const params = provider ? [email, provider] : [email];
  const rows = await query(sql, params);
  return rows[0] || null;
}
export async function findUserByProviderId(provider, providerId) {
  const rows = await query(
    'SELECT id, role FROM users WHERE provider = ? AND provider_id = ? LIMIT 1',
    [provider, providerId]
  );
  return rows[0] || null;
}
export async function findUserById(id) {
  const rows = await query(
    'SELECT id, full_name, email, phone, role, avatar_url, status, sessions_revoked_at FROM users WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}
export async function findUserByPhone(phone) {
  const rows = await query(
    'SELECT id, email, phone, full_name, status FROM users WHERE phone = ? LIMIT 1',
    [phone]
  );
  return rows[0] || null;
}
export async function createLocalUser({ fullName, email, phone, passwordHash }) {
  return query(
    `INSERT INTO users (full_name, email, phone, password_hash, provider, status)
     VALUES (?, ?, ?, ?, 'local', 'pending')`,
    [fullName, email, phone || null, passwordHash]
  );
}
export async function updateFailedLoginAttempts(userId, attempts, lockedUntil = null) {
  if (lockedUntil) {
    return query(
      'UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?',
      [attempts, lockedUntil, userId]
    );
  }
  return query(
    'UPDATE users SET failed_login_attempts = ? WHERE id = ?',
    [attempts, userId]
  );
}
export async function resetLoginAttempts(userId) {
  return query(
    'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?',
    [userId]
  );
}
export async function activateUserByEmail(email) {
  return query(
    `UPDATE users SET status = 'active', email_verified_at = NOW()
     WHERE email = ? AND status = 'pending'`,
    [email]
  );
}
export async function updatePassword(userId, passwordHash) {
  return query(
    `UPDATE users
     SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL, status = 'active'
     WHERE id = ?`,
    [passwordHash, userId]
  );
}
export async function upsertOAuthUser({ email, name, provider, providerId, avatar }) {
  let existing;
  if (email) {
    existing = await query(
      'SELECT id, status, email, provider FROM users WHERE (provider = ? AND provider_id = ?) OR email = ? LIMIT 1',
      [provider, providerId, email]
    );
  } else {
    existing = await query(
      'SELECT id, status, email, provider FROM users WHERE provider = ? AND provider_id = ? LIMIT 1',
      [provider, providerId]
    );
  }

  if (existing.length === 0) {
    return query(
      `INSERT INTO users (full_name, email, provider, provider_id, status, avatar_url, email_verified_at, email_locked)\r\n       VALUES (?, ?, ?, ?, 'active', ?, NOW(), 0)`,
      [name || 'Người dùng', email || null, provider, providerId, avatar || null]
    );
  }

  if (existing[0].status === 'locked') {
    throw new Error('ACCOUNT_LOCKED');
  }

  if (email && existing[0].email === email && existing[0].provider !== provider) {
    const providerName = existing[0].provider === 'local' ? 'mật khẩu' : (existing[0].provider === 'google' ? 'Google' : 'Facebook');
    throw new Error(`Email này đã được liên kết với tài khoản ${providerName}. Vui lòng đăng nhập bằng ${providerName}.`);
  }
  if (existing[0].email) {
    return query(
      'UPDATE users SET avatar_url = ?, provider_id = ?, updated_at = NOW() WHERE id = ?',
      [avatar || null, providerId, existing[0].id]
    );
  } else if (email) {
    return query(
      'UPDATE users SET avatar_url = ?, provider_id = ?, updated_at = NOW() WHERE id = ?',
      [avatar || null, providerId, existing[0].id]
    );
  }

  return query(
    'UPDATE users SET avatar_url = ?, provider_id = ?, updated_at = NOW() WHERE id = ?',
    [avatar || null, providerId, existing[0].id]
  );
}
export async function updateUserFullName(userId, fullName) {
  return query(
    'UPDATE users SET full_name = ? WHERE id = ?',
    [fullName, userId]
  );
}
export async function updateUserPhone(userId, phone) {
  return query(
    'UPDATE users SET phone = ? WHERE id = ?',
    [phone || null, userId]
  );
}
export async function updateUserEmailFirstTime(userId, email) {
  return query(
    'UPDATE users SET email = ?, email_locked = 1, updated_at = NOW() WHERE id = ? AND (email IS NULL OR email = \'\') AND email_locked = 0',
    [email.toLowerCase(), userId]
  );
}
export async function findUserFullById(id) {
  const rows = await query(
    'SELECT id, full_name, email, role, avatar_url, status, provider, email_locked FROM users WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}
