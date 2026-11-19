import { InjectionToken, Signal } from '@angular/core';
import { AuditLog, DashboardAnalytics, DashboardOverview } from '../models/dashboard.models';

/** Tham số gửi lên `/admin/dashboard/overview` và `/admin/dashboard/analytics`. */
export interface DashboardQuery {
  period?: 'today' | '7d' | 'month' | 'quarter' | 'year';
  grain?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  startDate?: string;
  endDate?: string;
}

/**
 * Hợp đồng dữ liệu Dashboard.
 *
 * `environment.adminDataSource` quyết định implementation (Admin API thật hoặc dữ liệu demo);
 * component chỉ inject token này nên không biết nguồn dữ liệu.
 */
export interface DashboardStore {
  readonly overview: Signal<DashboardOverview | null>;
  readonly analytics: Signal<DashboardAnalytics | null>;
  readonly logs: Signal<readonly AuditLog[]>;
  readonly logsTotal: Signal<number>;
  readonly loading: Signal<boolean>;
  readonly error: Signal<string>;
  /** Lỗi riêng của bảng nhật ký (403 với role không phải Super Admin). */
  readonly logsError: Signal<string>;
  load(query?: DashboardQuery): Promise<void>;
}

export const DASHBOARD_STORE = new InjectionToken<DashboardStore>('DASHBOARD_STORE');
