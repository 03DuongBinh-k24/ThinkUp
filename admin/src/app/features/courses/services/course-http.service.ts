import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApprovalItem, ApprovalWorkspace, Course, CourseFinance, CourseLevel, CourseStatus, CourseSuggestion, Roadmap, RoadmapNode, RoadmapStudio, RoadmapTest } from '../models/course.models';
import { CourseDemoService } from './course-demo.service';
import { APPROVAL_SLA_LABELS } from '../course-utils';
import { formatCurrency } from '../course-utils';
import { apiErrorMessage } from '../../../shared/utils/api-error';

interface Page { items?: Array<Record<string, unknown>>; pagination?: { pages?: number; totalPages?: number }; }

/** Shape của GET /admin/courses/:id/finance (xem courses.admin.js phía server). */
interface AdminFinanceTotals {
  listedPrice?: number | null;
  grossRevenue?: number | null;
  voucherDiscount?: number | null;
  actualPaid?: number | null;
  instructorShare?: number | null;
  platformShare?: number | null;
  orderCount?: number | null;
  refundTotal?: number | null;
  netAfterRefund?: number | null;
}
interface AdminFinanceResponse { totals?: AdminFinanceTotals; }

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
  private readonly studioRequests = new Map<string, Promise<{ id: string; roadmap: Roadmap; studio: RoadmapStudio }>>();
  private readonly loadErrorState = signal(false);
  override readonly loadError = this.loadErrorState.asReadonly();
  private readonly roadmapLoadErrorState = signal(false);
  override readonly roadmapLoadError = this.roadmapLoadErrorState.asReadonly();
  private readonly roadmapLoadMessageState = signal('');
  readonly roadmapLoadMessage = this.roadmapLoadMessageState.asReadonly();

  constructor() { super(); void this.load(); }
  override retry(): void { void this.load(); }

  override async getApprovalWorkspace(id: string): Promise<ApprovalWorkspace | null> {
    const response = await firstValueFrom(this.http.get<{ course?: Record<string, unknown> }>(`${this.base}/admin/courses/approvals/${encodeURIComponent(id)}`));
    const course = response.course;
    if (!course) return null;
    const approval = this.approvals().find(item => item.id === id);
    const sections = Array.isArray(course['sections']) ? course['sections'] as Array<Record<string, unknown>> : [];
    const lessons = Array.isArray(course['lessons']) ? course['lessons'] as Array<Record<string, unknown>> : [];
    const asText = (value: unknown): string => value == null ? '' : String(value);
    const asList = (value: unknown): string[] => {
      if (Array.isArray(value)) return value.map(asText).map(item => item.trim()).filter(Boolean);
      if (typeof value !== 'string' || !value.trim()) return [];
      try {
        const parsed: unknown = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map(asText).map(item => item.trim()).filter(Boolean) : [value.trim()];
      } catch { return value.split(/\r?\n/).map(item => item.trim()).filter(Boolean); }
    };
    const plainText = (value: unknown): string => asText(value).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/\s+/g, ' ').trim();
    const title = asText(course['title']) || approval?.courseTitle || 'Khóa học';
    const instructor = asText(course['instructorName']) || approval?.instructor || '';
    const chapters = sections.map((section, index) => ({
      no: String(section['order'] ?? index + 1).padStart(2, '0'),
      title: asText(section['title']) || `Chương ${index + 1}`,
      lessons: lessons.filter(lesson => asText(lesson['sectionId']) === asText(section['id'])).map((lesson, lessonIndex) => {
        const video = lesson['video'] as Record<string, unknown> | null;
        const reading = lesson['reading'] as Record<string, unknown> | null;
        const lab = lesson['lab'] as Record<string, unknown> | null;
        const quiz = lesson['quiz'] as Record<string, unknown> | null;
        const questions = Array.isArray(quiz?.['questions']) ? quiz['questions'] as Array<Record<string, unknown>> : [];
        const mappedQuestions = questions.map(question => {
          const answers = Array.isArray(question['answers']) ? question['answers'] as Array<Record<string, unknown>> : [];
          return {
            id: asText(question['id']), index: Number(question['index']) || 1,
            total: Number(question['total'] ?? quiz?.['questionCount'] ?? questions.length),
            prompt: asText(question['prompt']),
            answers: answers.map((answer, answerIndex) => ({ letter: asText(answer['letter']) || String.fromCharCode(65 + answerIndex), text: asText(answer['text']), correct: answer['correct'] === true })),
            correctLetter: asText(question['correctLetter']), explanation: asText(question['explanation'])
          };
        });
        return {
          id: asText(lesson['id']) || `${index + 1}-${lessonIndex + 1}`,
          kind: lessonKind(asText(lesson['type'])),
          title: asText(lesson['title']) || `Bài học ${lessonIndex + 1}`,
          preview: {
            videoUrl: video ? asText(video['url']) : undefined,
            duration: asText(video?.['duration'] ?? lesson['durationMinutes']),
            bodyHtml: reading ? asText(reading['contentHtml']) : undefined,
            requirements: lab ? asText(lab['requirements']) : undefined,
            sampleCode: lab ? asText(lab['sampleCode']) : undefined,
            expectedOutput: lab ? asText(lab['expectedOutput']) : undefined,
            questionCount: Number(quiz?.['questionCount'] ?? 0),
            questions: mappedQuestions,
            documents: Array.isArray(lesson['documents']) ? (lesson['documents'] as Array<Record<string, unknown>>).map(doc => ({ id: asText(doc['id']), name: asText(doc['name']), type: asText(doc['type']) })) : []
          }
        };
      })
    }));
    const lessonTotal = lessons.length;
    const emptyQuestion = { id: '', index: 0, total: 0, prompt: 'Khóa học chưa có dữ liệu câu hỏi xem trước.', answers: [], correctLetter: '', explanation: '' };
    const workspace: ApprovalWorkspace = {
      approvalId: id,
      courseId: asText(course['courseId']) || approval?.courseId || id,
      title,
      level: approval?.level ?? 'Cơ bản',
      instructor: { name: instructor, role: asText(course['instructorRole']) || 'Giảng viên', initials: instructor.split(/\\s+/).map(part => part[0] ?? '').slice(-2).join('').toUpperCase(), verified: false },
      checklist: [
        { id: 'identity', label: 'Kiểm tra thông tin khóa học', done: !!title.trim() && !!asText(course['description']).trim() },
        { id: 'curriculum', label: 'Kiểm tra giáo trình và bài học', done: sections.length > 0 && lessonTotal > 0 },
        { id: 'pricing', label: 'Kiểm tra giá đề xuất', done: Number(course['price']) >= 0 },
        { id: 'instructor', label: 'Kiểm tra thông tin giảng viên', done: !!instructor.trim() }
      ],
      landing: { coverUrl: asText(course['thumbnailUrl']), subtitle: plainText(course['shortDescription']) || plainText(course['description']), price: Number(course['price']) || 0, originalPrice: Number(course['originalPrice'] ?? course['price']) || 0, discount: approval?.discount ?? 0, stats: `${sections.length} chương · ${lessonTotal} bài học`, outcomes: asList(course['courseOutcomes']), requirement: asList(course['requirements']).join(' · '), categories: [approval?.category || asText(course['category'])].filter(Boolean), subtags: asList(course['tags']), certificate: asText((course['certificateSample'] as Record<string, unknown> | null)?.['title']), certificateNote: '' },
      chapters,
      video: { title: 'Nội dung bài học', type: 'Nội dung khóa học', progress: 0, duration: '', playback: '', description: 'Chọn bài học trong cấu trúc khóa học để đối chiếu nội dung.', attachments: '' },
      ide: { title: 'Bài tập lập trình', difficulty: '', prompt: 'Chưa có dữ liệu bài tập lập trình trong API.', language: '', code: '', testcases: [], result: '' },
      quiz: { title: 'Câu hỏi kiểm tra', question: emptyQuestion },
      files: [],
      history: (Array.isArray(course['reviewHistory']) ? course['reviewHistory'] as Array<Record<string, unknown>> : []).map(entry => {
        const action = asText(entry['action']);
        const actionLabel: Record<string, string> = { approve: 'Đồng ý phê duyệt', reject: 'Từ chối xuất bản', request_changes: 'Yêu cầu bổ sung', claim: 'Tiếp nhận thẩm định' };
        const note = [asText(entry['reason']), asText(entry['details'])].filter(Boolean).join(' · ');
        return { at: asText(entry['at']), actor: asText(entry['actor']) || 'Quản trị viên', action: actionLabel[action] || action, note };
      })
    };
    this.workspaces.update(items => [...items.filter(item => item.approvalId !== id), workspace]);
    return workspace;
  }

  override async createRoadmap(input: { categoryId: number; name: string; code?: string; description?: string }): Promise<{ id: string; roadmap: Roadmap; studio: RoadmapStudio }> {
    const response = await firstValueFrom(this.http.post<{ roadmap: Record<string, unknown> }>(`${this.base}/admin/roadmaps`, input));
    const id = text(response.roadmap, 'versionId', 'id');
    if (!id) throw new Error('API không trả về mã bản nháp lộ trình.');
    return this.ensureRoadmapStudio(id);
  }

  override ensureRoadmapStudio(id: string): Promise<{ id: string; roadmap: Roadmap; studio: RoadmapStudio }> {
    const cached = this.studios().find(studio => studio.roadmapId === id);
    if (cached) {
      const roadmap = this.roadmaps().find(item => item.id === id);
      if (roadmap) return Promise.resolve({ id, roadmap, studio: cached });
    }
    const pending = this.studioRequests.get(id);
    if (pending) return pending;
    const request = firstValueFrom(this.http.get<{ roadmap: Record<string, unknown> }>(`${this.base}/admin/roadmaps/${encodeURIComponent(id)}`))
      .then(({ roadmap }) => {
        const phasesRaw = Array.isArray(roadmap['stages']) ? roadmap['stages'] as Array<Record<string, unknown>> : [];
        const draftId = text(roadmap, 'versionId', 'id') || id;
        const parsePhaseTest = (rawPhaseTest: Record<string, unknown> | null | undefined, stageName: string): RoadmapTest | null => {
          if (!rawPhaseTest) return null;
          const questionsRaw = Array.isArray(rawPhaseTest['questions']) ? rawPhaseTest['questions'] as Array<Record<string, unknown>> : [];
          return {
            name: text(rawPhaseTest, 'name', 'title') || `Bài kiểm tra ${stageName}`,
            duration: num(rawPhaseTest, 'duration_minutes', 'duration') || 30,
            passScore: num(rawPhaseTest, 'pass_score', 'passScore') || 70,
            stage: stageName,
            questions: questionsRaw.map((question, index) => ({
              id: text(question, 'question_id', 'id') || `question-${index + 1}`,
              nodeId: text(question, 'node_id', 'nodeId'),
              skillTag: text(question, 'skill_tag', 'skillTag'),
              index: index + 1,
              title: text(question, 'title', 'question_text', 'prompt') || `Câu hỏi ${index + 1}`,
              meta: text(question, 'meta') || '4 phương án · 1 đáp án đúng',
              prompt: text(question, 'prompt', 'question_text', 'question'),
              language: text(question, 'language'),
              code: text(question, 'code'),
              hint: text(question, 'hint'),
              hintSaved: !!text(question, 'hint'),
              answers: (Array.isArray(question['answers']) ? question['answers'] as Array<Record<string, unknown>> : Array.isArray(question['options']) ? question['options'] as Array<Record<string, unknown>> : []).map((answer, answerIndex) => ({
                letter: text(answer, 'letter', 'key') || String.fromCharCode(65 + answerIndex),
                text: text(answer, 'text'),
                correct: answer['correct'] === true || text(question, 'correct_option', 'correctOption') === text(answer, 'key', 'letter')
              }))
            }))
          };
        };

        const phases = phasesRaw.map((phase, phaseIndex) => {
          const stageName = text(phase, 'name', 'title') || `Giai đoạn ${phaseIndex + 1}`;
          const stageNo = text(phase, 'no', 'order') || String(phaseIndex + 1).padStart(2, '0');
          const stageFull = `${stageNo} · ${stageName}`;
          return {
            id: text(phase, 'stage_id', 'id') || `phase-${phaseIndex + 1}`,
            no: stageNo,
            name: stageName,
            test: parsePhaseTest(phase['test'] as Record<string, unknown> | null | undefined, stageFull),
            nodes: (Array.isArray(phase['nodes']) ? phase['nodes'] as Array<Record<string, unknown>> : []).map((node, nodeIndex) => ({
              id: text(node, 'node_id', 'id') || `node-${phaseIndex + 1}-${nodeIndex + 1}`,
              name: text(node, 'title', 'name'), type: toNodeType(text(node, 'type')),
              level: toLevel(text(node, 'level')), industry: text(node, 'industry'), description: text(node, 'description'),
              outcomes: Array.isArray(node['outcomes']) ? (node['outcomes'] as unknown[]).join('\n') : text(node, 'outcomes'),
              tags: Array.isArray(node['tags']) ? (node['tags'] as unknown[]).map(String) : [],
              courses: (Array.isArray(node['courses']) ? node['courses'] as Array<Record<string, unknown>> : []).map(course => ({
                id: text(course, 'course_id', 'id'), title: text(course, 'title'), match: num(course, 's_match', 'match'), level: toLevel(text(course, 'level'))
              }))
            }))
          };
        });
        const firstPhaseWithTest = phases.find(p => p.test && p.test.questions.length > 0) || phases[0];
        const test: RoadmapTest = firstPhaseWithTest?.test ?? {
          name: 'Bài kiểm tra đánh giá năng lực',
          duration: 30,
          passScore: 70,
          stage: firstPhaseWithTest ? `${firstPhaseWithTest.no} · ${firstPhaseWithTest.name}` : '',
          questions: []
        };
        const firstNodeId = phases.flatMap(phase => phase.nodes)[0]?.id;
        const studio: RoadmapStudio = {
          roadmapId: draftId, phases, selectedNodeId: firstNodeId ?? '',
          suggestions: [], threshold: num(roadmap, 'threshold') || 70, test
        };
        const updatedRoadmap = toRoadmap({ ...roadmap, versionId: draftId });
        this.roadmaps.update(items => items.some(item => item.id === draftId)
          ? items : [updatedRoadmap, ...items.filter(item => item.id !== id)]);
        this.studios.update(items => [...items.filter(item => item.roadmapId !== draftId), studio]);
        return { id: draftId, roadmap: updatedRoadmap, studio };
      })
      .finally(() => this.studioRequests.delete(id));
    this.studioRequests.set(id, request);
    return request;
  }

  override async getRoadmapNodeSuggestions(roadmapId: string, nodeId: string): Promise<CourseSuggestion[]> {
    const url = `${this.base}/admin/roadmaps/${encodeURIComponent(roadmapId)}/nodes/${encodeURIComponent(nodeId)}/suggestions`;
    const { courses = [] } = await firstValueFrom(this.http.get<{ courses?: Array<Record<string, unknown>> }>(url));
    return courses.map(course => ({
      id: text(course, 'course_id', 'id'), title: text(course, 'title'),
      level: toLevel(text(course, 'level')), match: num(course, 's_match', 'match')
    }));
  }

  override async getCourseContent(course: Course): Promise<Course> {
    const url = `${this.base}/admin/courses/${encodeURIComponent(course.id)}`;
    const response = await firstValueFrom(this.http.get<{ course: Record<string, unknown> }>(url));
    const detail = response.course;
    const sections = Array.isArray(detail['sections']) ? detail['sections'] as Array<Record<string, unknown>> : [];
    const lessons = Array.isArray(detail['lessons']) ? detail['lessons'] as Array<Record<string, unknown>> : [];
    const sectionIdAliases = new Map<string, string>();
    for (const section of sections) {
      const canonical = text(section, 'id', 'sectionId', 'section_id');
      for (const key of [canonical, text(section, 'sectionId', 'section_id', '_id')]) if (key) sectionIdAliases.set(key, canonical);
    }
    const lessonGroups = new Map<string, Array<Record<string, unknown>>>();
    for (const lesson of lessons) {
      const rawSectionId = text(lesson, 'sectionId', 'section_id');
      const sectionId = sectionIdAliases.get(rawSectionId) ?? rawSectionId;
      lessonGroups.set(sectionId, [...(lessonGroups.get(sectionId) ?? []), lesson]);
    }
    const summary = (detail['curriculumSummary'] && typeof detail['curriculumSummary'] === 'object' ? detail['curriculumSummary'] : {}) as Record<string, unknown>;
    return {
      ...course,
      description: text(detail, 'description', 'shortDescription'),
      tags: Array.isArray(detail['tags']) ? (detail['tags'] as unknown[]).map(String) : [],
      category: text(detail, 'category') || course.category,
      thumbnailUrl: text(detail, 'thumbnailUrl', 'thumbnail_url', 'coverImage', 'cover_image', 'thumbnail', 'image') || course.thumbnailUrl,
      durationHours: num(detail, 'durationHours') || course.durationHours,
      curriculumSummary: `${num(summary, 'sectionCount')} chương · ${num(summary, 'lessonCount')} bài học`,
      chapters: sections.map((section, index) => {
        const id = text(section, 'id', 'sectionId', 'section_id');
        const chapterLessons = lessonGroups.get(sectionIdAliases.get(id) ?? id) ?? [];
        return { no: String(index + 1), title: text(section, 'title'), meta: `${chapterLessons.length} bài học`,
          description: text(section, 'description'), lessons: chapterLessons.map(lesson => ({
            id: text(lesson, 'id', 'lessonId', 'lesson_id'), title: text(lesson, 'title'), type: text(lesson, 'type', 'lesson_type'),
            durationMinutes: num(lesson, 'durationMinutes', 'duration_minutes')
          })) };
      })
    };
  }

  override async getCourseLearners(course: Course): Promise<Course['learners']> {
    const rows = await this.all(`/admin/courses/${encodeURIComponent(course.id)}/learners`);
    return rows.map(row => ({
      name: text(row, 'fullName', 'full_name', 'name'), email: text(row, 'email'),
      progress: num(row, 'progress', 'progressPercentage', 'progress_percentage'),
      enrolledAt: text(row, 'purchasedAt', 'purchased_at', 'enrolledAt', 'enrolled_at'),
      status: row['completed'] === true || row['isCompleted'] === true || row['is_completed'] === true ? 'Hoàn thành' : 'Đang học'
    }));
  }

  /**
   * GET /admin/courses/:id/finance (SA/FA). Backend chỉ trả báo cáo cho khóa đã duyệt,
   * đang bán hoặc tạm ẩn — còn lại trả 409 COURSE_FINANCE_UNAVAILABLE, CA/CS trả 403.
   * Lỗi được ném ra với thông điệp tiếng Việt đã chuẩn hoá để dialog hiển thị.
   */
  override async getCourseFinance(id: string): Promise<CourseFinance | null> {
    try {
      const res = await firstValueFrom(
        this.http.get<AdminFinanceResponse>(`${this.base}/admin/courses/${encodeURIComponent(id)}/finance`));
      const totals = res?.totals;
      if (!totals) return null;
      const asNumber = (value: unknown) => { const n = Number(value ?? 0); return Number.isFinite(n) ? n : 0; };
      const discount = asNumber(totals.voucherDiscount);
      const paid = asNumber(totals.actualPaid);
      const refund = asNumber(totals.refundTotal);
      const net = asNumber(totals.netAfterRefund);
      const price = this.courses().find(item => item.id === id)?.price ?? 0;
      return {
        listPrice: formatCurrency(price),
        // Backend đã tính 40% cho giảng viên / 60% sàn trên phần thực thu (100% gross nếu GV tài trợ voucher).
        instructorShare: formatCurrency(asNumber(totals.instructorShare)),
        platformShare: formatCurrency(asNumber(totals.platformShare)),
        revenue: formatCurrency(paid),
        voucher: discount > 0 ? `-${formatCurrency(discount)} tổng giảm` : 'Chưa áp dụng',
        voucherActive: discount > 0,
        orderCount: asNumber(totals.orderCount),
        refundTotal: formatCurrency(refund),
        netAfterRefund: formatCurrency(net)
      };
    } catch (error) {
      throw new Error(apiErrorMessage(error, 'Không tải được báo cáo tài chính. Vui lòng thử lại.'));
    }
  }
  async load(): Promise<void> {
    this.loadErrorState.set(false);
    this.roadmapLoadErrorState.set(false);
    this.roadmapLoadMessageState.set('');
    // Tải danh sách khóa học độc lập: lỗi ở API phụ (duyệt/lộ trình) không được
    // biến trang quản lý khóa học thành trạng thái lỗi khi endpoint chính vẫn hoạt động.
    const coursesRequest = this.all('/admin/courses').then(rows => {
      this.courses.set(rows.map(toCourse));
      return true;
    }).catch(() => false);
    const approvalsRequest = this.all('/admin/courses/approvals')
      .then(rows => this.approvals.set(rows.map(toApproval)))
      .catch(() => this.approvals.set([]));
    const roadmapsRequest = this.all('/admin/roadmaps').then(rows => {
      this.roadmaps.set(rows.map(toRoadmap));
      return true;
    }).catch(error => {
      this.roadmaps.set([]);
      this.roadmapLoadMessageState.set(apiErrorMessage(error, 'Không tải được danh sách lộ trình.'));
      return false;
    });

    const coursesLoaded = await coursesRequest;
    const [, roadmapsLoaded] = await Promise.all([approvalsRequest, roadmapsRequest]);
    this.loadErrorState.set(!coursesLoaded);
    this.roadmapLoadErrorState.set(!roadmapsLoaded);
  }
  private async all(path: string): Promise<Array<Record<string, unknown>>> {
    const rows: Array<Record<string, unknown>> = []; let page = 1; let pages = 1;
    do {
      const result = await firstValueFrom(this.http.get<Page>(`${this.base}${path}`, { params: new HttpParams().set('page', page).set('pageSize', 100) }));
      rows.push(...(result.items ?? [])); pages = result.pagination?.pages ?? result.pagination?.totalPages ?? 1; page += 1;
    } while (page <= pages);
    return rows;
  }
  override async archiveCourse(id: string, reason: string, explanation: string): Promise<void> { await this.patch(`/admin/courses/${encodeURIComponent(id)}/business-status`, { businessStatus: 'archived', reason, explanation }); }
  override async restoreArchivedCourse(id: string): Promise<void> {
    const response = await firstValueFrom(this.http.post<{ course?: Record<string, unknown> }>(`${this.base}/admin/courses/${encodeURIComponent(id)}/restore`, {}));
    if (response.course) this.courses.update(items => items.map(item => item.id === id ? toCourse(response.course!) : item));
  }
  override async setCourseStatus(id: string, status: CourseStatus): Promise<void> { await this.patch(`/admin/courses/${encodeURIComponent(id)}/business-status`, { businessStatus: status }); }
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
    await this.getApprovalWorkspace(id);
  }
  override async toggleRoadmapVisibility(id: string): Promise<void> {
    const item = this.roadmaps().find(roadmap => roadmap.id === id);
    if (!item) return;
    const action = item.hidden ? 'unhide' : 'hide';
    void this.post(`/admin/roadmaps/${encodeURIComponent(id)}/${action}`, {});
  }
  override updateRoadmapNode(_roadmapId: string, _node: RoadmapNode): void { /* Studio saves the complete draft atomically. */ }
  override saveRoadmapDraft(roadmapId: string, studio?: RoadmapStudio): Promise<void> { return this.saveStudio(roadmapId, studio); }
  override async publishRoadmap(roadmapId: string, studio?: RoadmapStudio): Promise<void> {
    const id = studio ? roadmapId : (await this.ensureRoadmapStudio(roadmapId)).id;
    if (studio) await this.saveStudio(roadmapId, studio);
    await firstValueFrom(this.http.post(`${this.base}/admin/roadmaps/${encodeURIComponent(id)}/publish`, {}));
    this.studios.update(items => items.filter(item => item.roadmapId !== id));
    await this.load();
  }
  override saveRoadmapTest(_roadmapId: string, _test: RoadmapTest): void { /* Studio saves the complete draft atomically. */ }
  private async saveStudio(roadmapId: string, currentStudio?: RoadmapStudio): Promise<void> {
    const studio = currentStudio ?? this.studios().find(item => item.roadmapId === roadmapId); if (!studio) throw new Error('Không có dữ liệu lộ trình để lưu.');
    const phases = studio.phases;
    const stages = phases.map(phase => {
      const activeTest = studio.test && studio.test.stage.endsWith(phase.name) ? this.serializeTest(studio.test) : null;
      const phaseTest = phase.test ? this.serializeTest(phase.test) : null;
      return {
        id: phase.id,
        name: phase.name,
        nodes: phase.nodes.map(node => this.serializeNode(node)),
        test: activeTest ?? phaseTest ?? null
      };
    });
    await this.patch(`/admin/roadmaps/${encodeURIComponent(roadmapId)}`, { name: this.roadmaps().find(item => item.id === roadmapId)?.name, threshold: studio.threshold, stages });
  }
  private serializeNode(node: RoadmapNode): Record<string, unknown> { return { id: node.id, name: node.name, type: node.type, icon: node.icon, level: node.level, industry: node.industry, description: node.description, outcomes: node.outcomes, tags: node.tags, courses: (node.courses ?? []).map(course => ({ course_id: course.id })) }; }
  private serializeTest(studioTest: RoadmapTest): Record<string, unknown> { return { name: studioTest.name, duration_minutes: studioTest.duration, pass_score: studioTest.passScore, questions: studioTest.questions.map(question => ({ id: question.id, node_id: question.nodeId, skill_tag: question.skillTag, prompt: question.prompt, language: question.language, code: question.code, explanation: question.hint, answers: question.answers.map(answer => ({ key: answer.letter, text: answer.text, correct: answer.correct })) })) }; }
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
const COURSE_STATUSES: readonly string[] = ['published', 'pending', 'hidden', 'archived', 'unpublished'];
const toLevel = (value: string): CourseLevel => {
  const normalized = value.trim().toLocaleLowerCase();
  if (['cơ bản', 'co ban', 'basic', 'beginner', 'elementary'].includes(normalized)) return 'Cơ bản';
  if (['trung cấp', 'trung cap', 'intermediate', 'mid'].includes(normalized)) return 'Trung cấp';
  if (['nâng cao', 'nang cao', 'advanced', 'expert'].includes(normalized)) return 'Nâng cao';
  return 'Cơ bản';
};
const toNodeType = (value: string): RoadmapNode['type'] => {
  const types: Record<string, RoadmapNode['type']> = { framework: 'Framework', language: 'Ngôn ngữ', tool: 'Công cụ', skill: 'Kỹ năng', project: 'Dự án', Framework: 'Framework', 'Ngôn ngữ': 'Ngôn ngữ', 'Công cụ': 'Công cụ', 'Kỹ năng': 'Kỹ năng', 'Dự án': 'Dự án' };
  return types[value] ?? 'Kỹ năng';
};
const lessonKind = (value: string): ApprovalWorkspace['chapters'][number]['lessons'][number]['kind'] => {
  const type = value.toLowerCase();
  if (['article', 'reading', 'text', 'doc'].includes(type)) return 'reading';
  if (['quiz', 'test', 'exam', 'assessment'].includes(type)) return 'quiz';
  if (['lab', 'coding', 'practice', 'ide'].includes(type)) return 'ide';
  return 'video';
};

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
    status: ['pending_review', 'in_review', 'changes_requested'].includes(text(row, 'reviewStatus'))
      && status === 'unpublished' ? 'pending' : (COURSE_STATUSES.includes(status) ? status : 'unpublished') as CourseStatus,
    createdAt: text(row, 'createdAt'),
    updatedAt: text(row, 'updatedAt'),
    durationHours: num(row, 'durationHours'),
    description: text(row, 'description'),
    thumbnailUrl: text(row, 'thumbnailUrl', 'thumbnail_url', 'coverImage', 'cover_image', 'thumbnail', 'image'),
    tags: Array.isArray(row['tags']) ? row['tags'].map(String) : [],
    curriculumSummary: text(row, 'curriculumSummary'),
    chapters: [],
    learners: [],
    finance: { listPrice: '', instructorShare: '', platformShare: '', revenue: '', voucher: '', voucherActive: false }
  };
}
function toApproval(row: Record<string, unknown>): ApprovalItem {
  const review = text(row, 'reviewStatus');
  const hours = row['reviewHoursRemaining'];
  const sla: ApprovalItem['slaStatus'] = review === 'changes_requested' ? 'waiting'
    : review === 'approved' ? 'approved'
    : typeof hours === 'number' && hours <= 0 ? 'overdue'
    : typeof hours === 'number' && hours <= 12 ? 'due-soon' : 'remaining';
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
    submittedAt: text(row, 'reviewSubmittedAt'),
    slaHours: typeof hours === 'number' ? hours : 0,
    slaStatus: sla,
    slaLabel: APPROVAL_SLA_LABELS[sla],
    slaHint: typeof hours === 'number' ? `${Math.ceil(Math.abs(hours))} giờ` : '',
    action: 'inspect'
  };
}
function toRoadmapTest(raw: Record<string, unknown>, stage: string): RoadmapTest {
  const questions = Array.isArray(raw['questions']) ? raw['questions'] as Record<string, unknown>[] : [];
  return {
    name: text(raw, 'name', 'title'),
    duration: num(raw, 'duration_minutes', 'duration'),
    passScore: num(raw, 'pass_score', 'passScore'),
    stage,
    questions: questions.map((question, index) => {
      const rawAnswers = question['answers'] ?? question['options'];
      const answers = Array.isArray(rawAnswers) ? rawAnswers as Record<string, unknown>[] : [];
      const correctOption = text(question, 'correct_option', 'correctOption').toUpperCase();
      const hint = text(question, 'hint', 'explanation');
      return {
        id: text(question, 'question_id', 'id') || `question-${index + 1}`,
        nodeId: text(question, 'node_id', 'nodeId'),
        skillTag: text(question, 'skill_tag', 'skillTag'),
        index: index + 1,
        title: text(question, 'title', 'question_text', 'prompt') || `Câu hỏi ${index + 1}`,
        meta: text(question, 'meta') || '4 phương án · 1 đáp án đúng',
        prompt: text(question, 'prompt', 'question_text', 'question'),
        language: text(question, 'language'),
        code: text(question, 'code'),
        hint,
        hintSaved: !!hint,
        answers: answers.map((answer, answerIndex) => {
          const letter = text(answer, 'letter', 'key').toUpperCase() || String.fromCharCode(65 + answerIndex);
          return { letter, text: text(answer, 'text'), correct: answer['correct'] === true || correctOption === letter };
        })
      };
    })
  };
}

function toRoadmap(row: Record<string, unknown>): Roadmap {
  const coverage = num(row, 'coverage');
  const rawStages = row['stageDetails'] ?? row['stages'];
  const stages = Array.isArray(rawStages) ? rawStages as Array<Record<string, unknown>> : [];
  const learnerCount = num(row, 'learnerCount', 'learners');
  const completed = num(row, 'completedLearnerCount', 'completedCount', 'completedLearners');
  return {
    // Bảng lộ trình dùng `versionId` làm khóa, không phải `id`.
    id: text(row, 'versionId') || text(row, 'roadmapId', 'id') || String(row['categoryId'] ?? ''),
    code: text(row, 'code'),
    name: text(row, 'name', 'title'),
    industry: text(row, 'industry'),
    stages: num(row, 'stageCount') || stages.length || num(row, 'stages'),
    nodes: num(row, 'nodeCount') || stages.reduce((sum, stage) => sum + (Array.isArray(stage['nodes']) ? (stage['nodes'] as unknown[]).length : 0), 0) || num(row, 'nodes'),
    // API dùng `learnerCount`, model UI dùng `learners`.
    learners: learnerCount,
    completion: row['completionRate'] != null || row['completion'] != null ? num(row, 'completionRate', 'completion') : learnerCount && row['completedLearnerCount'] != null ? Math.round(completed / learnerCount * 100) : null,
    coverage,
    coverageAvg: num(row, 'coverageAvg') || coverage,
    testPassed: row['testPassed'] != null || row['testsPassed'] != null ? num(row, 'testPassed', 'testsPassed') : null,
    // API's testTotal is the number of learner attempts. Keep zero distinct
    // from absent values; stage test availability is represented by missingTests.
    testTotal: row['testTotal'] != null || row['testsTotal'] != null ? num(row, 'testTotal', 'testsTotal') : 0,
    // The list API supplies this derived count. If an older API omits it, do
    // not infer missing tests from stage details that are not included here.
    missingTests: row['missingTests'] != null ? num(row, 'missingTests') : 0,
    hidden: row['hidden'] === true || row['status'] === 'hidden' || row['status'] === 'draft' || row['status'] === 'superseded'
  };
}
