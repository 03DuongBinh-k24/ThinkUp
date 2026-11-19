import { environment } from '../../../../environments/environment';
import { afterNextRender, Component, computed, ElementRef, HostListener, inject, Injector, OnInit, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { LucideArrowRight, LucideCircleDollarSign, LucideGraduationCap, LucideMonitorUp, LucideTrendingUp, LucideUsersRound } from '@lucide/angular';
import { DateTimePickerComponent } from '../../../shared/components/date-time-picker/date-time-picker.component';
import { ColumnFilterComponent, ColumnFilterValue, TEXT_SORT_OPTIONS, compareSortValues } from '../../../shared/components/column-filter/column-filter.component';
import { CustomSelectComponent, CustomSelectOption } from '../../../shared/components/custom-select/custom-select.component';
import { ExportMenuComponent } from '../../../shared/components/export-menu/export-menu.component';
import { SelectionAction, SelectionBarComponent } from '../../../shared/components/selection-bar/selection-bar.component';
import { BulkSelectionDialogComponent, BulkSelectionItem } from '../../../shared/components/bulk-selection-dialog/bulk-selection-dialog.component';
import { ExportFormat, downloadTable } from '../../../shared/utils/export-formats';
import { AdminNumberPipe } from '../../../shared/pipes/admin-number.pipe';
import { AdminPrivacyPipe } from '../../../shared/pipes/admin-privacy.pipe';
import { ActionItem, AuditLog, DashboardLearning, DashboardMetric, RevenuePoint } from '../models/dashboard.models';
import { DASHBOARD_STORE, DashboardQuery } from '../services/dashboard.store';
import { moneyLabel } from '../services/dashboard-http.service';

type Period = 'Ngày' | 'Tuần' | 'Tháng' | 'Năm' | 'Quý';
interface DashboardPalette { id: string; label: string; original: string; marketplace: string; payout: string; }
type DashboardLogColumn = 'account' | 'role' | 'action';

const PERIOD_QUERY: Record<Period, { period: NonNullable<DashboardQuery['period']>; grain: NonNullable<DashboardQuery['grain']> }> = {
  'Ngày': { period: 'today', grain: 'day' },
  'Tuần': { period: '7d', grain: 'day' },
  'Tháng': { period: 'month', grain: 'day' },
  'Năm': { period: 'year', grain: 'month' },
  'Quý': { period: 'quarter', grain: 'month' },
};

const EMPTY_LEARNING: DashboardLearning = {
  totalEnrollments: 0, completed: 0, inProgress: 0, inactive: 0,
  percentages: { completed: 0, inProgress: 0, inactive: 0 },
};

const decimalFmt = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

function niceCeil(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const scaled = value / power;
  // Làm tròn mượt mà và bám sát giá trị đỉnh hơn để trục tung không bị dư khoảng trắng quá lớn
  const step = scaled <= 1 ? 1 : scaled <= 1.25 ? 1.25 : scaled <= 1.5 ? 1.5 : scaled <= 2 ? 2 : scaled <= 2.5 ? 2.5 : scaled <= 3 ? 3 : scaled <= 4 ? 4 : scaled <= 5 ? 5 : scaled <= 6 ? 6 : scaled <= 8 ? 8 : 10;
  return step * power;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [AdminNumberPipe, AdminPrivacyPipe, DateTimePickerComponent, ColumnFilterComponent, CustomSelectComponent, ExportMenuComponent, SelectionBarComponent, BulkSelectionDialogComponent, LucideArrowRight, LucideCircleDollarSign, LucideGraduationCap, LucideMonitorUp, LucideTrendingUp, LucideUsersRound],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private readonly data = inject(DASHBOARD_STORE);
  private readonly router = inject(Router);

  readonly paletteOptions: DashboardPalette[] = [
    { id: 'denim-amber', label: 'Denim · Amber', original: '#3674b5', marketplace: '#f59a2f', payout: '#d86d7d' }
  ];
  readonly paletteId = signal('denim-amber');
  readonly palette = computed(() => this.paletteOptions.find(option => option.id === this.paletteId()) ?? this.paletteOptions[0]);
  readonly hoveredBar = signal<number | null>(null);
  /** Chỉ hiện cảnh báo khi app chạy ở chế độ demo; chế độ HTTP hiển thị số liệu thật. */
  readonly previewDashboard = environment.adminDataSource !== 'http';
  readonly loading = this.data.loading;
  readonly loadError = this.data.error;
  readonly analyticsError = this.data.analyticsError;
  readonly overview = this.data.overview;

  readonly metrics = computed<readonly DashboardMetric[]>(() => this.overview()?.metrics ?? []);
  readonly actions = computed<readonly ActionItem[]>(() => this.overview()?.actions ?? []);
  readonly courses = computed(() => this.data.analytics()?.courses ?? []);
  readonly learning = computed<DashboardLearning>(() => this.data.analytics()?.learning ?? EMPTY_LEARNING);
  readonly totals = computed(() => this.data.analytics()?.totals ?? {
    total: 0, original: 0, marketplace: 0, payout: 0, changePercent: null
  });
  readonly chartBars = computed<RevenuePoint[]>(() => {
    const rawBars = this.data.analytics()?.bars ?? [];
    if (!rawBars.length) return [];
    const hasAny = rawBars.some(b => b.original > 0 || b.marketplace > 0 || b.payout > 0);
    if (!hasAny) return rawBars;

    // Lọc lấy các tháng phát sinh doanh thu / dòng tiền
    const activeBars = rawBars.filter(b => b.original > 0 || b.marketplace > 0 || b.payout > 0);
    // Nếu chỉ có 1 hoặc 2 tháng phát sinh dữ liệu, để biểu đồ không bị đơn điệu và thấy rõ độ dốc / tăng trưởng,
    // ta lấy một dải tháng tự nhiên xung quanh các tháng có dữ liệu (tối thiểu 4 - 6 cột)
    if (activeBars.length < 5) {
      let firstIdx = rawBars.findIndex(b => b.original > 0 || b.marketplace > 0 || b.payout > 0);
      let lastIdx = rawBars.length - 1 - [...rawBars].reverse().findIndex(b => b.original > 0 || b.marketplace > 0 || b.payout > 0);
      const start = Math.max(0, Math.min(firstIdx, rawBars.length - 5));
      const end = Math.min(rawBars.length - 1, Math.max(lastIdx, start + 4));
      return rawBars.slice(start, end + 1);
    }
    return activeBars;
  });
  readonly bars = computed<RevenuePoint[]>(() => this.chartBars());
  readonly periods: Period[] = ['Ngày', 'Tuần', 'Tháng', 'Năm', 'Quý'];
  readonly period = signal<Period>('Năm');
  readonly rangeApplied = signal(false);
  readonly filter = signal('Tất cả');
  readonly filterOptions: ReadonlyArray<CustomSelectOption> = [
    { value: 'Tất cả', label: 'Tất cả' },
    { value: 'Finance (FA)', label: 'Finance (FA)' },
    { value: 'Academic (CA)', label: 'Academic (CA)' },
    { value: 'Support (CS)', label: 'Support (CS)' },
    { value: 'Admin', label: 'Admin' }
  ];
  readonly datePickerOpen = signal(false);
  readonly datePopoverPosition = signal<{ left: number; top: number; maxHeight: number } | null>(null);
  private readonly injector = inject(Injector);
  private readonly dateTrigger = viewChild<ElementRef<HTMLButtonElement>>('dateTrigger');
  private readonly datePopover = viewChild<ElementRef<HTMLElement>>('datePopover');
  private readonly initialRange = this.currentYearRange();
  readonly startDate = signal(this.initialRange.start);
  readonly endDate = signal(this.initialRange.end);
  readonly rangeLabel = computed(() => `${this.displayDate(this.startDate())} - ${this.displayDate(this.endDate())}`);
  readonly selectedLog = signal<AuditLog | null>(null);
  readonly toast = signal<string | null>(null);
  readonly logAccountFilter = signal<string[]>([]);
  readonly logRoleFilter = signal<string[]>([]);
  readonly logActionFilter = signal<string[]>([]);
  readonly logs = this.data.logs;
  readonly logAccountValues = computed<readonly ColumnFilterValue[]>(() =>
    [...new Set(this.logs().map(log => log.account))].map(account => ({ value: account, label: account })));
  readonly logRoleValues: readonly ColumnFilterValue[] = this.filterOptions
    .filter(option => option.value !== 'Tất cả')
    .map(option => ({ value: option.value, label: option.label }));
  readonly logActionValues = computed<readonly ColumnFilterValue[]>(() =>
    [...new Set(this.logs().map(log => log.action))].map(action => ({ value: action, label: action })));
  readonly textSorts = TEXT_SORT_OPTIONS;
  readonly columnSort = signal<{ column: DashboardLogColumn; direction: 'asc' | 'desc' } | null>(null);
  readonly visibleLogs = computed(() => {
    const accounts = this.logAccountFilter();
    const roles = this.logRoleFilter();
    const actions = this.logActionFilter();
    const logs = this.logs().filter(log =>
      (this.filter() === 'Tất cả' || log.role === this.filter())
      && (!accounts.length || accounts.includes(log.account))
      && (!roles.length || roles.includes(log.role))
      && (!actions.length || actions.includes(log.action)));
    const columnSort = this.columnSort();
    if (columnSort) {
      const factor = columnSort.direction === 'asc' ? 1 : -1;
      return [...logs].sort((a, b) => compareSortValues(this.sortValue(a, columnSort.column), this.sortValue(b, columnSort.column)) * factor);
    }
    return logs;
  });
  readonly logsEmptyMessage = computed(() => {
    if (this.data.logsError()) return this.data.logsError();
    if (this.loading()) return 'Đang tải nhật ký quản trị…';
    return 'Không có mục nhật ký nào khớp bộ lọc hiện tại.';
  });

  readonly chartMax = computed(() => {
    const bars = this.bars();
    const peak = bars.reduce((max, bar) => Math.max(max, bar.original + bar.marketplace, bar.payout), 0);
    if (peak <= 0) return 10;
    // Để trục tung ngắn lại, các cột cao lên và thấy rõ độ biến động lớn
    // Ta làm tròn vừa sát với đỉnh peak (nhân 1.05 rồi làm tròn theo bước bội số 10 hoặc 25)
    if (peak <= 50) return Math.ceil(peak * 1.05 / 5) * 5;
    if (peak <= 150) return Math.ceil(peak * 1.05 / 10) * 10;
    return niceCeil(peak * 1.02);
  });
  readonly chartTicks = computed(() => {
    const max = this.chartMax();
    return Array.from({ length: 7 }, (_, index) => decimalFmt.format(max - (max * index) / 6));
  });
  readonly donutGradient = computed(() => {
    const percent = this.learning().percentages;
    const completed = Math.min(100, Math.max(0, percent.completed));
    const learning = Math.min(100 - completed, Math.max(0, percent.inProgress));
    return `conic-gradient(#1570d1 0 ${completed}%, #42b7b3 ${completed}% ${completed + learning}%, #e5ae50 ${completed + learning}% 100%)`;
  });
  readonly revenueChangeBadge = computed(() => {
    const change = this.totals().changePercent;
    if (change === null || !Number.isFinite(change)) return '—';
    return `${change > 0 ? '↗ ' : change < 0 ? '↘ ' : ''}${change > 0 ? '+' : ''}${decimalFmt.format(change)}%`;
  });
  readonly revenueChangeNegative = computed(() => (this.totals().changePercent ?? 0) < 0);

  readonly payoutPath = computed(() => this.makePayoutPath(this.bars()));
  readonly payoutPoints = computed(() => this.bars().map((bar, index, bars) => ({
    x: bars.length > 0 ? (index + 0.5) * (730 / bars.length) : 0,
    y: this.payoutY(bar.payout)
  })));

  readonly selection = signal<ReadonlySet<string>>(new Set());
  readonly selectionListOpen = signal(false);
  readonly selectedIds = computed(() => [...this.selection()]);
  readonly allVisibleSelected = computed(() => {
    const logs = this.visibleLogs();
    const chosen = this.selection();
    return logs.length > 0 && logs.every(log => chosen.has(this.keyOf(log)));
  });
  readonly someVisibleSelected = computed(() =>
    !this.allVisibleSelected() && this.visibleLogs().some(log => this.selection().has(this.keyOf(log))));
  readonly selectionItems = computed<BulkSelectionItem[]>(() =>
    this.logs().filter(log => this.selection().has(this.keyOf(log)))
      .map(log => ({ id: this.keyOf(log), label: log.account, detail: `${log.action} · ${log.time}` })));
  readonly selectionCandidates = computed<BulkSelectionItem[]>(() =>
    this.visibleLogs().filter(log => !this.selection().has(this.keyOf(log)))
      .map(log => ({ id: this.keyOf(log), label: log.account, detail: `${log.action} · ${log.time}` })));
  readonly selectionActions = computed<readonly SelectionAction[]>(() => [
    { key: 'export', label: 'Xuất mục đã chọn', tone: 'primary', title: 'Tải tệp các mục nhật ký đã chọn' }
  ]);
  private toastTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    void this.load();
  }

  reload(): void {
    void this.load();
  }

  choosePeriod(period: Period): void {
    if (this.period() === period && !this.rangeApplied()) return;
    this.period.set(period);
    this.rangeApplied.set(false);
    void this.load();
  }

  private async load(): Promise<void> {
    const mapping = PERIOD_QUERY[this.period()];
    await this.data.load(this.rangeApplied()
      ? { startDate: this.startDate(), endDate: this.endDate(), grain: mapping.grain }
      : { period: mapping.period, grain: mapping.grain });
  }

  private queryPeriod(): DashboardQuery {
    const mapping = PERIOD_QUERY[this.period()];
    return this.rangeApplied()
      ? { startDate: this.startDate(), endDate: this.endDate(), grain: mapping.grain }
      : { period: mapping.period, grain: mapping.grain };
  }

  // Giữ tham chiếu để template/mở rộng dùng lại tham số đang áp dụng.
  readonly activeQuery = computed(() => this.queryPeriod());

  private keyOf(log: AuditLog): string {
    return log.id || log.time;
  }

  isLogSelected(log: AuditLog): boolean {
    return this.selection().has(this.keyOf(log));
  }

  toggleSelect(log: AuditLog, checked: boolean): void {
    const next = new Set(this.selection());
    const key = this.keyOf(log);
    if (checked) next.add(key);
    else next.delete(key);
    this.selection.set(next);
  }

  toggleSelectAll(): void {
    const next = new Set(this.selection());
    if (this.allVisibleSelected()) this.visibleLogs().forEach(log => next.delete(this.keyOf(log)));
    else this.visibleLogs().forEach(log => next.add(this.keyOf(log)));
    this.selection.set(next);
  }

  clearSelection(): void {
    this.selection.set(new Set());
  }

  setSelectionIds(ids: string[]): void {
    this.selection.set(new Set(ids));
  }

  runSelectionAction(key: string, ids?: readonly string[]): void {
    this.selectionListOpen.set(false);
    const targets = ids ?? this.selectedIds();
    if (!targets.length || key !== 'export') return;
    const logs = this.logs().filter(log => targets.includes(this.keyOf(log)));
    if (!logs.length) return;
    void downloadTable('xlsx', 'nhat-ky-quan-tri-da-chon', [
      ['Thời gian', 'Tài khoản', 'Role', 'Hành động', 'IP'],
      ...logs.map(log => [log.time, log.account, log.role, log.action, log.ip])
    ]).then(
      () => this.notify(`Đã xuất ${logs.length} mục nhật ký đã chọn.`),
      () => this.notify('Không thể xuất tệp nhật ký. Vui lòng thử lại.')
    );
  }

  private notify(message: string): void {
    clearTimeout(this.toastTimer);
    this.toast.set(message);
    this.toastTimer = setTimeout(() => this.toast.set(null), 3500);
  }

  toggleDatePopover(): void {
    if (this.datePickerOpen()) {
      this.closeDatePopover();
      return;
    }

    this.datePickerOpen.set(true);
    afterNextRender(() => this.positionDatePopover(), { injector: this.injector });
  }

  closeDatePopover(): void {
    this.datePickerOpen.set(false);
    this.datePopoverPosition.set(null);
  }

  applyDateRange(): void {
    this.rangeApplied.set(true);
    this.closeDatePopover();
    void this.load();
  }

  @HostListener('document:keydown.escape')
  closeDatePopoverOnEscape(): void {
    if (!this.datePickerOpen()) return;
    this.closeDatePopover();
    this.dateTrigger()?.nativeElement.focus();
  }

  @HostListener('document:click', ['$event'])
  closeDatePopoverOnOutsideClick(event: MouseEvent): void {
    if (!this.datePickerOpen()) return;
    const path = event.composedPath();
    const trigger = this.dateTrigger()?.nativeElement;
    const popover = this.datePopover()?.nativeElement;
    if ((trigger && path.includes(trigger)) || (popover && path.includes(popover))) return;
    this.closeDatePopover();
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  positionDatePopover(): void {
    const trigger = this.dateTrigger()?.nativeElement;
    const popover = this.datePopover()?.nativeElement;
    if (!trigger || !popover) return;

    const margin = 12;
    const gap = 8;
    const anchor = trigger.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const left = Math.max(margin, Math.min(anchor.right - popover.offsetWidth, viewportWidth - margin - popover.offsetWidth));
    const below = Math.max(0, viewportHeight - anchor.bottom - gap - margin);
    const above = Math.max(0, anchor.top - gap - margin);
    const height = popover.scrollHeight + popover.offsetHeight - popover.clientHeight;
    const opensAbove = below < height && above > below;
    const maxHeight = Math.min(opensAbove ? above : below, viewportHeight - 2 * margin);
    const top = opensAbove ? anchor.top - gap - Math.min(height, maxHeight) : anchor.bottom + gap;

    this.datePopoverPosition.set({
      left,
      top: Math.max(margin, Math.min(top, viewportHeight - margin - maxHeight)),
      maxHeight
    });
  }

  barHeight(value: number): number {
    return Math.max(0, Math.min(100, (value / this.chartMax()) * 100));
  }

  private payoutY(value: number): number {
    return 305 - (value / this.chartMax()) * 300;
  }

  private makePayoutPath(bars: readonly RevenuePoint[]): string {
    const step = bars.length > 0 ? 730 / bars.length : 0;
    const points = bars.map((bar, index) => ({ x: (index + 0.5) * step, y: this.payoutY(bar.payout) }));
    return points.reduce((path, point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      const previous = points[index - 1];
      const midpointX = (previous.x + point.x) / 2;
      return `${path} C ${midpointX} ${previous.y}, ${midpointX} ${point.y}, ${point.x} ${point.y}`;
    }, '');
  }

  openMetric(metric: DashboardMetric): void {
    if (metric.link) void this.router.navigateByUrl(metric.link);
    else this.notify('Chưa có trang quản lý phòng học ảo.');
  }

  openAction(action: ActionItem): void {
    void this.router.navigateByUrl(action.link);
  }

  openAllActions(): void {
    const first = this.actions()[0];
    if (first) this.openAction(first);
  }

  openAllCourses(): void {
    void this.router.navigateByUrl('/courses');
  }

  openAllLogs(): void {
    void this.router.navigateByUrl('/system/audit');
  }

  chooseToday(): void {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    this.startDate.set(today); this.endDate.set(today);
  }

  private displayDate(value: string): string { const [year, month, day] = value.split('-'); return `${day}/${month}/${year}`; }
  chooseFilter(value: string): void { this.filter.set(value); }
  setHoveredBar(index: number | null): void { this.hoveredBar.set(index); }
  setLogColumnFilter(kind: 'account' | 'role' | 'action', values: string[]): void {
    if (kind === 'account') this.logAccountFilter.set(values);
    if (kind === 'role') this.logRoleFilter.set(values);
    if (kind === 'action') this.logActionFilter.set(values);
  }

  sortFor(key: DashboardLogColumn): string {
    const current = this.columnSort();
    return current?.column === key ? current.direction : '';
  }

  updateColumnSort(key: DashboardLogColumn, direction: string): void {
    const current = this.columnSort();
    this.columnSort.set(!direction || (current?.column === key && current.direction === direction)
      ? null
      : { column: key, direction: direction as 'asc' | 'desc' });
  }

  private sortValue(log: AuditLog, column: DashboardLogColumn): string | number {
    switch (column) {
      case 'account': return log.account;
      case 'role': return log.role;
      case 'action': return log.action;
    }
  }

  exportLogs(format: ExportFormat): void {
    downloadTable(format, 'nhat-ky-quan-tri', [
      ['Thời gian', 'Tài khoản', 'Role', 'Hành động', 'IP'],
      ...this.visibleLogs().map(log => [log.time, log.account, log.role, log.action, log.ip])
    ]);
  }

  money(value: number): string {
    return moneyLabel(value);
  }

  share(part: number, total: number): number {
    return total > 0 ? Number((part / total * 100).toFixed(1)) : 0;
  }

  private currentMonthRange(): { start: string; end: string } {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    const start = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    const end = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate())}`;
    return { start, end };
  }

  private currentYearRange(): { start: string; end: string } {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    const start = `${now.getFullYear()}-01-01`;
    const end = `${now.getFullYear()}-12-${pad(new Date(now.getFullYear(), 12, 0).getDate())}`;
    return { start, end };
  }
}
