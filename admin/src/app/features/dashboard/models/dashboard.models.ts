/**
 * Kiểu dữ liệu hiển thị của Dashboard.
 *
 * Tách khỏi `core/data/mock/dashboard.mock.ts` để component và service HTTP dùng chung một
 * hợp đồng; mock chỉ còn là một implementation của `DashboardStore`.
 */

export type DashboardMetricKey = 'users' | 'courses' | 'revenue' | 'rooms';

export interface DashboardMetric {
  key: DashboardMetricKey;
  title: string;
  /** Chuỗi đã định dạng theo locale vi-VN (ví dụ `120.540`). */
  value: string;
  unit?: string;
  trend?: string;
  detail?: string[];
  theme: DashboardMetricKey;
  /** Trang đích của nút mũi tên; bỏ trống khi chưa có màn hình tương ứng. */
  link?: string;
  loadPercent?: number;
  loadLabel?: string;
}

export type DashboardActionKey = 'payouts' | 'courseApprovals' | 'complaints' | 'alerts';

export interface ActionItem {
  key: DashboardActionKey;
  title: string;
  description: string;
  count: number;
  suffix: string;
  status: string;
  action: string;
  theme: string;
  icon: string;
  link: string;
}

export interface AuditLog {
  id: string;
  time: string;
  account: string;
  role: string;
  action: string;
  ip: string;
  actor?: string;
  actionCode?: string;
  device?: string;
  entity?: string;
  previous?: string;
  current?: string;
}

/** Một cột của biểu đồ doanh thu; giá trị tính theo triệu VNĐ. */
export interface RevenuePoint {
  month: string;
  original: number;
  marketplace: number;
  payout: number;
}

export interface DashboardLearning {
  totalEnrollments: number;
  completed: number;
  inProgress: number;
  inactive: number;
  percentages: { completed: number; inProgress: number; inactive: number };
}

export interface TopCourse {
  courseId: string;
  name: string;
  purchases: number;
  /** Đã định dạng 1 chữ số thập phân (dấu phẩy) hoặc `—`. */
  rating: string;
}

export interface DashboardRevenueSummary {
  total: number;
  pending: number;
  changePercent: number | null;
}

export interface DashboardOverview {
  metrics: DashboardMetric[];
  actions: ActionItem[];
  revenue: DashboardRevenueSummary;
}

export interface DashboardAnalytics {
  bars: RevenuePoint[];
  learning: DashboardLearning;
  courses: TopCourse[];
  totals: {
    total: number;
    original: number;
    marketplace: number;
    payout: number;
    changePercent: number | null;
  };
}
