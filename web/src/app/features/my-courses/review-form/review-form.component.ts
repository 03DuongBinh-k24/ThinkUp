import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideBookOpen,
  LucideCheck,
  LucideCircleAlert,
  LucideCloudUpload,
  LucideFileText,
  LucideGlobe,
  LucideInfo,
  LucideLightbulb,
  LucideStar,
  LucideX,
} from '@lucide/angular';
import { Subscription } from 'rxjs';
import { LearningCourse } from '../../learning/models/learning.model';
import { LearningService } from '../../learning/services/learning.service';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    LucideBookOpen,
    LucideCheck,
    LucideCircleAlert,
    LucideCloudUpload,
    LucideFileText,
    LucideGlobe,
    LucideInfo,
    LucideLightbulb,
    LucideStar,
    LucideX,
  ],
  templateUrl: './review-form.component.html',
})
export class ReviewFormComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly learningService = inject(LearningService);

  readonly course = signal<LearningCourse | null>(null);
  readonly submitState = signal<SubmitState>('idle');
  readonly errorMessage = signal('');

  rating = 0;
  hoverRating = 0;
  comment = '';
  nps = 9;
  selectedTags = new Set<string>();
  files: { name: string; size: number; type: string }[] = [];
  dropActive = false;
  formError = '';
  private forceFailure = false;

  readonly tags = [
    { id: 'content', label: 'Nội dung dễ hiểu, thực tế' },
    { id: 'instructor', label: 'Giảng viên nhiệt tình, dễ hiểu' },
    { id: 'exercise', label: 'Bài tập thực hành hữu ích' },
    { id: 'materials', label: 'Tài liệu học tập chất lượng' },
    { id: 'support', label: 'Hỗ trợ học viên nhanh chóng' },
    { id: 'other', label: 'Khác' },
  ];

  readonly ratingLabels: Record<number, string> = {
    1: 'Rất tệ',
    2: 'Tệ',
    3: 'Bình thường',
    4: 'Tốt',
    5: 'Rất tốt',
  };

  private readonly subscriptions = new Subscription();

  constructor() {
    this.subscriptions.add(
      this.route.paramMap.subscribe((params) => {
        const courseId = params.get('courseId') ?? 'python-co-ban';
        this.subscriptions.add(
          this.learningService.getCourse(courseId).subscribe((course) => this.course.set(course))
        );
      })
    );
    this.subscriptions.add(
      this.route.queryParamMap.subscribe((params) => {
        this.forceFailure = params.get('simulate') === 'fail';
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get ratingLabel(): string {
    return this.ratingLabels[this.hoverRating || this.rating] ?? 'Chọn số sao';
  }

  get progress(): number {
    const lessons = this.course()?.chapters.flatMap((chapter) => chapter.lessons) ?? [];
    const done = lessons.filter((lesson) => lesson.completed).length;
    return lessons.length ? Math.round((done / lessons.length) * 100) : 0;
  }

  setRating(value: number): void {
    this.rating = value;
    this.formError = '';
  }

  toggleTag(id: string): void {
    if (this.selectedTags.has(id)) this.selectedTags.delete(id);
    else this.selectedTags.add(id);
  }

  isTagSelected(id: string): boolean {
    return this.selectedTags.has(id);
  }

  submit(): void {
    if (this.rating === 0) {
      this.formError = 'Vui lòng chọn số sao đánh giá.';
      return;
    }
    if (this.comment.trim().length < 10) {
      this.formError = 'Vui lòng chia sẻ cảm nhận ít nhất 10 ký tự.';
      return;
    }
    this.formError = '';
    this.submitState.set('submitting');

    this.learningService
      .submitReview({
        courseId: this.course()?.id ?? '',
        rating: this.rating,
        tags: [...this.selectedTags],
        comment: this.comment.trim(),
        nps: this.nps,
      })
      .subscribe((result) => {
        if (this.forceFailure || !result.success) {
          this.submitState.set('error');
          this.errorMessage.set(result.message || 'Đã xảy ra lỗi trong quá trình gửi đánh giá.');
        } else {
          this.submitState.set('success');
        }
      });
  }

  closeError(): void {
    this.submitState.set('idle');
  }

  retry(): void {
    this.submitState.set('idle');
    this.submit();
  }

  goToDashboard(): void {
    const courseId = this.course()?.id ?? 'python-co-ban';
    void this.router.navigate(['/main/my-courses', courseId]);
  }

  addFiles(fileList: FileList | null): void {
    if (!fileList) return;
    const allowed = ['image/', 'video/', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument'];
    for (const file of Array.from(fileList)) {
      if (file.size > 50 * 1024 * 1024) {
        this.formError = `Tệp ${file.name} vượt quá 50MB.`;
        continue;
      }
      if (!allowed.some((prefix) => file.type.startsWith(prefix))) {
        this.formError = `Định dạng tệp ${file.name} không được hỗ trợ.`;
        continue;
      }
      this.files = [...this.files, { name: file.name, size: file.size, type: file.type }];
    }
  }

  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addFiles(input.files);
    input.value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dropActive = false;
    this.addFiles(event.dataTransfer?.files ?? null);
  }

  removeFile(index: number): void {
    this.files = this.files.filter((_, itemIndex) => itemIndex !== index);
  }

  formatSize(bytes: number): string {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
}
