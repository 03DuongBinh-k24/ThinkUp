// TODO(pre-deploy): Nhớ xóa các tài khoản mock này khi kết nối CSDL và API backend thật.
import { User } from '../../models/user.model';
import { MOCK_LOGGED_IN_USER } from './mock-user';

export type MockUser = User & { password: string; repeatOnboardingOnLogin?: boolean };

export const INITIAL_MOCK_USERS: MockUser[] = [
  {
    id: 'mock-id-student-1',
    full_name: 'Học viên ThinkUp',
    email: 'hocvien.moi@thinkup.edu.vn',
    password: 'Hocvien@2026',
    role: 'student',
    onboarding_completed: false,
    // TODO(pre-deploy): Nhớ xóa ngoại lệ chỉ để thử khảo sát ở mỗi lần đăng nhập.
    repeatOnboardingOnLogin: true
  },
  {
    id: 'mock-id-instructor-1',
    full_name: 'Mai Diệu Thương',
    email: 'anhmai12312315@gmail.com',
    password: 'Engineer@7654',
    role: 'instructor',
    onboarding_completed: true
  },
  {
    id: MOCK_LOGGED_IN_USER.id!,
    full_name: MOCK_LOGGED_IN_USER.name,
    email: MOCK_LOGGED_IN_USER.email,
    avatar: MOCK_LOGGED_IN_USER.avatarUrl,
    password: 'AnNhien@2026',
    role: 'student',
    onboarding_completed: true
  }
];

// TODO(pre-deploy): Nhớ xóa danh tính đăng nhập mạng xã hội mock khi có OAuth thật.
export const MOCK_GOOGLE_USER: User = {
  id: 'mock-id-gg',
  full_name: 'Học viên (Google)',
  email: 'student_google@thinkup.vn',
  role: 'student',
  onboarding_completed: false,
};

export function createMockFacebookUser(email: string): User {
  return {
    id: 'mock-id-fb',
    full_name: 'Học viên (Facebook)',
    email,
    role: 'student',
    onboarding_completed: false,
  };
}
