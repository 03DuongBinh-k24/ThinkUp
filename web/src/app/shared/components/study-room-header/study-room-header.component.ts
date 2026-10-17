import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-study-room-header',
  standalone: true,
  imports: [HeaderComponent],
  templateUrl: './study-room-header.component.html',
  styleUrl: './study-room-header.component.css',
})
export class StudyRoomHeaderComponent {
  private readonly auth = inject(AuthService);
  readonly audience = computed(() => this.auth.isAuthenticated() ? 'member' : 'guest');
}
