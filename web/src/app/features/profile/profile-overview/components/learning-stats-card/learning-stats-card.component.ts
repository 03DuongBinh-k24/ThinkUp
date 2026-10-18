import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LearningStat } from '../../../../../core/models/profile.model';

@Component({
  selector: 'app-learning-stats-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './learning-stats-card.component.html',
  styleUrl: './learning-stats-card.component.css'
})
export class LearningStatsCardComponent {
  @Input() stats: LearningStat[] = [];
  @Input() roadmapProgress = 68;

  getToneClass(tone: string): string {
    switch (tone) {
      case 'green':
        return 'bg-[#C9F4D7] text-[#16A05D]';
      case 'orange':
        return 'bg-[#FFF0DE] text-[#F97316]';
      case 'sky':
        return 'bg-[#F0F9FF] text-[#F59E0B]';
      case 'blue':
      default:
        return 'bg-[#EAF1FF] text-[#4A79FF]';
    }
  }
}
