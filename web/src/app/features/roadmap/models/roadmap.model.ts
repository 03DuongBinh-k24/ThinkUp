export interface RoadmapMetaItem {
  id: string;
  title: string;
  shortCode: string;
  color: string;
  bgColor: string;
  desc: string;
  stagesCount: number;
  skillsCount: number;
}

export interface RoadmapCourseRef {
  id: number;
  title: string;
  rating: number;
  students: number;
  coverBg: string;
  cover: string;
}

export interface RoadmapSkill {
  id: string;
  title: string;
  desc: string;
  status: 'locked' | 'not-started' | 'in-progress' | 'completed';
  difficulty?: string;
  stagePosition?: string;
  stageId?: string;
  prerequisites?: string[];
  nextSkill?: {
    name?: string;
    description?: string;
  } | null;
  topics?: string[];
  checkedTopics?: number[];
  courses?: RoadmapCourseRef[];
  resources?: string[];
}

export interface RoadmapStage {
  id: string;
  number: number;
  title: string;
  desc: string;
  skills: RoadmapSkill[];
  visibleSkills?: RoadmapSkill[];
}

export interface RoadmapDetail {
  id: string;
  title: string;
  desc: string;
  stages: RoadmapStage[];
}
