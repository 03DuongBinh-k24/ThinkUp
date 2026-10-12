import { UserProfile, LearningStat, CurrentCourse, Achievement, RecentActivity } from '../../models/profile.model';

// TODO(pre-deploy): Nhớ xóa dữ liệu hồ sơ, thống kê, khóa học và hoạt động mock bên dưới khi có API thật.
export const MOCK_PROFILE: UserProfile = {
  name: 'Nguyễn An Nhiên',
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
};

export const MOCK_LEARNING_STATS: LearningStat[] = [
  { key: 'enrolled', value: 47, label: 'Khóa đã ghi danh', tone: 'blue' },
  { key: 'completed', value: 32, label: 'Khóa đã hoàn thành', tone: 'green' },
  { key: 'streak', value: 15, label: 'Chuỗi đạt được (ngày)', tone: 'orange' },
  { key: 'awards', value: 12, label: 'Thành tích và huy hiệu tích lũy', tone: 'sky' },
];

export const MOCK_CURRENT_COURSES: CurrentCourse[] = [
  {
    id: 'javascript',
    category: 'Lập trình',
    instructor: 'Lê Thị Bích',
    title: 'Lập trình Web với JavaScript & TypeScript Nâng Cao',
    progress: 75,
    nextLesson: 'Tiếp theo: Chương 8 — Async/Await & RxJS State Management',
    image: '/assets/profile/course-javascript.png',
    href: '/main/courses',
  },
  {
    id: 'uiux',
    category: 'Thiết kế',
    instructor: 'Trần Văn Cường',
    title: 'Thiết kế Giao diện Người dùng (UI/UX) Chuyên Nghiệp',
    progress: 50,
    nextLesson: 'Tiếp theo: Bài 12 — Design System & Hệ thống Màu Chuẩn Figma',
    image: '/assets/profile/course-uiux.png',
    href: '/main/courses',
  },
  {
    id: 'python',
    category: 'Dữ liệu',
    instructor: 'Phạm Thị Dung',
    title: 'Python cho Khoa học Dữ liệu & Học Máy Toàn Diện',
    progress: 90,
    nextLesson: 'Tiếp theo: Bài cuối — Dự án Capstone Dự Báo Thị Trường',
    image: '/assets/profile/course-python.png',
    href: '/main/courses',
  },
];

export const MOCK_ACHIEVEMENTS: Achievement[] = [
  { key: 'excellent', title: 'Học viên xuất sắc', subtitle: 'Năm 2024', tone: 'amber' },
  { key: 'python', title: 'Chuyên gia Python', subtitle: 'Khóa 12/2023', tone: 'blue' },
  { key: 'speed', title: 'Bứt phá tốc độ', subtitle: 'Khóa 09/2023', tone: 'sky' },
  { key: 'streak', title: 'Streak 30 ngày', subtitle: 'Tháng 11/2023', tone: 'red' },
  { key: 'complete', title: 'Hoàn thành 100%', subtitle: 'Khóa 08/2023', tone: 'green' },
  { key: 'graduate', title: 'Tốt nghiệp lộ trình', subtitle: 'Khóa 05/2023', tone: 'indigo' },
];

export const MOCK_RECENT_ACTIVITIES: RecentActivity[] = [
  { key: 'start', time: 'Hôm nay, 10:30', text: 'Bắt đầu học bài mới trong khóa “Lập trình Web với JavaScript & TypeScript”', tone: 'blue' },
  { key: 'badge', time: 'Hôm qua, 15:15', text: 'Nhận huy hiệu danh dự “Chuyên gia Python Toàn Diện”', tone: 'amber' },
  { key: 'progress', time: '2 ngày trước, 09:00', text: 'Đạt tiến độ 50% trong khóa học “Thiết kế Giao diện Người dùng UI/UX”', tone: 'green' },
  { key: 'finish', time: '3 ngày trước, 17:00', text: 'Hoàn thành xuất sắc bài kiểm tra trắc nghiệm “Cơ bản về JavaScript”', tone: 'sky' },
];

export const MOCK_ROADMAP_PROGRESS = 68;
export const MOCK_TOTAL_AWARDS = 12;
