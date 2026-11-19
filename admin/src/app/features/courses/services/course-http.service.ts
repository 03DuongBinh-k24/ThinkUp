import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApprovalItem, ApprovalWorkspace, Course, CourseLevel, CourseStatus, Roadmap, RoadmapNode, RoadmapStudio, RoadmapTest } from '../models/course.models';
import { CourseDemoService } from './course-demo.service';

interface Page { items?: Array<Record<string, unknown>>; pagination?: { pages?: number; totalPages?: number }; }

/** Base adapter for the verified courses and roadmaps routes. UI-only fields retain safe empty values. */
@Injectable()
export class CourseHttpService extends CourseDemoService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;
  // Không giữ mock trong danh sách: API lỗi/rỗng thì UI phải rỗng + banner lỗi, không hiển thị dữ liệu giả.
  override readonly courses = signal<Course[]>([]);
  override readonly approvals = signal<ApprovalItem[]>([]);
  override readonly roadmaps = signal<Roadmap[]>([]);
  // TODO(admin-api): backend chưa có endpoint workspace duyệt hồ sơ và studio lộ trình; giữ rỗng để UI hiện trạng thái trống.
  override readonly workspaces = signal<ApprovalWorkspace[]>([]);
  override readonly studios = signal<RoadmapStudio[]>([]);
  private readonly loadErrorState = signal(false);
  override readonly loadError = this.loadErrorState.asReadonly();

  constructor() { super(); void this.load(); }
  override retry(): void { void this.load(); }
  async load(): Promise<void> {
    this.loadErrorState.set(false);
    try {
      const [courses, approvals, roadmaps] = await Promise.all([
        this.all('/admin/courses'), this.all('/admin/courses/approvals'), this.all('/admin/roadmaps')
      ]);
      this.courses.set(courses.map(toCourse));
      this.approvals.set(approvals.map(toApproval));
      this.roadmaps.set(roadmaps.map(toRoadmap));
    } catch {
      // 403 được xử lý khi người dùng mở trang (Q2); ở đây chỉ báo lỗi tải, không rơi về mock.
      this.loadErrorState.set(true);
    }
  }
  private async all(path: string): Promise<Array<Record<string, unknown>>> {
    const rows: Array<Record<string, unknown>> = []; let page = 1; let pages = 1;
    do {
      const result = await firstValueFrom(this.http.get<Page>(`${this.base}${path}`, { params: new HttpParams().set('page', page).set('pageSize', 100) }));
      rows.push(...(result.items ?? [])); pages = result.pagination?.pages ?? result.pagination?.totalPages ?? 1; page += 1;
    } while (page <= pages);
    return rows;
  }
  override archiveCourse(id: string, reason: string, explanation: string): void { void this.patch(`/admin/courses/${encodeURIComponent(id)}/business-status`, { businessStatus: 'archived', reason, explanation }); }
  override setCourseStatus(id: string, status: CourseStatus): void { void this.patch(`/admin/courses/${encodeURIComponent(id)}/business-status`, { businessStatus: status }); }
  override async approveApproval(id: string): Promise<void> { await this.decide(id, { decision: 'approve' }); }
  override async rejectApproval(id: string, reason: string, detail: string): Promise<void> {
    await this.decide(id, { decision: 'reject', reason, details: detail });
  }
  override async requestSupplement(id: string, items: string[], issueType: string, detail: string): Promise<void> {
    await this.decide(id, { decision: 'request_changes', reason: issueType, details: detail, items });
  }
  private async decide(id: string, body: Record<string, unknown>): Promise<void> {
    const revision = this.approvals().find(item => item.id === id)?.reviewRevision;
    if (!revision) throw new Error('Tải lại hồ sơ để xác nhận phiên bản cần xử lý.');
    await firstValueFrom(this.http.post(`${this.base}/admin/courses/approvals/${encodeURIComponent(id)}/decision`,
      { ...body, expectedRevision: revision }));
    await this.load();
  }
  override toggleRoadmapVisibility(id: string): void { void this.post(`/admin/roadmaps/${encodeURIComponent(id)}/hide`, {}); }
  override updateRoadmapNode(roadmapId: string, node: RoadmapNode): void { void this.patch(`/admin/roadmaps/${encodeURIComponent(roadmapId)}`, { node }); }
  override saveRoadmapDraft(roadmapId: string): void { void this.patch(`/admin/roadmaps/${encodeURIComponent(roadmapId)}`, { status: 'draft' }); }
  override publishRoadmap(roadmapId: string): void { void this.post(`/admin/roadmaps/${encodeURIComponent(roadmapId)}/publish`, {}); }
  override saveRoadmapTest(roadmapId: string, test: RoadmapTest): void { void this.patch(`/admin/roadmaps/${encodeURIComponent(roadmapId)}`, { test }); }
  private post(path: string, body: unknown): Promise<unknown> { return firstValueFrom(this.http.post(`${this.base}${path}`, body)).then(result => { void this.load(); return result; }); }
  private patch(path: string, body: unknown): Promise<unknown> { return firstValueFrom(this.http.patch(`${this.base}${path}`, body)).then(result => { void this.load(); return result; }); }
}

const text = (row: Record<string, unknown>, ...keys: string[]): string => {
  for (const key of keys) {
    const value = row[key];
    if (value != null && typeof value !== 'object') { return String(value); }
  }
  return '';
};
const num = (row: Record<string, unknown>, ...keys: string[]): number => Number(keys.map(key => row[key]).find(value => value != null && typeof value !== 'object') ?? 0);
const COURSE_STATUSES: readonly string[] = ['published', 'pending', 'hidden', 'archived'];
const COURSE_LEVELS: readonly string[] = ['Cơ bản', 'Trung cấp', 'Nâng cao'];
const toLevel = (value: string): CourseLevel => COURSE_LEVELS.includes(value) ? value as CourseLevel : 'Cơ bản';

/** Không dùng bản ghi mock theo index: mỗi dòng API phải tự đủ field, thiếu thì để giá trị rỗng an toàn. */
function toCourse(row: Record<string, unknown>): Course {
  const status = text(row, 'status');
  return {
    id: text(row, 'courseId', 'id'),
    title: text(row, 'title'),
    category: text(row, 'category'),
    level: toLevel(text(row, 'level')),
    instructor: text(row, 'instructorName', 'instructor'),
    instructorId: text(row, 'instructorId'),
    students: row['learnerCount'] == null ? null : num(row, 'learnerCount'),
    price: num(row, 'price'),
    rating: row['rating'] == null ? null : num(row, 'rating'),
    // API trả `ratingCount`; model UI đặt tên là `reviewCount`.
    reviewCount: num(row, 'ratingCount', 'reviewCount'),
    status: (COURSE_STATUSES.includes(status) ? status : 'hidden') as CourseStatus,
    createdAt: text(row, 'createdAt'),
    updatedAt: text(row, 'updatedAt'),
    durationHours: num(row, 'durationHours'),
    description: text(row, 'description'),
    tags: Array.isArray(row['tags']) ? row['tags'].map(String) : [],
    curriculumSummary: text(row, 'curriculumSummary'),
    chapters: [],
    learners: [],
    finance: { listPrice: '', instructorShare: '', platformShare: '', revenue: '', voucher: '', voucherActive: false }
  };
}
function toApproval(row: Record<string, unknown>): ApprovalItem {
  const status = text(row, 'status');
  return {
    id: text(row, 'id'),
    reviewRevision: text(row, 'reviewRevision'),
    courseId: text(row, 'courseId', 'id'),
    courseTitle: text(row, 'title'),
    category: text(row, 'category'),
    level: toLevel(text(row, 'level')),
    instructor: text(row, 'instructorName', 'instructor'),
    instructorRole: text(row, 'instructorRole'),
    components: text(row, 'components'),
    resources: text(row, 'resources'),
    suggestedPrice: num(row, 'suggestedPrice', 'price'),
    discount: num(row, 'discount'),
    submittedAt: text(row, 'submittedAt', 'createdAt'),
    slaHours: num(row, 'slaHours'),
    slaStatus: (text(row, 'slaStatus') || (status === 'published' ? 'approved' : 'remaining')) as ApprovalItem['slaStatus'],
    slaLabel: text(row, 'slaLabel'),
    slaHint: text(row, 'slaHint'),
    action: 'inspect'
  };
}
function toRoadmap(row: Record<string, unknown>): Roadmap {
  const coverage = num(row, 'coverage');
  return {
    // Bảng lộ trình dùng `versionId` làm khóa, không phải `id`.
    id: text(row, 'versionId', 'roadmapId', 'id'),
    code: text(row, 'code'),
    name: text(row, 'name', 'title'),
    industry: text(row, 'industry'),
    stages: num(row, 'stages'),
    nodes: num(row, 'nodes'),
    // API dùng `learnerCount`, model UI dùng `learners`.
    learners: num(row, 'learnerCount', 'learners'),
    completion: num(row, 'completion'),
    coverage,
    coverageAvg: num(row, 'coverageAvg') || coverage,
    testPassed: num(row, 'testPassed'),
    testTotal: num(row, 'testTotal'),
    missingTests: num(row, 'missingTests'),
    hidden: row['hidden'] === true
  };
}
