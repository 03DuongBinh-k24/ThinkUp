import { getPool } from '../config/db.config.js';

async function query(sql, params = []) {
  const pool = await getPool();
  const [results] = await pool.execute(sql, params);
  return results;
}
export async function findAllRooms() {
  return query(`
    SELECT
      roomId, name, type, maxUsers, currentUsers, status, tags,
      category, language, template, theme, description,
      inviteMode, approvalRequired, rating, waitlistCount, updatedAt
    FROM rooms
    ORDER BY currentUsers DESC, updatedAt DESC
  `);
}
export async function findRoomById(roomId) {
  const rows = await query(
    'SELECT * FROM rooms WHERE roomId = ? LIMIT 1',
    [roomId]
  );
  return rows[0] || null;
}
export async function findRoomPasswordById(roomId) {
  const rows = await query(
    'SELECT password, type, inviteMode, approvalRequired FROM rooms WHERE roomId = ?',
    [roomId]
  );
  return rows[0] || null;
}
export async function createRoom({
  roomId, name, type, hashedPassword, maxUsers,
  tags, category, language, template, theme,
  description, inviteMode, approvalRequired, rating, waitlistCount,
}) {
  return query(
    `INSERT INTO rooms (
      roomId, name, type, password, maxUsers, currentUsers, status, tags,
      category, language, template, theme, description,
      inviteMode, approvalRequired, rating, waitlistCount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      roomId, name, type, hashedPassword, maxUsers,
      0, 'idle', JSON.stringify(tags),
      category, language, template, theme, description,
      inviteMode, approvalRequired ? 1 : 0, rating, waitlistCount,
    ]
  );
}
export async function incrementWaitlistCount(roomId) {
  await query('UPDATE rooms SET waitlistCount = waitlistCount + 1 WHERE roomId = ?', [roomId]);
  const rows = await query('SELECT waitlistCount FROM rooms WHERE roomId = ?', [roomId]);
  return rows[0]?.waitlistCount || 1;
}
export async function findJoinRequestsByRoom(roomId, status = 'pending') {
  return query(
    `SELECT requestId, roomId, requesterId, requesterName, note, status, createdAt
     FROM room_join_requests
     WHERE roomId = ? AND status = ?
     ORDER BY createdAt ASC`,
    [roomId, status]
  );
}
export async function findPendingJoinRequest(roomId, requesterId) {
  const rows = await query(
    `SELECT requestId, roomId, requesterId, requesterName, note, status, createdAt
     FROM room_join_requests
     WHERE roomId = ? AND requesterId = ? AND status = 'pending'
     LIMIT 1`,
    [roomId, requesterId]
  );
  return rows[0] || null;
}
export async function createJoinRequest({ requestId, roomId, requesterId, requesterName, note }) {
  return query(
    `INSERT INTO room_join_requests (requestId, roomId, requesterId, requesterName, note, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [requestId, roomId, requesterId, requesterName, note]
  );
}
export async function updateJoinRequestStatus(requestId, status) {
  return query(
    'UPDATE room_join_requests SET status = ? WHERE requestId = ?',
    [status, requestId]
  );
}
export async function findJoinRequestById(requestId) {
  const rows = await query(
    `SELECT requestId, roomId, requesterId, requesterName, note, status, createdAt
     FROM room_join_requests
     WHERE requestId = ? LIMIT 1`,
    [requestId]
  );
  return rows[0] || null;
}
