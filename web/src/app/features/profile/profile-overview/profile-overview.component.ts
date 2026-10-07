import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileService } from '../../../core/services/profile.service';
import { ProfileHeroComponent } from './components/profile-hero/profile-hero.component';
import { LearningStatsCardComponent } from './components/learning-stats-card/learning-stats-card.component';
import { CurrentCoursesCardComponent } from './components/current-courses-card/current-courses-card.component';
import { AchievementsCardComponent } from './components/achievements-card/achievements-card.component';
import { RecentActivityCardComponent } from './components/recent-activity-card/recent-activity-card.component';

@Component({
  selector: 'app-profile-overview',
  standalone: true,
  imports: [
    CommonModule,
    ProfileHeroComponent,
    LearningStatsCardComponent,
    CurrentCoursesCardComponent,
    AchievementsCardComponent,
    RecentActivityCardComponent,
  ],
  template: `
    <div class="min-h-full bg-[#F9F9FF] text-[#071123] flex flex-col font-['Inter',sans-serif]">
      <!-- Main Profile Overview Body -->
      <main class="mx-auto flex w-full min-w-0 max-w-[1920px] flex-1 flex-col gap-6 overflow-x-hidden px-4 py-8 sm:px-6 lg:px-10 xl:px-16">
        <!-- 1. Hero Banner -->
        <app-profile-hero [profile]="profileService.profile()" />

        <!-- 2. Thống kê & Khóa học đang tiến hành (2 cột chuẩn tỉ lệ Figma 706fr : 998fr) -->
        <div class="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,706fr)_minmax(0,998fr)]">
          <app-learning-stats-card
            [stats]="profileService.learningStats()"
            [roadmapProgress]="profileService.roadmapProgress()"
          />
          <app-current-courses-card
            [courses]="profileService.currentCourses()"
          />
        </div>

        <!-- 3. Thành tích & Huy hiệu -->
        <app-achievements-card
          [items]="profileService.achievements()"
          [total]="profileService.totalAwards()"
        />

        <!-- 4. Hoạt động gần đây -->
        <app-recent-activity-card
          [activities]="profileService.recentActivities()"
        />
      </main>
    </div>
  `,
})
export class ProfileOverviewComponent implements OnInit {
  readonly profileService = inject(ProfileService);

  ngOnInit(): void {
    this.profileService.getProfileOverview().subscribe();
  }
}
