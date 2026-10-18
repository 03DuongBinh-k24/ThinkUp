import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecentActivity } from '../../../../../core/models/profile.model';

@Component({
  selector: 'app-recent-activity-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recent-activity-card.component.html',
  styleUrl: './recent-activity-card.component.css'
})
export class RecentActivityCardComponent {
  @Input() activities: RecentActivity[] = [];

  getToneClass(tone: string): string {
    switch (tone) {
      case 'amber':
        return 'bg-[#FFF8DB] text-[#F59E0B]';
      case 'green':
        return 'bg-[#C9F4D7] text-[#16A05D]';
      case 'sky':
        return 'bg-[#F0F9FF] text-[#0088E8]';
      case 'blue':
      default:
        return 'bg-[#F0F9FF] text-[#4A79FF]';
    }
  }
}
