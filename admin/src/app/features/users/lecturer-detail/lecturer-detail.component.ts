import { HttpClient } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { downloadPrivateFile } from '../../../shared/utils/api-export';
import { UserModalComponent } from '../components/user-modal/user-modal.component';
import { UserToastComponent } from '../components/user-toast/user-toast.component';
import { LECTURER_STATUS_LABELS, LECTURER_STATUS_TONE } from '../models/user-management.labels';
import { Lecturer, LecturerDocument } from '../models/user-management.models';
import { UserManagementService } from '../services/user-management.service';
import { UserToastService } from '../services/user-toast.service';
import { formatCount, formatCurrency, formatDate, formatRevenueShort } from '../user-management.utils';

type DetailModal = 'reject' | 'documents';

interface DocumentOption {
  key: string;
  label: string;
  state: string;
  stateLabel: string;
  tone: string;
  downloadUrl?: string;
}

/**
 * Danh sách giấy tờ mặc định khi hồ sơ chưa có tài liệu nào.
 * `documentKeys` của API là chuỗi tự do (≤ 80 ký tự), backend không có enum — dùng đúng các key
 * nghiệp vụ đang được BA mô tả để yêu cầu bổ sung có ý nghĩa.
 */
const DEFAULT_DOCUMENT_OPTIONS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'signed_contract', label: 'Hợp đồng đã ký' },
  { key: 'tax', label: 'Xác nhận mã số thuế' },
  { key: 'cccd', label: 'Căn cước công dân' },
  { key: 'degree', label: 'Bằng cấp / chứng chỉ' }
];

const DOC_STATE_LABEL: Record<string, string> = {
  missing: 'Chưa nộp',
  invalid: 'Không hợp lệ',
  pending: 'Chờ xác minh',
  'not-started': 'Chưa bắt đầu'
};

const DOC_STATE_TONE: Record<string, string> = {
  missing: 'missing',
  invalid: 'invalid',
  pending: 'pending',
  'not-started': 'not-started'
};

/**
 * Trang "Thẩm định hồ sơ giảng viên" — frame Figma 5224:17686.
 * Quyết định duyệt / từ chối / yêu cầu bổ sung hồ sơ của một giảng viên.
 */
@Component({
  selector: 'app-lecturer-detail',
  standalone: true,
  imports: [RouterLink, UserModalComponent, UserToastComponent],
  templateUrl: './lecturer-detail.component.html',
  styleUrls: ['../user-page.css', '../user-modal-content.css', './lecturer-detail.component.css']
})
export class LecturerDetailComponent {
  private readonly data = inject(UserManagementService);
  private readonly toastService = inject(UserToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  readonly statusLabels = LECTURER_STATUS_LABELS;
  readonly statusTone = LECTURER_STATUS_TONE;
  readonly formatCurrency = formatCurrency;
  readonly formatCount = formatCount;
  readonly formatRevenueShort = formatRevenueShort;
  readonly formatDate = formatDate;

  readonly lecturerId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: '' }
  );

  readonly lecturer = computed<Lecturer | undefined>(() => this.data.lecturerDetail(this.lecturerId()));

  readonly modal = signal<DetailModal | null>(null);
  readonly saving = signal(false);
  readonly loadError = signal<string | null>(null);

  // Từ chối hồ sơ
  readonly rejectReason = signal('');
  readonly rejectSendEmail = signal(true);

  // Yêu cầu bổ sung
  readonly documentSelection = signal<ReadonlyArray<string>>(['tax']);
  readonly documentGuidance = signal('');
  readonly documentDeadline = signal(7);
  readonly documentSendEmail = signal(true);

  readonly documentOptions = computed<DocumentOption[]>(() => {
    const items = this.lecturer()?.documents ?? [];
    if (!items.length) {
      return DEFAULT_DOCUMENT_OPTIONS.map((doc) => ({
        key: doc.key,
        label: doc.label,
        state: 'not-started',
        stateLabel: DOC_STATE_LABEL['not-started'],
        tone: DOC_STATE_TONE['not-started']
      }));
    }
    return items.map((doc) => ({
      key: doc.key,
      label: doc.label,
      state: doc.state,
      stateLabel: DOC_STATE_LABEL[doc.state] ?? doc.state,
      tone: DOC_STATE_TONE[doc.state] ?? 'missing',
      downloadUrl: doc.downloadUrl
    }));
  });

  constructor() {
    // Hồ sơ chi tiết nằm ở endpoint riêng; danh sách chỉ có dữ liệu rút gọn.
    effect(() => {
      const id = this.lecturerId();
      if (!id) return;
      void this.loadDetail(id);
    });
  }

  /** Chỉ hồ sơ đang chờ thẩm định / chờ bổ sung mới được ra quyết định. */
  readonly canDecide = computed(() => {
    const status = this.lecturer()?.status;
    return status === 'pending-review' || status === 'pending-docs';
  });

  readonly canReject = computed(() => this.rejectReason().trim().length >= 20);
  readonly canRequestDocuments = computed(() =>
    this.documentSelection().length > 0 && this.documentGuidance().trim().length >= 20);

  openReject(): void {
    this.rejectReason.set('');
    this.rejectSendEmail.set(true);
    this.modal.set('reject');
  }

  openDocuments(): void {
    this.documentSelection.set(this.documentOptions().filter((doc) => doc.state !== 'pending').map((doc) => doc.key).slice(0, 1));
    this.documentGuidance.set('');
    this.documentDeadline.set(7);
    this.documentSendEmail.set(true);
    this.modal.set('documents');
  }

  closeModal(): void {
    this.modal.set(null);
  }

  approve(): void {
    const lecturer = this.lecturer();
    if (!lecturer || !this.canDecide() || this.saving()) return;
    this.saving.set(true);
    void this.data.approveLecturer(lecturer.id)
      .then(() => {
        this.notify(`Đã duyệt chuyên môn cho ${lecturer.name} và chuyển sang bước pháp lý.`);
        void this.router.navigate(['/users/lecturers']);
      })
      .catch((error: unknown) => this.notify(error instanceof Error ? error.message : 'Không duyệt được hồ sơ.'))
      .finally(() => this.saving.set(false));
  }

  submitReject(): void {
    const lecturer = this.lecturer();
    if (!lecturer || !this.canReject() || this.saving()) return;
    this.saving.set(true);
    void this.data.rejectLecturer(lecturer.id, {
      reason: this.rejectReason().trim(),
      sendEmail: this.rejectSendEmail()
    })
      .then(() => {
        this.modal.set(null);
        this.notify(`Đã từ chối hồ sơ ${lecturer.name}.`);
        void this.router.navigate(['/users/lecturers']);
      })
      .catch((error: unknown) => this.notify(error instanceof Error ? error.message : 'Không từ chối được hồ sơ.'))
      .finally(() => this.saving.set(false));
  }

  submitDocuments(): void {
    const lecturer = this.lecturer();
    if (!lecturer || !this.canRequestDocuments() || this.saving()) return;
    this.saving.set(true);
    void this.data.requestDocuments(lecturer.id, {
      documentKeys: this.documentSelection(),
      guidance: this.documentGuidance().trim(),
      deadlineDays: this.documentDeadline(),
      sendEmail: this.documentSendEmail()
    })
      .then(() => {
        this.modal.set(null);
        this.notify(`Đã gửi yêu cầu bổ sung hồ sơ tới ${lecturer.name}.`);
        void this.router.navigate(['/users/lecturers']);
      })
      .catch((error: unknown) => this.notify(error instanceof Error ? error.message : 'Không gửi được yêu cầu bổ sung.'))
      .finally(() => this.saving.set(false));
  }

  downloadCv(lecturer: Lecturer): void {
    const cv = lecturer.cv;
    if (!cv) return;
    const document = lecturer.documents.find((doc) => doc.filename === cv.fileName || doc.label === cv.fileName);
    if (!document?.downloadUrl) {
      this.notify('Tài liệu này chưa có đường dẫn tải xuống hợp lệ (hoặc vai trò của bạn không được tải).');
      return;
    }
    void downloadPrivateFile(this.http, document.downloadUrl, cv.fileName)
      .catch((error: unknown) => this.notify(error instanceof Error ? error.message : 'Không tải được tài liệu.'));
  }

  retryLoad(): void {
    void this.data.reload();
    void this.loadDetail(this.lecturerId());
  }

  private async loadDetail(id: string): Promise<void> {
    this.loadError.set(null);
    try {
      await this.data.loadLecturerDetail(id);
    } catch (error) {
      this.loadError.set(error instanceof Error ? error.message : 'Không tải được hồ sơ giảng viên.');
    }
  }

  toggleDocument(key: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.documentSelection.update((current) => (checked
      ? [...current, key]
      : current.filter((item) => item !== key)));
  }

  isDocumentSelected(key: string): boolean {
    return this.documentSelection().includes(key);
  }

  setRejectReason(event: Event): void {
    this.rejectReason.set((event.target as HTMLTextAreaElement).value);
  }

  setDocumentGuidance(event: Event): void {
    this.documentGuidance.set((event.target as HTMLTextAreaElement).value);
  }

  notify(message: string): void {
    this.toastService.show(message);
  }
}
