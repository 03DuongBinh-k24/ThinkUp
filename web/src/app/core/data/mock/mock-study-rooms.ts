// TODO(pre-deploy): Nhớ xóa dữ liệu mock này khi thay bằng dữ liệu thật.
import { StudyRoomItem } from '../../../features/study-room/models/study-room.model';

export const STUDY_ROOM_TOPICS = [
  'Tất cả',
  'Lập trình',
  'UI/UX & Thiết kế',
  'TOEIC / IELTS',
  'Tự học',
  'Focus Session',
  'Study Group'
];

export const MOCK_STUDY_ROOMS: StudyRoomItem[] = [
  {
    roomId: 'thinkup-official-1', name: 'Hỏi đáp & Hướng dẫn ThinkUp', type: 'public', maxUsers: 50, currentUsers: 15,
    status: 'idle', tags: ['Cộng đồng', 'Hỗ trợ'], category: 'Community', theme: 'thinkup-clean',
    description: 'Phòng chính thức giải đáp thắc mắc về nền tảng ThinkUp.', rating: 5.0, creator: 'Đội ngũ ThinkUp'
  },
  {
    roomId: 'thinkup-official-2', name: 'ThinkUp - Lofi Study Space', type: 'public', maxUsers: 100, currentUsers: 85,
    status: 'focus', tags: ['Focus Session', 'Lofi'], category: 'Relax', theme: 'lofi-night',
    description: 'Không gian học tập yên tĩnh cùng Lofi, duy trì focus tối đa.', rating: 5.0, creator: 'Đội ngũ ThinkUp'
  }
];
