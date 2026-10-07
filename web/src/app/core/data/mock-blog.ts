import { BlogPost } from '../models/blog.model';

export const BLOG_CATEGORIES = [
  'Tất cả',
  'Lập trình Web',
  'Trí tuệ nhân tạo (AI)',
  'Kinh nghiệm phỏng vấn',
  'Lộ trình sự nghiệp',
  'Tips & Công cụ'
];

export const MOCK_BLOG_POSTS: BlogPost[] = [
  {
    id: '1',
    title: 'Lộ trình trở thành Frontend Developer chuyên nghiệp năm 2026',
    slug: 'lo-trinh-frontend-developer-2026',
    summary: 'Tổng hợp các kỹ năng từ HTML/CSS căn bản, TypeScript, Angular 21, React đến tối ưu hiệu năng web cần nắm vững.',
    category: 'Lập trình Web',
    author: {
      name: 'Nguyễn Văn Dev',
      role: 'Senior Frontend Engineer'
    },
    publishedAt: '02/10/2026',
    readTimeMinutes: 7,
    tags: ['Frontend', 'Angular', 'React', 'Career'],
    viewsCount: 3420,
    likesCount: 156
  },
  {
    id: '2',
    title: 'Ứng dụng AI và LLM vào quy trình phát triển phần mềm thực chiến',
    slug: 'ung-dung-ai-llm-vao-software-engineering',
    summary: 'Cách tích hợp AI hỗ trợ pair-programming, sinh unit test tự động và kiểm thử hiệu năng tối ưu chi phí dự án.',
    category: 'Trí tuệ nhân tạo (AI)',
    author: {
      name: 'Trần Thị AI',
      role: 'Machine Learning Specialist'
    },
    publishedAt: '28/09/2026',
    readTimeMinutes: 10,
    tags: ['AI', 'LLM', 'Best Practices'],
    viewsCount: 5210,
    likesCount: 340
  },
  {
    id: '3',
    title: 'Bí quyết vượt qua vòng phỏng vấn Live Coding tại các công ty công nghệ lớn',
    slug: 'bi-quyet-live-coding-interview',
    summary: 'Chiến thuật giải thuật toán, rèn luyện tư duy problem-solving và kỹ năng giao tiếp tự tin trước nhà tuyển dụng.',
    category: 'Kinh nghiệm phỏng vấn',
    author: {
      name: 'Lê Văn Tech',
      role: 'Tech Lead @ Silicon Valley'
    },
    publishedAt: '20/09/2026',
    readTimeMinutes: 8,
    tags: ['Interview', 'Algorithms', 'Career'],
    viewsCount: 4180,
    likesCount: 289
  },
  {
    id: '4',
    title: 'Khám phá kiến trúc Standalone Components và Signals trong Angular 21',
    slug: 'kham-pha-standalone-signals-angular-21',
    summary: 'Tìm hiểu tại sao Angular 21 loại bỏ hoàn toàn NgModule và cách Signals giúp quản lý reactive state cực kỳ đơn giản.',
    category: 'Lập trình Web',
    author: {
      name: 'Phạm Minh Frontend',
      role: 'Angular Core Advocate'
    },
    publishedAt: '15/09/2026',
    readTimeMinutes: 6,
    tags: ['Angular', 'Frontend', 'TypeScript'],
    viewsCount: 2950,
    likesCount: 210
  }
];
