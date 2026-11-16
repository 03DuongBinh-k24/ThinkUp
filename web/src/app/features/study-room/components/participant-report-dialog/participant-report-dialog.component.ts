import { AfterViewInit, Component, ElementRef, HostListener, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideFlag, LucideX } from '@lucide/angular';
import { RoomParticipant } from '../../services/study-room.service';

export interface ParticipantReportSubmission {
  participantId: string;
  reason: string;
  detail: string;
}

@Component({
  selector: 'app-participant-report-dialog',
  standalone: true,
  imports: [FormsModule, LucideFlag, LucideX],
  templateUrl: './participant-report-dialog.component.html',
  styleUrl: './participant-report-dialog.component.css',
})
export class ParticipantReportDialogComponent implements AfterViewInit {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  private readonly previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  readonly participant = input.required<RoomParticipant>();
  readonly closed = output<void>();
  readonly submitted = output<ParticipantReportSubmission>();
  readonly reason = signal('');
  readonly detail = signal('');
  readonly error = signal('');

  readonly reasons = [
    { id: 'harassment', label: 'Quấy rối hoặc xúc phạm' },
    { id: 'inappropriate', label: 'Hành vi hoặc nội dung không phù hợp' },
    { id: 'spam', label: 'Spam hoặc quảng cáo' },
    { id: 'impersonation', label: 'Giả mạo người khác' },
    { id: 'other', label: 'Lý do khác' },
  ] as const;

  ngAfterViewInit(): void {
    this.closeButton()?.nativeElement.focus();
  }

  @HostListener('document:keydown.escape')
  close(): void {
    this.closed.emit();
    window.setTimeout(() => this.previousFocus?.focus());
  }

  @HostListener('document:keydown.tab', ['$event'])
  trapFocus(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    const focusable = Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled])'
    )).filter(element => element.getClientRects().length > 0);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (keyboardEvent.shiftKey && document.activeElement === first) {
      keyboardEvent.preventDefault();
      last.focus();
    } else if (!keyboardEvent.shiftKey && document.activeElement === last) {
      keyboardEvent.preventDefault();
      first.focus();
    }
  }

  selectReason(reason: string): void {
    this.reason.set(reason);
    this.error.set('');
  }

  updateDetail(detail: string): void {
    this.detail.set(detail);
    this.error.set('');
  }

  submit(): void {
    if (!this.reason()) {
      this.error.set('Vui lòng chọn lý do báo cáo.');
      return;
    }
    const detail = this.detail().trim();
    if (this.reason() === 'other' && detail.length < 10) {
      this.error.set('Vui lòng mô tả lý do khác bằng ít nhất 10 ký tự.');
      return;
    }
    this.submitted.emit({ participantId: this.participant().userId, reason: this.reason(), detail });
  }
}
