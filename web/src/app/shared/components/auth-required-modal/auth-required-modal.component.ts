import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-auth-required-modal',
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: './auth-required-modal.component.html',
  styleUrl: './auth-required-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthRequiredModalComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private previousActiveElement: HTMLElement | null = null;

  readonly open = input<boolean>(false);
  readonly closed = output<void>();
  readonly returnUrl = input<string>('');
  readonly contextMessage = input<string>('');

  readonly dialogElement = viewChild<ElementRef<HTMLElement>>('dialogElement');
  readonly firstFocusable = viewChild<ElementRef<HTMLElement>>('firstFocusable');
  readonly lastFocusable = viewChild<ElementRef<HTMLElement>>('lastFocusable');

  readonly authQueryParams = computed(() => {
    const url = this.returnUrl();
    return url ? { returnUrl: url } : undefined;
  });

  constructor() {
    effect(() => {
      const isOpen = this.open();
      if (!isPlatformBrowser(this.platformId)) return;

      if (isOpen) {
        this.previousActiveElement = document.activeElement as HTMLElement | null;
        document.body.style.overflow = 'hidden';

        setTimeout(() => {
          const first = this.firstFocusable()?.nativeElement;
          if (first) {
            first.focus();
          } else {
            this.dialogElement()?.nativeElement?.focus();
          }
        }, 0);
      } else {
        document.body.style.overflow = '';
        if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
          this.previousActiveElement.focus();
          this.previousActiveElement = null;
        }
      }
    });
  }

  onClose(): void {
    this.closed.emit();
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.onClose();
      return;
    }

    if (event.key === 'Tab') {
      const first = this.firstFocusable()?.nativeElement;
      const last = this.lastFocusable()?.nativeElement;

      if (!first || !last) return;

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
  }
}
