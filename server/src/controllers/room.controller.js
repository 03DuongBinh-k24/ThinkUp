import {
  getAllRooms,
  createStudyRoom,
  verifyRoomPassword,
  getJoinRequestsByRoom,
  submitJoinRequest,
  updateJoinRequest,
} from '../services/room.service.js';
import { apiError } from '../utils/response.util.js';
import { NextResponse } from 'next/server';
export async function getRooms() {
  try {
    const rooms = await getAllRooms();
    return NextResponse.json({ rooms });
  } catch (err) {
    console.error('[getRooms]', err);
    return NextResponse.json({ error: 'Lỗi lấy danh sách phòng' }, { status: 500 });
  }
}
export async function postRoom(req) {
  try {
    const body = await req.json();
    const room = await createStudyRoom(body);
    return NextResponse.json({ room }, { status: 201 });
  } catch (err) {
    const status = err.message.includes('ít nhất') || err.message.includes('cần ít nhất') ? 400 : 500;
    return NextResponse.json({ error: err.message || 'Lỗi tạo phòng học' }, { status });
  }
}
export async function verifyPassword(req) {
  try {
    const { roomId, password } = await req.json();
    const result = await verifyRoomPassword(roomId, password);
    return NextResponse.json(result);
  } catch (err) {
    const status = err.message.includes('không tồn tại') ? 404
      : err.message.includes('không đúng') ? 401
      : err.message.includes('Thiếu') ? 400
      : 500;
    return NextResponse.json({ error: err.message || 'Lỗi xác minh mật khẩu' }, { status });
  }
}
export async function getJoinRequests(req) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    const status = searchParams.get('status') || 'pending';

    const requests = await getJoinRequestsByRoom(roomId, status);
    return NextResponse.json({ requests });
  } catch (err) {
    const status = err.message.includes('Thiếu') ? 400 : 500;
    return NextResponse.json({ error: err.message || 'Lỗi lấy danh sách yêu cầu' }, { status });
  }
}
export async function postJoinRequest(req) {
  try {
    const body = await req.json();
    const { request, duplicate } = await submitJoinRequest(body);
    const httpStatus = duplicate ? 200 : 201;
    return NextResponse.json({ request, duplicate }, { status: httpStatus });
  } catch (err) {
    const status = err.message.includes('không tồn tại') ? 404
      : err.message.includes('không cần duyệt') ? 409
      : err.message.includes('Thiếu') ? 400
      : 500;
    return NextResponse.json({ error: err.message || 'Lỗi gửi yêu cầu vào phòng' }, { status });
  }
}
export async function patchJoinRequest(req) {
  try {
    const { requestId, status } = await req.json();
    const request = await updateJoinRequest(requestId, status);
    return NextResponse.json({ request });
  } catch (err) {
    const httpStatus = err.message.includes('không tồn tại') ? 404
      : err.message.includes('Thiếu') || err.message.includes('không hợp lệ') ? 400
      : 500;
    return NextResponse.json({ error: err.message || 'Lỗi cập nhật yêu cầu vào phòng' }, { status: httpStatus });
  }
}
export async function postWaitlist(req) {
  try {
    const body = await req.json();
    const { joinWaitlist } = await import('../services/room.service.js');
    const result = await joinWaitlist(body);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const status = err.message.includes('không tồn tại') ? 404
      : err.code === 'ROOM_NOT_FULL' ? 409
      : err.message.includes('Thiếu') ? 400
      : 500;
    return NextResponse.json({ error: err.message || 'Lỗi tham gia waitlist' }, { status });
  }
}
