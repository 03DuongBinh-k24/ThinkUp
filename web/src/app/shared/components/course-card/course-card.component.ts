import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon.component';
import { CourseCardView } from './course-card.model';
import { InstructorTriggerDirective } from '../../directives/instructor-trigger.directive';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-course-card',
  standalone: true,
  imports: [RouterLink, IconComponent, InstructorTriggerDirective],
  templateUrl: './course-card.component.html',
  styleUrl: './course-card.component.css',
})
export class CourseCardComponent {
  private readonly auth = inject(AuthService);
  readonly isLoggedIn = computed(() => this.auth.isAuthenticated() && !this.disabled());
  readonly card = input.required<CourseCardView>();
  readonly saved = input(false);
  readonly disabled = input(false);

  readonly saveToggle = output<CourseCardView>();
  readonly addToCart = output<CourseCardView>();
}


