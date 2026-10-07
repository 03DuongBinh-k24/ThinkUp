import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Achievement } from '../../../../../core/models/profile.model';

@Component({
  selector: 'app-achievements-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="min-w-0 rounded-[20px] border border-[#E0E5EB] bg-white p-6 xl:h-[232px] xl:p-[25px]">
      <div class="flex items-center justify-between">
        <h2 class="text-[18px] font-bold leading-7 text-[#071123]">Thành tích & Huy hiệu</h2>
        <span class="text-[14px] leading-5 text-[#596475] font-medium">Đã đạt {{ total }} huy hiệu</span>
      </div>

      <div class="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        @for (item of items; track item.key) {
          <div class="flex min-h-[134px] flex-col items-center text-center p-2 rounded-xl transition hover:bg-[#F8FAFC]">
            <span class="mt-2 grid h-16 w-16 place-items-center rounded-2xl shadow-sm" [ngClass]="getToneClass(item.tone)">
              @switch (item.key) {
                @case ('excellent') {
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
                }
                @case ('python') {
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                }
                @case ('speed') {
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>
                }
                @case ('streak') {
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
                }
                @case ('complete') {
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                }
                @case ('graduate') {
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                }
                @default {
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/></svg>
                }
              }
            </span>
            <strong class="mt-2 text-[12px] font-bold leading-[16px] text-[#071123]">{{ item.title }}</strong>
            <span class="mt-0.5 text-[11px] leading-[15px] text-[#596475]">{{ item.subtitle }}</span>
          </div>
        }
      </div>
    </section>
  `,
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
