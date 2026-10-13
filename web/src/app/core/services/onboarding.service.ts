import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { StudentPreferences, User } from '../models/user.model';
import { isMockAccount, saveMockOnboarding } from '../data/mock/mock-auth.store';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  private readonly USER_KEY = 'thinkup_current_user';

  /**
   * Kiểm tra xem học viên hiện tại đã hoàn thành khảo sát (hoặc đã bỏ qua) hay chưa.
   */
  isOnboardingCompleted(): boolean {
    return this.getCurrentUser()?.onboarding_completed === true;
  }

  /**
   * Lấy dữ liệu sở thích đã lưu của học viên (nếu đã hoàn thành khảo sát)
   */
  getPreferences(): StudentPreferences | null {
    return this.getCurrentUser()?.preferences ?? null;
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

    const user = this.getCurrentUser();
    // TODO(pre-deploy): Nhớ xóa nhánh hoàn tất tại máy khi API onboarding thật sẵn sàng.
    if (user && isMockAccount(user)) {
      this.saveCompletedState(preferences);
      return of({ success: true, message: 'Thiết lập thành công!' });
    }
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/onboarding/submit`, payload).pipe(
      tap(() => this.saveCompletedState(preferences))
    );
  }

  /**
   * Gửi yêu cầu bỏ qua khảo sát lên máy chủ (POST /api/v1/onboarding/skip)
   */
  skipOnboarding(): Observable<{ success: boolean; message: string }> {
    const user = this.getCurrentUser();
    // TODO(pre-deploy): Nhớ xóa nhánh bỏ qua tại máy khi API onboarding thật sẵn sàng.
    if (user && isMockAccount(user)) {
      this.saveSkippedState();
      return of({ success: true, message: 'Đã bỏ qua khảo sát' });
    }
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/onboarding/skip`, {}).pipe(
      tap(() => this.saveSkippedState())
    );
  }

  getCurrentUser(): User | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      const user: User | null = raw ? JSON.parse(raw) : null;
      return user?.id ? user : null;
    } catch { return null; }
  }

  private saveCompletedState(preferences: StudentPreferences): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const user = this.getCurrentUser();
      if (user) {
        user.onboarding_completed = true;
        user.preferences = { ...preferences, submittedAt: new Date().toISOString() };
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        if (isMockAccount(user)) saveMockOnboarding(user, user.preferences);
      }
    } catch {}
  }

  private saveSkippedState(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const user = this.getCurrentUser();
      if (user) {
        user.onboarding_completed = true;
        delete user.preferences;
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        if (isMockAccount(user)) saveMockOnboarding(user);
      }
    } catch {}
  }
}
