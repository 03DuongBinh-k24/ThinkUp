import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Course, CourseFilters, CourseFilterOptions, CourseListResponse, EnrolledCourse } from '../models/course.model';
import { StudentPreferences } from '../models/user.model';
import { MOCK_COURSES, MOCK_CATEGORIES, MOCK_POPULAR_TAGS } from '../data/mock/mock-courses';
import { MOCK_ENROLLED_COURSES } from '../data/mock/mock-enrolled-courses';

@Injectable({ providedIn: 'root' })
export class CourseService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getCourses(filters: CourseFilters = {}): Observable<CourseListResponse> {
    let params = new HttpParams();
    if (filters.query) params = params.set('query', filters.query);
    if (filters.searchMode) params = params.set('searchMode', filters.searchMode);
    if (filters.categories?.length) params = params.set('categories', filters.categories.join(','));
    if (filters.levels?.length) params = params.set('levels', filters.levels.join(','));
    if (filters.ratings) params = params.set('ratings', filters.ratings);
    if (filters.tags?.length) params = params.set('tags', filters.tags.join(','));
    if (filters.maxDuration && filters.maxDuration < 120) params = params.set('maxDuration', String(filters.maxDuration));
    if (filters.priceType && filters.priceType !== 'all') params = params.set('priceType', filters.priceType);
    if (filters.sort) params = params.set('sort', filters.sort);

    return this.http.get<CourseListResponse>(`${this.apiUrl}/courses`, { params }).pipe(
      catchError(() => {
        let list = [...MOCK_COURSES];

        if (filters.query) {
          const q = filters.query.toLowerCase();
          list = list.filter(c => c.title.toLowerCase().includes(q) || c.instructor.toLowerCase().includes(q));
        }
        if (filters.categories?.length) {
          list = list.filter(c => c.category && filters.categories!.includes(c.category));
        }
        if (filters.levels?.length) {
          list = list.filter(c => c.level && filters.levels!.includes(c.level));
        }
        if (filters.priceType === 'free') {
          list = list.filter(c => c.salePrice === 0);
        } else if (filters.priceType === 'paid') {
          list = list.filter(c => c.salePrice > 0);
        }

        if (filters.sort === 'price-low') {
          list.sort((a, b) => a.salePrice - b.salePrice);
        } else if (filters.sort === 'price-high') {
          list.sort((a, b) => b.salePrice - a.salePrice);
        } else if (filters.sort === 'rating') {
          list.sort((a, b) => b.rating - a.rating);
        }

        return of({ success: true, data: list, total: list.length });
      })
    );
  }

  getCourseById(courseId: string): Observable<{ success: boolean; data: Course | null }> {
    return this.http.get<{ success: boolean; data: Course | null }>(`${this.apiUrl}/courses/${courseId}`).pipe(
      catchError(() => {
        const found = MOCK_COURSES.find(c => c.id === courseId) || MOCK_COURSES[0];
        if (!found) return of({ success: false, data: null });

        const detailed: Course = {
          ...found,
          shortDescription: found.shortDescription || found.description || 'Khóa học toàn diện trang bị kiến thức chuyên sâu từ cơ bản đến nâng cao cùng các dự án thực tế.',
          language: found.language || 'Tiếng Việt',
          updatedAtLabel: found.updatedAtLabel || 'Tháng 10/2026',
          outcomes: found.outcomes || [
            'Nắm vững kiến thức nền tảng và nâng cao của chuyên đề',
            'Xây dựng các dự án thực tế có thể đưa vào portfolio',
            'Hiểu rõ các kỹ thuật tối ưu hóa và best practices',
            'Sẵn sàng phỏng vấn ứng tuyển vị trí công việc tương ứng'
          ],
          curriculum: found.curriculum || [
            {
              id: 'c1',
              title: 'Chương 1: Giới thiệu và thiết lập môi trường',
              duration: '1 giờ 45 phút',
              lessons: [
                { id: 'l1', title: '1.1 Tổng quan về khóa học và lộ trình', duration: '12:30', type: 'Video', isPreview: true },
                { id: 'l2', title: '1.2 Cài đặt công cụ và môi trường phát triển', duration: '25:10', type: 'Video', isPreview: true },
                { id: 'l3', title: '1.3 Bài tập trắc nghiệm chương 1', duration: '15:00', type: 'Quiz' }
              ]
            },
            {
              id: 'c2',
              title: 'Chương 2: Kiến thức nền tảng và cú pháp cốt lõi',
              duration: '4 giờ 15 phút',
              lessons: [
                { id: 'l4', title: '2.1 Các khái niệm quan trọng nhất', duration: '35:20', type: 'Video' },
                { id: 'l5', title: '2.2 Thực hành xây dựng chức năng đầu tiên', duration: '45:00', type: 'Lab' },
                { id: 'l6', title: '2.3 Tài liệu đọc thêm và hướng dẫn', duration: '20:00', type: 'Reading' }
              ]
            },
            {
              id: 'c3',
              title: 'Chương 3: Thực chiến dự án và triển khai thực tế',
              duration: '6 giờ 30 phút',
              lessons: [
                { id: 'l7', title: '3.1 Thiết kế kiến trúc dự án thực tế', duration: '40:15', type: 'Video' },
                { id: 'l8', title: '3.2 Triển khai và tối ưu hiệu năng', duration: '50:30', type: 'Video' }
              ]
            }
          ],
          reviews: found.reviews || [
            { id: 'r1', author: 'Lê Hoàng Nam', rating: 5, date: '3 ngày trước', comment: 'Khóa học rất chi tiết và dễ hiểu, giảng viên giải thích cặn kẽ từng dòng code!' },
            { id: 'r2', author: 'Nguyễn Thị Mai', rating: 5, date: '1 tuần trước', comment: 'Nội dung thực tế, áp dụng được ngay vào công việc hàng ngày. Đánh giá 5 sao!' },
            { id: 'r3', author: 'Trần Minh Đức', rating: 4.5, date: '2 tuần trước', comment: 'Rất đáng tiền, hỗ trợ trong phần hỏi đáp nhiệt tình.' }
          ],
          instructorProfile: found.instructorProfile || {
            name: found.instructor,
            title: 'Chuyên gia Kỹ thuật & Giảng viên Cao cấp',
            bio: 'Có hơn 8 năm kinh nghiệm làm việc tại các công ty công nghệ lớn, đã đào tạo hơn 20,000 học viên đạt mục tiêu nghề nghiệp.',
            rating: found.rating,
            studentsCount: found.students || '12,000+ học viên',
            coursesCount: 6
          },
          countdown: '2 ngày 14:32:00'
        };

        return of({ success: true, data: detailed });
      })
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

