import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Achievement } from '../../../../../core/models/profile.model';

@Component({
  selector: 'app-achievements-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './achievements-card.component.html',
  styleUrl: './achievements-card.component.css'
})
export class AchievementsCardComponent {
  @Input() items: Achievement[] = [];
  @Input() total = 12;

  getToneClass(tone: string): string {
    switch (tone) {
      case 'amber':
        return 'bg-[#FFF8DB] text-[#F59E0B]';
      case 'blue':
        return 'bg-[#EAF1FF] text-[#4A79FF]';
      case 'sky':
        return 'bg-[#F0F9FF] text-[#0088E8]';
      case 'red':
        return 'bg-[#FFF0F0] text-[#EF4444]';
      case 'green':
        return 'bg-[#C9F4D7] text-[#169B5B]';
      case 'indigo':
        return 'bg-[#EEF1FF] text-[#4A79FF]';
      default:
        return 'bg-[#EAF1FF] text-[#4A79FF]';
    }
  }
}
