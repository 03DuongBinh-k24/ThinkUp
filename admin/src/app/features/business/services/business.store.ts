import { InjectionToken, Signal } from '@angular/core';
import { ExportFormat } from '../../../shared/utils/export-formats';
import { BusinessOrder, BusinessVoucher, OrderStatus, PayoutRequest, PayoutDecision } from '../models/business.models';

/** Bộ lọc danh sách đơn hàng — dùng cho cả danh sách lẫn export server-side. */
export interface OrderListFilters {
  q?: string;
  status?: OrderStatus | '';
  method?: string;
  from?: string;
  to?: string;
  sort?: 'newest' | 'oldest';
  page?: number;
  pageSize?: number;
}

/** Bộ lọc danh sách voucher — chỉ gồm các trường backend hỗ trợ. */
export interface VoucherListFilters {
  q?: string;
  sponsor?: string;
  status?: string;
  scope?: string;
  discountType?: string;
  discountMin?: number | null;
  discountMax?: number | null;
  minOrderMin?: number | null;
  minOrderMax?: number | null;
  usedMin?: number | null;
  usedMax?: number | null;
  remainingMin?: number | null;
  remainingMax?: number | null;
  startsFrom?: string;
  startsTo?: string;
  endsFrom?: string;
  endsTo?: string;
}

export interface PayoutListFilters {
  page: number; pageSize: number; q?: string; status?: string;
  limitMin?: number | null; limitMax?: number | null; from?: string; to?: string;
  sort?: 'newest' | 'oldest'; taxOnly?: boolean; paidMonthOnly?: boolean;
}

export interface OrderTotals {
  total: number;
  success: number;
  pending: number;
  cancelled: number;
}

export interface PayoutSummary {
  pendingCount: number;
  largePendingCount: number;
  awaitingDisbursementAmount: number;
  paidThisMonthAmount: number;
  paidThisMonthCount: number;
  taxDeductedThisMonthAmount: number;
}

/**
 * Hợp đồng dữ liệu module kinh doanh.
 *
 * TODO(pre-deploy): Nhớ gỡ `BusinessDemoService` cùng `core/data/mock/business.mock.ts` khi chốt
 * dọn mock; hiện `environment.adminDataSource` quyết định nguồn dữ liệu.
 *
 * Payouts có thể tải dữ liệu và thống kê qua Admin API; chế độ mock vẫn phục vụ preview.
 */
export interface BusinessStore {
  readonly orders: Signal<readonly BusinessOrder[]>;
  readonly orderTotals: Signal<OrderTotals>;
  readonly vouchers: Signal<readonly BusinessVoucher[]>;
  readonly payouts: Signal<readonly PayoutRequest[]>;
  readonly payoutSummary: Signal<PayoutSummary | null>;
  readonly payoutRole: Signal<'finance' | 'super'>;
  readonly loading: Signal<boolean>;
  readonly error: Signal<string | null>;
  /** `true` khi dữ liệu chi trả vẫn là dữ liệu minh họa. */
  readonly payoutsAreDemo: Signal<boolean>;

  reloadOrders(filters?: OrderListFilters): Promise<void>;
  loadOrdersPage(filters: OrderListFilters): Promise<{ items: readonly BusinessOrder[]; total: number; summary: OrderTotals }>;
  reloadVouchers(filters?: VoucherListFilters): Promise<void>;
  exportOrders(format: ExportFormat, filters: OrderListFilters): Promise<void>;
  exportVouchers(format: ExportFormat, filters: VoucherListFilters): Promise<void>;

  saveVoucher(value: BusinessVoucher, editing: boolean): Promise<void>;
  deleteVoucher(code: string): Promise<void>;
  setVoucherLock(codes: readonly string[], locked: boolean): Promise<void>;

  /** Backend chưa có API xác nhận/hủy đơn; hiện chỉ cập nhật trong bộ nhớ để xem trước luồng UI. */
  updateOrder(id: string, changes: Partial<BusinessOrder>): void;
  reloadPayouts(): Promise<void>;
  loadPayoutsPage(filters: PayoutListFilters): Promise<{items: readonly PayoutRequest[];total:number}>;
  getPayoutSummary(): Promise<void>;
  payoutDetail(id: string): Promise<PayoutRequest>;
  updatePayout(id: string, decision: PayoutDecision): Promise<void>;
}

export const BUSINESS_STORE = new InjectionToken<BusinessStore>('BUSINESS_STORE');
