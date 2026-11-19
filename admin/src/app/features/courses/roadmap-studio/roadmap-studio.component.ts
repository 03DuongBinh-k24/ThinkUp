import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CustomSelectComponent, CustomSelectOption } from '../../../shared/components/custom-select/custom-select.component';
import { RoadmapHintDialogComponent } from '../components/roadmap-hint-dialog/roadmap-hint-dialog.component';
import { CourseToastComponent, ToastTone } from '../components/course-toast.component';
import { LEVEL_TONE, ROADMAP_NODE_TYPES, countChars } from '../course-utils';
import {
  CourseLevel, CourseSuggestion, Roadmap, RoadmapNode, RoadmapNodeType, RoadmapPhase, RoadmapQuestion, RoadmapTest, RoadmapStudio
} from '../models/course.models';
import { CourseStore } from '../services/course.store';
import { apiErrorMessage } from '../../../shared/utils/api-error';

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

  get roadmapId(): string { return this.route.snapshot.paramMap.get('id') ?? ''; }
  private readonly localStudio = signal<RoadmapStudio | null>(null);
  private readonly loadedRoadmap = signal<Roadmap | null>(null);
  readonly roadmap = computed(() => {
    const id = this.localStudio()?.roadmapId ?? this.roadmapId;
    return this.store.roadmaps().find(item => item.id === id) ?? this.loadedRoadmap();
  });
  readonly studio = computed(() => this.localStudio() ?? this.store.studios().find(item => item.roadmapId === this.roadmapId) ?? null);

  readonly tab = signal<StudioTab>('structure');
  readonly toast = signal<{ message: string; tone: ToastTone } | null>(null);
  readonly touched = signal(false);
  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly loadMessage = signal('');

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
  readonly suggestions = signal<CourseSuggestion[]>([]);
  private suggestionRevision = 0;
  readonly visibleSuggestions = computed(() => this.suggestions().filter(item => item.match >= this.threshold()));
  readonly qualifiedCount = computed(() => this.visibleSuggestions().length);
  readonly nodeName = computed(() => this.nodeDraft()?.name ?? '');
  readonly questionsCount = computed(() => this.testDraft()?.questions.length ?? 0);

  readonly nameError = computed(() => this.touched() && countChars(this.nodeDraft()?.name ?? '') === 0);
  readonly descriptionError = computed(() => this.touched() && countChars(this.nodeDraft()?.description ?? '') === 0);
  readonly outcomesError = computed(() => this.touched() && countChars(this.nodeDraft()?.outcomes ?? '') === 0);

  ngOnInit(): void {
    if (this.studio() && this.roadmap()) {
      const node = this.nodeDraft();
      if (node) this.refreshSuggestions(node);
    } else {
      this.loadStudio();
    }
  }

  loadStudio(): void {
    this.loading.set(true);
    this.loadMessage.set('');
    void this.store.ensureRoadmapStudio(this.roadmapId).then(async ({ id, roadmap, studio }) => {
      if (id !== this.roadmapId) {
        await this.router.navigate(['/courses/roadmaps', id, 'studio'], { replaceUrl: true });
      }
      this.loadedRoadmap.set(roadmap);
      this.initializeStudio(studio);
    }).catch(error => this.loadMessage.set(apiErrorMessage(error, 'Không tải được cấu hình lộ trình.')))
      .finally(() => this.loading.set(false));
  }

  private initializeStudio(studio: RoadmapStudio): void {
    this.localStudio.set(studio);
    this.threshold.set(studio.threshold);
    this.testDraft.set(clone(studio.test));
    this.selectedQuestionId.set(studio.test.questions[0]?.id ?? '');
    const node = this.findNode(studio.selectedNodeId);
    if (node) this.selectNode(node);
  }

  private refreshSuggestions(node: RoadmapNode, persisted = true): void {
    const revision = ++this.suggestionRevision;
    this.suggestions.set([]);
    this.attachedIds.set((node.courses ?? []).map(course => course.id));
    if (!persisted) return;
    void this.store.getRoadmapNodeSuggestions(this.roadmapId, node.id).then(suggestions => {
      if (revision === this.suggestionRevision) this.suggestions.set(suggestions);
    }).catch(error => {
      if (revision === this.suggestionRevision) this.notify(apiErrorMessage(error, 'Không tải được khóa học gợi ý.'), 'error');
    });
  }

  selectNode(node: RoadmapNode, persisted = this.store.studios().some(studio =>
    studio.roadmapId === this.roadmapId && studio.phases.some(phase => phase.nodes.some(item => item.id === node.id))
  )): void {
    const current = this.nodeDraft();
    if (current) this.commitNode(current);
    this.selectedNodeId.set(node.id);
    this.nodeDraft.set(clone(node));
    this.touched.set(false);
    this.refreshSuggestions(node, persisted);
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
    if (!studio || studio.phases.length >= 50) return;
    const count = studio.phases.length + 1;
    const phase: RoadmapPhase = { id: crypto.randomUUID(), no: String(count).padStart(2, '0'), name: `Giai đoạn ${count}`, nodes: [] };
    this.localStudio.set({ ...studio, phases: [...studio.phases, phase] });
    if (!this.testDraft()?.stage) this.setStage(`${phase.no} · ${phase.name}`);
  }

  addNode(phase: RoadmapPhase): void {
    const studio = this.studio();
    if (!studio || phase.nodes.length >= 100) return;
    const node: RoadmapNode = {
      id: crypto.randomUUID(), name: '', type: 'Kỹ năng', level: 'Cơ bản',
      industry: this.roadmap()?.industry ?? '', description: '', outcomes: '', tags: []
    };
    this.localStudio.set({ ...studio, phases: studio.phases.map(item =>
      item.id === phase.id ? { ...item, nodes: [...item.nodes, node] } : item) });
    this.selectNode(node);
  }

  renamePhase(phase: RoadmapPhase, name: string): void {
    this.commitTest();
    const studio = this.studio();
    if (!studio) return;
    const oldLabel = `${phase.no} · ${phase.name}`;
    const stage = `${phase.no} · ${name}`;
    this.localStudio.set({ ...studio, phases: studio.phases.map(item =>
      item.id === phase.id ? { ...item, name, test: item.test && { ...item.test, stage } } : item) });
    if (this.testDraft()?.stage === oldLabel) this.patchTest({ stage });
  }

  setThreshold(value: string): void {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    this.threshold.set(Math.min(100, Math.max(70, Math.round(parsed))));
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
    this.patchTest({ duration: Math.min(300, Math.max(1, Math.round(parsed))) });
  }

  setPassScore(value: string): void {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    this.patchTest({ passScore: Math.min(100, Math.max(0, Math.round(parsed))) });
  }

  setStage(value: string): void {
    this.commitTest();
    const phase = this.studio()?.phases.find(item => `${item.no} · ${item.name}` === value);
    const test = phase?.test ?? { stage: value, name: '', duration: 30, passScore: 70, questions: [] };
    this.testDraft.set(clone(test));
    this.selectedQuestionId.set(test.questions[0]?.id ?? '');
  }

  private commitTest(): void {
    const studio = this.studio();
    const test = this.testDraft();
    if (!studio || !test?.stage) return;
    const hasTest = !!test.name.trim() || test.questions.length > 0;
    const phases = studio.phases.map(phase => `${phase.no} · ${phase.name}` === test.stage
      ? { ...phase, test: hasTest ? clone(test) : undefined } : phase);
    this.localStudio.set({ ...studio, phases, test: clone(test) });
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
    void this.save(false);
  }

  publish(): void {
    void this.save(true);
  }

  private async save(publish: boolean): Promise<void> {
    if (this.saving()) return;
    const studio = this.persist();
    if (!studio || studio.phases.some(phase => !phase.name.trim() || phase.nodes.some(node =>
      !node.name.trim() || !node.description.trim() || !node.outcomes.trim() || !node.tags.length))) {
      this.notify('Nhập tên giai đoạn và bổ sung tên, mô tả, kết quả học tập, sub-tag cho từng node.', 'error');
      return;
    }
    this.saving.set(true);
    try {
      if (publish) {
        await this.store.publishRoadmap(this.roadmapId, studio);
        this.back();
      } else {
        await this.store.saveRoadmapDraft(this.roadmapId, studio);
        this.notify('Đã lưu bản nháp lộ trình.', 'success');
        const node = this.nodeDraft();
        if (node) this.refreshSuggestions(node);
      }
    } catch (error) {
      this.notify(apiErrorMessage(error, publish ? 'Không xuất bản được lộ trình.' : 'Không lưu được bản nháp lộ trình.'), 'error');
    } finally {
      this.saving.set(false);
    }
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
    this.commitTest();
    const studio = this.studio();
    return studio && { ...studio, threshold: this.threshold() };
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
