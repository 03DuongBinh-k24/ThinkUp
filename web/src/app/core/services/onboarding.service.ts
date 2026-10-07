import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { StudentPreferences, User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  private readonly PREFS_KEY = 'thinkup_student_preferences';
  private readonly ONBOARDING_DONE_KEY = 'thinkup_onboarding_done';
  private readonly USER_KEY = 'thinkup_current_user';

  /**
   * Kiểm tra xem học viên hiện tại đã hoàn thành khảo sát (hoặc đã bỏ qua) hay chưa.
   */
  isOnboardingCompleted(): boolean {
    if (typeof localStorage === 'undefined') return false;

    // 1. Kiểm tra cờ trực tiếp
    const doneFlag = localStorage.getItem(this.ONBOARDING_DONE_KEY);
    if (doneFlag === 'true') return true;

    // 2. Kiểm tra trong object user hiện tại
    try {
      const userRaw = localStorage.getItem(this.USER_KEY);
      if (userRaw) {
        const user: User = JSON.parse(userRaw);
        if (user.onboarding_completed === true) return true;
      }
    } catch {
      // Ignored
    }

    return false;
  }

  /**
   * Lấy dữ liệu sở thích đã lưu của học viên (nếu đã hoàn thành khảo sát)
   */
  getPreferences(): StudentPreferences | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(this.PREFS_KEY);
      if (raw) return JSON.parse(raw);

      // Thử đọc từ thinkup_current_user
      const userRaw = localStorage.getItem(this.USER_KEY);
      if (userRaw) {
        const user: User = JSON.parse(userRaw);
        if (user.preferences) return user.preferences;
      }
    } catch {
      // Ignored
    }
    return null;
  }

  /**
   * Gửi dữ liệu khảo sát lên máy chủ (POST /api/v1/onboarding/submit)
   */
  submitOnboarding(preferences: StudentPreferences): Observable<{ success: boolean; message: string }> {
    const payload = {
      targetRole: preferences.targetRole,
      selectedSkills: preferences.selectedSkills,
      currentLevel: preferences.currentLevel
    };

    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/onboarding/submit`, payload).pipe(
      tap(() => {
        this.saveCompletedState(preferences);
      }),
      catchError(() => {
        // Fallback lưu local mock khi Backend chưa sẵn sàng hoặc offline
        this.saveCompletedState(preferences);
        return of({ success: true, message: 'Thiết lập thành công!' });
      })
    );
  }

  /**
   * Gửi yêu cầu bỏ qua khảo sát lên máy chủ (POST /api/v1/onboarding/skip)
   */
  skipOnboarding(): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/onboarding/skip`, {}).pipe(
      tap(() => {
        this.saveSkippedState();
      }),
      catchError(() => {
        this.saveSkippedState();
        return of({ success: true, message: 'Đã bỏ qua khảo sát' });
      })
    );
  }

  /**
   * Đặt lại trạng thái test
   */
  resetOnboardingState(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.ONBOARDING_DONE_KEY);
    localStorage.removeItem(this.PREFS_KEY);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('thinkup_onboarding_draft');
    }

    try {
      const userRaw = localStorage.getItem(this.USER_KEY);
      if (userRaw) {
        const user: User = JSON.parse(userRaw);
        user.onboarding_completed = false;
        delete user.preferences;
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      }
    } catch {}
  }

  private saveCompletedState(preferences: StudentPreferences): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.ONBOARDING_DONE_KEY, 'true');
    localStorage.setItem(this.PREFS_KEY, JSON.stringify({
      ...preferences,
      submittedAt: new Date().toISOString()
    }));

    try {
      const userRaw = localStorage.getItem(this.USER_KEY);
      if (userRaw) {
        const user: User = JSON.parse(userRaw);
        user.onboarding_completed = true;
        user.preferences = preferences;
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      }
    } catch {}

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('thinkup_onboarding_draft');
    }
  }

  private saveSkippedState(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.ONBOARDING_DONE_KEY, 'true');
    localStorage.removeItem(this.PREFS_KEY);

    try {
      const userRaw = localStorage.getItem(this.USER_KEY);
      if (userRaw) {
        const user: User = JSON.parse(userRaw);
        user.onboarding_completed = true;
        delete user.preferences;
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      }
    } catch {}

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('thinkup_onboarding_draft');
    }
  }
}
