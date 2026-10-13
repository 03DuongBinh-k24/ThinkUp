// TODO(pre-deploy): Nhớ xóa màn khảo sát test độc lập này trước khi deploy.
/**
 * ==============================================================================
 * [FILE TEST CHỨC NĂNG ONBOARDING - KHẢO SÁT HỌC VIÊN MỚI]
 * Đường dẫn: src/app/features/onboarding/test-onboarding-survey.component.ts
 *
 * THIẾT KẾ: Khớp 100% Figma Section "Câu hỏi khảo sát" (Node 1959:6123 & 1840:14670)
 * Gồm đúng 3 BƯỚC KHẢO SÁT:
 *   1. Mục tiêu (Vị trí công nghệ nào bạn đang hướng tới?) - Node 1840:14670
 *   2. Công nghệ quan tâm (Công nghệ nào bạn muốn ưu tiên học tập ngay?) - Node 1840:12298
 *   3. Trình độ hiện tại (Trình độ công nghệ hiện tại của bạn ở mức nào?) - Node 1840:13225
 * ==============================================================================
 */

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

interface SurveyOption {
  id: string;
  title: string;
  desc?: string;
  iconUrl?: string;
  iconTag?: string;
  emoji?: string;
  tagColor?: string;
  tagBg?: string;
}

interface SurveyQuestion {
  id: number;
  label: string;
  badge: string;
  title: string;
  subtitle: string;
  type: 'single-role' | 'multi-tech' | 'single-level';
  asideTitle: string;
  asideDesc: string;
  asideImage?: string;
  options: SurveyOption[];
}

@Component({
  selector: 'app-test-onboarding-survey',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './test-onboarding-survey.component.html',
  styleUrl: './test-onboarding-survey.component.css'
})
export class TestOnboardingSurveyComponent {
  private readonly router = inject(Router);

  readonly currentStep = signal(0);
  readonly errorMessage = signal('');
  readonly completed = signal(false);
  readonly showSkipConfirm = signal(false);

  readonly answers: { [key: number]: any } = {
    1: null,
    2: [] as string[],
    3: null
  };

  /**
   * ĐÚNG 3 CÂU HỎI THEO BẢN THIẾT KẾ FIGMA NODE 1959:6123
   */
  readonly questions: SurveyQuestion[] = [
    {
      id: 1,
      label: 'Mục tiêu',
      badge: 'Câu hỏi 1',
      title: 'Vị trí công nghệ nào bạn đang hướng tới?',
      subtitle: 'Chọn 1 vị trí phù hợp nhất với mục tiêu của bạn.',
      type: 'single-role',
      asideTitle: 'Xác định mục tiêu',
      asideDesc: 'Giúp chúng tôi gợi ý khóa học và lộ trình phù hợp nhất dành cho bạn.',
      asideImage: '/assets/onboarding/aside-1840-14784.png',
      options: [
        {
          id: 'frontend',
          title: 'Frontend Developer',
          desc: 'Xây dựng giao diện web tương tác và trải nghiệm người dùng.',
          iconUrl: '/assets/onboarding/icons/role-frontend.svg'
        },
        {
          id: 'backend',
          title: 'Backend Developer',
          desc: 'Phát triển logic máy chủ, xây dựng API và quản trị cơ sở dữ liệu.',
          iconUrl: '/assets/onboarding/icons/role-backend.svg'
        },
        {
          id: 'fullstack',
          title: 'Fullstack Developer',
          desc: 'Làm chủ toàn diện cả phần giao diện (Frontend) và hệ thống máy chủ (Backend).',
          iconUrl: '/assets/onboarding/icons/role-fullstack.svg'
        },
        {
          id: 'mobile',
          title: 'Mobile Developer',
          desc: 'Phát triển ứng dụng di động trên nền tảng Android và iOS.',
          iconUrl: '/assets/onboarding/icons/role-mobile.svg'
        },
        {
          id: 'data-ai',
          title: 'Data Science & AI',
          desc: 'Xử lý, phân tích dữ liệu và xây dựng mô hình trí tuệ nhân tạo.',
          iconUrl: '/assets/onboarding/icons/role-data-ai.svg'
        },
        {
          id: 'devops-cloud',
          title: 'DevOps & Cloud',
          desc: 'Triển khai hạ tầng, tự động hóa và tối ưu hóa vận hành hệ thống.',
          iconUrl: '/assets/onboarding/icons/role-devops.svg'
        },
        {
          id: 'explore',
          title: 'Khám phá tự do',
          desc: 'Chưa có định hướng cố định, muốn trải nghiệm đa dạng các lĩnh vực.',
          iconUrl: '/assets/onboarding/icons/role-explore.svg'
        }
      ]
    },
    {
      id: 2,
      label: 'Công nghệ quan tâm',
      badge: 'Câu hỏi 2',
      title: 'Công nghệ nào bạn muốn ưu tiên học tập ngay?',
      subtitle: 'Chọn tối đa 3 công nghệ bạn quan tâm.',
      type: 'multi-tech',
      asideTitle: 'Chọn công nghệ bạn quan tâm',
      asideDesc: 'Điều này giúp chúng tôi gợi ý khóa học phù hợp với sở thích của bạn.',
      asideImage: '/assets/onboarding/aside-1840-12495.png',
      options: [
        { id: 'html-css', title: 'HTML5 & CSS3/Tailwind', iconUrl: '/assets/onboarding/icons/tech-html-css.svg' },
        { id: 'js-ts', title: 'JavaScript / TypeScript', iconUrl: '/assets/onboarding/icons/tech-js-ts.svg' },
        { id: 'angular', title: 'Angular Framework', iconUrl: '/assets/onboarding/icons/tech-angular.svg' },
        { id: 'react-next', title: 'ReactJS / Next.js', iconUrl: '/assets/onboarding/icons/tech-react.svg' },
        { id: 'node-express', title: 'NodeJS & ExpressJS API', iconUrl: '/assets/onboarding/icons/tech-node.svg' },
        { id: 'database', title: 'Cơ sở dữ liệu (MongoDB / MySQL)', iconUrl: '/assets/onboarding/icons/tech-db.svg' },
        { id: 'dsa', title: 'Cấu trúc dữ liệu & Thuật toán', iconUrl: '/assets/onboarding/icons/tech-dsa.svg' },
        { id: 'portfolio', title: 'Xây dựng dự án thực chiến (Portfolio)', iconUrl: '/assets/onboarding/icons/tech-portfolio.svg' }
      ]
    },
    {
      id: 3,
      label: 'Trình độ hiện tại',
      badge: 'Câu hỏi 3',
      title: 'Trình độ công nghệ hiện tại của bạn ở mức nào?',
      subtitle: 'Chọn 1 đáp án phản ánh đúng nhất năng lực hiện tại của bạn.',
      type: 'single-level',
      asideTitle: 'Hiểu rõ trình độ của bạn',
      asideDesc: 'Giúp chúng tôi cá nhân hóa lộ trình học tập và đề xuất khóa học phù hợp nhất.',
      asideImage: '/assets/onboarding/aside-1840-13335.png',
      options: [
        {
          id: 'beginner',
          title: 'Người mới bắt đầu (Beginner)',
          desc: 'Chưa có kiến thức lập trình hoặc mới tìm hiểu khái niệm, muốn học từ số 0.',
          emoji: '🌱'
        },
        {
          id: 'intermediate',
          title: 'Đã có nền tảng cơ bản (Intermediate)',
          desc: 'Đã nắm cú pháp và logic cơ bản, muốn thực hành làm dự án thực tế.',
          emoji: '🌿'
        },
        {
          id: 'advanced',
          title: 'Nâng cao / Chuyên sâu (Advanced)',
          desc: 'Đã có kinh nghiệm làm việc, muốn nâng cao kỹ năng kiến trúc và tối ưu hóa hệ thống.',
          emoji: '🌳'
        }
      ]
    }
  ];

  get currentQuestion(): SurveyQuestion {
    return this.questions[this.currentStep()];
  }

  selectSingle(optionId: string): void {
    this.answers[this.currentQuestion.id] = optionId;
    this.errorMessage.set('');
  }

  toggleTech(techId: string): void {
    const list: string[] = this.answers[2] || [];
    if (list.includes(techId)) {
      this.answers[2] = list.filter(id => id !== techId);
    } else {
      if (list.length >= 3) {
        this.errorMessage.set('Bạn chỉ có thể chọn tối đa 3 công nghệ quan tâm.');
        return;
      }
      this.answers[2] = [...list, techId];
    }
    this.errorMessage.set('');
  }

  isTechSelected(techId: string): boolean {
    const list: string[] = this.answers[2] || [];
    return list.includes(techId);
  }

  getTechTitle(techId: string): string {
    const q2 = this.questions[1];
    const opt = q2.options.find(o => o.id === techId);
    return opt?.title || techId;
  }

  getRoleTitle(roleId: string): string {
    const q1 = this.questions[0];
    const opt = q1.options.find(o => o.id === roleId);
    return opt?.title || roleId;
  }

  getLevelTitle(levelId: string): string {
    const q3 = this.questions[2];
    const opt = q3.options.find(o => o.id === levelId);
    return opt?.title || levelId;
  }

  nextStep(): void {
    const currentAnswer = this.answers[this.currentQuestion.id];
    if (this.currentQuestion.type === 'multi-tech') {
      if (!currentAnswer || currentAnswer.length === 0) {
        this.errorMessage.set('Vui lòng chọn ít nhất 1 công nghệ (tối đa 3 công nghệ).');
        return;
      }
    } else {
      if (!currentAnswer) {
        this.errorMessage.set('Vui lòng chọn một đáp án để tiếp tục.');
        return;
      }
    }

    if (this.currentStep() < this.questions.length - 1) {
      this.currentStep.update(s => s + 1);
      this.errorMessage.set('');
    } else {
      try {
        localStorage.setItem('thinkup_onboarding_answers', JSON.stringify(this.answers));
        localStorage.setItem('thinkup_onboarding_done', 'true');
      } catch (e) {
        console.error(e);
      }
      this.completed.set(true);
    }
  }

  prevStep(): void {
    if (this.currentStep() > 0) {
      this.currentStep.update(s => s - 1);
      this.errorMessage.set('');
    }
  }

  openSkipModal(): void {
    this.showSkipConfirm.set(true);
  }

  closeSkipModal(): void {
    this.showSkipConfirm.set(false);
  }

  confirmSkipSurvey(): void {
    this.showSkipConfirm.set(false);
    try {
      localStorage.setItem('thinkup_onboarding_done', 'true');
    } catch (e) {
      console.error(e);
    }
    this.router.navigate(['/main/courses']);
  }

  resetTest(): void {
    this.currentStep.set(0);
    this.errorMessage.set('');
    this.completed.set(false);
    this.showSkipConfirm.set(false);
    this.answers[1] = null;
    this.answers[2] = [];
    this.answers[3] = null;
  }
}
