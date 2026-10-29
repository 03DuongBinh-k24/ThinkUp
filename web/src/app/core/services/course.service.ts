import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Course, CourseFilters, CourseFilterOptions, CourseListResponse, EnrolledCourse } from '../models/course.model';
import { StudentPreferences } from '../models/user.model';
import { MOCK_COURSES, MOCK_CATEGORIES, MOCK_POPULAR_TAGS } from '../data/mock/mock-courses';
import { MOCK_ENROLLED_COURSES } from '../data/mock/mock-enrolled-courses';

interface CourseCardDto {
  id: string;
  course_id?: string;
  slug?: string;
  title: string;
  thumbnail_url?: string;
  badge?: string;
  level?: string;
  duration_formatted?: string;
  instructor?: { name?: string };
  rating?: number | string;
  total_reviews?: number | string;
  total_students?: number | string;
  tag_names?: string[];
  price?: { original?: number | string; sale?: number | string };
}

interface CourseCardsResponse {
  success: boolean;
  data: {
    pagination: { total_items: number };
    courses: CourseCardDto[];
  };
}

@Injectable({ providedIn: 'root' })
export class CourseService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getCourses(filters: CourseFilters = {}): Observable<CourseListResponse> {
    let params = new HttpParams();
    if (filters.query) params = params.set('search', filters.query);
    if (filters.categories?.length === 1) params = params.set('category_id', filters.categories[0]);
    if (filters.levels?.length === 1) params = params.set('level', filters.levels[0]);
    if (filters.ratings) params = params.set('min_rating', filters.ratings);
    if (filters.tags?.length === 1) params = params.set('tag_id', filters.tags[0]);
    if (filters.priceType && filters.priceType !== 'all') params = params.set('price_type', filters.priceType);
    if (filters.sort) params = params.set('sort', this.mapSort(filters.sort));
    params = params.set('limit', 'all');

    return this.http.get<CourseCardsResponse>(`${this.apiUrl}/courses`, { params }).pipe(
      map(response => ({
        success: response.success,
        data: response.data.courses.map(course => this.mapCourseCard(course)),
        total: response.data.pagination.total_items,
      }))
    );
  }

  private mapCourseCard(course: CourseCardDto): Course {
    return {
      id: course.course_id || course.id,
      courseId: course.course_id,
      slug: course.slug,
      title: course.title,
      instructor: course.instructor?.name || 'Giảng viên ThinkUp',
      level: course.level,
      rating: this.toNumber(course.rating),
      ratingCount: this.toNumber(course.total_reviews),
      studentsCount: this.toNumber(course.total_students),
      duration: course.duration_formatted,
      originalPrice: this.toNumber(course.price?.original),
      salePrice: this.toNumber(course.price?.sale),
      badge: course.badge,
      tags: course.tag_names || [],
      thumbnailUrl: course.thumbnail_url,
    };
  }

  private mapSort(sort: string): string {
    return ({
      'price-low': 'price_asc',
      'price-high': 'price_desc',
      rating: 'highest_rated',
    } as Record<string, string>)[sort] || sort;
  }

  private toNumber(value: number | string | null | undefined): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  getCourseById(courseId: string): Observable<{ success: boolean; data: Course | null }> {
    return this.http.get<{ success: boolean; data: CourseCardDto }>(`${this.apiUrl}/courses/${encodeURIComponent(courseId)}`).pipe(
      map(response => ({ success: response.success, data: this.mapCourseCard(response.data) }))
    );
  }

  getFilterOptions(): Observable<{ success: boolean; data: CourseFilterOptions }> {
    return this.http.get<{ success: boolean; data: CourseFilterOptions }>(`${this.apiUrl}/courses/filters`).pipe(
      catchError(() => of({
        success: true,
        data: { categories: MOCK_CATEGORIES, popularTags: MOCK_POPULAR_TAGS }
      }))
    );
  }

  getRecommendedCourses(interests: string[] = [], excludeIds: string[] = []): Observable<{ success: boolean; data: Course[] }> {
    let params = new HttpParams();
    if (interests.length) params = params.set('interests', interests.join(','));
    if (excludeIds.length) params = params.set('excludeIds', excludeIds.join(','));

    return this.http.get<{ success: boolean; data: Course[] }>(`${this.apiUrl}/courses/recommendations`, { params }).pipe(
      catchError(() => of({ success: true, data: MOCK_COURSES.slice(0, 4) }))
    );
  }

  getMyCourses(): Observable<{ success: boolean; data: EnrolledCourse[] }> {
    return this.http.get<{ success: boolean; data: EnrolledCourse[] }>(`${this.apiUrl}/user/dashboard`, { withCredentials: true }).pipe(
      catchError(() => of({ success: true, data: MOCK_ENROLLED_COURSES }))
    );
  }

  /**
   * BỘ LỌC KHÓA HỌC GỢI Ý (LOGIC-ONB-REC-01)
   * 1. Hard Filter: Loại bỏ khóa học không liên quan đến nghề hoặc kỹ năng học viên đã chọn.
   * 2. Sorting Priority:
   *    - Ưu tiên 1: Khóa học có level trùng khớp với currentLevel của học viên.
   *    - Ưu tiên 2: Khóa học chứa nhiều kỹ năng trùng khớp nhất với selectedSkills.
   *    - Ưu tiên 3: Rating cao hơn và số lượng học viên đông hơn.
   */
  filterByPreferences(courses: Course[], preferences: StudentPreferences | null): Course[] {
    if (!preferences || !preferences.targetRole) {
      // Bỏ qua khảo sát hoặc không có sở thích: Sắp xếp theo số học viên đông nhất (ORDER BY total_students DESC)
      return [...courses].sort((a, b) => (b.studentsCount || 0) - (a.studentsCount || 0));
    }

    const targetRole = preferences.targetRole.toLowerCase();
    const selectedSkills = (preferences.selectedSkills || []).map(s => s.toLowerCase());
    const currentLevel = (preferences.currentLevel || '').toLowerCase();

    // Mapping role ID sang các từ khóa danh mục / tags
    const roleKeywordMap: Record<string, string[]> = {
      'frontend': ['frontend', 'reactjs', 'angular', 'vue', 'html', 'css', 'javascript', 'typescript', 'tailwind'],
      'backend': ['backend', 'nodejs', 'express', 'python', 'java', 'database', 'sql', 'mongodb', 'api'],
      'fullstack': ['fullstack', 'frontend', 'backend', 'reactjs', 'nodejs', 'nextjs', 'javascript'],
      'mobile': ['mobile', 'flutter', 'react native', 'ios', 'android', 'swift', 'kotlin'],
      'data-ai': ['data', 'ai', 'python', 'machine learning', 'deep learning', 'data science', 'sql'],
      'devops-cloud': ['devops', 'cloud', 'docker', 'kubernetes', 'aws', 'linux', 'ci/cd'],
      'explore': [],
      'ui-ux': ['ui/ux', 'design', 'thiết kế', 'figma']
    };

    const targetKeywords = roleKeywordMap[targetRole] || [targetRole];

    // Helper: Map level string
    const mapLevel = (levelStr: string = ''): string => {
      const l = levelStr.toLowerCase();
      if (l.includes('cơ bản') || l.includes('người mới') || l.includes('beginner')) return 'beginner';
      if (l.includes('trung cấp') || l.includes('nền tảng') || l.includes('intermediate')) return 'intermediate';
      if (l.includes('nâng cao') || l.includes('chuyên sâu') || l.includes('advanced')) return 'advanced';
      return 'beginner';
    };

    const normalizedTargetLevel = mapLevel(currentLevel);

    // 1. HARD FILTER: Khóa học phải thuộc nghề hoặc có ít nhất 1 kỹ năng trùng
    const filtered = courses.filter(c => {
      const courseTags = (c.tags || []).map(t => t.toLowerCase());
      const courseTitle = (c.title || '').toLowerCase();
      const courseCategory = (c.category || '').toLowerCase();

      // Điều kiện 1: Khóa học thuộc danh mục nghề học viên đã chọn
      const matchesRole = targetKeywords.some(kw =>
        courseCategory.includes(kw) || courseTitle.includes(kw) || courseTags.some(t => t.includes(kw))
      );

      // Điều kiện 2: Khóa học chứa ít nhất 1 kỹ năng trong danh sách học viên chọn
      const matchesSkill = selectedSkills.some(skill => {
        const cleanSkill = skill.replace(/[-_]/g, ' ');
        return courseTags.some(t => t.includes(cleanSkill) || cleanSkill.includes(t)) ||
               courseTitle.includes(cleanSkill);
      });

      return matchesRole || matchesSkill;
    });

    // 2. SORTING PRIORITY:
    filtered.sort((a, b) => {
      const aLevel = mapLevel(a.level);
      const bLevel = mapLevel(b.level);

      const aLevelMatch = aLevel === normalizedTargetLevel ? 1 : 0;
      const bLevelMatch = bLevel === normalizedTargetLevel ? 1 : 0;

      // Ưu tiên 1: Trình độ trùng khớp
      if (aLevelMatch !== bLevelMatch) {
        return bLevelMatch - aLevelMatch;
      }

      // Ưu tiên 2: Số kỹ năng trùng khớp nhiều nhất
      const countMatchingSkills = (course: Course): number => {
        const tags = (course.tags || []).map(t => t.toLowerCase());
        const title = (course.title || '').toLowerCase();
        let count = 0;
        selectedSkills.forEach(skill => {
          const cleanSkill = skill.replace(/[-_]/g, ' ');
          if (tags.some(t => t.includes(cleanSkill) || cleanSkill.includes(t)) || title.includes(cleanSkill)) {
            count++;
          }
        });
        return count;
      };

      const aSkillCount = countMatchingSkills(a);
      const bSkillCount = countMatchingSkills(b);
      if (aSkillCount !== bSkillCount) {
        return bSkillCount - aSkillCount;
      }

      // Ưu tiên 3: Rating cao hơn & số học viên đông hơn
      if ((b.rating || 0) !== (a.rating || 0)) {
        return (b.rating || 0) - (a.rating || 0);
      }
      return (b.studentsCount || 0) - (a.studentsCount || 0);
    });

    return filtered;
  }
}

