import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommerceService } from '../../../core/services/commerce.service';

@Component({
  selector: 'app-auth-header',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <header class="relative z-20 h-[68px] w-full border-b border-[#E2E8F0] bg-white font-sans" role="banner">
      <div class="flex h-full w-full items-center justify-between gap-3 px-4 py-[11px] sm:px-[22px] xl:gap-6">
        <!-- Left Brand / ThinkUP Logo -->
        <div class="flex h-[46.8px] w-auto shrink-0 items-center px-1 sm:w-[217.8px] sm:px-3">
          <a routerLink="/main" class="flex items-center gap-[10px] select-none" aria-label="ThinkUp Trang chủ">
            <svg width="32.8" height="32" viewBox="0 0 33 32" fill="none" xmlns="http://www.w3.org/2000/svg" class="shrink-0">
              <g clip-path="url(#clip0_thinkup_auth)">
                <path d="M8.11094 14.2222C12.1978 14.2222 15.5109 11.0385 15.5109 7.11111C15.5109 3.18375 12.1978 0 8.11094 0C4.02403 0 0.710938 3.18375 0.710938 7.11111C0.710938 11.0385 4.02403 14.2222 8.11094 14.2222Z" fill="#3898EC"/>
                <path d="M32.0891 0H17.2891V14.2222H32.0891V0Z" fill="#090909"/>
                <path d="M0.710938 15.6445H15.5109V32.0001L0.710938 15.6445Z" fill="#9BD1FF"/>
                <path d="M32.0891 22.9137V15.6445H24.6891H17.2891V32.0001H24.2996C28.6015 32.0001 32.0891 27.9319 32.0891 22.9137Z" fill="#257FE6"/>
              </g>
              <defs>
                <clipPath id="clip0_thinkup_auth"><rect width="32.8" height="32" fill="white"/></clipPath>
              </defs>
            </svg>
            <span class="hidden sm:flex font-semibold font-['Inter'] tracking-tight select-none whitespace-nowrap items-center text-[28px] leading-none">
              <span class="text-[#090909]">THINK</span>
              <span class="text-[#0088E8]">UP</span>
            </span>
          </a>
        </div>

        <!-- Search / ThinkUp courses -->
        <form
          (ngSubmit)="handleSearch()"
          class="hidden h-[46px] min-w-0 max-w-[661.2px] flex-1 items-center justify-between rounded-full border border-[#E2E8F0] bg-white py-[7.2px] pl-[28.8px] pr-[10.8px] xl:flex"
        >
          <input
            type="text"
            [(ngModel)]="searchQuery"
            name="query"
            placeholder="Tìm kiếm khóa học ThinkUp"
            class="h-5 min-w-0 flex-1 bg-transparent pr-4 text-[14px] font-normal leading-5 text-[#334155] outline-none placeholder:text-[#334155]"
          />
          <button
            type="submit"
            class="flex h-[37.6px] w-[37.6px] items-center justify-center rounded-full bg-[#0B5BD3] text-white transition-colors duration-200 hover:bg-[#094bb0]"
            aria-label="Tìm kiếm"
          >
            <svg class="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </form>

        <!-- Right actions -->
        <div class="flex h-[43.2px] w-auto shrink-0 items-center sm:w-[354.6px] justify-end">
          <!-- Cart Icon Button -->
          <a
            routerLink="/main/cart"
            class="relative hidden h-[39.6px] w-[39.6px] items-center justify-center rounded-full text-[#131927] transition-colors duration-200 hover:bg-slate-100 sm:flex"
            aria-label="Giỏ hàng"
          >
            <svg class="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            @if (cartCount() > 0) {
              <span class="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#00CCF9] px-1 text-[10px] font-bold text-[#005266]">
                {{ cartCount() }}
              </span>
            }
          </a>

          <!-- Đăng nhập -->
          <a
            routerLink="/auth/login"
            class="ml-2 flex h-10 w-auto items-center justify-center whitespace-nowrap rounded-full bg-[#FFAA00] px-4 py-3 text-center text-[13px] font-semibold leading-4 text-[#191B23] transition-colors duration-200 hover:bg-[#F0A000] sm:ml-8 sm:px-8 sm:text-[14px]"
          >
            Đăng nhập
          </a>

          <!-- Đăng ký -->
          <a
            routerLink="/auth/sign-up"
            class="ml-2 flex h-10 w-auto items-center justify-center whitespace-nowrap rounded-full bg-[#006AB5] px-4 py-3 text-center text-[13px] font-semibold leading-4 text-white transition-colors duration-200 hover:bg-[#005590] sm:ml-[10.9px] sm:px-8 sm:text-[14px]"
          >
            Đăng ký
          </a>
        </div>
      </div>
    </header>
  `
})
export class AuthHeaderComponent {
  private router = inject(Router);
  private commerceService = inject(CommerceService);

  readonly cartCount = this.commerceService.cartCount;
  searchQuery = '';

  handleSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/main/courses'], { queryParams: { query: this.searchQuery.trim() } });
    }
  }
}
