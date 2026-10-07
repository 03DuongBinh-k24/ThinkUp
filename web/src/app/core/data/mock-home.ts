export interface HeroSlide {
  id: string;
  greeting: string;
  name: string;
  question: string;
  quote: string;
  action: string;
  href: string;
}

export interface MyLearningItem {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  category: string;
  progress: number;
  nextLesson: string;
  color: string;
  iconClass?: string;
  href: string;
}

export interface BenefitItem {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'morning',
    greeting: 'Chào mừng bạn đến với ThinkUP,',
    name: 'Học viên! 👋',
    question: 'Sẵn sàng chinh phục kiến thức mới hôm nay?',
    quote: '"Học hôm nay, vững bước tương lai!"',
    action: 'Vào phòng học ảo',
    href: '/learning/study-room',
  },
];

export const MY_LEARNING_COURSES: MyLearningItem[] = [
  {
    id: 'reactjs',
    icon: '⚛',
    title: 'ReactJS',
    subtitle: 'từ cơ bản đến nâng cao',
    category: 'LẬP TRÌNH',
    progress: 45,
    nextLesson: 'Bài học tiếp: State và Lifecycle',
    color: 'linear-gradient(158deg, #0f172b 0%, #1d293d 100%)',
    iconClass: 'text-cyan-300',
    href: '/main/courses/reactjs',
  },
  {
    id: 'python',
    icon: '🐍',
    title: 'Python',
    subtitle: 'cho người mới bắt đầu',
    category: 'LẬP TRÌNH',
    progress: 25,
    nextLesson: 'Bài học tiếp: Hàm (Functions)',
    color: 'linear-gradient(158deg, #111827 0%, #1f2937 100%)',
    href: '/main/courses/python-data',
  },
  {
    id: 'javascript',
    icon: 'JS',
    title: 'JavaScript',
    subtitle: 'cơ bản cho người mới',
    category: 'LẬP TRÌNH',
    progress: 80,
    nextLesson: 'Bài học tiếp: DOM Manipulation',
    color: 'linear-gradient(158deg, #0f172b 0%, #1d293d 100%)',
    iconClass: 'text-[#f7df1e]',
    href: '/main/courses/javascript-es6',
  },
];

export const ROADMAP_BANNER = {
  badge: '✦ LỘ TRÌNH CÁ NHÂN HÓA',
  title: 'Mỗi chặng học, một bước gần hơn tới mục tiêu nghề nghiệp',
  description: 'Bạn đã hoàn thành 60% lộ trình Frontend Developer. Tiếp tục chặng học để duy trì chuỗi học tập đều đặn!',
  href: '/learning/roadmap',
  primaryAction: 'Tiếp tục lộ trình của bạn',
  meta: '60% hoàn thành • Chuỗi 7 ngày liên tục',
};

export const BENEFITS: BenefitItem[] = [
  { id: 'devices', icon: 'devices', title: 'Học mọi lúc, mọi nơi', subtitle: 'Hỗ trợ tối ưu trên mọi thiết bị' },
  { id: 'instructors', icon: 'instructor', title: 'Giảng viên chuyên môn cao', subtitle: 'Đội ngũ chuyên gia hàng đầu' },
  { id: 'community', icon: 'community', title: 'Cộng đồng học viên năng động', subtitle: 'Trao đổi, hỗ trợ và giải đáp 24/7' },
  { id: 'certificate', icon: 'certificate', title: 'Chứng chỉ chuẩn nghề nghiệp', subtitle: 'Nâng tầm hồ sơ ứng tuyển' },
];

export const STREAK_DAYS = [
  { label: 'T2', active: true },
  { label: 'T3', active: true },
  { label: 'T4', active: true },
  { label: 'T5', active: true },
  { label: 'T6', active: false },
  { label: 'T7', active: false },
  { label: 'CN', active: true },
];

export const HEATMAP_STATS = [
  { value: '42 ngày', label: 'Có hoạt động học tập' },
  { value: '18,5 giờ', label: 'Tổng thời gian học' },
  { value: '+21%', label: 'Tăng trưởng so với kỳ trước' },
];
