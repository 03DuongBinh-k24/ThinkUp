import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProfileService } from '../../../core/services/profile.service';
import { ProfileSidebarComponent } from './components/profile-sidebar/profile-sidebar.component';
import { ProfileFormComponent } from './components/profile-form/profile-form.component';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ProfileSidebarComponent,
    ProfileFormComponent,
  ],
  template: `
    <div class="min-h-full bg-[#F9F9FF] text-[#1C1D1F] flex flex-col font-['Inter',sans-serif]">
      <!-- Main Edit View (Khớp tỉ lệ lưới Figma) -->
      <main class="mx-auto grid w-full min-w-0 max-w-[1920px] grid-cols-1 items-start gap-6 overflow-x-hidden px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[minmax(280px,413px)_minmax(0,1fr)] lg:pl-[clamp(24px,2.55vw,49px)] lg:pr-[clamp(24px,3.23vw,62px)] flex-1">
        <!-- Sidebar Upload Avatar -->
        <div class="flex flex-col gap-4">
          <a
            routerLink="/main/profile"
            class="inline-flex items-center gap-2 text-[14px] font-semibold text-[#155DFC] hover:underline"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
            Quay lại trang tổng quan
          </a>

          <app-profile-sidebar
            [displayName]="displayName()"
            [avatarUrl]="profileService.profile().avatarUrl"
            (avatarChange)="onAvatarChange($event)"
          />
        </div>

        <!-- Form Edit Details -->
        <app-profile-form
          [formData]="profileData()"
          [isSaving]="isSaving()"
          [saveSuccess]="saveSuccess()"
          (save)="onSave($event)"
        />
      </main>
    </div>
  `,
})
export class ProfileEditComponent {
  readonly profileService = inject(ProfileService);

  readonly isSaving = signal(false);
  readonly saveSuccess = signal(false);

  // Clone local form data
  readonly profileData = signal<any>({ ...this.profileService.profile() });

  displayName(): string {
    const p = this.profileData();
    const full = [p.firstName, p.lastName].filter(Boolean).join(' ').trim();
    return full || p.name || 'Học viên ThinkUp';
  }

  onAvatarChange(newUrl: string): void {
    this.profileData.update((p) => ({ ...p, avatarUrl: newUrl }));
    this.profileService.updateAvatar(newUrl);
  }

  onSave(data: any): void {
    this.isSaving.set(true);
    this.saveSuccess.set(false);

    this.profileService.updateProfile(data).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.saveSuccess.set(true);
        setTimeout(() => this.saveSuccess.set(false), 3000);
      },
      error: () => {
        this.isSaving.set(false);
      },
    });
  }
}
