import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css'
})
export class ContactComponent {
  fullName = '';
  email = '';
  topic = 'Khóa học & Học tập';
  message = '';

  readonly submittedSuccess = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  handleSubmit(): void {
    if (!this.fullName.trim() || !this.email.trim() || !this.message.trim()) {
      this.errorMessage.set('Vui lòng điền đầy đủ các trường thông tin bắt buộc.');
      return;
    }

    this.errorMessage.set('');
    this.submittedSuccess.set(true);
    this.fullName = '';
    this.email = '';
    this.message = '';
  }
}
