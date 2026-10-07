import { StudyRoomItem } from '../models/study-room.model';

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
    roomId: 'frontend-focus',
    name: 'Frontend Focus 50/10',
    type: 'public',
    maxUsers: 20,
    currentUsers: 14,
    status: 'focus',
    tags: ['Lập trình', 'React'],
    category: 'Programming',
    theme: 'night',
    description: 'Ôn React Hooks, Router và làm bài tập nhóm trong phiên tập trung 50/10.',
    rating: 4.9,
    creator: 'Dev Nguyen'
  },
  {
    roomId: 'ai-sprint',
    name: 'AI Study Sprint & Data Science',
    type: 'public',
    maxUsers: 30,
    currentUsers: 18,
    status: 'break',
    tags: ['Lập trình', 'Focus Session'],
    category: 'AI',
    theme: 'space',
    description: 'Brainstorm ý tưởng, chia task và trao đổi kinh nghiệm học Machine Learning.',
    rating: 4.8,
    creator: 'AI Club'
  },
  {
    roomId: 'exam-room',
    name: 'Ôn thi cuối kỳ & Chứng chỉ',
    type: 'public',
    maxUsers: 25,
    currentUsers: 8,
    status: 'idle',
    tags: ['Study Group', 'Tự học'],
    category: 'Exam',
    theme: 'library',
    description: 'Không gian yên tĩnh để ôn đề, giải đề thi thử và chốt checklist hàng ngày.',
    rating: 4.7,
    creator: 'Student Assoc'
  },
  {
    roomId: 'uiux-portfolio',
    name: 'UI/UX Design & Case Study',
    type: 'public',
    maxUsers: 15,
    currentUsers: 9,
    status: 'focus',
    tags: ['UI/UX & Thiết kế', 'Study Group'],
    category: 'Design',
    theme: 'coffee',
    description: 'Cùng nhau hoàn thiện Figma wireframes và portfolio xin việc chuẩn chỉnh.',
    rating: 4.9,
    creator: 'Linh UX'
  },
  {
    roomId: 'toeic-sprint',
    name: 'Luyện đề TOEIC 750+ Mỗi Ngày',
    type: 'public',
    maxUsers: 20,
    currentUsers: 12,
    status: 'focus',
    tags: ['TOEIC / IELTS', 'Tự học'],
    category: 'Language',
    theme: 'coffee',
    description: 'Luyện Part 5, 6, 7 và nghe Part 3 có bấm giờ Pomodoro tự động.',
    rating: 4.8,
    creator: 'English Zone'
  }
];
