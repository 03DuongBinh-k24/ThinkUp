import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserProfile } from '../../../../../core/models/profile.model';

@Component({
  selector: 'app-profile-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-form.component.html',
  styleUrl: './profile-form.component.css'
})
export class ProfileFormComponent {
  @Input({ required: true }) formData: any = {};
  @Input() isSaving = false;
  @Input() saveSuccess = false;
  @Output() save = new EventEmitter<any>();

  readonly socialFields = [
    { name: 'facebook', prefix: 'facebook.com/' },
    { name: 'instagram', prefix: 'instagram.com/' },
    { name: 'linkedin', prefix: 'linkedin.com/in/' },
    { name: 'tiktok', prefix: 'tiktok.com/@' },
    { name: 'x', prefix: 'x.com/' },
    { name: 'youtube', prefix: 'youtube.com/@' },
  ];

  onSubmit(): void {
    this.save.emit(this.formData);
  }
}
