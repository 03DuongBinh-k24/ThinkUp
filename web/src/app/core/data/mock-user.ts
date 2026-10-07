import { UserProfile } from '../models/profile.model';

export interface LoggedInUser extends UserProfile {
  id?: string;
  fullName?: string;
  role?: 'student' | 'instructor' | 'admin';
  roleLabel?: string;
}

export const MOCK_LOGGED_IN_USER: LoggedInUser = {
  id: 'usr_thinkup_001',
  name: 'Nguyễn An Nhiên',
  fullName: 'Nguyễn An Nhiên',
  firstName: 'Nhiên',
  lastName: 'Nguyễn An',
  email: 'annhien.nguyen@thinkup.edu.vn',
  headline: 'Học viên Chuyên sâu Frontend & UI/UX Design',
  location: 'Hồ Chí Minh, Việt Nam',
  joinedAt: 'Tháng 03/2024',
  avatarUrl: '/assets/profile/overview-avatar.png',
  gender: 'Nữ',
  birthDate: '15/08/2002',
  bio: 'Đam mê lập trình Web hiện đại với Angular và thiết kế trải nghiệm người dùng tối ưu. Luôn tìm tòi các giải pháp công nghệ mới.',
  language: 'vi',
  facebook: 'facebook.com/annhien.thinkup',
  instagram: 'instagram.com/annhien.dev',
  linkedin: 'linkedin.com/in/annhien-nguyen',
  tiktok: 'tiktok.com/@annhien_code',
  x: 'x.com/annhien_frontend',
  youtube: 'youtube.com/@annhiencoding',
  maskedEmail: 'a••••••@thinkup.edu.vn',
  role: 'student',
  roleLabel: 'Học viên',
};
