import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { RoadmapService } from '../services/roadmap.service';
import { AuthService } from '../../../core/services/auth.service';
import { RoadmapMetaItem } from '../models/roadmap.model';

@Component({
  selector: 'app-roadmap-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './roadmap-list.component.html',
  styleUrl: './roadmap-list.component.css'
})
export class RoadmapListComponent {
  private readonly roadmapService = inject(RoadmapService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly searchKeyword = signal<string>('');
  readonly feedbackMessage = signal<string>('');
  readonly feedbackType = signal<'success' | 'warning'>('success');

  readonly allRoadmaps = this.roadmapService.roadmapsList;
  readonly totalRoadmaps = computed(() => this.allRoadmaps().length);

  readonly filteredRoadmaps = computed(() => {
    const keyword = this.searchKeyword().trim().toLowerCase();
    if (!keyword) return this.allRoadmaps();
    return this.allRoadmaps().filter((item) =>
      item.title.toLowerCase().includes(keyword) ||
      item.desc.toLowerCase().includes(keyword) ||
      item.shortCode.toLowerCase().includes(keyword)
    );
  });

  isEnrolled(roadmapId: string): boolean {
    return this.roadmapService.isEnrolled(roadmapId);
  }

  handleToggleEnroll(roadmap: RoadmapMetaItem): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/learning/roadmap' } });
      return;
    }

    if (this.isEnrolled(roadmap.id)) {
      this.roadmapService.unenrollRoadmap(roadmap.id);
      this.showFeedback('Đã hủy chọn lộ trình học.', 'success');
      return;
    }

    const result = this.roadmapService.enrollRoadmap(roadmap.id);
    if (result.success) {
      this.showFeedback(result.message, 'success');
    } else {
      this.showFeedback(result.message, 'warning');
    }
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchKeyword.set(target.value);
  }

  clearSearch(): void {
    this.searchKeyword.set('');
  }

  private showFeedback(message: string, type: 'success' | 'warning'): void {
    this.feedbackMessage.set(message);
    this.feedbackType.set(type);
    setTimeout(() => {
      if (this.feedbackMessage() === message) {
        this.feedbackMessage.set('');
      }
    }, 4000);
  }

  dismissFeedback(): void {
    this.feedbackMessage.set('');
  }
}
