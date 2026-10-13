import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideCalendarDays, LucideChevronDown } from '@lucide/angular';
import { CommerceService } from '../../../core/services/commerce.service';
import { TransactionRow } from '../../../core/models/commerce.model';
import { DateCalendarComponent } from './components/date-calendar/date-calendar.component';

type StatusFilter = 'all' | 'success' | 'failed';

@Component({
  selector: 'app-purchase-history',
  standalone: true,
  imports: [RouterLink, LucideCalendarDays, LucideChevronDown, DateCalendarComponent],
  templateUrl: './purchase-history.component.html',
  styleUrl: './purchase-history.component.css',
})
export class PurchaseHistoryComponent {
  private readonly commerce = inject(CommerceService);
  readonly query = signal('');
  readonly selectedStatus = signal<StatusFilter>('all');
  readonly selectedDate = signal('Tất cả thời gian');
  readonly statusOpen = signal(false);
  readonly dateOpen = signal(false);
  readonly customRangeOpen = signal(false);
  readonly activeCalendar = signal<'from' | 'to' | null>(null);
  readonly sortAscending = signal(false);
  readonly page = signal(1);
  readonly pageSize = 5;
  readonly statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'success', label: 'Thành công' },
    { value: 'failed', label: 'Thất bại' },
  ];
  readonly datePresets = ['Hôm nay', 'Hôm qua', '7 ngày qua', '30 ngày qua', 'Tháng này', 'Tháng trước', 'Tùy chọn khác'];
  readonly customFrom = signal('');
  readonly customTo = signal('');
  readonly appliedCustomRange = signal<{ from: string; to: string } | null>(null);
  readonly invalidRange = computed(() => !!this.customFrom() && !!this.customTo() && this.customFrom() > this.customTo());
  readonly dateButtonLabel = computed(() => {
    const range = this.appliedCustomRange();
    return this.selectedDate() === 'Tùy chọn khác' && range
      ? `${this.formatDisplayDate(range.from)} - ${this.formatDisplayDate(range.to)}`
      : this.selectedDate();
  });
  readonly transactions = this.commerce.transactions;
  readonly successful = computed(() => this.transactions().filter(row => row.status === 'success'));
  readonly spending = computed(() => `${new Intl.NumberFormat('vi-VN').format(this.successful().reduce((sum, row) => sum + Number(row.amount.replace(/\D/g, '')), 0))}đ`);
  readonly courseCount = computed(() => this.successful().reduce((sum, row) => sum + row.courses.length, 0));
  readonly filtered = computed(() => {
    const query = this.query().trim().toLocaleLowerCase('vi-VN');
    const status = this.selectedStatus();
    const preset = this.selectedDate();
    const range = this.appliedCustomRange();
    return this.transactions().filter(row => {
      if (status !== 'all' && row.status !== status) return false;
      if (query && ![row.id, row.paymentMethod, row.amount, row.date, ...row.courses].join(' ').toLocaleLowerCase('vi-VN').includes(query)) return false;
      if (preset === 'Tất cả thời gian') return true;
      const date = this.dateOf(row);
      if (preset === 'Tùy chọn khác') {
        if (!range) return true;
        const endExclusive = new Date(`${range.to}T00:00:00`);
        endExclusive.setDate(endExclusive.getDate() + 1);
        return date >= new Date(`${range.from}T00:00:00`) && date < endExclusive;
      }
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const tomorrow = new Date(start);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (preset === 'Hôm nay') return date >= start && date < tomorrow;
      if (preset === 'Hôm qua') { const from = new Date(start); from.setDate(from.getDate() - 1); return date >= from && date < start; }
      if (preset === '7 ngày qua' || preset === '30 ngày qua') { const from = new Date(start); from.setDate(from.getDate() - (preset.startsWith('7') ? 6 : 29)); return date >= from && date < tomorrow; }
      if (preset === 'Tháng này') return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
      if (preset === 'Tháng trước') { const previous = new Date(today.getFullYear(), today.getMonth() - 1, 1); return date.getMonth() === previous.getMonth() && date.getFullYear() === previous.getFullYear(); }
      return true;
    }).sort((a, b) => (this.sortAscending() ? 1 : -1) * (this.dateOf(a).getTime() - this.dateOf(b).getTime()));
  });
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  readonly visible = computed(() => this.filtered().slice((Math.min(this.page(), this.pageCount()) - 1) * this.pageSize, Math.min(this.page(), this.pageCount()) * this.pageSize));
  readonly visibleStart = computed(() => this.filtered().length ? (Math.min(this.page(), this.pageCount()) - 1) * this.pageSize + 1 : 0);
  readonly visibleEnd = computed(() => Math.min(Math.min(this.page(), this.pageCount()) * this.pageSize, this.filtered().length));
  readonly pages = computed(() => Array.from({ length: this.pageCount() }, (_, index) => index + 1));

  setQuery(value: string): void { this.query.set(value); this.page.set(1); }
  setStatus(value: StatusFilter): void { this.selectedStatus.set(value); this.statusOpen.set(false); this.page.set(1); }
  setDate(value: string): void {
    if (value === 'Tùy chọn khác') {
      this.customRangeOpen.update(open => !open);
      this.activeCalendar.set(null);
      return;
    }
    this.selectedDate.set(this.selectedDate() === value ? 'Tất cả thời gian' : value);
    this.dateOpen.set(false);
    this.customRangeOpen.set(false);
    this.activeCalendar.set(null);
    this.page.set(1);
  }
  toggleCalendar(field: 'from' | 'to'): void {
    this.activeCalendar.set(this.activeCalendar() === field ? null : field);
  }
  setCustomDate(field: 'from' | 'to', value: string): void {
    (field === 'from' ? this.customFrom : this.customTo).set(value);
    this.activeCalendar.set(null);
  }
  cancelCustomDate(): void {
    const applied = this.appliedCustomRange();
    this.customFrom.set(applied?.from ?? '');
    this.customTo.set(applied?.to ?? '');
    this.activeCalendar.set(null);
    this.dateOpen.set(false);
    this.customRangeOpen.set(false);
  }
  applyCustomDate(): void {
    if (!this.customFrom() || !this.customTo() || this.invalidRange()) return;
    this.appliedCustomRange.set({ from: this.customFrom(), to: this.customTo() });
    this.selectedDate.set('Tùy chọn khác');
    this.activeCalendar.set(null);
    this.dateOpen.set(false);
    this.page.set(1);
  }
  formatDisplayDate(value: string): string {
    if (!value) return 'dd/mm/yyyy';
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }
  @HostListener('document:keydown.escape')
  closeCalendarOnEscape(): void {
    if (this.activeCalendar()) this.activeCalendar.set(null);
    else if (this.dateOpen()) this.dateOpen.set(false);
  }
  setPage(value: number): void { this.page.set(Math.max(1, Math.min(value, this.pageCount()))); }
  statusLabel(): string { return this.statusOptions.find(option => option.value === this.selectedStatus())?.label ?? this.statusOptions[0].label; }
  private dateOf(row: TransactionRow): Date {
    if (row.timestamp) return new Date(row.timestamp);
    const [day, month, year] = row.date.split('/').map(Number);
    return new Date(year, month - 1, day);
  }
}
