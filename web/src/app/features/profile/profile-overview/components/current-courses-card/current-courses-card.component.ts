import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CurrentCourse } from '../../../../../core/models/profile.model';

@Component({
  selector: 'app-current-courses-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './current-courses-card.component.html',
  styleUrl: './current-courses-card.component.css'
})
export class CurrentCoursesCardComponent {
  @Input() courses: CurrentCourse[] = [];
}
