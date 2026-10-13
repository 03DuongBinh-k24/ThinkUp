// TODO(pre-deploy): Nhớ xóa người dùng mô phỏng này khi phiên phòng dùng danh tính từ AuthService và thành viên từ realtime service.
export const MOCK_STUDY_ROOM_USER = { name: 'Minh Khoa', initials: 'MK', role: 'owner' } as const;
// TODO(pre-deploy): Nhớ xóa cấu hình quyền mô phỏng khi thay bằng cấu hình phòng thật từ API.
export const MOCK_ROOM_PERMISSIONS = { voiceEnabled: true, cameraEnabled: true, chatEnabled: true, whiteboardLocked: false, participantShareScreen: false, participantUpload: true };
