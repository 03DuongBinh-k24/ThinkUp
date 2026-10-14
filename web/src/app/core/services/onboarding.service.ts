import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StudentPreferences, User } from '../models/user.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = environment.apiUrl;

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
   * Gửi dữ liệu khảo sát lên máy chủ.
   */
  submitOnboarding(preferences: StudentPreferences): Observable<{ success: boolean; message: string }> {
    const payload = {
      targetRole: preferences.targetRole,
      selectedSkills: preferences.selectedSkills,
      currentLevel: preferences.currentLevel
    };

    return this.http.post<{ message: string }>(`${this.apiUrl}/user/onboarding/submit`, payload).pipe(
      tap(() => this.saveCompletedState(preferences)),
      map(response => ({ success: true, message: response.message }))
    );
  }

  /**
   * Gửi yêu cầu bỏ qua khảo sát lên máy chủ.
   */
  skipOnboarding(): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/user/onboarding/skip`, {}).pipe(
      tap(() => this.saveSkippedState()),
      map(response => ({ success: true, message: response.message }))
    );
  }

  getCurrentUser(): User | null {
    return this.authService.currentUser();
  }

  private saveCompletedState(preferences: StudentPreferences): void {
    const user = this.getCurrentUser();
    if (!user) return;
    this.authService.updateUser({
      ...user,
      onboarding_completed: true,
      preferences: { ...preferences, submittedAt: new Date().toISOString() }
    });
  }

  private saveSkippedState(): void {
    const user = this.getCurrentUser();
    if (!user) return;
    const updated: User = { ...user, onboarding_completed: true };
    delete updated.preferences;
    this.authService.updateUser(updated);
  }
}
