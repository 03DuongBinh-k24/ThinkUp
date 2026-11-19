import { Component, computed, inject, input, output, signal } from '@angular/core';
import { AdminDialogComponent } from '../../../../shared/components/admin-dialog/admin-dialog.component';
import { Course, CourseFinance } from '../../models/course.models';
import { CourseStore } from '../../services/course.store';
import {
  COURSE_STATUS_LABELS, COURSE_STATUS_TONE, formatCurrency, formatDate, formatDateTime, formatNumber, LEVEL_TONE
} from '../../course-utils';

type DetailTab = 'overview' | 'content' | 'learners' | 'finance';
type FinanceState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-course-detail-dialog',
  standalone: true,
  imports: [AdminDialogComponent],
  templateUrl: './course-detail-dialog.component.html',
  styleUrls: ['../../courses-page.css', './course-detail-dialog.component.css']
})
export class CourseDetailDialogComponent {
  private readonly store = inject(CourseStore);

  readonly course = input.required<Course>();
  readonly closed = output<void>();

  readonly tab = signal<DetailTab>('overview');
  readonly tabs: Array<{ id: DetailTab; label: string }> = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'content', label: 'Nội dung học' },
    { id: 'learners', label: 'Học viên' },
    { id: 'finance', label: 'Đối soát tài chính' }
  ];

  readonly financeState = signal<FinanceState>('loading');
  readonly financeData = signal<CourseFinance | null>(null);
  readonly financeError = signal('');
  /** Báo cáo tài chính đã chuẩn hoá để hiển thị; `null` khi đang tải hoặc lỗi. */
  readonly finance = computed(() => this.financeData());

  readonly statusLabel = computed(() => COURSE_STATUS_LABELS[this.course().status]);
  readonly statusTone = computed(() => COURSE_STATUS_TONE[this.course().status]);
  readonly levelTone = computed(() => LEVEL_TONE[this.course().level]);
  readonly learners = computed(() => this.course().learners);

  constructor() {
    // TODO(api-contract): API chỉ trả báo cáo cho khóa đã duyệt và đang bán/ẩn; dialog tự xử lý trạng thái này.
    void this.loadFinance();
  }

  private async loadFinance(): Promise<void> {
    this.financeState.set('loading');
    try {
      const result = await this.store.getCourseFinance(this.course().id);
      this.financeData.set(result);
      this.financeState.set(result ? 'ready' : 'error');
      if (!result) this.financeError.set('Khóa học chưa có báo cáo tài chính (cần đã duyệt và đang bán hoặc tạm ẩn).');
    } catch (error) {
      this.financeData.set(null);
      this.financeError.set(error instanceof Error ? error.message : 'Không tải được báo cáo tài chính. Vui lòng thử lại.');
      this.financeState.set('error');
    }
  }

  setTab(id: DetailTab): void {
    this.tab.set(id);
  }

  close(): void {
    this.closed.emit();
  }

  money = formatCurrency;
  number = formatNumber;
  date = formatDate;
  dateTime = formatDateTime;
}
