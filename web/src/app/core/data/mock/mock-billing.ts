// TODO(pre-deploy): Nhớ xóa lịch sử thanh toán mẫu này khi API đơn hàng thật hoạt động.
import { TransactionDetail, TransactionRow } from '../../models/commerce.model';
import { MOCK_COURSES } from './mock-courses';

export const MOCK_BILLING_EMAIL = 'annhien.nguyen@thinkup.edu.vn';

const purchases: { id: string; courseIds: string[]; date: string; method: string; status?: 'failed' }[] = [
  { id: 'GD-AN-001', courseIds: ['reactjs'], date: '2026-09-28T09:42:00', method: 'Chuyển khoản ngân hàng' },
  { id: 'GD-AN-002', courseIds: ['javascript-es6'], date: '2026-09-21T14:18:00', method: 'Ví MoMo' },
  { id: 'GD-AN-003', courseIds: ['python-data'], date: '2026-09-10T10:05:00', method: 'Thẻ ngân hàng' },
  { id: 'GD-AN-004', courseIds: ['angular'], date: '2026-08-26T16:30:00', method: 'Chuyển khoản ngân hàng', status: 'failed' },
  { id: 'GD-AN-005', courseIds: ['uiux-design'], date: '2026-08-14T08:15:00', method: 'Ví MoMo' },
  { id: 'GD-AN-006', courseIds: ['vuejs-3'], date: '2026-07-30T19:24:00', method: 'Thẻ ngân hàng' },
  { id: 'GD-AN-007', courseIds: ['nextjs'], date: '2026-07-12T11:36:00', method: 'Chuyển khoản ngân hàng' },
  { id: 'GD-AN-008', courseIds: ['flutter'], date: '2026-06-23T13:52:00', method: 'Ví MoMo', status: 'failed' },
  { id: 'GD-AN-009', courseIds: ['ai-ml'], date: '2026-06-04T17:09:00', method: 'Thẻ ngân hàng' },
  { id: 'GD-AN-010', courseIds: ['sql-data', 'nodejs'], date: '2026-05-18T09:10:00', method: 'Chuyển khoản ngân hàng' },
];

const money = (value: number): string => `${new Intl.NumberFormat('vi-VN').format(value)}đ`;

const records = purchases.map(purchase => {
  const courses = purchase.courseIds.map(id => {
    const course = MOCK_COURSES.find(item => item.id === id);
    if (!course) throw new Error(`Mock billing course not found: ${id}`);
    return course;
  });
  const timestamp = new Date(purchase.date).getTime();
  const when = new Date(timestamp);
  const dateTime = when.toLocaleString('vi-VN', { hour12: false });
  const total = courses.reduce((sum, course) => sum + course.salePrice, 0);
  const failed = purchase.status === 'failed';
  const row: TransactionRow = {
    id: purchase.id,
    courses: courses.map(course => course.displayTitle || course.title),
    paymentMethod: purchase.method,
    amount: money(total),
    status: failed ? 'failed' : 'success',
    date: when.toLocaleDateString('vi-VN'),
    time: when.toLocaleTimeString('vi-VN', { hour12: false }),
    timestamp,
  };
  const detail: TransactionDetail = {
    id: purchase.id,
    transactionCode: `THKUP-AN-${purchase.id.slice(-3)}`,
    paymentMethod: purchase.method,
    createdAt: dateTime,
    paidAt: failed ? 'Chưa thanh toán' : dateTime,
    completedAt: failed ? 'Chưa hoàn tất' : dateTime,
    paymentContent: `Thanh toán đơn hàng ${purchase.id}`,
    status: failed ? 'failed' : 'success',
    order: {
      countLabel: `${courses.length} khóa học`,
      courses: courses.map(course => ({
        id: course.id,
        title: course.displayTitle || course.title,
        instructor: course.instructor,
        price: money(course.salePrice),
        originalPrice: money(course.originalPrice),
        badge: course.shortLabel || course.icon || 'Course',
        tone: 'blue',
      })),
      subtotal: money(total),
      courseDiscount: money(0),
      voucherDiscount: `-${money(0)}`,
      voucherCode: '',
      total: money(total),
    },
    payment: {
      bank: purchase.method,
      accountNumber: '—',
      accountName: 'THINKUP',
      transferContent: `THINKUP ${purchase.id}`,
      paidAmount: failed ? money(0) : money(total),
      bankTransactionCode: failed ? '—' : `FT-AN-${purchase.id.slice(-3)}`,
      paidAt: failed ? 'Chưa thanh toán' : dateTime,
    },
    invoice: {
      code: failed ? 'Chưa phát hành' : `HD-AN-${purchase.id.slice(-3)}`,
      issuedAt: failed ? '—' : dateTime,
      status: failed ? 'Chưa phát hành' : 'Đã phát hành',
      buyer: { name: 'Nguyễn An Nhiên', email: MOCK_BILLING_EMAIL, phone: '' },
    },
  };
  return { row, detail };
});

export const MOCK_BILLING_ROWS = records.map(record => record.row);
export const MOCK_BILLING_DETAILS: Record<string, TransactionDetail> = Object.fromEntries(
  records.map(record => [record.detail.id, record.detail]),
);
