import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  UserProfile,
  LearningStat,
  CurrentCourse,
  Achievement,
  RecentActivity,
  ProfileOverviewData,
} from '../models/profile.model';

const PROFILE_STORAGE_KEY = 'thinkup_user_profile';
const CURRENT_USER_KEY = 'thinkup_current_user';

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

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Reactive State Signals
  readonly profile = signal<UserProfile>(MOCK_PROFILE);
  readonly learningStats = signal<LearningStat[]>(MOCK_LEARNING_STATS);
  readonly roadmapProgress = signal<number>(68);
  readonly currentCourses = signal<CurrentCourse[]>(MOCK_CURRENT_COURSES);
  readonly achievements = signal<Achievement[]>(MOCK_ACHIEVEMENTS);
  readonly totalAwards = signal<number>(12);
  readonly recentActivities = signal<RecentActivity[]>(MOCK_RECENT_ACTIVITIES);

  constructor() {
    this.initMockLoggedInUser();
    this.loadFromStorage();
  }

  /**
   * Tự động khởi tạo phiên đăng nhập giả lập cho tài khoản test
   * để khi mở giao diện lên là thấy ngay góc nhìn đã đăng nhập
   */
  private initMockLoggedInUser(): void {
    try {
      if (typeof window !== 'undefined') {
        const isLoggedIn = localStorage.getItem('thinkup_user_logged_in');
        if (isLoggedIn !== 'true') {
          localStorage.setItem('thinkup_user_logged_in', 'true');
        }

        const currentUser = localStorage.getItem(CURRENT_USER_KEY);
        if (!currentUser || currentUser.includes('Nguyễn Văn An')) {
          const mockUser = {
            id: 'usr_001',
            email: MOCK_PROFILE.email,
            full_name: MOCK_PROFILE.name,
            fullName: MOCK_PROFILE.name,
            name: MOCK_PROFILE.name,
            role: 'student',
            avatar: MOCK_PROFILE.avatarUrl,
            avatarUrl: MOCK_PROFILE.avatarUrl,
          };
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(mockUser));
        }
      }
    } catch {}
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (stored) {
        if (stored.includes('Nguyễn Văn An')) {
          localStorage.removeItem(PROFILE_STORAGE_KEY);
          this.profile.set(MOCK_PROFILE);
        } else {
          const parsed = JSON.parse(stored);
          this.profile.set({ ...MOCK_PROFILE, ...parsed });
        }
      }
    } catch {}
  }

  getProfileOverview(): Observable<ProfileOverviewData> {
    return this.http
      .get<{ success: boolean; data: ProfileOverviewData }>(
        `${this.apiUrl}/user/profile/overview`,
        { withCredentials: true }
      )
      .pipe(
        tap((res) => {
          if (res.success && res.data) {
            this.profile.set(res.data.profile);
            this.learningStats.set(res.data.learningStats);
            this.roadmapProgress.set(res.data.roadmapProgress);
            this.currentCourses.set(res.data.currentCourses);
            this.achievements.set(res.data.achievements);
            this.totalAwards.set(res.data.totalAwards);
            this.recentActivities.set(res.data.recentActivities);
          }
        }),
        catchError(() => {
          // Fallback tự động khi backend offline
          const fallbackData: ProfileOverviewData = {
            profile: this.profile(),
            learningStats: this.learningStats(),
            roadmapProgress: this.roadmapProgress(),
            currentCourses: this.currentCourses(),
            achievements: this.achievements(),
            totalAwards: this.totalAwards(),
            recentActivities: this.recentActivities(),
          };
          return of(fallbackData);
        })
      ) as Observable<ProfileOverviewData>;
  }

  updateProfile(updated: Partial<UserProfile>): Observable<UserProfile> {
    const nextProfile: UserProfile = { ...this.profile(), ...updated };
    const fullName = [nextProfile.firstName, nextProfile.lastName].filter(Boolean).join(' ').trim() || nextProfile.name;
    nextProfile.name = fullName;

    // Cập nhật State & LocalStorage
    this.profile.set(nextProfile);
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));

      // Đồng bộ thông tin user hiện tại cho Header
      const current = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || '{}');
      const nextUser = {
        ...current,
        full_name: fullName,
        fullName: fullName,
        name: fullName,
        avatar: nextProfile.avatarUrl,
        avatarUrl: nextProfile.avatarUrl,
      };
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(nextUser));
      window.dispatchEvent(new Event('storage'));
    } catch {}

    // Gửi API nếu có backend
    return this.http
      .put<{ success: boolean; data: UserProfile }>(
        `${this.apiUrl}/user/profile`,
        nextProfile,
        { withCredentials: true }
      )
      .pipe(
        tap((res) => {
          if (res.success && res.data) {
            this.profile.set(res.data);
          }
        }),
        catchError(() => of(nextProfile))
      ) as Observable<UserProfile>;
  }

  updateAvatar(avatarUrl: string): void {
    this.profile.update((p) => ({ ...p, avatarUrl }));
    this.updateProfile({ avatarUrl }).subscribe();
  }
}
