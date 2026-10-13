import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProfileService } from '../services/profile.service';
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
  templateUrl: './profile-edit.component.html',
  styleUrl: './profile-edit.component.css'
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
