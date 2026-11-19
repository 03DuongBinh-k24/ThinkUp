import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, PLATFORM_ID, computed, inject, signal, viewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CourseService } from '../../core/services/course.service';
import { Course } from '../../core/models/course.model';
import {
  classroomFeatures,
  faqItems,
  instructors,
  skillTracks,
  stats,
  testimonials,
} from '../../core/data/mock/mock-landing-data';
import { ToastService } from '../../core/services/toast.service';
import { CourseCardComponent } from '../../shared/components/course-card/course-card.component';
import { CourseCardView } from '../../shared/components/course-card/course-card.model';
import { formatMoney, toCourseCardView } from '../../shared/components/course-card/course-card.mapper';
import { IconComponent, IconName } from '../../shared/components/icon/icon.component';
import { LandingHeaderComponent } from './components/landing-header.component';
import { AuthRequiredModalComponent } from '../../shared/components/auth-required-modal/auth-required-modal.component';
import { AuthService } from '../../core/services/auth.service';

interface LandingTool {
  label: string;
  title: string;
  desc: string;
  icon: IconName;
  tone: 'blue' | 'purple' | 'green' | 'amber' | 'teal';
  wide?: boolean;
}

interface LandingRoomSlide {
  id: string;
  label: string;
  image: string;
  alt: string;
}

/** Ảnh xem trước phòng học ảo, render trực tiếp từ 3 bản thiết kế Figma. */
const ROOM_SLIDES: LandingRoomSlide[] = [
  {
    id: 'lobby',
    label: 'Sảnh phòng học ảo',
    image: '/assets/study-room/studyroom-lobby.png',
    alt: 'Sảnh phòng học ảo ThinkUp với phòng học chung, bộ lọc và danh sách phòng đang mở',
  },
  {
    id: 'interactive',
    label: 'Không gian tương tác',
    image: '/assets/study-room/studyroom-room.png',
    alt: 'Không gian phòng học tương tác với avatar bạn học, khung chat và thanh công cụ',
  },
  {
    id: 'in-room',
    label: 'Trong phòng học',
    image: '/assets/study-room/studyroom-inroom.png',
    alt: 'Bên trong phòng học ảo với bạn học, đồng hồ tập trung và thanh công cụ',
  },
];

const ROOM_AUTOPLAY_MS = 6500;

const TOOL_CARDS: LandingTool[] = [
  {
    label: 'Video bài giảng',
    title: 'Video Bài Giảng',
    desc: 'Học trực quan, chia nhỏ bài',
    icon: 'play',
    tone: 'blue',
  },
  {
    label: 'Ebook & tài liệu',
    title: 'Ebook & Tài Liệu',
    desc: 'Tài liệu học tập, đọc mọi lúc',
    icon: 'book-open',
    tone: 'purple',
  },
  {
    label: 'Lab thực hành',
    title: 'Lab Thực Hành',
    desc: 'Code trực tiếp trên web, không cần cài đặt',
    icon: 'code',
    tone: 'green',
    wide: true,
  },
  {
    label: 'Trắc nghiệm',
    title: 'Trắc Nghiệm & Quiz',
    desc: 'Làm bài tập, đánh giá nắm vững',
    icon: 'file-text',
    tone: 'amber',
  },
  {
    label: 'Hỏi đáp giảng viên',
    title: 'Hỏi Đáp Với Giảng Viên',
    desc: 'Hỏi đáp, góp ý trực tiếp cùng Mentor',
    icon: 'message-circle',
    tone: 'teal',
  },
];

const TOOL_CHECKS = [
  'Học lý thuyết qua Video & Ebook.',
  'Luyện tập trực tiếp với Lab & Quiz đánh giá.',
  'Kết nối, hỏi đáp trực tiếp với Giảng Viên & Mentor.',
];

@Component({
  selector: 'app-landing-view',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CourseCardComponent, IconComponent, LandingHeaderComponent, AuthRequiredModalComponent],
  templateUrl: './landing.component.html',
  styleUrls: ['./styles/landing-ui.css', './landing.component.css'],
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly courseService = inject(CourseService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  private revealObserver?: IntersectionObserver;

  readonly authModalOpen = signal(false);
  readonly authReturnUrl = signal('/learning/study-room');

  readonly skillTracks = skillTracks;
  readonly stats = stats;
  readonly classroomFeatures = classroomFeatures;
  readonly instructors = instructors;
  readonly testimonials = testimonials;
  readonly faqItems = faqItems;
  readonly toolCards = TOOL_CARDS;
  readonly toolChecks = TOOL_CHECKS;

  readonly popularCourses = signal<Course[]>([]);
  readonly openFaq = signal<number | null>(null);

  readonly roomSlides = ROOM_SLIDES;
  readonly activeRoomSlide = signal(0);
  /** Vị trí từng slide trong coverflow: is-active | is-prev | is-next. */
  readonly roomSlideState = computed(() => {
    const total = this.roomSlides.length;
    const active = this.activeRoomSlide();
    return this.roomSlides.map((_, index) => {
      const offset = (index - active + total) % total;
      if (offset === 0) return 'is-active';
      return offset === 1 ? 'is-next' : 'is-prev';
    });
  });

  private roomAutoPlayId: ReturnType<typeof setInterval> | null = null;
  private roomAutoPlayPaused = false;

  readonly popularCards = computed<CourseCardView[]>(() =>
    this.popularCourses().slice(0, 4).map((course, index) => toCourseCardView(course, index))
  );

  private readonly courseTrack = viewChild<ElementRef<HTMLElement>>('courseTrack');

  ngOnInit(): void {
    this.courseService.getCourses({ sort: 'popular' }).subscribe({
      next: (res) => {
        this.popularCourses.set(res.data.slice(0, 4));
      },
      error: () => this.toast.showToast({ type: 'error', message: 'Không tải được khóa học. Vui lòng thử lại.' }),
    });
  }

  /**
   * Progressive enhancement: section reveals are enabled only when supported.
   * Content stays visible without JS, IntersectionObserver, or when motion is reduced.
   */
  ngAfterViewInit(): void {
    this.startRoomAutoPlay();

    if (!isPlatformBrowser(this.platformId) ||
        !('IntersectionObserver' in window) ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const page = this.host.nativeElement.querySelector<HTMLElement>('.tu-landing-page');
    if (!page) return;

    const sections: NodeListOf<HTMLElement> = page.querySelectorAll<HTMLElement>(
      'main > section:not(:first-child)'
    );
    if (sections.length === 0) return;

    this.revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('tu-reveal--visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });

    sections.forEach((section) => {
      section.classList.add('tu-reveal');
      this.revealObserver?.observe(section);
    });
    page.classList.add('tu-motion-ready');
  }

  ngOnDestroy(): void {
    this.stopRoomAutoPlay();
    this.revealObserver?.disconnect();
  }

  nextRoomSlide(): void {
    this.goToRoomSlide(this.activeRoomSlide() + 1);
  }

  prevRoomSlide(): void {
    this.goToRoomSlide(this.activeRoomSlide() - 1);
  }

  goToRoomSlide(index: number): void {
    const total = this.roomSlides.length;
    this.activeRoomSlide.set(((index % total) + total) % total);
  }

  /** Tạm dừng tự chuyển ảnh khi người dùng đang hover hoặc focus vào carousel. */
  pauseRoomAutoPlay(): void {
    this.roomAutoPlayPaused = true;
  }

  resumeRoomAutoPlay(): void {
    this.roomAutoPlayPaused = false;
  }

  private startRoomAutoPlay(): void {
    if (!isPlatformBrowser(this.platformId) || this.roomAutoPlayId !== null) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    this.roomAutoPlayId = setInterval(() => {
      if (this.roomAutoPlayPaused || document.hidden) return;
      this.goToRoomSlide(this.activeRoomSlide() + 1);
    }, ROOM_AUTOPLAY_MS);
  }

  private stopRoomAutoPlay(): void {
    if (this.roomAutoPlayId === null) return;
    clearInterval(this.roomAutoPlayId);
    this.roomAutoPlayId = null;
  }

  toggleFaq(index: number): void {
    this.openFaq.set(this.openFaq() === index ? null : index);
  }

  scrollCourses(direction: 1 | -1): void {
    const track = this.courseTrack()?.nativeElement;
    if (!track) return;
    track.scrollBy({ left: direction * Math.round(track.clientWidth * 0.8), behavior: 'smooth' });
  }

  onEnterStudyRoom(event: Event): void {
    if (!this.authService.isAuthenticated()) {
      event.preventDefault();
      this.authReturnUrl.set('/learning/study-room');
      this.authModalOpen.set(true);
    }
  }

  requireAccount(returnUrl = '/'): void {
    this.authReturnUrl.set(returnUrl);
    this.authModalOpen.set(true);
  }
}
