import { Component, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideCrown, LucideExternalLink, LucideX } from '@lucide/angular';
import { RoomParticipant } from '../../services/study-room.service';

@Component({
  selector: 'app-participant-popover',
  standalone: true,
  imports: [RouterLink, LucideCrown, LucideExternalLink, LucideX],
  templateUrl: './participant-popover.component.html',
  styleUrl: './participant-popover.component.css',
})
export class ParticipantPopoverComponent {
  readonly participant = input.required<RoomParticipant>();
  readonly color = input('#714cb6');
  readonly course = input('Study room');
  readonly progress = input(0);
  readonly avatarFailed = signal(false);
  readonly close = output<void>();
}
