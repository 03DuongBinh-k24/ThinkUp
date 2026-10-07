import { Injectable, signal, computed } from '@angular/core';
import { RoadmapDetail, RoadmapMetaItem, RoadmapSkill } from '../models/roadmap.model';
import { ROADMAPS_DATA, ROADMAPS_LIST } from '../data/mock-roadmaps';

const STORAGE_KEY = 'thinkup-roadmap-storage';

interface PersistedState {
  dynamicRoadmaps: Record<string, RoadmapDetail>;
  enrolledRoadmaps: string[];
}

@Injectable({
  providedIn: 'root'
})
export class RoadmapService {
  private readonly dynamicRoadmapsSig = signal<Record<string, RoadmapDetail>>({});
  private readonly enrolledRoadmapsSig = signal<string[]>([]);

  readonly roadmapsList = signal<RoadmapMetaItem[]>(ROADMAPS_LIST);
  readonly enrolledRoadmaps = computed(() => this.enrolledRoadmapsSig());
  readonly dynamicRoadmaps = computed(() => this.dynamicRoadmapsSig());

  constructor() {
    this.initFromStorage();
  }

  private initFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PersistedState;
        if (parsed.dynamicRoadmaps && Object.keys(parsed.dynamicRoadmaps).length > 0) {
          this.dynamicRoadmapsSig.set(parsed.dynamicRoadmaps);
        } else {
          this.dynamicRoadmapsSig.set(JSON.parse(JSON.stringify(ROADMAPS_DATA)));
        }

        if (Array.isArray(parsed.enrolledRoadmaps)) {
          this.enrolledRoadmapsSig.set(parsed.enrolledRoadmaps);
        }
        return;
      }
    } catch {
      // Fallback
    }

    this.dynamicRoadmapsSig.set(JSON.parse(JSON.stringify(ROADMAPS_DATA)));
    this.enrolledRoadmapsSig.set([]);
    this.persist();
  }

  private persist(): void {
    try {
      const state: PersistedState = {
        dynamicRoadmaps: this.dynamicRoadmapsSig(),
        enrolledRoadmaps: this.enrolledRoadmapsSig()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota exceeded in storage
    }
  }

  getRoadmapById(id: string): RoadmapDetail | null {
    return this.dynamicRoadmapsSig()[id] || null;
  }

  getRoadmapMeta(id: string): RoadmapMetaItem | null {
    return this.roadmapsList().find((item) => item.id === id) || null;
  }

  isEnrolled(roadmapId: string): boolean {
    return this.enrolledRoadmapsSig().includes(roadmapId);
  }

  enrollRoadmap(roadmapId: string): { success: boolean; message: string } {
    const enrolled = this.enrolledRoadmapsSig();
    if (enrolled.includes(roadmapId)) {
      return { success: true, message: 'Đã chọn lộ trình này.' };
    }
    if (enrolled.length >= 1) {
      return { success: false, message: 'Bạn chỉ được chọn 1 lộ trình học cùng lúc.' };
    }

    this.enrolledRoadmapsSig.set([...enrolled, roadmapId]);
    this.persist();
    return { success: true, message: 'Đã chọn lộ trình học thành công!' };
  }

  unenrollRoadmap(roadmapId: string): void {
    const enrolled = this.enrolledRoadmapsSig().filter((id) => id !== roadmapId);
    this.enrolledRoadmapsSig.set(enrolled);
    this.persist();
  }

  updateSkillStatus(
    roadmapId: string,
    stageId: string,
    skillId: string,
    status: RoadmapSkill['status']
  ): void {
    const current = { ...this.dynamicRoadmapsSig() };
    const roadmap = current[roadmapId];
    if (!roadmap) return;

    const updatedStages = roadmap.stages.map((stage) => {
      if (stage.id !== stageId) return stage;

      const updatedSkills = stage.skills.map((skill) => {
        if (skill.id !== skillId) return skill;

        const checkedTopics =
          status === 'completed'
            ? (skill.topics ? skill.topics.map((_, i) => i) : [])
            : (status === 'not-started' || status === 'locked' ? [] : (skill.checkedTopics || []));

        return {
          ...skill,
          status,
          checkedTopics
        };
      });

      return { ...stage, skills: updatedSkills };
    });

    current[roadmapId] = { ...roadmap, stages: updatedStages };
    this.dynamicRoadmapsSig.set(current);
    this.persist();
  }

  toggleTopic(roadmapId: string, stageId: string, skillId: string, topicIndex: number): void {
    const current = { ...this.dynamicRoadmapsSig() };
    const roadmap = current[roadmapId];
    if (!roadmap) return;

    const updatedStages = roadmap.stages.map((stage) => {
      if (stage.id !== stageId) return stage;

      const updatedSkills = stage.skills.map((skill) => {
        if (skill.id !== skillId) return skill;

        const checkedTopics = skill.checkedTopics || [];
        const isChecked = checkedTopics.includes(topicIndex);
        const nextChecked = isChecked
          ? checkedTopics.filter((idx) => idx !== topicIndex)
          : [...checkedTopics, topicIndex];

        return {
          ...skill,
          checkedTopics: nextChecked
        };
      });

      return { ...stage, skills: updatedSkills };
    });

    current[roadmapId] = { ...roadmap, stages: updatedStages };
    this.dynamicRoadmapsSig.set(current);
    this.persist();
  }
}
