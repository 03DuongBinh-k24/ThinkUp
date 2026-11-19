import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CustomSelectComponent, CustomSelectOption } from '../../../shared/components/custom-select/custom-select.component';
import { RoadmapHintDialogComponent } from '../components/roadmap-hint-dialog/roadmap-hint-dialog.component';
import { CourseToastComponent, ToastTone } from '../components/course-toast.component';
import { LEVEL_TONE, ROADMAP_NODE_TYPES, countChars } from '../course-utils';
import {
  CourseLevel, CourseSuggestion, RoadmapNode, RoadmapNodeType, RoadmapPhase, RoadmapQuestion, RoadmapTest, RoadmapStudio
} from '../models/course.models';
import { CourseStore } from '../services/course.store';

type StudioTab = 'structure' | 'test';

@Component({
  selector: 'app-roadmap-studio',
  standalone: true,
  imports: [
    CustomSelectComponent,
    RoadmapHintDialogComponent,
    CourseToastComponent
  ],
  templateUrl: './roadmap-studio.component.html',
  styleUrl: '../courses-page.css'
})
export class RoadmapStudioComponent {
  private readonly store = inject(CourseStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly navigationData = (this.router.getCurrentNavigation()?.extras.state ?? history.state) as { roadmap?: import('../models/course.models').Roadmap; studio?: import('../models/course.models').RoadmapStudio };
  readonly roadmapId = this.route.snapshot.paramMap.get('id') ?? '';
  private readonly localStudio = signal<RoadmapStudio | null>(null);
  readonly roadmap = computed(() => this.store.roadmaps().find(item => item.id === this.roadmapId) ?? this.navigationData?.roadmap ?? null);
  readonly studio = computed(() => this.localStudio() ?? this.store.studios().find(item => item.roadmapId === this.roadmapId) ?? (this.navigationData?.studio?.roadmapId === this.roadmapId ? this.navigationData.studio : null));

  readonly tab = signal<StudioTab>('structure');
  readonly toast = signal<{ message: string; tone: ToastTone } | null>(null);
  readonly touched = signal(false);

  readonly selectedNodeId = signal(this.findNode(this.studio()?.selectedNodeId ?? '')?.id ?? '');
  readonly nodeDraft = signal<RoadmapNode | null>(this.findNode(this.selectedNodeId()));
  readonly testDraft = signal<RoadmapTest | null>(this.studio()?.test ? clone(this.studio()!.test) : null);
  readonly selectedQuestionId = signal(this.testDraft()?.questions[0]?.id ?? '');
  readonly threshold = signal(this.studio()?.threshold ?? 70);
  readonly attachedIds = signal<string[]>([]);
  readonly hintOpen = signal(false);
  readonly newTag = signal('');
  readonly editingTag = signal<string | null>(null);
  readonly editingTagValue = signal('');

  readonly typeOptions: CustomSelectOption[] = ROADMAP_NODE_TYPES.map(value => ({ value, label: value }));
  readonly levelOptions: CustomSelectOption[] = [
    { value: 'Cơ bản', label: 'Cơ bản' },
    { value: 'Trung cấp', label: 'Trung cấp' },
    { value: 'Nâng cao', label: 'Nâng cao' }
  ];
  readonly stageOptions = computed<CustomSelectOption[]>(() => {
    const phases = this.studio()?.phases ?? [];
    const options = phases.map(phase => ({ value: `${phase.no} · ${phase.name}`, label: `${phase.no} · ${phase.name}` }));
    // Figma lưu giai đoạn của bài test là "03 · Front-end Framework" trong khi cây cấu trúc đánh số
    // giai đoạn đó là 02, nên giữ nguyên giá trị đã lưu làm lựa chọn để select không rơi về placeholder.
    const current = this.testDraft()?.stage;
    if (current && !options.some(option => option.value === current)) {
      options.unshift({ value: current, label: current });
    }
    return options;
  });

  readonly activeQuestion = computed(() => {
    const test = this.testDraft();
    return test?.questions.find(item => item.id === this.selectedQuestionId()) ?? null;
  });
  readonly suggestions = computed(() => this.studio()?.suggestions ?? []);
  readonly visibleSuggestions = computed(() => this.suggestions().filter(item => item.match >= this.threshold()));
  readonly qualifiedCount = computed(() => this.visibleSuggestions().length);
  readonly nodeName = computed(() => this.nodeDraft()?.name ?? '');
  readonly questionsCount = computed(() => this.testDraft()?.questions.length ?? 0);

  readonly nameError = computed(() => this.touched() && countChars(this.nodeDraft()?.name ?? '') === 0);
  readonly descriptionError = computed(() => this.touched() && countChars(this.nodeDraft()?.description ?? '') === 0);
  readonly outcomesError = computed(() => this.touched() && countChars(this.nodeDraft()?.outcomes ?? '') === 0);

  selectNode(node: RoadmapNode): void {
    const current = this.nodeDraft();
    if (current) this.commitNode(current);
    this.selectedNodeId.set(node.id);
    this.nodeDraft.set(clone(node));
    this.touched.set(false);
  }

  private commitNode(node: RoadmapNode): void {
    const studio = this.studio();
    if (!studio) return;
    const phases = studio.phases.map((phase: RoadmapPhase) => ({ ...phase, nodes: phase.nodes.map((item: RoadmapNode) => item.id === node.id ? clone(node) : item) }));
    this.localStudio.set({ ...studio, phases });
  }

  patchNode(patch: Partial<RoadmapNode>): void {
    const current = this.nodeDraft();
    if (!current) return;
    this.nodeDraft.set({ ...current, ...patch });
  }

  setNodeType(value: string): void { this.patchNode({ type: value as RoadmapNodeType }); }
  setNodeLevel(value: string): void { this.patchNode({ level: value as CourseLevel }); }

  addTag(): void {
    const value = this.newTag().trim();
    const current = this.nodeDraft();
    if (!current || !value) return;
    if (current.tags.includes(value)) {
      this.notify(`Sub-tag “${value}” đã tồn tại.`, 'error');
      return;
    }
    this.patchNode({ tags: [...current.tags, value] });
    this.newTag.set('');
  }

  startEditTag(tag: string): void {
    this.editingTag.set(tag);
    this.editingTagValue.set(tag);
  }

  confirmEditTag(tag: string): void {
    const value = this.editingTagValue().trim();
    const current = this.nodeDraft();
    if (!current) return;
    if (!value) {
      this.removeTag(tag);
      return;
    }
    this.patchNode({
      tags: current.tags.map(item => (item === tag ? value : item)).filter((item, index, list) => list.indexOf(item) === index)
    });
    this.editingTag.set(null);
  }

  cancelEditTag(): void {
    this.editingTag.set(null);
  }

  removeTag(tag: string): void {
    const current = this.nodeDraft();
    if (!current) return;
    this.patchNode({ tags: current.tags.filter(item => item !== tag) });
    if (this.editingTag() === tag) this.editingTag.set(null);
  }

  addPhase(): void {
    const studio = this.studio();
    if (!studio) return;
    const nextIndex = studio.phases.length + 1;
    const phaseNo = String(nextIndex).padStart(2, '0');
    const newPhase: RoadmapPhase = {
      id: `stage-${Date.now().toString(36)}`,
      no: phaseNo,
      name: `Giai đoạn ${phaseNo}`,
      nodes: [],
      test: null
    };
    const updatedPhases = [...studio.phases, newPhase];
    this.localStudio.set({ ...studio, phases: updatedPhases });
    this.notify(`Đã thêm ${newPhase.name}.`, 'success');
  }

  addNode(phase: RoadmapPhase): void {
    const studio = this.studio();
    if (!studio) return;
    const nodeIndex = phase.nodes.length + 1;
    const newNode: RoadmapNode = {
      id: `node-${Date.now().toString(36)}-${nodeIndex}`,
      name: `Kỹ năng mới ${nodeIndex}`,
      type: 'Kỹ năng',
      level: 'Cơ bản',
      industry: this.roadmap()?.industry || '',
      description: 'Mô tả chi tiết kỹ năng cần đạt.',
      outcomes: 'Kết quả học tập đạt được.',
      tags: ['Kỹ năng'],
      courses: []
    };
    const updatedPhases = studio.phases.map(p =>
      p.id === phase.id ? { ...p, nodes: [...p.nodes, newNode] } : p
    );
    this.localStudio.set({ ...studio, phases: updatedPhases });
    this.selectNode(newNode);
    this.notify(`Đã thêm node vào ${phase.name}.`, 'success');
  }

  setThreshold(value: string): void {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    this.threshold.set(Math.min(100, Math.max(0, Math.round(parsed))));
  }

  attach(suggestion: CourseSuggestion): void {
    if (this.attachedIds().includes(suggestion.id)) return;
    this.attachedIds.set([...this.attachedIds(), suggestion.id]);
    const current = this.nodeDraft();
    if (current) {
      const attached = { ...current, courses: [...(current.courses ?? []), { id: suggestion.id, title: suggestion.title, match: suggestion.match, level: suggestion.level }] };
      this.nodeDraft.set(attached);
      this.commitNode(attached);
    }
    this.notify(`Đã gắn “${suggestion.title}” vào node ${this.nodeName()}.`, 'success');
  }

  selectQuestion(id: string): void {
    this.selectedQuestionId.set(id);
  }

  patchTest(patch: Partial<RoadmapTest>): void {
    const test = this.testDraft();
    if (!test) return;
    this.testDraft.set({ ...test, ...patch });
  }

  setDuration(value: string): void {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    this.patchTest({ duration: Math.max(1, Math.round(parsed)) });
  }

  setPassScore(value: string): void {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    this.patchTest({ passScore: Math.min(100, Math.max(0, Math.round(parsed))) });
  }

  setStage(value: string): void {
    const currentTest = this.testDraft();
    const studio = this.studio();
    if (studio && currentTest) {
      // Lưu lại bài test hiện tại vào đúng phase tương ứng
      const updatedPhases = studio.phases.map(phase => {
        const fullStageName = `${phase.no} · ${phase.name}`;
        if (currentTest.stage.endsWith(phase.name) || currentTest.stage === fullStageName) {
          return { ...phase, test: clone(currentTest) };
        }
        return phase;
      });
      this.localStudio.set({ ...studio, phases: updatedPhases });

      // Tìm phase mục tiêu được chọn
      const targetPhase = updatedPhases.find(phase => {
        const fullStageName = `${phase.no} · ${phase.name}`;
        return value.endsWith(phase.name) || value === fullStageName;
      });

      if (targetPhase?.test) {
        // Nếu phase mục tiêu đã có bài test và bộ câu hỏi, tải lên
        this.testDraft.set(clone(targetPhase.test));
        this.selectedQuestionId.set(targetPhase.test.questions[0]?.id ?? '');
        return;
      }
    }

    // Nếu phase mục tiêu chưa có bài test hoặc không tìm thấy, đổi stage và reset về rỗng
    this.patchTest({
      stage: value,
      name: `Bài kiểm tra ${value}`,
      questions: []
    });
    this.selectedQuestionId.set('');
  }

  patchQuestion(patch: Partial<RoadmapQuestion>): void {
    this.updateQuestion(question => ({ ...question, ...patch }));
  }

  setAnswerText(letter: string, text: string): void {
    this.updateQuestion(question => ({
      ...question,
      answers: question.answers.map(answer => (answer.letter === letter ? { ...answer, text } : answer))
    }));
  }

  setCorrectAnswer(letter: string): void {
    this.updateQuestion(question => ({
      ...question,
      answers: question.answers.map(answer => ({ ...answer, correct: answer.letter === letter }))
    }));
  }

  addQuestion(): void {
    const test = this.testDraft();
    if (!test) return;
    const index = test.questions.length + 1;
    const question: RoadmapQuestion = {
      id: `q-${Date.now().toString(36)}`,
      index,
      title: `${String(index).padStart(2, '0')} Trắc nghiệm · ${this.roadmap()?.name ?? 'Lộ trình'}`,
      meta: '4 phương án · 1 đáp án đúng',
      prompt: '',
      language: 'HTML / CSS',
      code: '',
      answers: ['A', 'B', 'C', 'D'].map((letter, position) => ({ letter, text: '', correct: position === 0 })),
      hint: '',
      hintSaved: false
    };
    this.testDraft.set({ ...test, questions: [...test.questions, question] });
    this.selectedQuestionId.set(question.id);
  }

  openHint(): void {
    this.hintOpen.set(true);
  }

  closeHint(): void {
    this.hintOpen.set(false);
  }

  saveHint(text: string): void {
    this.updateQuestion(question => ({ ...question, hint: text, hintSaved: true }));
    this.hintOpen.set(false);
    this.notify('Đã lưu gợi ý cho câu hỏi.', 'success');
  }

  saveDraft(): void {
    const studio = this.persist();
    if (!studio) {
      this.notify('Vui lòng nhập đủ tên node, mô tả và kết quả học được.', 'error');
      return;
    }
    void Promise.resolve(this.store.saveRoadmapDraft(this.roadmapId, studio))
      .then(() => this.notify('Đã lưu bản nháp lộ trình.', 'success'))
      .catch(error => this.notify(error instanceof Error ? error.message : 'Không lưu được bản nháp lộ trình.', 'error'));
  }

  publish(): void {
    const studio = this.persist();
    if (!studio) {
      this.notify('Vui lòng nhập đủ tên node, mô tả và kết quả học được.', 'error');
      return;
    }
    void Promise.resolve(this.store.publishRoadmap(this.roadmapId, studio))
      .then(() => this.notify('Đã xuất bản lộ trình cho học viên.', 'success'))
      .catch(error => this.notify(error instanceof Error ? error.message : 'Không xuất bản được lộ trình.', 'error'));
  }

  back(): void {
    void this.router.navigate(['/courses/roadmaps']);
  }

  notify(message: string, tone: ToastTone): void {
    this.toast.set({ message, tone });
    setTimeout(() => { if (this.toast()?.message === message) this.toast.set(null); }, 4200);
  }

  questionIndex(index: number): string {
    return String(index).padStart(2, '0');
  }

  levelTone(level: CourseLevel): string {
    return LEVEL_TONE[level];
  }

  private persist(): RoadmapStudio | null {
    this.touched.set(true);
    const node = this.nodeDraft();
    if (node && (countChars(node.name) === 0 || countChars(node.description) === 0 || countChars(node.outcomes) === 0)) {
      return null;
    }
    if (node) this.commitNode(node);
    if (this.testDraft()) this.localStudio.update(current => current ? { ...current, test: clone(this.testDraft()!) } : current);
    return this.localStudio() ?? this.studio();
  }

  private updateQuestion(transform: (question: RoadmapQuestion) => RoadmapQuestion): void {
    const test = this.testDraft();
    if (!test) return;
    const id = this.selectedQuestionId();
    this.testDraft.set({
      ...test,
      questions: test.questions.map(question => (question.id === id ? transform(question) : question))
    });
  }

  private findNode(id: string): RoadmapNode | null {
    const phases = this.studio()?.phases ?? [];
    for (const phase of phases) {
      const node = phase.nodes.find((item: RoadmapNode) => item.id === id);
      if (node) return clone(node);
    }
    return phases[0]?.nodes[0] ? clone(phases[0].nodes[0]) : null;
  }
}

function clone<T>(value: T): T {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}
