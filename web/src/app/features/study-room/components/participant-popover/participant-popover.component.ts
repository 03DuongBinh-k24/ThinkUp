import { Component, input, output, signal } from '@angular/core';
import { LucideFlag, LucideLogOut, LucideX } from '@lucide/angular';
import { RoomParticipant } from '../../services/study-room.service';

@Component({
  selector: 'app-participant-popover',
  standalone: true,
  imports: [LucideFlag, LucideLogOut, LucideX],
  templateUrl: './participant-popover.component.html',
  styleUrl: './participant-popover.component.css',
})
export class ParticipantPopoverComponent {
  readonly participant = input.required<RoomParticipant>();
  readonly color = input('#714cb6');
  readonly canRemove = input(false);
  readonly avatarFailed = signal(false);
  readonly close = output<void>();
  readonly report = output<void>();
  readonly remove = output<void>();
}
