import { Component, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideBookOpen, LucideExternalLink, LucideSparkles, LucideX } from '@lucide/angular';

export type ThinkUpCornerDismissReason = 'not-relevant' | 'distracting' | 'already-seen' | 'other';

@Component({
  selector: 'app-thinkup-corner',
  standalone: true,
  imports: [RouterLink, LucideBookOpen, LucideExternalLink, LucideSparkles, LucideX],
  templateUrl: './thinkup-corner.component.html',
  styleUrl: './thinkup-corner.component.css',
})
export class ThinkUpCornerComponent {
  readonly position = input.required<{ x: number; y: number }>();
  readonly dismissed = output<ThinkUpCornerDismissReason>();
  readonly expanded = signal(false);
  readonly surveyOpen = signal(false);
  readonly reason = signal<ThinkUpCornerDismissReason | ''>('');
  readonly showReasonError = signal(false);

  openCorner(): void {
    if (!this.surveyOpen()) this.expanded.update(value => !value);
  }

  openDismissSurvey(event: Event): void {
    event.stopPropagation();
    this.expanded.set(false);
    this.surveyOpen.set(true);
  }

  keepCorner(event: Event): void {
    event.stopPropagation();
    this.reason.set('');
    this.showReasonError.set(false);
    this.surveyOpen.set(false);
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
}
