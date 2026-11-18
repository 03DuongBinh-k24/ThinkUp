import { CartItem } from '../../models/commerce.model';

// TODO(pre-deploy): Nhớ xóa adapter giỏ hàng mock khi bỏ cấu hình study-room-demo.
const key = 'thinkup_study_room_demo_cart';
const course: CartItem = {
  id: '73',
  title: 'Kỹ thuật ghi nhớ hiệu quả',
  instructor: 'ThinkUp',
  rating: 4.9,
  ratingCount: 0,
  duration: '10 phút',
  originalPrice: 0,
  salePrice: 0,
  thumbnailUrl: '/assets/courses/course-73-cover.png',
  isAvailable: true,
};

const cartDemoAdapter = {
  read: (): CartItem[] => localStorage.getItem(key) === course.id ? [course] : [],
  write: (items: CartItem[]): void => {
    if (items.some(item => item.id === course.id)) localStorage.setItem(key, course.id);
    else localStorage.removeItem(key);
  },
  find: (id: string): CartItem | undefined => id === course.id ? course : undefined,
};

export function getCartDemoAdapter() {
  return cartDemoAdapter;
}
