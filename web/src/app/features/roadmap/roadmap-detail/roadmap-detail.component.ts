import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RoadmapService } from '../services/roadmap.service';
import { AuthService } from '../../../core/services/auth.service';
import { RoadmapDetail, RoadmapMetaItem, RoadmapSkill, RoadmapStage } from '../models/roadmap.model';

interface FilterOption {
  id: 'all' | 'completed' | 'in-progress' | 'not-started';
  label: string;
}

@Component({
  selector: 'app-roadmap-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './roadmap-detail.component.html',
  styleUrl: './roadmap-detail.component.css'
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
