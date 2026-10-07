import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Course } from '../models/course.model';
import { MOCK_COURSES } from '../data/mock-courses';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  private _favorites = signal<Course[]>([]);
  readonly favorites = this._favorites.asReadonly();
  readonly count = computed(() => this._favorites().length);

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem('thinkup_favorite_courses');
      if (saved) {
        const courses = JSON.parse(saved);
        if (Array.isArray(courses) && courses.length > 0) {
          this._favorites.set(courses);
          return;
        }
      }
      // Default initial mock favorites if first time
      const initialFavs = MOCK_COURSES.slice(0, 3);
      this._favorites.set(initialFavs);
      this.saveToStorage(initialFavs);
    } catch {
      this._favorites.set(MOCK_COURSES.slice(0, 3));
    }
  }

  private saveToStorage(courses: Course[]): void {
    try {
      const ids = courses.map(c => c.id);
      localStorage.setItem('thinkup_favorite_course_ids', JSON.stringify(ids));
      localStorage.setItem('thinkup_favorite_courses', JSON.stringify(courses));
    } catch {}
  }

  isFavorite(courseId: string): boolean {
    return this._favorites().some(c => c.id === courseId);
  }

  loadFavorites(): Observable<Course[]> {
    return this.http.get<{ success: boolean; data: Course[] }>(`${this.apiUrl}/user/favorites`, { withCredentials: true }).pipe(
      tap(res => {
        if (res.success && res.data) {
          this._favorites.set(res.data);
          this.saveToStorage(res.data);
        }
      }),
      catchError(() => {
        this.loadFromStorage();
        return of(this._favorites());
      })
    ) as Observable<any>;
  }

  toggleFavorite(course: Course): Observable<{ success: boolean; data: Course[]; isFavorite: boolean }> {
    const courseId = course.id;
    const isFav = this.isFavorite(courseId);

    // Update state immediately for instant responsive UX
    const current = this._favorites();
    const next = isFav
      ? current.filter(c => c.id !== courseId)
      : [course, ...current];
    this._favorites.set(next);
    this.saveToStorage(next);

    return this.http.request<{ success: boolean; data: Course[] }>(
      isFav ? 'DELETE' : 'POST',
      `${this.apiUrl}/user/favorites`,
      {
        body: { courseId },
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
      }
    ).pipe(
      tap(res => {
        if (res.success && res.data) {
          this._favorites.set(res.data);
          this.saveToStorage(res.data);
        }
      }),
      catchError(() => of({ success: true, data: next, isFavorite: !isFav }))
    ) as Observable<any>;
  }
}
