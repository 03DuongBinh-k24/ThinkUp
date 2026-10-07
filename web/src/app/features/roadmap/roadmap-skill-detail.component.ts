import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RoadmapService } from '../../core/services/roadmap.service';
import { CourseService } from '../../core/services/course.service';
import { Course } from '../../core/models/course.model';
import { MOCK_COURSES } from '../../core/data/mock-courses';
import { RoadmapDetail, RoadmapMetaItem, RoadmapSkill, RoadmapStage } from '../../core/models/roadmap.model';

@Component({
  selector: 'app-roadmap-skill-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-[#F8FAFB] font-sans text-[#191C1D]">
      <main class="mx-auto w-full max-w-[1280px] px-6 pb-20 pt-10">
        <!-- Breadcrumb -->
        <nav class="flex items-center flex-wrap gap-2 text-[12px] sm:text-[13.5px] leading-5 text-[#6D717F] mb-6 sm:mb-8" aria-label="Breadcrumb">
          <a routerLink="/" class="hover:text-[#0088E8] transition-colors">Trang chủ</a>
          <span>/</span>
          <a routerLink="/learning/roadmap" class="hover:text-[#0088E8] transition-colors">Roadmap</a>
          <span>/</span>
          <a [routerLink]="['/learning/roadmap', roadmapId()]" class="hover:text-[#0088E8] transition-colors">{{ roadmapMeta()?.title }}</a>
          <span>/</span>
          <span class="text-[#4D5461]">{{ stage()?.title }}</span>
          <span>/</span>
          <span class="font-medium text-[#0088E8]">{{ activeSkill()?.title }}</span>
        </nav>

        @if (!activeSkill() || !roadmapDetail()) {
          <div class="rounded-2xl border border-dashed border-[#D2D5DB] bg-white p-12 text-center text-[#6D717F]">
            <p class="text-[16px] font-semibold">Không tìm thấy thông tin kỹ năng.</p>
            <a [routerLink]="['/learning/roadmap', roadmapId()]" class="mt-4 inline-block text-[14px] text-[#0088E8] underline">
              Quay lại lộ trình
            </a>
          </div>
        } @else {
          <!-- Layout Grid -->
          <div class="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] min-[1200px]:grid-cols-[240px_minmax(0,1fr)_316px] gap-6 items-start">
            
            <!-- LEFT SIDEBAR: Stages and skills tree -->
            <aside class="w-full shrink-0 bg-white border border-[#D2D5DB]/70 rounded-[16px] p-5 hidden lg:block self-start lg:sticky lg:top-24 shadow-sm">
              <span class="text-[13px] font-medium text-[#6D717F] block mb-1">Lộ trình</span>
              <h2 class="text-[16px] font-semibold text-[#191C1D] mb-6">{{ roadmapMeta()?.title }}</h2>

              <div class="space-y-6">
                @for (s of roadmapDetail()?.stages; track s.id; let idx = $index) {
                  <div class="relative">
                    <div class="flex gap-4 relative z-10">
                      <div
                        class="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11.5px] font-semibold text-white shadow-sm"
                        [ngStyle]="{ 'background-color': s.id === stage()?.id ? roadmapMeta()?.color : '#6D717F' }"
                      >
                        {{ s.number }}
                      </div>

                      <div class="flex-1 min-w-0">
                        <button
                          type="button"
                          (click)="toggleStageExpand(s.id)"
                          class="w-full text-left group focus-visible:outline-none"
                        >
                          <div class="flex items-center justify-between">
                            <h4 class="text-[13.5px] font-semibold text-[#191C1D] leading-[20px] group-hover:text-[#0088E8] transition-colors pr-2 truncate">
                              {{ s.title }}
                            </h4>
                            <span class="text-xs text-[#6D717F]">
                              {{ isStageOpen(s.id) ? '▲' : '▼' }}
                            </span>
                          </div>
                          <span class="text-[11.5px] text-[#6D717F] block mt-1">
                            {{ getStageCompleted(s) }}/{{ s.skills.length }} kỹ năng
                          </span>
                        </button>

                        @if (isStageOpen(s.id)) {
                          <div class="mt-3 p-3 bg-[#E6F4FF] rounded-xl border border-[#0088E8]/10 space-y-2">
                            @for (sk of s.skills; track sk.id) {
                              <a
                                [routerLink]="['/learning/roadmap', roadmapId(), sk.id]"
                                class="w-full flex items-center gap-2 text-left text-[12.5px] transition-colors"
                                [ngClass]="sk.id === activeSkill()?.id ? 'font-bold text-[#0088E8]' : 'text-[#4D5461] hover:text-[#0088E8]'"
                              >
                                <span>{{ sk.status === 'completed' ? '✓' : '•' }}</span>
                                <span class="truncate">{{ sk.title }}</span>
                              </a>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            </aside>

            <!-- CENTER COLUMN: Skill Details -->
            <div class="min-w-0 w-full space-y-6">
              <!-- Header Section -->
              <section class="bg-white border border-[#D2D5DB]/70 rounded-[16px] p-6 sm:p-8 flex flex-col sm:flex-row gap-6 shadow-sm">
                <div
                  class="w-20 h-20 rounded-[16px] shrink-0 flex items-center justify-center text-white text-2xl font-bold shadow-sm"
                  [ngStyle]="{ 'background-color': roadmapMeta()?.color }"
                >
                  ⚡
                </div>
                <div>
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-[13px] font-semibold" [ngStyle]="{ color: roadmapMeta()?.color }">
                      {{ stage()?.title }}
                    </span>
                  </div>
                  <h1 class="text-[32px] sm:text-[38px] font-bold text-[#191C1D] leading-tight tracking-[-0.02em] mb-4">
                    {{ activeSkill()?.title }}
                  </h1>
                  <p class="text-[14px] sm:text-[15px] text-[#4D5461] leading-[26px]">
                    {{ activeSkill()?.desc || 'Khám phá và nắm vững kỹ năng này theo chuẩn lộ trình công nghệ.' }}
                  </p>
                </div>
              </section>

              <!-- Stats Cards -->
              <section class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="bg-white border border-[#D2D5DB]/70 rounded-[16px] p-5 shadow-sm">
                  <span class="text-[13px] text-[#6D717F]">Độ khó</span>
                  <div class="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-[#FFF4D1] text-[#D97706] text-[13.5px] font-semibold">
                    {{ activeSkill()?.difficulty || 'Cơ bản' }}
                  </div>
                </div>
                <div class="bg-white border border-[#D2D5DB]/70 rounded-[16px] p-5 shadow-sm">
                  <span class="text-[13px] text-[#6D717F]">Giai đoạn</span>
                  <div class="mt-2 text-[15px] font-semibold text-[#191C1D] truncate">
                    Giai đoạn {{ stage()?.number }}
                  </div>
                </div>
                <div class="bg-white border border-[#D2D5DB]/70 rounded-[16px] p-5 shadow-sm">
                  <span class="text-[13px] text-[#6D717F]">Trạng thái hiện tại</span>
                  <div class="mt-2 text-[15px] font-semibold text-[#0088E8]">
                    {{ activeSkill()?.status === 'completed' ? 'Đã hoàn thành' : activeSkill()?.status === 'in-progress' ? 'Đang học' : 'Chưa bắt đầu' }}
                  </div>
                </div>
              </section>

              <!-- Status Action Buttons -->
              <section class="bg-white border border-[#D2D5DB]/70 rounded-[16px] p-6 shadow-sm">
                <h3 class="text-[15px] font-semibold text-[#191C1D] mb-4">Cập nhật trạng thái kỹ năng</h3>
                <div class="flex flex-wrap gap-3">
                  <button
                    type="button"
                    (click)="setSkillStatus('completed')"
                    class="flex items-center gap-2 px-5 py-2.5 rounded-[12px] text-[14px] font-semibold transition"
                    [ngClass]="activeSkill()?.status === 'completed' ? 'bg-[#16A34A] text-white' : 'border border-[#D2D5DB] bg-white text-[#4D5461] hover:bg-slate-50'"
                  >
                    <span>✓ Đã hoàn thành</span>
                  </button>
                  <button
                    type="button"
                    (click)="setSkillStatus('in-progress')"
                    class="flex items-center gap-2 px-5 py-2.5 rounded-[12px] text-[14px] font-semibold transition"
                    [ngClass]="activeSkill()?.status === 'in-progress' ? 'bg-[#0088E8] text-white' : 'border border-[#D2D5DB] bg-white text-[#4D5461] hover:bg-slate-50'"
                  >
                    <span>⏳ Đang học</span>
                  </button>
                  <button
                    type="button"
                    (click)="setSkillStatus('not-started')"
                    class="flex items-center gap-2 px-5 py-2.5 rounded-[12px] text-[14px] font-semibold transition"
                    [ngClass]="activeSkill()?.status === 'not-started' ? 'bg-slate-800 text-white' : 'border border-[#D2D5DB] bg-white text-[#4D5461] hover:bg-slate-50'"
                  >
                    <span>○ Chưa bắt đầu</span>
                  </button>
                </div>
              </section>

              <!-- What you will learn Checklist -->
              @if (activeSkill()?.topics && (activeSkill()?.topics)!.length > 0) {
                <section class="bg-white border border-[#D2D5DB]/70 rounded-[16px] p-6 sm:p-8 shadow-sm">
                  <h3 class="text-[16px] font-semibold text-[#191C1D] mb-6">Bạn sẽ học được gì? (Checklist)</h3>
                  <div class="space-y-3">
                    @for (topic of activeSkill()?.topics; track topic; let idx = $index) {
                      <label class="flex items-start gap-3 p-2 rounded-lg hover:bg-[#F8FAFB] cursor-pointer transition">
                        <input
                          type="checkbox"
                          [checked]="isTopicChecked(idx)"
                          (change)="toggleTopic(idx)"
                          class="mt-1 h-4 w-4 rounded border-[#D2D5DB] text-[#0088E8] focus:ring-[#8ACEFF]"
                        />
                        <span
                          class="text-[14.5px] leading-[22px]"
                          [ngClass]="isTopicChecked(idx) ? 'line-through text-[#6D717F]' : 'text-[#212936]'"
                        >
                          {{ topic }}
                        </span>
                      </label>
                    }
                  </div>
                </section>
              }

              <!-- Prerequisites -->
              @if (activeSkill()?.prerequisites && (activeSkill()?.prerequisites)!.length > 0) {
                <section class="bg-white border border-[#D2D5DB]/70 rounded-[16px] p-6 sm:p-8 shadow-sm">
                  <h3 class="text-[15px] font-semibold text-[#191C1D] mb-4">Kiến thức nền tảng (Prerequisites)</h3>
                  <ul class="space-y-2">
                    @for (item of activeSkill()?.prerequisites; track item) {
                      <li class="flex items-center gap-2 text-[14px] text-[#4D5461]">
                        <span class="h-2 w-2 rounded-full bg-[#0088E8]"></span>
                        <span>{{ item }}</span>
                      </li>
                    }
                  </ul>
                </section>
              }

              <!-- Next Skill Navigation -->
              @if (nextSkill()) {
                <section class="bg-[#F8FAFB] border border-[#D2D5DB]/70 rounded-[16px] p-6 shadow-sm">
                  <h3 class="text-[15px] font-semibold text-[#191C1D] mb-3">Kỹ năng kế tiếp trong lộ trình</h3>
                  <a
                    [routerLink]="['/learning/roadmap', roadmapId(), nextSkill()?.id]"
                    class="block bg-white p-5 rounded-xl border border-[#D2D5DB] hover:border-[#0088E8] hover:shadow transition group"
                  >
                    <h4 class="text-[15px] font-bold text-[#191C1D] group-hover:text-[#0088E8] transition-colors">
                      {{ nextSkill()?.title }} →
                    </h4>
                    <p class="text-[13px] text-[#4D5461] mt-1">{{ nextSkill()?.desc }}</p>
                  </a>
                </section>
              }
            </div>

            <!-- RIGHT SIDEBAR: Related Courses -->
            <aside class="w-full shrink-0 bg-white border border-[#D2D5DB]/70 rounded-[16px] p-5 min-[1200px]:sticky min-[1200px]:top-24 shadow-sm">
              <h3 class="text-[16px] font-semibold text-[#191C1D] mb-2">Khóa học đề xuất</h3>
              <p class="text-[13px] text-[#6D717F] leading-[20px] mb-4">
                Các khóa học liên quan đến kỹ năng này trên ThinkUp:
              </p>

              <div class="space-y-4">
                @for (c of relatedCourses(); track c.id) {
                  <a
                    [routerLink]="['/courses', c.id]"
                    class="block p-3 rounded-xl border border-[#EEF0F3] hover:border-[#0088E8] hover:shadow-sm transition group"
                  >
                    <h5 class="text-[13.5px] font-semibold text-[#191C1D] group-hover:text-[#0088E8] transition-colors line-clamp-2">
                      {{ c.title }}
                    </h5>
                    <div class="flex items-center justify-between mt-2 text-[12px] text-[#6D717F]">
                      <span>⭐ {{ c.rating }}</span>
                      <span class="font-bold text-[#0088E8]">{{ c.salePrice | currency:'VND':'symbol':'1.0-0' }}</span>
                    </div>
                  </a>
                } @empty {
                  <div class="p-6 text-center text-xs text-[#6D717F] bg-[#F8FAFB] rounded-xl border border-dashed border-[#D2D5DB]">
                    Chưa có khóa học trực tiếp cho từ khóa này.
                  </div>
                }
              </div>

              <a
                routerLink="/courses"
                class="mt-5 block w-full py-2.5 px-4 rounded-xl border border-[#D2D5DB] bg-[#F4F6F9] hover:bg-[#EAF1FF] text-[#0088E8] text-[13px] font-semibold text-center transition-colors"
              >
                Xem tất cả khóa học
              </a>
            </aside>
          </div>
        }
      </main>
    </div>
  `
})
export class RoadmapSkillDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly roadmapService = inject(RoadmapService);
  private readonly courseService = inject(CourseService);

  readonly roadmapId = signal<string>('');
  readonly skillId = signal<string>('');
  readonly openStages = signal<string[]>([]);

  readonly roadmapMeta = computed(() => {
    const id = this.roadmapId();
    return id ? this.roadmapService.getRoadmapMeta(id) : null;
  });

  readonly roadmapDetail = computed(() => {
    const id = this.roadmapId();
    return id ? this.roadmapService.getRoadmapById(id) : null;
  });

  readonly stageAndSkill = computed(() => {
    const detail = this.roadmapDetail();
    const skId = this.skillId();
    if (!detail || !skId) return null;

    for (const stage of detail.stages) {
      const found = stage.skills.find((sk) => sk.id === skId);
      if (found) {
        return { stage, skill: found };
      }
    }
    return null;
  });

  readonly stage = computed(() => this.stageAndSkill()?.stage || null);
  readonly activeSkill = computed(() => this.stageAndSkill()?.skill || null);

  readonly nextSkill = computed(() => {
    const detail = this.roadmapDetail();
    const current = this.activeSkill();
    if (!detail || !current) return null;

    const all = detail.stages.flatMap((s) => s.skills);
    const idx = all.findIndex((sk) => sk.id === current.id);
    if (idx >= 0 && idx < all.length - 1) {
      return all[idx + 1];
    }
    return null;
  });

  readonly relatedCourses = computed<Course[]>(() => {
    const skill = this.activeSkill();
    if (!skill) return [];
    return MOCK_COURSES.slice(0, 3);
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const rId = params.get('roadmapId') || '';
      const sId = params.get('skillId') || '';
      this.roadmapId.set(rId);
      this.skillId.set(sId);

      const found = this.stageAndSkill();
      if (found) {
        this.openStages.set([found.stage.id]);
      }
    });
  }

  isStageOpen(stageId: string): boolean {
    return this.openStages().includes(stageId);
  }

  toggleStageExpand(stageId: string): void {
    const open = this.openStages();
    if (open.includes(stageId)) {
      this.openStages.set(open.filter((id) => id !== stageId));
    } else {
      this.openStages.set([...open, stageId]);
    }
  }

  getStageCompleted(stage: RoadmapStage): number {
    return stage.skills.filter((s) => s.status === 'completed').length;
  }

  isTopicChecked(index: number): boolean {
    const skill = this.activeSkill();
    return skill?.checkedTopics ? skill.checkedTopics.includes(index) : false;
  }

  setSkillStatus(status: RoadmapSkill['status']): void {
    const s = this.stage();
    const sk = this.activeSkill();
    if (s && sk) {
      this.roadmapService.updateSkillStatus(this.roadmapId(), s.id, sk.id, status);
    }
  }

  toggleTopic(topicIndex: number): void {
    const s = this.stage();
    const sk = this.activeSkill();
    if (s && sk) {
      this.roadmapService.toggleTopic(this.roadmapId(), s.id, sk.id, topicIndex);
    }
  }
}
