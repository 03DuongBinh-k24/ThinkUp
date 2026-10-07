import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LearningStat } from '../../../../../core/models/profile.model';

@Component({
  selector: 'app-learning-stats-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="min-w-0 rounded-[20px] border border-[#E0E5EB] bg-white p-6 xl:h-[469px] xl:p-[25px] flex flex-col justify-between">
      <div>
        <h2 class="text-[18px] font-bold leading-7 text-[#071123]">Thống kê học tập</h2>
        <div class="mt-5 grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
          @for (item of stats; track item.key) {
            <div class="flex h-12 items-center gap-3">
              <span class="grid h-12 w-12 shrink-0 place-items-center rounded-xl" [ngClass]="getToneClass(item.tone)">
                @switch (item.key) {
                  @case ('enrolled') {
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                  }
                  @case ('completed') {
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                  }
                  @case ('streak') {
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
                  }
                  @case ('awards') {
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
                  }
                  @default {
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
                  }
                }
              </span>
              <span class="min-w-0">
                <strong class="block text-[24px] font-bold leading-[30px] text-[#071123]">{{ item.value }}</strong>
                <span class="block text-[12px] leading-4 text-[#596475]">{{ item.label }}</span>
              </span>
            </div>
          }
        </div>
      </div>

      <!-- Roadmap Section -->
      <div class="mt-5 border-t border-[#E0E5EB] pt-6">
        <div class="flex items-center justify-between text-[14px] leading-5">
          <span class="text-[#071123] font-medium">Tiến độ lộ trình</span>
          <strong class="font-bold text-[#4A79FF]">{{ roadmapProgress }}%</strong>
        </div>
        <div class="mt-2 h-2 max-w-[602px] overflow-hidden rounded-full bg-[#EDEFFE]">
          <div class="h-full rounded-full bg-[#4E61F6] transition-all duration-500" [style.width.%]="roadmapProgress"></div>
        </div>
        <p class="mt-2 text-[12px] leading-4 text-[#596475]">Tiếp tục học để hoàn thành lộ trình chuyên sâu của bạn.</p>
        <a routerLink="/main/roadmap" class="mt-3 flex h-9 max-w-[603px] items-center justify-center rounded-full bg-[#4A79FF] text-[13px] font-medium leading-4 text-white shadow-sm transition hover:bg-[#3563E9]">
          Xem lộ trình học
        </a>
      </div>
    </section>
  `,
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
