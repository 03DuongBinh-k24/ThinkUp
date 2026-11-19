import { Signal } from '@angular/core';
import {
  ApprovalItem, ApprovalWorkspace, Course, CourseFinance, CourseStatus, Roadmap, RoadmapNode, RoadmapStudio, RoadmapTest
} from '../models/course.models';

/** Replaceable contract so the demo data source can be swapped for the real course API. */
export abstract class CourseStore {
  abstract readonly courses: Signal<readonly Course[]>;
  abstract readonly approvals: Signal<readonly ApprovalItem[]>;
  abstract readonly roadmaps: Signal<readonly Roadmap[]>;
  abstract readonly workspaces: Signal<readonly ApprovalWorkspace[]>;
  abstract readonly studios: Signal<readonly RoadmapStudio[]>;
  abstract readonly loadError: Signal<boolean>;

  abstract retry(): void;
  abstract getCourseContent(course: Course): Promise<Course>;
  abstract getCourseLearners(course: Course): Promise<Course['learners']>;
  /**
   * Báo cáo tài chính tích lũy của một khóa học (Giảng viên nhận / Sàn giữ lại / Doanh thu / Voucher).
   * Trả `null` khi chưa đủ điều kiện (khóa chưa duyệt) hoặc không có dữ liệu để đối soát.
   */
  abstract getCourseFinance(id: string): Promise<CourseFinance | null>;
  abstract archiveCourse(id: string, reason: string, explanation: string): void;
  abstract setCourseStatus(id: string, status: CourseStatus): void;
  abstract approveApproval(id: string): Promise<void> | void;
  abstract rejectApproval(id: string, reason: string, detail: string): Promise<void> | void;
  abstract requestSupplement(id: string, items: string[], issueType: string, detail: string): Promise<void> | void;
  abstract toggleRoadmapVisibility(id: string): void;
  abstract updateRoadmapNode(roadmapId: string, node: RoadmapNode): void;
  abstract saveRoadmapDraft(roadmapId: string): void;
  abstract publishRoadmap(roadmapId: string): void;
  abstract saveRoadmapTest(roadmapId: string, test: RoadmapTest): void;
  abstract reset(): void;
}
