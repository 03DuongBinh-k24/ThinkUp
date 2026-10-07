import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RoadmapService } from '../../core/services/roadmap.service';
import { AuthService } from '../../core/services/auth.service';
import { RoadmapDetail, RoadmapMetaItem, RoadmapSkill, RoadmapStage } from '../../core/models/roadmap.model';

interface FilterOption {
  id: 'all' | 'completed' | 'in-progress' | 'not-started';
  label: string;
}

@Component({
  selector: 'app-roadmap-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-[#F8FAFB] font-sans text-[#191C1D]">
      <main class="mx-auto w-full max-w-[1280px] px-6 pb-20 pt-10">
        <!-- Breadcrumbs -->
        <nav class="flex items-center gap-2 overflow-hidden text-[14px] leading-[21px] text-[#6D717F]" aria-label="Breadcrumb">
          <a routerLink="/" class="inline-flex items-center gap-1.5 hover:text-[#0088E8]">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Trang chủ</span>
          </a>
          <span class="text-[#D2D5DB]">/</span>
          <a routerLink="/learning/roadmap" class="hover:text-[#0088E8]">Lộ trình</a>
          <span class="text-[#D2D5DB]">/</span>
          <span class="truncate font-medium text-[#0088E8]">{{ roadmapMeta()?.title }}</span>
        </nav>

        @if (!roadmapDetail() || !roadmapMeta()) {
          <div class="mt-12 rounded-2xl border border-dashed border-[#D2D5DB] bg-white p-16 text-center">
            <p class="text-[16px] text-[#4D5461]">Không tìm thấy lộ trình học tập yêu cầu.</p>
            <a routerLink="/learning/roadmap" class="mt-4 inline-block text-[14px] font-semibold text-[#0088E8] underline">
              Quay lại danh sách lộ trình
            </a>
          </div>
        } @else {
          <!-- Header and Progress Section -->
          <section class="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
            <div>
              <div class="flex items-center gap-3">
                <span
                  class="rounded-lg px-3 py-1 text-xs font-bold"
                  [ngStyle]="{ 'background-color': roadmapMeta()?.bgColor, 'color': roadmapMeta()?.color }"
                >
                  {{ roadmapMeta()?.shortCode }}
                </span>
                <span class="text-xs font-medium text-[#6D717F]">Lộ trình đào tạo chuẩn kỹ sư</span>
              </div>
              <h1 class="mt-3 text-[34px] font-bold leading-tight tracking-[-0.025em] text-[#191C1D] sm:text-[44px]">
                {{ roadmapDetail()?.title }}
              </h1>
              <p class="mt-3 max-w-[680px] text-[15px] leading-[24px] text-[#4D5461]">
                {{ roadmapDetail()?.desc }}
              </p>

              <div class="mt-5 flex flex-wrap gap-3">
                @if (isEnrolled()) {
                  <button
                    (click)="handleToggleEnroll()"
                    class="inline-flex items-center gap-2 rounded-xl border border-[#16A34A] bg-[#E6F7EE] px-6 py-3 text-[14px] font-semibold text-[#16A34A] transition hover:bg-[#d4f2e2]"
                  >
                    <span>✓ Đang tham gia lộ trình này</span>
                    <span class="text-xs font-normal text-[#16A34A]/80">(Nhấp để hủy)</span>
                  </button>
                } @else {
                  <button
                    (click)="handleToggleEnroll()"
                    class="inline-flex items-center gap-2 rounded-xl bg-[#0088E8] px-6 py-3 text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#0077CC]"
                  >
                    <span>+ Đăng ký học lộ trình này</span>
                  </button>
                }
              </div>
            </div>

            <!-- Overall Progress Widget -->
            <div class="rounded-2xl border border-[#D2D5DB]/70 bg-white p-6 shadow-sm">
              <h3 class="text-[15px] font-semibold text-[#191C1D]">Tiến độ học tập của bạn</h3>
              <p class="mt-1 text-[13px] text-[#6D717F]">
                Đã hoàn thành <strong class="text-[#191C1D]">{{ progressStats().completed }}</strong> trên tổng số <strong>{{ progressStats().total }}</strong> kỹ năng
              </p>

              <div class="mt-4 h-2.5 overflow-hidden rounded-full bg-[#EEF0F3]">
                <div
                  class="h-full rounded-full bg-[#0088E8] transition-all duration-500"
                  [style.width.%]="progressStats().percent"
                ></div>
              </div>

              <div class="mt-3 flex items-center justify-between">
                <span class="text-[14px] font-semibold text-[#0088E8]">{{ progressStats().percent }}% Hoàn thành</span>
                <span class="text-[12px] text-[#6D717F]">{{ totalStages() }} giai đoạn</span>
              </div>
            </div>
          </section>

          <!-- Search & Status Filter Bar -->
          <section class="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between" aria-label="Tìm kiếm và lọc kỹ năng">
            <div class="relative w-full md:max-w-[448px]">
              <svg class="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#6D717F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                [value]="searchKeyword()"
                (input)="onSearchInput($event)"
                placeholder="Tìm kiếm kỹ năng, công nghệ..."
                class="h-12 w-full rounded-full border border-[#D2D5DB] bg-white pl-11 pr-4 text-[14px] text-[#191C1D] outline-none transition focus:border-[#0088E8] focus:ring-2 focus:ring-[#8ACEFF]/40"
              />
            </div>

            <div class="flex gap-2 overflow-x-auto pb-1 md:pb-0" role="group" aria-label="Lọc theo trạng thái">
              @for (filter of filterOptions; track filter.id) {
                <button
                  type="button"
                  (click)="setStatusFilter(filter.id)"
                  class="h-11 shrink-0 rounded-full border px-5 text-[14px] font-medium transition focus-visible:outline-none"
                  [ngClass]="{
                    'border-[#0088E8] bg-[#0088E8] text-white': statusFilter() === filter.id,
                    'border-[#D2D5DB] bg-white text-[#212936] hover:border-[#8ACEFF]': statusFilter() !== filter.id
                  }"
                >
                  {{ filter.label }}
                </button>
              }
            </div>
          </section>

          <!-- Notification Toast -->
          @if (feedbackMessage()) {
            <div
              class="mt-6 flex items-center justify-between rounded-xl p-4 text-[14px] font-medium transition-all"
              [ngClass]="{
                'bg-[#E6F7EE] text-[#16A34A] border border-[#16A34A]/20': feedbackType() === 'success',
                'bg-[#FFF4D1] text-[#D97706] border border-[#D97706]/20': feedbackType() === 'warning'
              }"
            >
              <span>{{ feedbackMessage() }}</span>
              <button (click)="feedbackMessage.set('')" class="text-xs font-bold underline">Đóng</button>
            </div>
          }

          <!-- Timeline Accordion Stages -->
          <section class="relative mt-10" aria-label="Các giai đoạn trong lộ trình">
            <div class="space-y-5">
              @for (stage of filteredStages(); track stage.id; let idx = $index) {
                <article class="relative">
                  <div class="overflow-hidden rounded-2xl border border-[#D2D5DB]/70 bg-white">
                    <!-- Stage Header / Accordion trigger -->
                    <button
                      type="button"
                      (click)="toggleStage(stage.id)"
                      class="grid w-full gap-5 p-6 text-left transition hover:bg-[#FBFCFD] md:grid-cols-[56px_minmax(0,1fr)_208px_24px] md:items-center"
                    >
                      <div
                        class="flex h-14 w-14 items-center justify-center rounded-2xl text-[16px] font-bold shadow-sm"
                        [ngStyle]="{ 'background-color': roadmapMeta()?.bgColor, 'color': roadmapMeta()?.color }"
                      >
                        {{ stage.number }}
                      </div>

                      <div class="min-w-0">
                        <span class="block text-[18px] font-semibold leading-[27px] text-[#191C1D]">{{ stage.title }}</span>
                        <span class="mt-0.5 block text-[14px] leading-[21px] text-[#4D5461]">{{ stage.desc }}</span>
                        <div class="mt-2 flex flex-wrap gap-1.5">
                          @for (skill of stage.skills.slice(0, 4); track skill.id) {
                            <span class="rounded-full bg-[#F4F6F9] px-2.5 py-0.5 text-[11px] font-medium text-[#212936]">{{ skill.title }}</span>
                          }
                          @if (stage.skills.length > 4) {
                            <span class="rounded-full bg-[#EEF0F3] px-2 py-0.5 text-[11px] text-[#6D717F]">+{{ stage.skills.length - 4 }}</span>
                          }
                        </div>
                      </div>

                      <div>
                        <div class="flex justify-between text-[13px]">
                          <span class="text-[#4D5461]">{{ getStageProgress(stage).completed }}/{{ stage.skills.length }} kỹ năng</span>
                          <strong [ngClass]="getStageProgress(stage).percent === 100 ? 'text-[#16A34A]' : 'text-[#0088E8]'">
                            {{ getStageProgress(stage).percent }}%
                          </strong>
                        </div>
                        <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-[#D2D5DB]/60">
                          <div
                            class="h-full rounded-full transition-all duration-300"
                            [ngClass]="getStageProgress(stage).percent === 100 ? 'bg-[#16A34A]' : 'bg-[#0088E8]'"
                            [style.width.%]="getStageProgress(stage).percent"
                          ></div>
                        </div>
                      </div>

                      <div class="flex items-center justify-center">
                        <svg
                          class="h-5 w-5 text-[#6D717F] transition-transform duration-200"
                          [class.rotate-180]="isStageExpanded(stage.id)"
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    <!-- Expanded Stage Skills List -->
                    @if (isStageExpanded(stage.id)) {
                      <div class="border-t border-[#D2D5DB]/60 px-6 py-4">
                        @for (skill of stage.visibleSkills; track skill.id) {
                          <div class="flex min-h-[64px] w-full flex-col gap-3 border-b border-[#EEF0F3] py-3 text-left last:border-0 sm:flex-row sm:items-center sm:justify-between hover:bg-[#F8FAFB] px-2 rounded-lg transition-colors">
                            <!-- Skill Status Cycle Button -->
                            <div class="w-[150px] shrink-0">
                              <button
                                type="button"
                                (click)="cycleSkillStatus(stage.id, skill)"
                                class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition hover:opacity-80"
                                [ngClass]="{
                                  'border-[#16A34A]/30 bg-[#E6F7EE] text-[#16A34A]': skill.status === 'completed',
                                  'border-[#0088E8]/30 bg-[#E6F4FF] text-[#0088E8]': skill.status === 'in-progress',
                                  'border-[#D2D5DB] bg-white text-[#6D717F]': skill.status === 'not-started' || skill.status === 'locked'
                                }"
                              >
                                @if (skill.status === 'completed') {
                                  <span>✓ Hoàn thành</span>
                                } @else if (skill.status === 'in-progress') {
                                  <span>⏳ Đang học</span>
                                } @else {
                                  <span>○ Chưa học</span>
                                }
                              </button>
                            </div>

                            <!-- Skill Link to Detail -->
                            <div class="flex flex-1 items-center justify-between min-w-0">
                              <div class="min-w-0 pr-4">
                                <a
                                  [routerLink]="['/learning/roadmap', roadmapId(), skill.id]"
                                  class="text-[14px] font-semibold text-[#212936] hover:text-[#0088E8] transition-colors"
                                >
                                  {{ skill.title }}
                                </a>
                                @if (skill.desc) {
                                  <p class="truncate text-[12px] text-[#6D717F]">{{ skill.desc }}</p>
                                }
                              </div>

                              <a
                                [routerLink]="['/learning/roadmap', roadmapId(), skill.id]"
                                class="shrink-0 text-[13px] font-medium text-[#0088E8] hover:underline"
                              >
                                Chi tiết →
                              </a>
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>
                </article>
              } @empty {
                <div class="rounded-2xl border border-dashed border-[#D2D5DB] bg-white p-12 text-center text-[#6D717F]">
                  <p class="text-[15px]">Không tìm thấy kỹ năng nào phù hợp với bộ lọc hiện tại.</p>
                </div>
              }
            </div>
          </section>
        }
      </main>
    </div>
  `
})
export class RoadmapDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly roadmapService = inject(RoadmapService);
  private readonly authService = inject(AuthService);

  readonly roadmapId = signal<string>('');
  readonly searchKeyword = signal<string>('');
  readonly statusFilter = signal<'all' | 'completed' | 'in-progress' | 'not-started'>('all');
  readonly expandedStages = signal<string[]>([]);
  readonly feedbackMessage = signal<string>('');
  readonly feedbackType = signal<'success' | 'warning'>('success');

  readonly filterOptions: FilterOption[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'completed', label: 'Đã hoàn thành' },
    { id: 'in-progress', label: 'Đang học' },
    { id: 'not-started', label: 'Chưa bắt đầu' }
  ];

  readonly roadmapMeta = computed(() => {
    const id = this.roadmapId();
    return id ? this.roadmapService.getRoadmapMeta(id) : null;
  });

  readonly roadmapDetail = computed(() => {
    const id = this.roadmapId();
    return id ? this.roadmapService.getRoadmapById(id) : null;
  });

  readonly totalStages = computed(() => this.roadmapDetail()?.stages.length || 0);

  readonly progressStats = computed(() => {
    const detail = this.roadmapDetail();
    if (!detail) return { completed: 0, total: 0, percent: 0 };

    const allSkills = detail.stages.flatMap((s) => s.skills);
    const completed = allSkills.filter((sk) => sk.status === 'completed').length;
    const total = allSkills.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percent };
  });

  readonly filteredStages = computed(() => {
    const detail = this.roadmapDetail();
    if (!detail) return [];

    const query = this.searchKeyword().trim().toLowerCase();
    const filter = this.statusFilter();

    return detail.stages
      .map((stage) => {
        const visibleSkills = stage.skills.filter((skill) => {
          const statusMatches =
            filter === 'all' ||
            (filter === 'not-started'
              ? skill.status === 'not-started' || skill.status === 'locked'
              : skill.status === filter);

          const queryMatches =
            !query ||
            skill.title.toLowerCase().includes(query) ||
            skill.desc.toLowerCase().includes(query) ||
            (skill.topics || []).some((t) => t.toLowerCase().includes(query));

          return statusMatches && queryMatches;
        });

        return { ...stage, visibleSkills };
      })
      .filter((stage) => stage.visibleSkills.length > 0);
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id') || '';
      this.roadmapId.set(id);

      const detail = this.roadmapService.getRoadmapById(id);
      if (detail && detail.stages.length > 0) {
        this.expandedStages.set([detail.stages[0].id]);
      }
    });
  }

  isEnrolled(): boolean {
    const id = this.roadmapId();
    return id ? this.roadmapService.isEnrolled(id) : false;
  }

  handleToggleEnroll(): void {
    const id = this.roadmapId();
    if (!id) return;

    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: `/learning/roadmap/${id}` } });
      return;
    }

    if (this.isEnrolled()) {
      this.roadmapService.unenrollRoadmap(id);
      this.showToast('Đã hủy tham gia lộ trình học.', 'success');
      return;
    }

    const res = this.roadmapService.enrollRoadmap(id);
    if (res.success) {
      this.showToast(res.message, 'success');
    } else {
      this.showToast(res.message, 'warning');
    }
  }

  isStageExpanded(stageId: string): boolean {
    return this.expandedStages().includes(stageId);
  }

  toggleStage(stageId: string): void {
    const current = this.expandedStages();
    if (current.includes(stageId)) {
      this.expandedStages.set(current.filter((id) => id !== stageId));
    } else {
      this.expandedStages.set([...current, stageId]);
    }
  }

  getStageProgress(stage: RoadmapStage): { completed: number; percent: number } {
    const completed = stage.skills.filter((sk) => sk.status === 'completed').length;
    const total = stage.skills.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, percent };
  }

  cycleSkillStatus(stageId: string, skill: RoadmapSkill): void {
    if (!this.isEnrolled()) {
      this.showToast('Bạn cần chọn lộ trình này để cập nhật tiến độ.', 'warning');
      return;
    }

    const cycle: Array<RoadmapSkill['status']> = ['not-started', 'in-progress', 'completed'];
    let idx = cycle.indexOf(skill.status);
    if (idx === -1) idx = 0;
    const nextStatus = cycle[(idx + 1) % cycle.length];

    this.roadmapService.updateSkillStatus(this.roadmapId(), stageId, skill.id, nextStatus);

    const labels: Record<string, string> = {
      'not-started': 'Chưa bắt đầu',
      'in-progress': 'Đang học',
      completed: 'Đã hoàn thành'
    };
    this.showToast(`Đã cập nhật trạng thái: ${labels[nextStatus]}`, 'success');
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchKeyword.set(target.value);
  }

  setStatusFilter(filter: 'all' | 'completed' | 'in-progress' | 'not-started'): void {
    this.statusFilter.set(filter);
  }

  private showToast(message: string, type: 'success' | 'warning'): void {
    this.feedbackMessage.set(message);
    this.feedbackType.set(type);
    setTimeout(() => {
      if (this.feedbackMessage() === message) {
        this.feedbackMessage.set('');
      }
    }, 3500);
  }
}
