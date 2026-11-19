import { Injectable, computed, inject } from '@angular/core';
import {
  DisciplineCommand,
  DocumentRequestCommand,
  LockStudentsCommand,
  RejectLecturerCommand,
  USER_DATA_SOURCE,
  UserListFilters,
  UserListResult
} from '../data/user-management.data-source';
import { ExportFormat } from '../../../shared/utils/export-formats';
import { Lecturer, LecturerCourseRow, Student } from '../models/user-management.models';
import { addDaysIso, todayIso } from '../user-management.utils';

/**
 * Facade dữ liệu của module quản lý người dùng.
 *
 * Mọi thao tác đi qua `USER_DATA_SOURCE` (xem `data/user-management.providers.ts`), nên component
 * không biết dữ liệu đến từ Admin API hay bộ mock demo. Các lệnh ghi trả `Promise` để trang hiển
 * thị trạng thái đang xử lý và lỗi thật từ server.
 */
@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private readonly source = inject(USER_DATA_SOURCE);

  readonly lecturers = this.source.lecturers;
  readonly students = this.source.students;
  readonly quickStats = this.source.quickStats;
  readonly lecturerSummary = this.source.lecturerSummary;
  readonly studentSummary = this.source.studentSummary;
  updateLecturerSummary(summary: { total: number; pending: number; active: number; locked: number }): void {
    this.source.setLecturerSummary(summary);
  }
  updateStudentSummary(summary: { total: number; fresh: number; active: number; locked: number }): void { this.source.setStudentSummary(summary); }
  readonly lecturerDetails = this.source.lecturerDetails;
  readonly studentDetails = this.source.studentDetails;
  readonly coursesByLecturer = this.source.coursesByLecturer;
  readonly loading = this.source.loading;
  readonly loadingLecturers = this.source.loadingLecturers;
  readonly loadingStudents = this.source.loadingStudents;
  readonly error = this.source.error;

  readonly lecturerKpis = computed(() => {
    const summary = this.lecturerSummary();
    return {
      total: summary.total,
      pending: summary.pending,
      active: summary.active,
      withViolations: summary.locked,
      needAction: summary.locked
    };
  });

  readonly studentKpis = computed(() => {
    const summary = this.studentSummary();
    return {
      total: summary.total,
      fresh: summary.fresh,
      active: summary.active,
      locked: summary.locked
    };
  });

  findLecturer(id: string): Lecturer | undefined {
    return this.lecturers().find((item) => item.id === id);
  }

  findStudent(id: string): Student | undefined {
    return this.students().find((item) => item.id === id);
  }

  lecturerDetail(id: string): Lecturer | undefined {
    return this.lecturerDetails().get(id) ?? this.findLecturer(id);
  }

  studentDetail(id: string): Student | undefined {
    return this.studentDetails().get(id) ?? this.findStudent(id);
  }

  reload(): Promise<void> {
    return this.source.reload();
  }

  loadLecturers(filters: UserListFilters): Promise<UserListResult> {
    return this.source.loadLecturers(filters);
  }
  loadStudents(filters: UserListFilters) { return this.source.loadStudents(filters); }

  loadLecturerDetail(id: string): Promise<Lecturer | undefined> {
    return this.source.loadLecturerDetail(id);
  }

  loadStudentDetail(id: string): Promise<Student | undefined> {
    return this.source.loadStudentDetail(id);
  }

  loadCoursesFor(id: string): Promise<readonly LecturerCourseRow[]> {
    return this.source.loadCoursesFor(id);
  }

  coursesFor(id: string): readonly LecturerCourseRow[] {
    return this.coursesByLecturer().get(id) ?? [];
  }

  exportList(kind: 'students' | 'lecturers', format: ExportFormat, filters: UserListFilters): Promise<void> {
    return this.source.exportList(kind, format, filters);
  }

  disciplineLecturer(id: string, command: DisciplineCommand): Promise<void> {
    return this.source.disciplineLecturer(id, command);
  }

  unlockLecturer(id: string, reason: string): Promise<void> {
    return this.source.unlockLecturer(id, reason);
  }

  approveLecturer(id: string): Promise<void> {
    return this.source.approveLecturer(id);
  }

  rejectLecturer(id: string, command: RejectLecturerCommand): Promise<void> {
    return this.source.rejectLecturer(id, command);
  }

  requestDocuments(id: string, command: DocumentRequestCommand): Promise<void> {
    return this.source.requestDocuments(id, command);
  }

  lockStudents(command: LockStudentsCommand): Promise<number> {
    return this.source.lockStudents(command);
  }

  unlockStudent(id: string, reason: string): Promise<void> {
    return this.source.unlockStudent(id, reason);
  }
}
