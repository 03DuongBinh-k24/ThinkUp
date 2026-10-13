import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RoadmapService } from '../services/roadmap.service';
import { CourseService } from '../../../core/services/course.service';
import { Course } from '../../../core/models/course.model';
import { MOCK_COURSES } from '../../../core/data/mock/mock-courses';
import { RoadmapDetail, RoadmapMetaItem, RoadmapSkill, RoadmapStage } from '../models/roadmap.model';

@Component({
  selector: 'app-roadmap-skill-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './roadmap-skill-detail.component.html',
  styleUrl: './roadmap-skill-detail.component.css'
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
