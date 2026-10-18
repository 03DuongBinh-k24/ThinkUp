import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-sidebar.component.html',
  styleUrl: './profile-sidebar.component.css'
})
export class ProfileSidebarComponent {
  @Input({ required: true }) displayName = '';
  @Input() avatarUrl = '';
  @Output() avatarChange = new EventEmitter<string>();

  readonly isUploading = signal(false);

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      this.isUploading.set(true);
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          this.avatarChange.emit(reader.result as string);
        }
        this.isUploading.set(false);
      };
      reader.onerror = () => {
        this.isUploading.set(false);
      };
      reader.readAsDataURL(file);
      target.value = '';
    }
  }
}
