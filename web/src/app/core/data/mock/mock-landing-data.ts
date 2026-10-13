// TODO(pre-deploy): Nhớ xóa dữ liệu mock này khi thay bằng dữ liệu thật.
const ASSET_BASE = '/assets/landing';

export const skillTracks = [
  {
    title: 'AI tạo sinh',
    image: `${ASSET_BASE}/skill-ai-6ef1d5.png`,
    href: '/main/courses',
  },
  {
    title: 'Chứng chỉ CNTT',
    image: `${ASSET_BASE}/skill-it-43407f.png`,
    href: '/main/courses',
  },
  {
    title: 'Khoa học dữ liệu',
    image: `${ASSET_BASE}/skill-data.png`,
    href: '/main/courses',
  },
];

export const stats = [
  { value: '240K+', label: 'Học viên đang học' },
  { value: '12.000+', label: 'Khoá học chất lượng' },
  { value: '850+', label: 'Giảng viên chuyên gia' },
  { value: '98%', label: 'Tỉ lệ hài lòng' },
];

export const classroomFeatures = [
  {
    title: 'Phòng học chung',
    description: 'Cùng bật mic hoặc camera, học theo nhịp của riêng bạn và giữ động lực trong suốt buổi học.',
  },
  {
    title: 'Kết nối bạn học',
    description: 'Gặp gỡ những người cùng mục tiêu, chia sẻ kinh nghiệm và đồng hành trên hành trình học tập.',
  },
];

export const instructors = [
  {
    name: 'Diệu Anh Huyền',
    role: 'Wordpress Developer',
    description: 'Hướng dẫn học viên xây dựng website WordPress từ cơ bản đến thực hành, tập trung vào giao diện, plugin và tối ưu website.',
    image: `${ASSET_BASE}/instructor-1.png`,
  },
  {
    name: 'Mai Diệu Thương',
    role: 'PHP Developer',
    description: 'Giảng dạy kiến thức lập trình PHP, xử lý dữ liệu và xây dựng chức năng web thông qua các bài tập thực tế.',
    image: `${ASSET_BASE}/instructor-2.png`,
  },
  {
    name: 'Phan Đình Tùng',
    role: 'JavaScript Developer',
    description: 'Hướng dẫn học viên nắm vững JavaScript, tư duy lập trình và cách xây dựng giao diện web tương tác.',
    image: `${ASSET_BASE}/instructor-3.png`,
  },
];

export const testimonials = [
  {
    name: 'Kim Linh',
    role: 'WordPress',
    quote: '“Khóa học rất dễ hiểu, nội dung được hướng dẫn từng bước nên mình có thể tự xây dựng website WordPress cơ bản sau khi học.”',
    image: `${ASSET_BASE}/testimonial-1.png`,
    reverse: false,
  },
  {
    name: 'Anh Tài',
    role: 'PHP',
    quote: '“Giảng viên hướng dẫn tận tình, bài học có nhiều ví dụ thực tế giúp mình hiểu rõ hơn cách xử lý dữ liệu và xây dựng chức năng web bằng PHP.”',
    image: `${ASSET_BASE}/testimonial-2.png`,
    reverse: true,
  },
  {
    name: 'Như Anh',
    role: 'JavaScript',
    quote: '“Khóa học giúp mình nắm chắc kiến thức JavaScript nền tảng và biết cách tạo các hiệu ứng tương tác cho website.”',
    image: `${ASSET_BASE}/testimonial-3.png`,
    reverse: false,
  },
];

export const faqItems = [
  {
    question: 'ThinkUp là gì?',
    answer: 'ThinkUp là nền tảng e-learning chuyên về công nghệ thông tin, cung cấp lộ trình học từ cơ bản đến nâng cao cho web, mobile, data, AI, cloud và DevOps.',
  },
  {
    question: 'Tôi có cần biết lập trình trước không?',
    answer: 'Không cần. Các khóa học trên ThinkUp bắt đầu từ số 0, có lộ trình rõ ràng và được thiết kế phù hợp với cả người mới bắt đầu.',
  },
  {
    question: 'Làm sao để bắt đầu?',
    answer: 'Bạn chỉ cần tạo một tài khoản miễn phí, chọn lộ trình học tập mong muốn và bắt đầu bài học đầu tiên ngay lập tức.',
  },
  {
    question: 'ThinkUp có cấp chứng chỉ không?',
    answer: 'Có. Sau khi hoàn thành toàn bộ khóa học và các bài lab/dự án bắt buộc, bạn sẽ nhận được chứng chỉ hoàn thành khóa học từ ThinkUp.',
  },
  {
    question: 'Ai phù hợp học tại ThinkUp?',
    answer: 'Học sinh, sinh viên, người chuyển ngành (non-IT) hoặc các nhà phát triển muốn nâng cao kỹ năng chuyên môn.',
  },
  {
    question: 'Tôi có thể tương tác với mentor như thế nào?',
    answer: 'Bạn có thể tương tác qua phòng học ảo, đặt câu hỏi tại phần bình luận, tham gia thảo luận nhóm hoặc nhận review code trực tiếp trên GitHub PR.',
  },
  {
    question: 'Học liệu có được cập nhật không?',
    answer: 'Học liệu được cập nhật hàng tuần để bắt kịp các xu hướng công nghệ mới nhất trên thế giới.',
  },
  {
    question: 'ThinkUp có hỗ trợ tìm việc không?',
    answer: 'ThinkUp liên kết với các doanh nghiệp công nghệ hàng đầu để giới thiệu các cơ hội thực tập và việc làm cho học viên xuất sắc.',
  },
  {
    question: 'Tôi có thể học thử miễn phí không?',
    answer: 'Có, tất cả các lộ trình học đều có các bài học đầu tiên mở miễn phí để bạn trải nghiệm chất lượng học tập trước.',
  },
  {
    question: 'Học phí thanh toán như thế nào?',
    answer: 'Học phí được hỗ trợ thanh toán linh hoạt qua chuyển khoản ngân hàng, ví điện tử, hoặc trả góp 0% lãi suất.',
  },
];
