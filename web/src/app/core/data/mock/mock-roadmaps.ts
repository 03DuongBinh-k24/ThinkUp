// TODO(pre-deploy): Nhớ xóa dữ liệu mock và các file JSON trong mock/roadmaps khi thay bằng dữ liệu thật.
import { RoadmapDetail, RoadmapMetaItem, RoadmapSkill } from '../../../features/roadmap/models/roadmap.model';

import aiMlEngineerData from './roadmaps/ai-ml-engineer-roadmap.json';
import backendDeveloperData from './roadmaps/backend-developer-roadmap.json';
import businessAnalysisData from './roadmaps/business-analysis-roadmap.json';
import cloudEngineeringData from './roadmaps/cloud-engineering-roadmap.json';
import dataAnalysisData from './roadmaps/data-analysis-roadmap.json';
import dataEngineeringData from './roadmaps/data-engineering-roadmap.json';
import devopsEngineeringData from './roadmaps/devops-engineering-roadmap.json';
import erpConsultingData from './roadmaps/erp-consulting-roadmap.json';
import frontendDeveloperData from './roadmaps/frontend-developer-roadmap.json';
import fullstackDeveloperData from './roadmaps/fullstack-developer-roadmap.json';
import mobileDeveloperData from './roadmaps/mobile-developer-roadmap.json';
import productManagementData from './roadmaps/product-management-roadmap.json';
import projectManagementData from './roadmaps/project-management-roadmap.json';
import securityEngineeringData from './roadmaps/security-engineering-roadmap.json';
import softwareTestingQaData from './roadmaps/software-testing-qa-roadmap.json';
import systemAnalysisData from './roadmaps/system-analysis-roadmap.json';
import uiUxDesignData from './roadmaps/ui-ux-design-roadmap.json';

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[&]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function formatTitle(rawName: string): string {
  return rawName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface RawSkill {
  name: string;
  difficulty?: string;
  prerequisites?: string[];
  whatYouWillLearn?: string[];
  nextSkill?: {
    name?: string;
    description?: string;
  };
}

interface RawStage {
  stageId: number;
  name: string;
  description: string;
  skills: RawSkill[];
}

interface RawRoadmapJson {
  roadmap: {
    name: string;
    description: string;
  };
  stages: RawStage[];
}

interface RoadmapMetaDefinition {
  id: string;
  shortCode: string;
  color: string;
  bgColor: string;
  data: RawRoadmapJson;
}

const ROADMAP_META: RoadmapMetaDefinition[] = [
  { id: 'frontend-developer', shortCode: 'FE', color: '#0088E8', bgColor: '#E6F4FF', data: frontendDeveloperData as unknown as RawRoadmapJson },
  { id: 'backend-developer', shortCode: 'BE', color: '#7C3AED', bgColor: '#F3ECFF', data: backendDeveloperData as unknown as RawRoadmapJson },
  { id: 'fullstack-developer', shortCode: 'FS', color: '#4F46E5', bgColor: '#EEF2FF', data: fullstackDeveloperData as unknown as RawRoadmapJson },
  { id: 'mobile-developer', shortCode: 'MB', color: '#0891B2', bgColor: '#E0F7FA', data: mobileDeveloperData as unknown as RawRoadmapJson },
  { id: 'ai-ml-engineer', shortCode: 'AI', color: '#16A34A', bgColor: '#E6F7EE', data: aiMlEngineerData as unknown as RawRoadmapJson },
  { id: 'data-analysis', shortCode: 'DA', color: '#EA7317', bgColor: '#FFE9D6', data: dataAnalysisData as unknown as RawRoadmapJson },
  { id: 'data-engineering', shortCode: 'DE', color: '#D97706', bgColor: '#FEF3C7', data: dataEngineeringData as unknown as RawRoadmapJson },
  { id: 'devops-engineering', shortCode: 'DO', color: '#DC2626', bgColor: '#FEE2E2', data: devopsEngineeringData as unknown as RawRoadmapJson },
  { id: 'cloud-engineering', shortCode: 'CE', color: '#0284C7', bgColor: '#E0F2FE', data: cloudEngineeringData as unknown as RawRoadmapJson },
  { id: 'security-engineering', shortCode: 'SC', color: '#E11D48', bgColor: '#FFE4E6', data: securityEngineeringData as unknown as RawRoadmapJson },
  { id: 'ui-ux-design', shortCode: 'UX', color: '#DB2777', bgColor: '#FCE7F3', data: uiUxDesignData as unknown as RawRoadmapJson },
  { id: 'product-management', shortCode: 'PM', color: '#0D9488', bgColor: '#CCFBF1', data: productManagementData as unknown as RawRoadmapJson },
  { id: 'project-management', shortCode: 'PJ', color: '#059669', bgColor: '#D1FAE5', data: projectManagementData as unknown as RawRoadmapJson },
  { id: 'business-analysis', shortCode: 'BA', color: '#6366F1', bgColor: '#EEF2FF', data: businessAnalysisData as unknown as RawRoadmapJson },
  { id: 'software-testing-qa', shortCode: 'QA', color: '#CA8A04', bgColor: '#FEF9C3', data: softwareTestingQaData as unknown as RawRoadmapJson },
  { id: 'system-analysis', shortCode: 'SA', color: '#64748B', bgColor: '#F1F5F9', data: systemAnalysisData as unknown as RawRoadmapJson },
  { id: 'erp-consulting', shortCode: 'ERP', color: '#9333EA', bgColor: '#F3E8FF', data: erpConsultingData as unknown as RawRoadmapJson }
];

function buildRoadmapDetail(id: string, raw: RawRoadmapJson): RoadmapDetail {
  const title = formatTitle(raw.roadmap.name);
  const desc = raw.roadmap.description;

  const stages = raw.stages.map((stage) => ({
    id: `${id}-stage-${stage.stageId}`,
    number: stage.stageId,
    title: `${stage.stageId}. ${stage.name}`,
    desc: stage.description,
    skills: stage.skills.map((skill) => {
      const skillId = slugify(skill.name);
      const whatYouWillLearn = skill.whatYouWillLearn || [];
      const skillDesc =
        skill.nextSkill?.description ||
        (whatYouWillLearn.length >= 2
          ? whatYouWillLearn.slice(0, 2).join('. ')
          : whatYouWillLearn[0] || '');

      return {
        id: skillId,
        title: skill.name,
        desc: skillDesc,
        status: 'not-started' as const,
        difficulty: skill.difficulty || 'Cơ bản',
        prerequisites: skill.prerequisites || [],
        nextSkill: skill.nextSkill || null,
        topics: whatYouWillLearn,
        checkedTopics: [],
        resources: []
      };
    })
  }));

  return { id, title, desc, stages };
}

export const ROADMAPS_DATA: Record<string, RoadmapDetail> = {};
export const ROADMAPS_LIST: RoadmapMetaItem[] = [];

for (const meta of ROADMAP_META) {
  const detail = buildRoadmapDetail(meta.id, meta.data);
  ROADMAPS_DATA[meta.id] = detail;

  const skillsCount = detail.stages.reduce(
    (sum, stage) => sum + stage.skills.length,
    0
  );

  ROADMAPS_LIST.push({
    id: meta.id,
    title: detail.title,
    shortCode: meta.shortCode,
    color: meta.color,
    bgColor: meta.bgColor,
    desc: detail.desc,
    stagesCount: detail.stages.length,
    skillsCount
  });
}
