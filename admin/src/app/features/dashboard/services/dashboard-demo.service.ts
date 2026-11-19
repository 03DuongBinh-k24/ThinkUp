import { Injectable, signal } from '@angular/core';
import {
  AUDIT_LOGS, DASHBOARD_ACTIONS, DASHBOARD_METRICS, REVENUE_DATASETS, TOP_COURSES,
} from '../../../core/data/mock/dashboard.mock';
import {
  ActionItem, AuditLog, DashboardAnalytics, DashboardMetric, DashboardOverview, RevenuePoint, TopCourse,
} from '../models/dashboard.models';
import { DashboardQuery, DashboardStore } from './dashboard.store';

const PERIOD_DATASET: Record<string, string> = {
  today: 'Ngày', '7d': 'Tuần', month: 'Tháng', quarter: 'Quý', year: 'Năm'
};

const ACTION_LINKS: Record<string, string> = {
  payouts: '/business/payouts',
  courseApprovals: '/courses/approvals',
  complaints: '/support/complaints',
  alerts: '/system/audit',
};

const ACTION_KEYS = ['payouts', 'courseApprovals', 'complaints', 'alerts'] as const;

/**
 * Dữ liệu Dashboard cho chế độ demo.
 *
 * TODO(pre-deploy): Nhớ xoá service này cùng `core/data/mock/dashboard.mock.ts` khi backend đã
 * được xác minh đầy đủ và chủ dự án duyệt dọn mock trước deploy.
 */
@Injectable({ providedIn: 'root' })
export class DashboardDemoService implements DashboardStore {
  readonly overview = signal<DashboardOverview | null>(null);
  readonly analytics = signal<DashboardAnalytics | null>(null);
  readonly logs = signal<readonly AuditLog[]>([]);
  readonly logsTotal = signal(0);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly analyticsError = signal('');
  readonly logsError = signal('');

  async load(query: DashboardQuery = {}): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    this.analyticsError.set('');
    this.logsError.set('');
    this.overview.set({
      metrics: DASHBOARD_METRICS.map(metric => ({
        ...metric,
        key: metric.theme as DashboardMetric['key'],
        theme: metric.theme as DashboardMetric['theme'],
      })),
      actions: DASHBOARD_ACTIONS.map((action, index) => this.toAction(action, ACTION_KEYS[index])),
      revenue: { total: 2_480_000_000, pending: 170_000_000, changePercent: 12.9 },
    });
    const bars = (REVENUE_DATASETS[PERIOD_DATASET[query.period ?? 'month']] ?? REVENUE_DATASETS['Tháng'])
      .map((bar: RevenuePoint) => ({ ...bar }));
    const courses: TopCourse[] = TOP_COURSES.map(course => ({
      courseId: course.name,
      name: course.name,
      purchases: Number(course.purchases.replace(/\./g, '')),
      rating: course.rating,
    }));
    this.analytics.set({
      bars,
      learning: { totalEnrollments: 12_480, completed: 3_370, inProgress: 7_238, inactive: 1_872, percentages: { completed: 27, inProgress: 58, inactive: 15 } },
      courses,
      totals: {
        total: 2_480_000_000,
        original: 1_980_000_000,
        marketplace: 500_000_000,
        payout: 1_236_000_000,
        changePercent: 12.9,
      },
    });
    this.logs.set(AUDIT_LOGS.map(log => ({ ...log, id: log.id ?? log.time })));
    this.logsTotal.set(AUDIT_LOGS.length);
    this.loading.set(false);
  }

  private toAction(action: (typeof DASHBOARD_ACTIONS)[number], key: (typeof ACTION_KEYS)[number]): ActionItem {
    return { ...action, key, link: ACTION_LINKS[key] };
  }
}
