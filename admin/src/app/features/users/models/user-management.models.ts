/** Trạng thái tài khoản giảng viên — khoá theo đúng bộ lọc của Figma. */
export type LecturerStatus =
  | 'active'
  | 'pending-review'
  | 'pending-docs'
  | 'pending-contract'
  | 'warning'
  | 'violation'
  | 'frozen'
  | 'rejected';

/** Trạng thái pháp lý / hợp đồng & thuế. */
export type LecturerLegalStatus = 'signed' | 'incomplete';

/** Trạng thái tài khoản học viên. */
export type StudentStatus = 'active' | 'locked' | 'inactive';

/** Mức kỷ luật dùng chung cho luồng khoá tài khoản và xử lý vi phạm. */
export type DisciplineLevel = 1 | 2 | 3;

/**
 * Một lần xử lý kỷ luật.
 * `appliedAt` luôn là ISO 8601 (có thể chỉ có ngày) — hiển thị qua `formatDate`.
 */
export interface DisciplineRecord {
  /** Nhãn mức, ví dụ "Cảnh cáo · Mức 1". */
  level: string;
  appliedAt: string;
  reason: string;
  /** Ticket khiếu nại liên quan do admin nhập. */
  ticket?: string;
  /** Tên tệp minh chứng đã đính kèm. */
  evidence?: readonly string[];
  action?: 'discipline' | 'unlock';
  courseIds?: readonly string[];
  adminName?: string;
}

export interface LecturerLinks {
  portfolio?: string;
  linkedin?: string;
  gsahub?: string;
}

export interface LecturerDocument {
  key: string;
  label: string;
  /** Trạng thái của từng giấy tờ trong popup "Yêu cầu bổ sung". */
  state: 'missing' | 'invalid' | 'pending' | 'not-started';
  /** ID tài liệu trên server (dùng cho endpoint tải tệp). */
  id?: string;
  filename?: string;
  mimeType?: string;
  /** Chỉ có khi vai trò SA/CA được tải tệp. */
  downloadUrl?: string;
}

/** Yêu cầu bổ sung hồ sơ đã gửi cho giảng viên. */
export interface LecturerDocumentRequest {
  keys: readonly string[];
  guidance: string;
  /** Hạn bổ sung, ISO 8601. */
  deadline: string;
  sendEmail: boolean;
}

/** Quyết định từ chối hồ sơ giảng viên. */
export interface LecturerRejection {
  reason: string;
  sendEmail: boolean;
  /** ISO 8601. */
  decidedAt: string;
}

export interface Lecturer {
  /** Business code from instructor_id; separate from Mongo user id. */
  lecturerCode?: string;
  id: string;
  /** False for a public legacy profile without a linked login account. */
  accountLinked?: boolean;
  name: string;
  initials: string;
  email: string;
  phone: string;
  specialty: string;
  field: string;
  stack: string;
  title: string;
  bio: string;
  courses: number;
  learners: number;
  revenue: number;
  status: LecturerStatus;
  legalStatus: LecturerLegalStatus;
  taxVerified: boolean;
  contractCode?: string;
  /** ISO 8601. */
  joinedAt: string;
  links: LecturerLinks;
  /** `uploadedAt` là ISO 8601. Bỏ trống khi hồ sơ chưa có tệp CV (API chỉ trả metadata tài liệu). */
  cv?: { fileName: string; size: string; uploadedAt: string };
  kyc: { cccd: string; taxCode: string; address: string; verified: boolean };
  violations: DisciplineRecord[];
  /** Mức kỷ luật đang áp dụng — hiển thị trong popup "Mở khóa tài khoản". */
  lockLevel?: DisciplineLevel;
  /** Hạn mở khóa, ISO 8601. Không có = khoá vĩnh viễn. */
  lockedUntil?: string;
  documents: LecturerDocument[];
  /** Yêu cầu bổ sung hồ sơ gần nhất (nếu có). */
  documentRequest?: LecturerDocumentRequest;
  /** Quyết định từ chối gần nhất (nếu có). */
  rejection?: LecturerRejection;
  /** Ghi chú lần xử lý gần nhất, hiển thị trong popup kỷ luật. */
  disciplineHistory?: { warnings: number; hiddenCourses: number };
}

/** Một dòng trong popup "Khóa học của giảng viên". */
export interface LecturerCourseRow {
  /** Mã khóa học, ví dụ "KH-2026-014" — dùng làm khoá chọn ở Mức 2. */
  code: string;
  name: string;
  status: 'published' | 'draft' | 'hidden';
  learners: number;
  revenue: number;
  /** ISO 8601. */
  updatedAt: string;
}

export interface StudentOrder {
  id: string;
  amount: number;
  /** ISO 8601 (có giờ). */
  paidAt: string;
  status: string;
}

export interface EnrolledCourse {
  id?: string;
  name: string;
  progress: number;
  totalLearningTimeSeconds?: number;
  sections?: Array<{
    id: string;
    title: string;
    progress: number;
    completedLessons: number;
    totalLessons: number;
    lessons: Array<{
      id: string;
      title: string;
      type: string;
      status: string;
      completed: boolean;
      timeSpentSeconds: number;
      quizAttempts: Array<{ scorePercent: number; passed: boolean; status: string; submittedAt?: string | null }>;
      labAttempts: Array<{ status: string; submittedAt?: string | null; runCount: number; passedRuns: number }>;
    }>;
  }>;
}

export interface Student {
  /** Business code from student_id; separate from Mongo user id. */
  studentCode?: string;
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  courseCount: number;
  orders: number;
  /** ISO 8601. */
  registeredAt: string;
  status: StudentStatus;
  violations: DisciplineRecord[];
  enrolledCourses: EnrolledCourse[];
  recentOrder?: StudentOrder;
  /** Hạn khoá tài khoản, ISO 8601. Không có = khoá vĩnh viễn. */
  lockedUntil?: string;
  lockLevel?: DisciplineLevel;
  lockReason?: string;
}
