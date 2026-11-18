import { afterNextRender, Component, ElementRef, input, output, viewChild } from '@angular/core';

@Component({
  selector: 'app-remove-participant-dialog',
  templateUrl: './remove-participant-dialog.component.html',
  styleUrls: ['../room-glass.css', './remove-participant-dialog.component.css'],
})
export class RemoveParticipantDialogComponent {
  readonly name = input.required<string>();
  readonly dark = input(false);
  readonly selectedTheme = input('');
  readonly cancelled = output<void>();
  readonly confirmed = output<void>();
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  close(): void {
    this.dialog().nativeElement.close();
  }
}
