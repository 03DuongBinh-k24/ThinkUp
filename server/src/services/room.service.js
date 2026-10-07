import bcrypt from 'bcryptjs';
import {
  findAllRooms,
  findRoomById,
  findRoomPasswordById,
  createRoom,
  findJoinRequestsByRoom,
  findPendingJoinRequest,
  createJoinRequest,
  updateJoinRequestStatus,
  findJoinRequestById,
} from '../models/room.model.js';

const VALID_INVITE_MODES = ['link', 'code', 'password', 'approval'];

const generateRoomId = () => Math.random().toString(36).substring(2, 12);
const generateRequestId = () => `rq-${Math.random().toString(36).substring(2, 12)}`;
export function normalizeRoom(room) {
  return {
    roomId: room.roomId,
    name: room.name,
    type: room.type || 'public',
    maxUsers: Number(room.maxUsers || 20),
    currentUsers: Number(room.currentUsers || 0),
    status: room.status || 'idle',
    tags: parseTags(room.tags),
    category: room.category || 'General Study',
    language: room.language || 'Vietnamese',
    template: room.template || 'study-group',
    theme: room.theme || 'minimal',
    description: room.description || '',
    inviteMode: room.inviteMode || (room.type === 'private' && room.password ? 'password' : 'link'),
    approvalRequired: Boolean(room.approvalRequired),
    rating: room.rating === null || room.rating === undefined ? null : Number(room.rating),
    waitlistCount: Number(room.waitlistCount || 0),
  };
}

function parseTags(tags) {
  if (Array.isArray(tags)) return tags;
  if (typeof tags !== 'string') return [];
  try {
    return JSON.parse(tags || '[]');
  } catch {
    return [];
  }
}
export function normalizeJoinRequest(request) {
  return {
    requestId: request.requestId,
    roomId: request.roomId,
    requesterId: request.requesterId,
    requesterName: request.requesterName,
    note: request.note || '',
    status: request.status || 'pending',
    createdAt: request.createdAt instanceof Date
      ? request.createdAt.toISOString()
      : request.createdAt,
  };
}
export async function getAllRooms() {
  const rows = await findAllRooms();
  return rows.map(normalizeRoom);
}
export async function createStudyRoom(payload) {
  const {
    name,
    type = 'public',
    password,
    maxUsers = 20,
    tags = [],
    category = 'General Study',
    language = 'Vietnamese',
    template = 'study-group',
    theme = 'minimal',
    description = '',
    inviteMode,
    approvalRequired = false,
    rating = null,
    waitlistCount = 0,
  } = payload;
  if (!name || name.trim().length < 2) {
    throw new Error('Tên phòng phải có ít nhất 2 ký tự');
  }

  const normalizedInviteMode = VALID_INVITE_MODES.includes(inviteMode)
    ? inviteMode
    : type === 'private' ? 'password' : 'link';

  if (type === 'private' && normalizedInviteMode === 'password' && (!password || password.length < 4)) {
    throw new Error('Phòng riêng tư dùng mật khẩu cần ít nhất 4 ký tự');
  }

  const roomId = generateRoomId();
  const hashedPassword = (type === 'private' && normalizedInviteMode === 'password' && password)
    ? await bcrypt.hash(password, 10)
    : null;
  const finalApprovalRequired = normalizedInviteMode === 'approval' || approvalRequired;

  await createRoom({
    roomId,
    name: name.trim(),
    type,
    hashedPassword,
    maxUsers,
    tags,
    category,
    language,
    template,
    theme,
    description,
    inviteMode: normalizedInviteMode,
    approvalRequired: finalApprovalRequired,
    rating,
    waitlistCount,
  });

  return normalizeRoom({
    roomId,
    name: name.trim(),
    type,
    maxUsers,
    currentUsers: 0,
    status: 'idle',
    tags,
    category,
    language,
    template,
    theme,
    description,
    inviteMode: normalizedInviteMode,
    approvalRequired: finalApprovalRequired,
    rating,
    waitlistCount,
  });
}
export async function verifyRoomPassword(roomId, password) {
  if (!roomId) throw new Error('Thiếu roomId');

  const room = await findRoomPasswordById(roomId);
  if (!room) throw new Error('Phòng không tồn tại');

  if (room.type !== 'private') return { verified: true };

  const inviteMode = room.inviteMode || (room.password ? 'password' : 'link');

  if (inviteMode === 'approval' || room.approvalRequired) {
    return { verified: false, approvalRequired: true, roomId };
  }

  if (inviteMode !== 'password') return { verified: true, roomId };

  if (!password) throw new Error('Vui lòng nhập mật khẩu');
  if (!room.password) throw new Error('Lỗi bảo mật phòng');

  const isMatch = await bcrypt.compare(password, room.password);
  if (!isMatch) throw new Error('Mật khẩu không đúng');

  return { verified: true, roomId };
}
export async function getJoinRequestsByRoom(roomId, status = 'pending') {
  if (!roomId) throw new Error('Thiếu roomId');
  const rows = await findJoinRequestsByRoom(roomId, status);
  return rows.map(normalizeJoinRequest);
}
export async function submitJoinRequest({ roomId, requesterId = 'guest', requesterName = 'Bạn', note = '' }) {
  if (!roomId) throw new Error('Thiếu roomId');
  if (!requesterName?.trim()) throw new Error('Thiếu tên người yêu cầu');

  const room = await findRoomById(roomId);
  if (!room) throw new Error('Phòng không tồn tại');

  const needsApproval = room.type === 'private' && (room.inviteMode === 'approval' || room.approvalRequired);
  if (!needsApproval) throw new Error('Phòng này không cần duyệt vào');
  const existing = await findPendingJoinRequest(roomId, requesterId);
  if (existing) {
    return { request: normalizeJoinRequest(existing), duplicate: true };
  }

  const requestId = generateRequestId();
  await createJoinRequest({
    requestId, roomId, requesterId,
    requesterName: requesterName.trim(),
    note,
  });

  return {
    request: normalizeJoinRequest({
      requestId, roomId, requesterId,
      requesterName: requesterName.trim(),
      note, status: 'pending',
      createdAt: new Date().toISOString(),
    }),
    duplicate: false,
  };
}
export async function updateJoinRequest(requestId, status) {
  if (!requestId) throw new Error('Thiếu requestId');

  const normalizedStatus = String(status || '').toLowerCase();
  if (!['accepted', 'declined'].includes(normalizedStatus)) {
    throw new Error('Trạng thái không hợp lệ');
  }

  await updateJoinRequestStatus(requestId, normalizedStatus);

  const updated = await findJoinRequestById(requestId);
  if (!updated) throw new Error('Yêu cầu không tồn tại');

  return normalizeJoinRequest(updated);
}
export async function joinWaitlist({ roomId, name = 'Bạn' }) {
  if (!roomId) throw new Error('Thiếu roomId');

  const room = await findRoomById(roomId);
  if (!room) throw new Error('Phòng không tồn tại');

  if (Number(room.currentUsers || 0) < Number(room.maxUsers || 0)) {
    const err = new Error('Phòng vẫn còn chỗ, có thể vào trực tiếp');
    err.code = 'ROOM_NOT_FULL';
    throw err;
  }
  const { incrementWaitlistCount } = await import('../models/room.model.js');
  const nextCount = await incrementWaitlistCount(roomId);

  return {
    roomId,
    name,
    position: nextCount,
    estimatedMinutes: Math.max(2, nextCount * 3),
  };
}
