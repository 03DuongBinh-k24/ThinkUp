// TODO: Xóa các Mock này KHI KẾT NỐI CSDL VÀ API BACKEND
import { User } from '../models/user.model';

export const INITIAL_MOCK_USERS: (User & { password?: string })[] = [
  {
    id: 'mock-id-student-1',
    full_name: 'Học viên ThinkUp',
    email: 'hocvien.moi@thinkup.edu.vn',
    password: 'Hocvien@2026',
    role: 'student',
    onboarding_completed: false
  },
  {
    id: 'mock-id-instructor-1',
    full_name: 'Mai Diệu Thương',
    email: 'anhmai12312315@gmail.com',
    password: 'Engineer@7654',
    role: 'instructor',
    onboarding_completed: true
  }
];
