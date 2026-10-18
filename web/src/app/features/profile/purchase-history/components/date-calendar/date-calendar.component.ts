import { Component, computed, effect, input, output, signal } from '@angular/core';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';

interface CalendarDay {
  date: string;
  day: number;
  inMonth: boolean;
  today: boolean;
}

@Component({
  selector: 'app-date-calendar',
  standalone: true,
  imports: [LucideChevronLeft, LucideChevronRight],
  templateUrl: './date-calendar.component.html',
  styleUrl: './date-calendar.component.css',
})
export class DateCalendarComponent {
  readonly value = input('');
  readonly dateSelected = output<string>();
  readonly weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  readonly viewMonth = signal(this.startOfMonth(this.parseDate(this.value()) ?? new Date()));
  readonly monthLabel = computed(() => {
    const date = this.viewMonth();
    return `Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
  });
  readonly days = computed<CalendarDay[]>(() => {
    const first = this.viewMonth();
    const offset = (first.getDay() + 6) % 7;
    const today = this.toDateKey(new Date());
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(first.getFullYear(), first.getMonth(), index - offset + 1);
      const date = this.toDateKey(day);
      return { date, day: day.getDate(), inMonth: day.getMonth() === first.getMonth(), today: date === today };
    });
  });

  constructor() {
    effect(() => {
      const selected = this.parseDate(this.value());
      if (selected) this.viewMonth.set(this.startOfMonth(selected));
    });
  }

  changeMonth(delta: number): void {
    const current = this.viewMonth();
    this.viewMonth.set(new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  selectDate(value: string): void { this.dateSelected.emit(value); }
  selectToday(): void { this.dateSelected.emit(this.toDateKey(new Date())); }
  clearDate(): void { this.dateSelected.emit(''); }

  private parseDate(value: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(year, month - 1, day);
    return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day ? parsed : null;
  }

  private startOfMonth(date: Date): Date { return new Date(date.getFullYear(), date.getMonth(), 1); }
  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
