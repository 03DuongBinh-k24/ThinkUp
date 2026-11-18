import { DecimalPipe } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild, inject, input, output, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { CommerceService } from '../../../../core/services/commerce.service';
import { CourseService } from '../../../../core/services/course.service';
import { ToastService } from '../../../../core/services/toast.service';
import { InstructorTriggerDirective } from '../../../../shared/directives/instructor-trigger.directive';
import { toSignal } from '@angular/core/rxjs-interop';
import { LucideClock3, LucideExternalLink, LucideShoppingCart, LucideStar, LucideUserRound, LucideX } from '@lucide/angular';

export type ThinkUpCornerDismissReason = 'not-relevant' | 'distracting' | 'already-seen' | 'too-frequent' | 'other';

@Component({
  selector: 'app-thinkup-corner',
  standalone: true,
  imports: [DecimalPipe, RouterLink, InstructorTriggerDirective, LucideClock3, LucideExternalLink, LucideShoppingCart, LucideStar, LucideUserRound, LucideX],
  templateUrl: './thinkup-corner.component.html',
  styleUrls: ['../room-glass.css', './thinkup-corner.component.css', './thinkup-corner-overrides.css'],
})
export class ThinkUpCornerComponent {
  readonly position = input.required<{ x: number; y: number }>();
  readonly scale = input(1);
  readonly draggable = input(false);
  readonly dark = input(false);
  readonly theme = input('');
  readonly courseId = '73';
  readonly course = toSignal(inject(CourseService).getCourseDetail(this.courseId).pipe(catchError(() => of(null))));
  readonly addingToCart = signal(false);
  private readonly commerce = inject(CommerceService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  addToCart(): void {
    if (this.addingToCart()) return;
    this.addingToCart.set(true);
    this.commerce.addToCart(this.courseId).pipe(finalize(() => this.addingToCart.set(false))).subscribe({
      next: ({ data, added }) => {
        if (!data.some(item => item.id === this.courseId)) {
          this.toast.showToast({ type: 'error', message: 'Không tìm thấy khóa học trong giỏ hàng.' });
          return;
        }
        this.toast.showToast({
          type: added ? 'success' : 'info',
          message: added ? 'Đã thêm khóa học vào giỏ hàng.' : 'Khóa học đã có trong giỏ hàng.',
          action: {
            label: 'Xem giỏ hàng',
            run: () => {
              const url = this.router.serializeUrl(this.router.createUrlTree(['/main/cart']));
              window.open(url, '_blank', 'noopener');
            },
          },
        });
      },
      error: () => this.toast.showToast({ type: 'error', message: 'Không thêm được khóa học vào giỏ hàng.' }),
    });
  }
  readonly dismissed = output<ThinkUpCornerDismissReason>();
  readonly positionChange = output<{ x: number; y: number }>();
  @ViewChild('dismissButton') private dismissButton?: ElementRef<HTMLButtonElement>;
  readonly expanded = signal(false);
  readonly surveyOpen = signal(false);
  readonly reason = signal<ThinkUpCornerDismissReason | ''>('');
  readonly showReasonError = signal(false);
  private drag?: { pointerId: number; startX: number; startY: number; originX: number; originY: number };
  private dragged = false;

  @HostListener('document:keydown.escape')
  closeWithEscape(): void { if (this.surveyOpen()) this.keepCorner(); }

  openCorner(): void {
    if (this.dragged) { this.dragged = false; return; }
    if (!this.surveyOpen()) this.expanded.update(value => !value);
  }

  openDismissSurvey(event: Event): void {
    event.stopPropagation();
    this.expanded.set(false);
    this.surveyOpen.set(true);
    queueMicrotask(() => this.dismissButton?.nativeElement.focus());
  }

  keepCorner(event?: Event): void {
    event?.stopPropagation();
    this.reason.set('');
    this.showReasonError.set(false);
    this.surveyOpen.set(false);
    queueMicrotask(() => this.dismissButton?.nativeElement.focus());
  }

  selectReason(reason: ThinkUpCornerDismissReason): void {
    this.reason.set(reason);
    this.showReasonError.set(false);
  }

  confirmDismiss(event: Event): void {
    event.stopPropagation();
    const reason = this.reason();
    if (!reason) {
      this.showReasonError.set(true);
      return;
    }
    this.dismissed.emit(reason);
  }

  onCardKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); this.openCorner(); }
  }

  startDrag(event: PointerEvent): void {
    event.stopPropagation();
    const target = event.target as HTMLElement;
    if (!this.draggable() || event.button !== 0 || !event.isPrimary || this.surveyOpen() || target.closest('button, a, .instructor-trigger, input, textarea, select, label')) return;
    event.preventDefault();
    const current = this.position();
    this.drag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: current.x, originY: current.y };
    this.dragged = false;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  @HostListener('document:pointermove', ['$event'])
  moveDrag(event: PointerEvent): void {
    if (!this.drag || this.drag.pointerId !== event.pointerId) return;
    const scale = Math.max(this.scale(), 0.1);
    const dx = (event.clientX - this.drag.startX) / scale;
    const dy = (event.clientY - this.drag.startY) / scale;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.dragged = true;
    this.positionChange.emit({ x: Math.max(8, this.drag.originX + dx), y: Math.max(72, this.drag.originY + dy) });
  }

  @HostListener('document:pointerup', ['$event'])
  endDrag(event: PointerEvent): void {
    if (this.drag?.pointerId === event.pointerId) this.drag = undefined;
  }
}
