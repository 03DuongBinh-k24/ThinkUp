import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CourseService } from '../../core/services/course.service';
import { Course } from '../../core/models/course.model';
import { skillTracks, stats, classroomFeatures, instructors, testimonials, faqItems } from '../../core/data/mock/mock-landing-data';

@Component({
  selector: 'app-landing-view',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent implements OnInit {
  private readonly courseService = inject(CourseService);

  readonly skillTracks = skillTracks;
  readonly stats = stats;
  readonly classroomFeatures = classroomFeatures;
  readonly instructors = instructors;
  readonly testimonials = testimonials;
  readonly faqItems = faqItems;

  readonly popularCourses = signal<Course[]>([]);
  readonly openFaq = signal<number | null>(null);

  ngOnInit(): void {
    this.courseService.getCourses({ sort: 'popular' }).subscribe({
      next: (res) => {
        this.popularCourses.set((res.data || []).slice(0, 4));
      }
    });
  }

  toggleFaq(index: number): void {
    this.openFaq.set(this.openFaq() === index ? null : index);
  }
}
