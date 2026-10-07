/**
 * ==============================================================================
 * MODULE: KHẢO SÁT ONBOARDING & BỘ LỌC KHÓA HỌC GỢI Ý
 * Mã nghiệp vụ: SPEC-ONB-STU-01 & LOGIC-ONB-REC-01
 * Giao diện đối chiếu: Figma Node 1959:6123, 1840:14670, 3654:16887, 3659:16992, 1840:13225, 3671:16778
 * ==============================================================================
 */

import { Component, OnInit, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { OnboardingService } from '../../core/services/onboarding.service';
import { StudentPreferences } from '../../core/models/user.model';

interface SurveyOption {
  id: string;
  title: string;
  desc?: string;
  iconUrl?: string;
  iconTag?: string;
  emoji?: string;
  relevantRoles?: string[]; // Danh sách các vai trò liên quan ở Bước 1
}

interface SurveyQuestion {
  id: number;
  label: string;
  badge: string;
  title: string;
  subtitle: string;
  type: 'single-role' | 'multi-tech' | 'single-level';
  asideTitle: string;
  asideDesc: string;
  asideImage?: string;
  options: SurveyOption[];
}

@Component({
  selector: 'app-onboarding-survey',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <!-- HEADER KHẢO SÁT CHUẨN FIGMA (LOGO + TIẾN ĐỘ + NÚT BỎ QUA GÓC TRÊN) -->
    <header class="bg-white border-b border-[#E2E8F0] h-[68px] px-6 lg:px-12 flex items-center justify-between shrink-0 sticky top-0 z-40 select-none">
      <a routerLink="/main" class="flex items-center gap-2.5" aria-label="ThinkUp Trang chủ">
        <svg width="32" height="32" viewBox="0 0 33 32" fill="none" xmlns="http://www.w3.org/2000/svg" class="shrink-0">
          <g clip-path="url(#clip0_thinkup_onboard)">
            <path d="M8.11094 14.2222C12.1978 14.2222 15.5109 11.0385 15.5109 7.11111C15.5109 3.18375 12.1978 0 8.11094 0C4.02403 0 0.710938 3.18375 0.710938 7.11111C0.710938 11.0385 4.02403 14.2222 8.11094 14.2222Z" fill="#3898EC"/>
            <path d="M32.0891 0H17.2891V14.2222H32.0891V0Z" fill="#090909"/>
            <path d="M0.710938 15.6445H15.5109V32.0001L0.710938 15.6445Z" fill="#9BD1FF"/>
            <path d="M32.0891 22.9137V15.6445H24.6891H17.2891V32.0001H24.2996C28.6015 32.0001 32.0891 27.9319 32.0891 22.9137Z" fill="#257FE6"/>
          </g>
          <defs>
            <clipPath id="clip0_thinkup_onboard"><rect width="32.8" height="32" fill="white"/></clipPath>
          </defs>
        </svg>
        <span class="font-semibold font-['Inter'] tracking-tight text-[26px] leading-none">
          <span class="text-[#090909]">THINK</span>
          <span class="text-[#0088E8]">UP</span>
        </span>
      </a>

    </header>

    <!-- TOAST THÔNG BÁO LỖI NGOẠI LỆ / THÀNH CÔNG (EX-ONB-01) -->
    @if (toastMessage()) {
      <div
        class="fixed top-20 right-6 z-50 px-5 py-3 rounded-xl shadow-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300"
        [ngClass]="toastType() === 'error' ? 'bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]' : 'bg-[#F0FDF4] border-[#86EFAC] text-[#166534]'"
      >
        <span class="text-base">{{ toastType() === 'error' ? '⚠️' : '✅' }}</span>
        <span class="text-xs font-semibold">{{ toastMessage() }}</span>
      </div>
    }

    <!-- MAIN ONBOARDING VIEW CONTAINER (MAX-W 1240PX CHUẨN FIGMA) -->
    <div class="min-h-[calc(100vh-68px)] bg-[#F8FAFD] text-[#0D182B] flex flex-col font-sans select-none">
      <main class="mx-auto flex w-full max-w-[1240px] flex-1 flex-col justify-start gap-3 px-4 py-3 md:px-6 md:py-4">
        
        <!-- TOP: STEP TRACKER TIMELINE (ĐÚNG 3 BƯỚC FIGMA NODE 1840:14676) -->
        <section class="w-full shrink-0 rounded-2xl border border-[#DEE5EF] bg-white px-6 py-2.5 md:px-12 shadow-xs">
          <ol class="relative mx-auto flex w-full max-w-[1020px] items-start justify-between list-none p-0 m-0">
            @for (step of questions; track step.id; let idx = $index; let isLast = $last) {
              <li class="relative flex flex-1 flex-col items-center">
                <!-- Connecting Horizontal Divider -->
                @if (!isLast) {
                  <div class="absolute left-1/2 right-[-50%] top-5 -z-0 h-px bg-[#DEE5EF]">
                    <div
                      class="h-full bg-[#0766EE] transition-all duration-300"
                      [style.width.%]="isStepCompleted(step.id) ? 100 : 0"
                    ></div>
                  </div>
                }

                <!-- Step Number Circle: 40px x 40px, rounded-full, border 2px (Exact Figma 1840:14679) -->
                <div
                  class="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 font-sans text-sm font-semibold transition-all duration-200"
                  [ngClass]="{
                    'border-[#0766EE] bg-white text-[#0766EE]': isStepCompleted(step.id) && step.id !== currentQuestion.id,
                    'border-[#0766EE] bg-[#0766EE] text-white shadow-[0_6px_16px_-4px_rgba(7,102,238,0.4)]': step.id === currentQuestion.id,
                    'border-[#DEE5EF] bg-white text-[#667383]': !isStepCompleted(step.id) && step.id !== currentQuestion.id
                  }"
                >
                  <!-- Hiện tick khi bước đó đã được chọn hợp lệ -->
                  @if (isStepCompleted(step.id) && step.id !== currentQuestion.id) {
                    <svg class="h-4 w-4 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  } @else {
                    <span>{{ step.id }}</span>
                  }
                </div>

                <!-- Step Label -->
                <div class="mt-2 text-center">
                  <span
                    class="font-sans text-[14px] leading-5 transition-colors block whitespace-nowrap"
                    [ngClass]="step.id === currentQuestion.id ? 'text-[#0766EE] font-semibold' : isStepCompleted(step.id) ? 'text-[#0D182B] font-medium' : 'text-[#667383] font-medium'"
                  >
                    {{ step.label }}
                  </span>
                </div>
              </li>
            }
          </ol>
        </section>

        <!-- BOTTOM: MAIN SECTION CARD (SPLIT-SCREEN 2 CỘT) -->
        <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#DEE5EF] bg-white shadow-xs">
          <div class="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-4 md:flex-row md:gap-8 md:px-10 lg:gap-10">
            
            <!-- LEFT COLUMN: NỘI DUNG CÂU HỎI -->
            <div class="flex flex-col min-h-0 flex-1">
              <!-- Step indicator badge -->
              <div class="flex items-center justify-between shrink-0">
                <span class="rounded-lg bg-[#EDF6FF] px-3 py-1 text-xs font-semibold text-[#0766EE] uppercase tracking-wider">
                  {{ currentQuestion.badge }}
                </span>
              </div>

              <!-- Title & Subtitle -->
              <div class="mt-2 flex shrink-0 flex-col gap-1">
                <h1 class="font-sans text-xl md:text-2xl font-bold leading-tight text-[#0D182B]">
                  {{ currentQuestion.title }}
                </h1>
                <p class="font-sans text-sm font-normal text-[#667383]">
                  {{ currentQuestion.subtitle }}
                </p>
              </div>

              <!-- Options container -->
              <div class="mt-3 min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-2 pb-2">
                
                <!-- BƯỚC 1: VỊ TRÍ CÔNG NGHỆ (Figma Node 3654:16887 - Icon bên trái, Nội dung ở giữa, Radio bên phải) -->
                @if (currentQuestion.type === 'single-role') {
                  <div class="flex max-w-[680px] flex-col gap-2 pt-0.5">
                    @for (opt of currentQuestion.options; track opt.id) {
                      <button
                        (click)="selectRole(opt.id)"
                        type="button"
                        class="group flex min-h-[48px] w-full items-center justify-between gap-3.5 rounded-[10px] border px-4 py-1.5 text-left font-sans transition-all duration-200"
                        [ngClass]="answers.targetRole === opt.id
                          ? 'border-[#007DFF] bg-[#E3F2FD] shadow-[0_2px_8px_rgba(0,125,255,0.12)]'
                          : 'border-[#D4E3F4] hover:border-[#007DFF] hover:bg-[#F4F9FF] bg-white'"
                      >
                        <!-- Left: Icon Box (40px x 40px, rounded-[10px], bg-[#E3F2FD]) -->
                        <div
                          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] transition-colors"
                          [ngClass]="answers.targetRole === opt.id ? 'bg-[#D0E8FD]' : 'bg-[#E3F2FD]'"
                        >
                          @if (opt.iconUrl) {
                            <img [src]="opt.iconUrl" [alt]="opt.title" class="h-[25px] w-[25px] object-contain" />
                          }
                        </div>
                        
                        <!-- Middle: Details -->
                        <div class="flex-1 min-w-0">
                          <h3
                            class="font-sans text-[14px] font-semibold leading-tight transition-colors"
                            [ngClass]="answers.targetRole === opt.id ? 'text-[#007DFF]' : 'text-[#0D182B]'"
                          >
                            {{ opt.title }}
                          </h3>
                          <p class="mt-1 font-sans text-[12px] font-normal leading-normal text-[#667383]">
                            {{ opt.desc }}
                          </p>
                        </div>

                        <!-- Right: Radio Indicator (18px x 18px circle with inner dot 10px when active) -->
                        <div
                          class="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-all"
                          [ngClass]="answers.targetRole === opt.id
                            ? 'border-[#007DFF] bg-white'
                            : 'border-[#CADBF0] bg-white group-hover:border-[#007DFF]'"
                        >
                          @if (answers.targetRole === opt.id) {
                            <div class="h-2.5 w-2.5 rounded-full bg-[#007DFF]"></div>
                          }
                        </div>
                      </button>
                    }
                  </div>
                }

                <!-- BƯỚC 2: CÔNG NGHỆ ƯU TIÊN (Figma Node 3659:16992 - Pill rounded-[39px], Khóa khi đủ 3 thẻ) -->
                @if (currentQuestion.type === 'multi-tech') {
                  <div class="flex flex-col gap-4">
                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      @for (opt of sortedTechOptions(); track opt.id) {
                        @let isSelected = isTechSelected(opt.id);
                        @let isDisabled = !isSelected && selectedTechCount() >= 3;

                        <button
                          (click)="toggleTech(opt.id)"
                          [disabled]="isDisabled"
                          type="button"
                          class="group flex min-h-[54px] items-center justify-between gap-3.5 px-5 py-1.5 rounded-[39px] border text-left font-sans transition-all duration-200"
                          [ngClass]="{
                            'border-[#73AEF8] bg-[#DBF1FF] shadow-xs cursor-pointer': isSelected,
                            'border-[#DEE5EF] hover:border-[#73AEF8] hover:bg-[#F8FBFF] bg-white cursor-pointer': !isSelected && !isDisabled,
                            'border-[#E2E8F0] bg-slate-50 opacity-40 cursor-not-allowed': isDisabled
                          }"
                        >
                          <!-- Left: Tech SVG Icon Box -->
                          <div
                            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors"
                            [ngClass]="isSelected ? 'bg-white shadow-xs' : 'bg-transparent'"
                          >
                            @if (opt.iconUrl) {
                              <img [src]="opt.iconUrl" [alt]="opt.title" class="h-[44px] w-[44px] object-contain" />
                            }
                          </div>

                          <!-- Middle: Tech Title -->
                          <div class="flex-1 min-w-0">
                            <span
                              class="font-sans text-[15px] font-semibold leading-tight block transition-colors"
                              [ngClass]="isSelected ? 'text-[#0766EE]' : 'text-[#0D182B]'"
                            >
                              {{ opt.title }}
                            </span>
                          </div>

                          <!-- Right: Selection Checkmark Circle indicator -->
                          <div
                            class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors mr-1"
                            [ngClass]="isSelected ? 'border-[#0766EE] bg-[#0766EE] text-white' : 'border-[#CBD5E1] bg-white group-hover:border-[#73AEF8]'"
                          >
                            @if (isSelected) {
                              <svg class="h-3 w-3 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            }
                          </div>
                        </button>
                      }
                    </div>
                  </div>
                }

                <!-- BƯỚC 3: TRÌNH ĐỘ CÔNG NGHỆ HIỆN TẠI (Figma Node 1840:13225 - 3 Thẻ lớn có Emoji 🌱 🌿 🌳) -->
                @if (currentQuestion.type === 'single-level') {
                  <div class="flex max-w-[700px] flex-col gap-3.5 pt-1">
                    @for (opt of currentQuestion.options; track opt.id) {
                      <button
                        (click)="selectLevel(opt.id)"
                        type="button"
                        class="group flex min-h-[64px] items-center gap-4 rounded-[20px] p-3 text-left font-sans transition-all duration-200 border"
                        [ngClass]="answers.currentLevel === opt.id
                          ? 'border-[#0766EE] bg-white shadow-[0_0_0_1px_rgba(19,104,233,0.4)] ring-2 ring-[#0766EE]/20'
                          : 'border-[#DEE5EF] bg-[#EFF6FD] hover:bg-[#E5F1FC] hover:border-[#B0BAC9]'"
                      >
                        <!-- Big Emoji box -->
                        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-xs text-2xl">
                          <span>{{ opt.emoji }}</span>
                        </div>

                        <!-- Level text details -->
                        <div class="flex-1 min-w-0">
                          <h3 class="font-sans text-[16px] font-bold leading-snug text-[#0D182B]" [ngClass]="answers.currentLevel === opt.id ? 'text-[#0766EE]' : ''">
                            {{ opt.title }}
                          </h3>
                          <p class="mt-1 font-sans text-[13px] font-normal leading-relaxed text-[#667383]">
                            {{ opt.desc }}
                          </p>
                        </div>

                        <!-- Radio circle -->
                        <div
                          class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                          [ngClass]="answers.currentLevel === opt.id ? 'border-[#0766EE] bg-white' : 'border-[#CBD5E1] bg-white'"
                        >
                          @if (answers.currentLevel === opt.id) {
                            <div class="h-2.5 w-2.5 rounded-full bg-[#0766EE]"></div>
                          }
                        </div>
                      </button>
                    }
                  </div>
                }

                <!-- Validation error message -->
                @if (errorMessage()) {
                  <div class="mt-3 text-xs text-red-500 font-medium flex items-center gap-1.5 animate-pulse">
                    <span>⚠️</span>
                    <span>{{ errorMessage() }}</span>
                  </div>
                }

              </div>
            </div>

            <!-- RIGHT COLUMN: ASIDE PANEL (Xuất nguyên khung Figma - Chỉ hiện trên màn hình laptop/desktop lg:flex) -->
            @if (currentQuestion.asideImage) {
              <div class="hidden lg:flex w-[340px] xl:w-[380px] shrink-0 flex-col items-center justify-center p-2">
                <img
                  [src]="currentQuestion.asideImage"
                  [alt]="currentQuestion.asideTitle"
                  class="w-full h-auto max-h-[500px] object-contain select-none"
                />
              </div>
            }

          </div>

          <!-- FOOTER ACTIONS BAR (QUAY LẠI, BỎ QUA, TIẾP THEO / HOÀN TẤT) -->
          <div class="flex shrink-0 items-center justify-between border-t border-[#DEE5EF] bg-white px-6 py-2.5 md:px-10">
            <!-- Back button (Ẩn ở Bước 1, hiện ở Bước 2 & 3 theo SPEC-ONB-STU-01) -->
            @if (currentStep() > 0) {
              <button
                (click)="prevStep()"
                type="button"
                [disabled]="submitting()"
                class="flex h-10 items-center gap-1.5 rounded-xl border border-[#DEE5EF] px-5 font-sans text-xs font-semibold text-[#0D182B] transition-colors hover:bg-[#F8FAFD] active:scale-95 disabled:opacity-50"
              >
                <span>←</span>
                <span>Quay lại</span>
              </button>
            } @else {
              <div></div>
            }

            <!-- Skip & Next/Submit buttons -->
            <div class="flex items-center gap-3">
              <button
                (click)="openSkipModal()"
                [disabled]="submitting()"
                type="button"
                class="h-10 rounded-xl border border-[#DEE5EF] px-5 font-sans text-xs font-semibold text-[#667383] transition-colors hover:bg-[#F8FAFD] hover:text-[#0D182B] disabled:opacity-50"
              >
                Bỏ qua khảo sát
              </button>

              <!-- Primary Button (Tiếp tục / Hoàn tất khảo sát kèm trạng thái Disabled mặc định) -->
              <button
                (click)="handlePrimaryAction()"
                [disabled]="!canProceed() || submitting()"
                type="button"
                class="flex h-10 items-center gap-2 rounded-xl px-6 font-sans text-xs font-semibold transition-all shadow-sm"
                [ngClass]="canProceed() && !submitting()
                  ? 'bg-[#0766EE] text-white shadow-[0_4px_14px_rgba(7,102,238,0.35)] hover:bg-[#0555cc] active:scale-95 cursor-pointer'
                  : 'bg-[#CBD5E1] text-[#64748B] cursor-not-allowed opacity-70'"
              >
                @if (submitting()) {
                  <!-- Spinner xoay khi đang submit (EX-ONB-02 & AC-ONB-15) -->
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>ThinkUp đang xử lý...</span>
                } @else {
                  <span>{{ currentStep() === 2 ? 'Hoàn tất khảo sát' : 'Tiếp tục' }}</span>
                  <span>→</span>
                }
              </button>
            </div>
          </div>

        </div>
      </main>

      <!-- POPUP XÁC NHẬN BỎ QUA KHẢO SÁT CHUẨN 100% FIGMA NODE 3671:16778 -->
      @if (showSkipConfirm()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div class="absolute inset-0" (click)="closeSkipModal()"></div>

          <div class="relative z-10 w-full max-w-[480px] rounded-2xl border border-[#DEE5EF] bg-white p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <h2 class="font-['Inter'] text-[20px] font-semibold leading-7 text-[#1A2130]">
              Bạn có chắc muốn bỏ qua khảo sát?
            </h2>

            <p class="font-['Inter'] text-[14px] font-normal leading-[22px] text-[#667383]">
              Nếu bạn bỏ qua, bạn vẫn có thể khám phá các khóa học. Tuy nhiên, gợi ý khóa học và lộ trình sẽ chưa được cá nhân hóa theo mục tiêu và trình độ của bạn.
            </p>

            <div class="flex items-center gap-3 pt-2">
              <button
                (click)="closeSkipModal()"
                type="button"
                class="flex-1 h-11 rounded-lg bg-[#0766EE] hover:bg-[#0555cc] text-white font-['Inter'] text-[14px] font-medium transition active:scale-[0.98] shadow-xs"
              >
                Tiếp tục khảo sát
              </button>

              <button
                (click)="confirmSkipSurvey()"
                type="button"
                class="flex-1 h-11 rounded-lg border border-[#DEE5EF] bg-white hover:bg-[#F8FAFD] text-[#243045] font-['Inter'] text-[14px] font-medium transition active:scale-[0.98]"
              >
                Bỏ qua khảo sát
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class OnboardingSurveyComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly onboardingService = inject(OnboardingService);

  private readonly DRAFT_KEY = 'thinkup_onboarding_draft';

  readonly currentStep = signal<number>(0);
  readonly errorMessage = signal<string>('');
  readonly submitting = signal<boolean>(false);
  readonly showSkipConfirm = signal<boolean>(false);
  readonly toastMessage = signal<string>('');
  readonly toastType = signal<'success' | 'error'>('success');

  // Form State
  answers: {
    targetRole: string | null;
    selectedSkills: string[];
    currentLevel: string | null;
  } = {
    targetRole: null,
    selectedSkills: [],
    currentLevel: null
  };

  readonly questions: SurveyQuestion[] = [
    {
      id: 1,
      label: 'Mục tiêu',
      badge: 'CÂU HỎI 1',
      title: 'Vị trí công nghệ nào bạn đang hướng tới?',
      subtitle: 'Chọn 1 vị trí phù hợp nhất với mục tiêu của bạn.',
      type: 'single-role',
      asideTitle: 'Xác định mục tiêu',
      asideDesc: 'Giúp chúng tôi gợi ý khóa học và lộ trình phù hợp nhất dành cho bạn.',
      asideImage: '/assets/onboarding/aside-1840-14784.png',
      options: [
        {
          id: 'frontend',
          title: 'Frontend Developer',
          desc: 'Xây dựng giao diện web tương tác và trải nghiệm người dùng.',
          iconUrl: '/assets/onboarding/icons/role-frontend.svg'
        },
        {
          id: 'backend',
          title: 'Backend Developer',
          desc: 'Phát triển logic máy chủ, xây dựng API và quản trị cơ sở dữ liệu.',
          iconUrl: '/assets/onboarding/icons/role-backend.svg'
        },
        {
          id: 'fullstack',
          title: 'Fullstack Developer',
          desc: 'Làm chủ toàn diện cả phần giao diện (Frontend) và hệ thống máy chủ (Backend).',
          iconUrl: '/assets/onboarding/icons/role-fullstack.svg'
        },
        {
          id: 'mobile',
          title: 'Mobile Developer',
          desc: 'Phát triển ứng dụng di động trên nền tảng Android và iOS.',
          iconUrl: '/assets/onboarding/icons/role-mobile.svg'
        },
        {
          id: 'data-ai',
          title: 'Data Science & AI',
          desc: 'Xử lý, phân tích dữ liệu và xây dựng mô hình trí tuệ nhân tạo.',
          iconUrl: '/assets/onboarding/icons/role-data-ai.svg'
        },
        {
          id: 'devops-cloud',
          title: 'DevOps & Cloud',
          desc: 'Triển khai hạ tầng, tự động hóa và tối ưu hóa vận hành hệ thống.',
          iconUrl: '/assets/onboarding/icons/role-devops.svg'
        },
        {
          id: 'explore',
          title: 'Khám phá tự do',
          desc: 'Chưa có định hướng cố định, muốn trải nghiệm đa dạng các lĩnh vực.',
          iconUrl: '/assets/onboarding/icons/role-explore.svg'
        }
      ]
    },
    {
      id: 2,
      label: 'Kỹ năng ưu tiên',
      badge: 'CÂU HỎI 2',
      title: 'Công nghệ nào bạn muốn ưu tiên học tập ngay?',
      subtitle: 'Chọn tối đa 3 công nghệ bạn quan tâm.',
      type: 'multi-tech',
      asideTitle: 'Chọn công nghệ bạn quan tâm',
      asideDesc: 'Điều này giúp chúng tôi gợi ý khóa học phù hợp với sở thích của bạn.',
      asideImage: '/assets/onboarding/aside-1840-12495.png',
      options: [
        { id: 'html-css', title: 'HTML5 & CSS3/Tailwind', iconUrl: '/assets/onboarding/icons/tech-html-css.svg', relevantRoles: ['frontend', 'fullstack'] },
        { id: 'js-ts', title: 'JavaScript / TypeScript', iconUrl: '/assets/onboarding/icons/tech-js-ts.svg', relevantRoles: ['frontend', 'backend', 'fullstack'] },
        { id: 'angular', title: 'Angular Framework', iconUrl: '/assets/onboarding/icons/tech-angular.svg', relevantRoles: ['frontend', 'fullstack'] },
        { id: 'react-next', title: 'ReactJS / Next.js', iconUrl: '/assets/onboarding/icons/tech-react.svg', relevantRoles: ['frontend', 'fullstack'] },
        { id: 'node-express', title: 'NodeJS & ExpressJS API', iconUrl: '/assets/onboarding/icons/tech-node.svg', relevantRoles: ['backend', 'fullstack'] },
        { id: 'database', title: 'Cơ sở dữ liệu (MongoDB / MySQL)', iconUrl: '/assets/onboarding/icons/tech-db.svg', relevantRoles: ['backend', 'fullstack', 'data-ai'] },
        { id: 'dsa', title: 'Cấu trúc dữ liệu & Thuật toán', iconUrl: '/assets/onboarding/icons/tech-dsa.svg', relevantRoles: ['frontend', 'backend', 'fullstack', 'mobile'] },
        { id: 'portfolio', title: 'Xây dựng dự án thực chiến (Portfolio)', iconUrl: '/assets/onboarding/icons/tech-portfolio.svg', relevantRoles: ['frontend', 'backend', 'fullstack', 'mobile', 'data-ai'] }
      ]
    },
    {
      id: 3,
      label: 'Trình độ hiện tại',
      badge: 'CÂU HỎI 3',
      title: 'Trình độ công nghệ hiện tại của bạn ở mức nào?',
      subtitle: 'Chọn 1 đáp án phản ánh đúng nhất năng lực hiện tại của bạn.',
      type: 'single-level',
      asideTitle: 'Hiểu rõ trình độ của bạn',
      asideDesc: 'Giúp chúng tôi cá nhân hóa lộ trình học tập và đề xuất khóa học phù hợp nhất.',
      asideImage: '/assets/onboarding/aside-1840-13335.png',
      options: [
        {
          id: 'beginner',
          title: 'Người mới bắt đầu (Beginner)',
          desc: 'Chưa có kiến thức lập trình hoặc mới tìm hiểu khái niệm, muốn học từ số 0.',
          emoji: '🌱'
        },
        {
          id: 'intermediate',
          title: 'Đã có nền tảng cơ bản (Intermediate)',
          desc: 'Đã nắm cú pháp và logic cơ bản, muốn thực hành làm dự án thực tế.',
          emoji: '🌿'
        },
        {
          id: 'advanced',
          title: 'Đã đi làm / Chuyển ngành (Advanced)',
          desc: 'Đã có kinh nghiệm làm việc, muốn nâng cao kỹ năng kiến trúc và tối ưu hóa hệ thống.',
          emoji: '🌳'
        }
      ]
    }
  ];

  get currentQuestion(): SurveyQuestion {
    return this.questions[this.currentStep()];
  }

  ngOnInit(): void {
    this.restoreFromSessionStorage();
  }

  // Lắng nghe phím Enter để tiếp tục (SPEC-ONB-STU-01 III.1)
  @HostListener('window:keydown.enter', ['$event'])
  handleEnterKey(event: Event): void {
    if (this.canProceed() && !this.submitting() && !this.showSkipConfirm()) {
      event.preventDefault();
      this.handlePrimaryAction();
    }
  }

  selectRole(roleId: string): void {
    this.answers.targetRole = roleId;
    this.errorMessage.set('');
    this.saveToSessionStorage();
  }

  toggleTech(techId: string): void {
    const list = this.answers.selectedSkills;
    if (list.includes(techId)) {
      this.answers.selectedSkills = list.filter(id => id !== techId);
    } else {
      if (list.length >= 3) {
        this.errorMessage.set('Bạn chỉ có thể chọn tối đa 3 kỹ năng quan tâm.');
        return;
      }
      this.answers.selectedSkills = [...list, techId];
    }
    this.errorMessage.set('');
    this.saveToSessionStorage();
  }

  isTechSelected(techId: string): boolean {
    return this.answers.selectedSkills.includes(techId);
  }

  selectedTechCount(): number {
    return this.answers.selectedSkills.length;
  }

  selectLevel(levelId: string): void {
    this.answers.currentLevel = levelId;
    this.errorMessage.set('');
    this.saveToSessionStorage();
  }

  isStepCompleted(stepId: number): boolean {
    if (stepId === 1) return !!this.answers.targetRole;
    if (stepId === 2) return this.answers.selectedSkills.length > 0;
    if (stepId === 3) return !!this.answers.currentLevel;
    return false;
  }

  canProceed(): boolean {
    const step = this.currentStep();
    if (step === 0) return !!this.answers.targetRole;
    if (step === 1) return this.answers.selectedSkills.length >= 1 && this.answers.selectedSkills.length <= 3;
    if (step === 2) return !!this.answers.currentLevel;
    return false;
  }

  // Ưu tiên các kỹ năng liên quan đến nghề đã chọn đưa lên đầu (SPEC-ONB-STU-01 II.2)
  sortedTechOptions(): SurveyOption[] {
    const q2 = this.questions[1];
    const role = this.answers.targetRole;
    if (!role) return q2.options;

    return [...q2.options].sort((a, b) => {
      const aRel = a.relevantRoles?.includes(role) ? 1 : 0;
      const bRel = b.relevantRoles?.includes(role) ? 1 : 0;
      return bRel - aRel;
    });
  }

  isRelevantToRole(opt: SurveyOption): boolean {
    const role = this.answers.targetRole;
    return !!(role && opt.relevantRoles?.includes(role));
  }

  handlePrimaryAction(): void {
    if (!this.canProceed() || this.submitting()) return;

    if (this.currentStep() < 2) {
      this.currentStep.update(s => s + 1);
      this.errorMessage.set('');
      this.saveToSessionStorage();
    } else {
      this.submitSurvey();
    }
  }

  prevStep(): void {
    if (this.currentStep() > 0) {
      this.currentStep.update(s => s - 1);
      this.errorMessage.set('');
      this.saveToSessionStorage();
    }
  }

  submitSurvey(): void {
    if (this.submitting()) return; // Debounce chống spam click (EX-ONB-02 & AC-ONB-15)
    this.submitting.set(true);

    const prefs: StudentPreferences = {
      targetRole: this.answers.targetRole || 'frontend',
      selectedSkills: this.answers.selectedSkills,
      currentLevel: this.answers.currentLevel || 'beginner'
    };

    this.onboardingService.submitOnboarding(prefs).subscribe({
      next: () => {
        this.submitting.set(false);
        this.clearSessionStorage();
        this.showToast('Thiết lập thành công!', 'success');
        // Điều hướng học viên vào Dashboard có bộ lọc cá nhân hóa
        setTimeout(() => {
          this.router.navigate(['/main/home']);
        }, 800);
      },
      error: () => {
        // EX-ONB-01: Lỗi mạng / timeout -> Tắt spinner, hiện toast đỏ, bảo lưu form
        this.submitting.set(false);
        this.showToast('Không thể lưu thông tin khảo sát. Vui lòng kiểm tra lại mạng Internet và thử lại!', 'error');
      }
    });
  }

  openSkipModal(): void {
    this.showSkipConfirm.set(true);
  }

  closeSkipModal(): void {
    this.showSkipConfirm.set(false);
  }

  confirmSkipSurvey(): void {
    this.showSkipConfirm.set(false);
    this.onboardingService.skipOnboarding().subscribe({
      next: () => {
        this.clearSessionStorage();
        this.router.navigate(['/main/home']);
      },
      error: () => {
        this.clearSessionStorage();
        this.router.navigate(['/main/home']);
      }
    });
  }

  private saveToSessionStorage(): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
      const draft = {
        step: this.currentStep(),
        answers: this.answers
      };
      sessionStorage.setItem(this.DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }

  private restoreFromSessionStorage(): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
      const raw = sessionStorage.getItem(this.DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.step === 'number' && parsed.step >= 0 && parsed.step <= 2) {
          this.currentStep.set(parsed.step);
        }
        if (parsed.answers) {
          this.answers = {
            targetRole: parsed.answers.targetRole || null,
            selectedSkills: parsed.answers.selectedSkills || [],
            currentLevel: parsed.answers.currentLevel || null
          };
        }
      }
    } catch {}
  }

  private clearSessionStorage(): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(this.DRAFT_KEY);
  }

  private showToast(msg: string, type: 'success' | 'error'): void {
    this.toastMessage.set(msg);
    this.toastType.set(type);
    setTimeout(() => {
      this.toastMessage.set('');
    }, 4000);
  }
}
