import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideChevronDown,
  LucideChevronUp,
  LucideCircle,
  LucideCircleAlert,
  LucideCircleCheck,
  LucideCirclePlay,
  LucideCircleQuestionMark,
  LucideCode,
  LucideFileText,
  LucideLayoutGrid,
  LucideLock,
  LucidePanelLeft,
} from '@lucide/angular';
import { LearningChapter, LearningCourse, LearningLesson } from '../../models/learning.model';

@Component({
  selector: 'app-study-sidebar',
  standalone: true,
  imports: [
    RouterLink,
    LucideChevronDown,
    LucideChevronUp,
    LucideCircle,
    LucideCircleAlert,
    LucideCircleCheck,
    LucideCirclePlay,
    LucideCircleQuestionMark,
    LucideCode,
    LucideFileText,
    LucideLayoutGrid,
    LucideLock,
    LucidePanelLeft,
  ],
  templateUrl: './study-sidebar.component.html',
})
export class StudySidebarComponent {
  @Input({ required: true }) course!: LearningCourse;
  @Input() activeLessonId = '';
  @Input() open = false;
  @Input() previewMode = false;
  @Input() openChapterIds: string[] = [];

  @Output() toggle = new EventEmitter<void>();
  @Output() lessonSelected = new EventEmitter<LearningLesson>();
  @Output() chapterToggled = new EventEmitter<string>();

  isOpen(chapter: LearningChapter): boolean {
    return this.openChapterIds.includes(chapter.id);
  }

  chapterLabel(chapter: LearningChapter, index: number): string {
    const title = chapter.title.replace(/^(phần|chương)\s*\d+\s*:\s*/i, '');
    return `Chương ${index + 1}: ${title}`;
  }

  isLocked(chapter: LearningChapter, index: number): boolean {
    return this.previewMode && index > 0 && !chapter.lessons.some((lesson) => lesson.id === this.activeLessonId);
  }

  toggleChapter(chapter: LearningChapter, index: number): void {
    if (this.isLocked(chapter, index)) return;
    this.chapterToggled.emit(chapter.id);
  }

  lessonStatus(lesson: LearningLesson): 'done' | 'failed' | 'todo' {
    if (lesson.completed || lesson.status === 'done') {
      return 'done';
    }
    if (lesson.status === 'failed') {
      return 'failed';
    }
    return 'todo';
  }
}
