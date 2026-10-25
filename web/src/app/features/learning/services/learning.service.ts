import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import {
  MOCK_COURSE_REVIEWS,
  MOCK_LEARNING_COURSE,
  MOCK_LESSON_RESOURCES,
} from '../../../core/data/mock/learning-player.mock';
import {
  CourseReviewSummary,
  LearningCourse,
  LearningResource,
  ReportReason,
} from '../models/learning.model';
import { MOCK_REPORT_REASONS } from '../../../core/data/mock/learning-player.mock';

export interface LearningEnrollment {
  completedLessons: number;
  totalLessons: number;
  percent: number;
  completed: number;
  remaining: number;
  studyTime: string;
  nextLessonId: string;
  nextLessonTitle: string;
  lastUpdated: string;
}

export interface SubmitReviewPayload {
  courseId: string;
  rating: number;
  tags: string[];
  comment: string;
  nps: number;
}

@Injectable({ providedIn: 'root' })
export class LearningService {
  private readonly lessonCompletion = new Map<string, boolean>();

  getCourse(_courseId: string): Observable<LearningCourse> {
    const course = structuredClone(MOCK_LEARNING_COURSE);
    const lessons = course.chapters.flatMap((chapter) => chapter.lessons);

    for (const lesson of lessons) {
      if (this.lessonCompletion.has(lesson.id)) {
        const completed = this.lessonCompletion.get(lesson.id) ?? false;
        lesson.completed = completed;
        lesson.status = completed ? 'done' : 'not-started';
      }
    }

    course.progress = lessons.length
      ? Math.round((lessons.filter((lesson) => lesson.completed).length / lessons.length) * 100)
      : 0;

    return of(course).pipe(delay(120));
  }

  setLessonCompleted(lessonId: string, completed: boolean): void {
    this.lessonCompletion.set(lessonId, completed);
  }

  getReviews(_courseId: string): Observable<CourseReviewSummary> {
    return of(structuredClone(MOCK_COURSE_REVIEWS)).pipe(delay(100));
  }

  getResources(): LearningResource[] {
    return MOCK_LESSON_RESOURCES;
  }

  getReportReasons(): ReportReason[] {
    return MOCK_REPORT_REASONS;
  }

  getEnrollment(course: LearningCourse): LearningEnrollment {
    const lessons = course.chapters.flatMap((chapter) => chapter.lessons);
    const completedLessons = lessons.filter((lesson) => lesson.completed).length;
    const totalLessons = lessons.length;
    const percent = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const nextLesson = lessons.find((lesson) => !lesson.completed) ?? lessons[0];

    return {
      completedLessons,
      totalLessons,
      percent,
      completed: completedLessons,
      remaining: totalLessons - completedLessons,
      studyTime: '08h 45m',
      nextLessonId: nextLesson?.id ?? '',
      nextLessonTitle: nextLesson?.title ?? '',
      lastUpdated: 'Hôm nay, 10:30',
    };
  }

  submitReview(payload: SubmitReviewPayload): Observable<{ success: boolean; message: string }> {
    const valid = payload.rating > 0;
    return of(
      valid
        ? { success: true, message: 'Đánh giá thành công!' }
        : { success: false, message: 'Đánh giá thất bại' }
    ).pipe(delay(450));
  }

  submitReport(reasonIds: string[], detail: string): Observable<{ success: boolean }> {
    return of({ success: reasonIds.length > 0 && detail.trim().length >= 10 }).pipe(delay(350));
  }
}
