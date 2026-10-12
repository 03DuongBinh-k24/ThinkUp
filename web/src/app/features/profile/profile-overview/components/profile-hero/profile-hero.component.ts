import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UserProfile } from '../../../../../core/models/profile.model';
import { ProfileService } from '../../../services/profile.service';

@Component({
  selector: 'app-profile-hero',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile-hero.component.html',
  styleUrl: './profile-hero.component.css'
})
export class ProfileHeroComponent {
  private profileService = inject(ProfileService);
  @Input({ required: true }) profile!: UserProfile;

  onAvatarUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          this.profileService.updateAvatar(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
      input.value = '';
    }
  }
}
