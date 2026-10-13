// TODO(pre-deploy): Nhớ xóa dữ liệu bài viết mẫu này khi API Blog thật được triển khai; BlogService sẽ gọi API thay thế.
import { BlogCategory, BlogPost } from '../../../features/blog/models/blog.model';

export const BLOG_CATEGORIES: BlogCategory[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'basic', label: 'Lập trình cơ bản' },
  { id: 'web', label: 'Web Development' },
  { id: 'backend', label: 'Backend' },
  { id: 'devops', label: 'DevOps' },
  { id: 'algorithm', label: 'Thuật toán' },
  { id: 'experience', label: 'Kinh nghiệm' },
  { id: 'resources', label: 'Tài nguyên' },
];

export const MOCK_BLOG_POSTS: BlogPost[] = [
  { id: '1', title: 'Lộ trình trở thành Frontend Developer chuyên nghiệp', slug: 'lo-trinh-frontend-developer', description: 'Khám phá lộ trình học lập trình Frontend từ nền tảng HTML, CSS, JavaScript đến React và các dự án thực tế.', content: '<h2>Bắt đầu từ nền tảng</h2><p>HTML, CSS và JavaScript là nền tảng để xây dựng giao diện web hiện đại. Hãy thực hành qua những dự án nhỏ mỗi ngày.</p><h2>Phát triển kỹ năng</h2><p>Sau khi nắm vững nền tảng, hãy tìm hiểu framework, tối ưu hiệu năng và xây dựng sản phẩm thực tế.</p>', category: 'WEB DEVELOPMENT', categoryId: 'web', author: 'ThinkUp Team', date: '02/10/2026', readTime: '7 phút đọc', coverImage: '/assets/blog/article-1.jpg', tags: ['web', 'basic'], views: 3420 },
  { id: '2', title: 'Những điều cần biết khi bắt đầu học lập trình', slug: 'bat-dau-hoc-lap-trinh', description: 'Tổng hợp kiến thức và kinh nghiệm giúp bạn xây dựng thói quen học code hiệu quả, bền vững.', content: '<h2>Học từ những điều cơ bản</h2><p>Chia mục tiêu lớn thành các bước nhỏ và dành thời gian thực hành đều đặn.</p>', category: 'LẬP TRÌNH CƠ BẢN', categoryId: 'basic', author: 'ThinkUp Team', date: '28/09/2026', readTime: '5 phút đọc', coverImage: '/assets/blog/article-2.jpg', tags: ['basic'], views: 2850 },
  { id: '3', title: 'Tư duy giải thuật và cấu trúc dữ liệu cho người mới', slug: 'tu-duy-giai-thuat', description: 'Cách tiếp cận bài toán, lựa chọn cấu trúc dữ liệu và luyện tập giải thuật một cách có hệ thống.', content: '<h2>Phân tích bài toán</h2><p>Hiểu rõ đầu vào, đầu ra và các trường hợp đặc biệt trước khi viết mã.</p>', category: 'THUẬT TOÁN', categoryId: 'algorithm', author: 'ThinkUp Team', date: '20/09/2026', readTime: '8 phút đọc', coverImage: '/assets/blog/article-3.jpg', tags: ['algorithm', 'basic'], views: 4180 },
  { id: '4', title: 'Kinh nghiệm xây dựng dự án cá nhân ấn tượng', slug: 'xay-dung-du-an-ca-nhan', description: 'Từ ý tưởng đến sản phẩm hoàn thiện: các bước làm một portfolio thể hiện rõ năng lực của bạn.', content: '<h2>Chọn vấn đề phù hợp</h2><p>Một dự án tốt giải quyết nhu cầu thực tế và thể hiện cách bạn đưa ra quyết định kỹ thuật.</p>', category: 'KINH NGHIỆM', categoryId: 'experience', author: 'ThinkUp Team', date: '15/09/2026', readTime: '6 phút đọc', coverImage: '/assets/blog/article-4.jpg', tags: ['experience', 'web'], views: 2950 },
];
