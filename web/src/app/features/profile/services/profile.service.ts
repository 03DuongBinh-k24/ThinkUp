import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { UserProfile, LearningStat, CurrentCourse, Achievement, RecentActivity, ProfileOverviewData } from '../../../core/models/profile.model';
import { MOCK_PROFILE, MOCK_LEARNING_STATS, MOCK_CURRENT_COURSES, MOCK_ACHIEVEMENTS, MOCK_RECENT_ACTIVITIES, MOCK_ROADMAP_PROGRESS, MOCK_TOTAL_AWARDS } from '../../../core/data/mock/mock-profile';

const PROFILE_STORAGE_KEY = 'thinkup_user_profile';
const CURRENT_USER_KEY = 'thinkup_current_user';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = environment.apiUrl;

  // Reactive State Signals
  readonly profile = signal<UserProfile>(this.initialProfile());
  readonly learningStats = signal<LearningStat[]>(MOCK_LEARNING_STATS);
  readonly roadmapProgress = signal<number>(MOCK_ROADMAP_PROGRESS);
  readonly currentCourses = signal<CurrentCourse[]>(MOCK_CURRENT_COURSES);
  readonly achievements = signal<Achievement[]>(MOCK_ACHIEVEMENTS);
  readonly totalAwards = signal<number>(MOCK_TOTAL_AWARDS);
  readonly recentActivities = signal<RecentActivity[]>(MOCK_RECENT_ACTIVITIES);

  constructor() {
    this.loadFromStorage();
  }

  private initialProfile(): UserProfile {
    const user = this.authService.currentUser();
    return user
      ? { ...MOCK_PROFILE, name: user.full_name, email: user.email, avatarUrl: user.avatar || '' }
      : MOCK_PROFILE;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (stored) {
        const user = this.authService.currentUser();
        const parsed = JSON.parse(stored) as Partial<UserProfile>;
        if (user && parsed.email !== user.email) return;
        if (stored.includes('Nguyễn Văn An')) {
          localStorage.removeItem(PROFILE_STORAGE_KEY);
          this.profile.set(this.initialProfile());
        } else {
          this.profile.set({ ...this.initialProfile(), ...parsed,
            avatarUrl: parsed.avatarUrl === MOCK_PROFILE.avatarUrl && user ? '' : parsed.avatarUrl || '' });
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
