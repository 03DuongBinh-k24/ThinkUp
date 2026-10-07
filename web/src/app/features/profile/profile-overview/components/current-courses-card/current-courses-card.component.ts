import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CurrentCourse } from '../../../../../core/models/profile.model';

@Component({
  selector: 'app-current-courses-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="min-w-0 rounded-[20px] border border-[#E0E5EB] bg-white p-6 xl:h-[469px] xl:p-[25px] flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between">
          <h2 class="text-[18px] font-bold leading-7 text-[#071123]">Khóa học đang tiến hành</h2>
          <a routerLink="/main/courses" class="rounded-full px-3 py-1.5 text-[13px] font-semibold leading-4 text-[#4A79FF] hover:bg-[#F0F4FF] transition">
            Xem tất cả
          </a>
        </div>

        <ul class="mt-4 space-y-3 xl:pl-4">
          @for (course of courses; track course.id) {
            <li class="flex min-h-[105px] items-center gap-4 rounded-xl p-2.5 transition hover:bg-[#FAFBFF] border border-transparent hover:border-[#E0E5EB]/60">
              <img [src]="course.image" [alt]="course.title" class="h-16 w-16 shrink-0 rounded-xl object-cover border border-[#E2E8F0]" />
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2 text-[10px] leading-[14px]">
                  <span class="rounded-full bg-[#FFF8DB] px-[9px] py-0.5 text-[#7A6525] font-medium shadow-sm">
                    {{ course.category }}
                  </span>
                  <span class="text-[12px] leading-4 text-[#596475]">GV: {{ course.instructor }}</span>
                </div>
                <p class="mt-1 truncate text-[14px] font-semibold leading-5 text-[#071123]" [title]="course.title">
                  {{ course.title }}
                </p>
                <div class="mt-1.5 flex items-center gap-3">
                  <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EDEFFE]">
                    <div class="h-full rounded-full bg-[#4A79FF] transition-all duration-300" [style.width.%]="course.progress"></div>
                  </div>
                  <span class="w-9 text-right text-[12px] font-semibold leading-4 text-[#4A79FF]">{{ course.progress }}%</span>
                </div>
                <p class="mt-1 truncate text-[11px] leading-[14px] text-[#596475]">{{ course.nextLesson }}</p>
              </div>
              <a [routerLink]="course.href" class="hidden h-8 shrink-0 items-center rounded-full bg-[#4A79FF] px-4 text-[12px] font-medium leading-4 text-white hover:bg-[#3563E9] transition 2xl:flex">
                Tiếp tục
              </a>
            </li>
          }
        </ul>
      </div>
    </section>
  `,
})
export class CurrentCoursesCardComponent {
  @Input() courses: CurrentCourse[] = [];
}
