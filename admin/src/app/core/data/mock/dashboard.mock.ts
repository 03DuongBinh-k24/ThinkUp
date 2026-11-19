// TODO(pre-deploy): Nhớ xóa dữ liệu dashboard mẫu này và thay bằng service sử dụng API admin đã được backend bàn giao.
export interface DashboardMetric { title: string; value: string; unit?: string; detail?: string[]; trend?: string; theme: string; }
export interface ActionItem { title: string; description: string; count: number; suffix: string; status: string; action: string; theme: string; icon: string; }
export interface AuditLog { time: string; account: string; role: string; action: string; ip: string; id?: string; actor?: string; actionCode?: string; device?: string; entity?: string; previous?: string; current?: string; }

export const DASHBOARD_METRICS: DashboardMetric[] = [
  { title: 'Tổng người dùng', value: '120.540', unit: 'người', trend: '+38,2%', detail: ['Đang hoạt động: 98.240', 'Mới trong tháng: 4.860'], theme: 'users' },
  { title: 'Khóa học', value: '215', unit: 'khóa học', trend: '+12%', detail: ['Đã xuất bản: 180', 'Chờ duyệt: 25', 'Bị ẩn: 10'], theme: 'courses' },
  { title: 'Doanh thu', value: '2.48', unit: 'tỷ VNĐ', trend: '+24,1%', detail: ['Đã thanh toán: 2,31 tỷ', 'Chờ đối soát: 170 triệu'], theme: 'revenue' },
  { title: 'Phòng học ảo', value: '18', unit: 'phòng đang diễn ra', detail: ['Trực tuyến: 258'], theme: 'rooms' }
];

export const DASHBOARD_ACTIONS: ActionItem[] = [
  { title: 'Phê duyệt rút tiền', description: 'Yêu cầu vượt hạn mức (> 20M)', count: 3, suffix: 'yêu cầu đang chờ', status: 'Cần phê duyệt', action: 'Xem & Duyệt', theme: 'pink', icon: '2-svg.svg' },
  { title: 'Khóa học trễ hạn duyệt', description: 'Chờ duyệt quá hạn (> 2 tuần)', count: 3, suffix: 'khóa học cần xử lý', status: 'Cần phê duyệt', action: 'Xử lý', theme: 'amber', icon: '2-svg2.svg' },
  { title: 'Khiếu nại tài khoản', description: 'Ticket khiếu nại mức độ cao', count: 2, suffix: 'ticket chưa xử lý', status: 'Ưu tiên cao', action: 'Xử lý ngay', theme: 'pink', icon: '2-svg4.svg' },
  { title: 'Cảnh báo vận hành', description: 'Giám sát sức khỏe nền tảng', count: 0, suffix: 'sự cố ghi nhận', status: 'Vận hành ổn định', action: 'Kiểm tra', theme: 'blue', icon: '2-svg6.svg' }
];

export const TOP_COURSES = [
  { name: 'Python cơ bản', purchases: '12.480', rating: '4,9' },
  { name: 'Thiết kế UI/UX với Figma', purchases: '8.320', rating: '4,8' },
  { name: 'Phân tích dữ liệu với Excel', purchases: '6.540', rating: '4,7' },
  { name: 'Java nâng cao', purchases: '5.210', rating: '4,8' },
  { name: 'Marketing số', purchases: '4.490', rating: '4,5' }
];

export const AUDIT_LOGS: AuditLog[] = [
  { time: '12/10/2026 14:30:22', account: 'thanhtri@thinkup.vn', role: 'Academic (CA)', action: 'Cập nhật trạng thái khóa học', ip: '14.233.18.17', id: '10293', actor: 'Thanh Duy Academic (CA)', actionCode: 'UPDATE_COURSE_STATUS', device: 'Chrome 114, Windows 11', entity: '[Khóa học: Lập trình Angular 21]', previous: '{\n  "id": 10293,\n  "title": "Lập trình Angular 21",\n  "status": "pending_review",\n  "approved_by": null,\n  "updated_at": "2026-10-12 14:30:22"\n}', current: '{\n  "id": 10293,\n  "title": "Lập trình Angular 21",\n  "status": "published",\n  "approved_by": "Thanh Duy (CA)",\n  "updated_at": "2026-10-12 14:30:22"\n}' },
  { time: '12/10/2026 13:12:45', account: 'minhtram@thinkup.vn', role: 'Finance (FA)', action: 'Xử lý yêu cầu hoàn tiền', ip: '113.172.56.12' },
  { time: '12/10/2026 13:02:35', account: 'quangduy@thinkup.vn', role: 'Support (CS)', action: 'Phản hồi ticket hỗ trợ', ip: '171.81.033.33' },
  { time: '12/10/2026 12:19:37', account: 'admin@thinkup.vn', role: 'Admin', action: 'Cập nhật cấu hình hệ thống', ip: '123.45.67.89' },
  { time: '11/10/2026 14:58:30', account: 'ngochao@thinkup.vn', role: 'Academic (CA)', action: 'Duyệt khóa học', ip: '14.246.67.90' }
];

export interface RevenuePoint { month: string; original: number; marketplace: number; payout: number; }

export const REVENUE_BARS: RevenuePoint[] = [
  { month: '06/25', original: 145, marketplace: 48, payout: 132 }, { month: '07/25', original: 125, marketplace: 46, payout: 107 },
  { month: '08/25', original: 183, marketplace: 45, payout: 153 }, { month: '09/25', original: 143, marketplace: 55, payout: 120 },
  { month: '10/25', original: 178, marketplace: 41, payout: 165 }, { month: '11/25', original: 184, marketplace: 46, payout: 187 },
  { month: '12/25', original: 193, marketplace: 48, payout: 179 }, { month: '01/26', original: 145, marketplace: 66, payout: 137 },
  { month: '02/26', original: 205, marketplace: 56, payout: 191 }, { month: '03/26', original: 184, marketplace: 40, payout: 160 },
  { month: '04/26', original: 151, marketplace: 36, payout: 124 }, { month: '05/26', original: 199, marketplace: 48, payout: 130 }
];

// TODO(pre-deploy): Nhớ thay các bộ dữ liệu biểu đồ mẫu bằng response thống nhất từ API analytics.
export const REVENUE_DATASETS: Record<string, RevenuePoint[]> = {
  Ngày: [
    { month: 'T2', original: 42, marketplace: 12, payout: 28 }, { month: 'T3', original: 55, marketplace: 16, payout: 35 },
    { month: 'T4', original: 48, marketplace: 19, payout: 32 }, { month: 'T5', original: 61, marketplace: 21, payout: 40 },
    { month: 'T6', original: 73, marketplace: 25, payout: 48 }, { month: 'T7', original: 68, marketplace: 22, payout: 45 }, { month: 'CN', original: 51, marketplace: 18, payout: 36 }
  ],
  Tuần: [
    { month: 'T1', original: 118, marketplace: 31, payout: 96 }, { month: 'T2', original: 136, marketplace: 38, payout: 108 },
    { month: 'T3', original: 149, marketplace: 42, payout: 119 }, { month: 'T4', original: 131, marketplace: 35, payout: 104 },
    { month: 'T5', original: 158, marketplace: 46, payout: 128 }, { month: 'T6', original: 172, marketplace: 49, payout: 143 }, { month: 'T7', original: 165, marketplace: 44, payout: 137 }
  ],
  Tháng: REVENUE_BARS,
  Năm: [
    { month: '01/26', original: 145, marketplace: 48, payout: 120 },
    { month: '02/26', original: 168, marketplace: 52, payout: 135 },
    { month: '03/26', original: 194, marketplace: 55, payout: 150 },
    { month: '04/26', original: 178, marketplace: 50, payout: 142 },
    { month: '05/26', original: 205, marketplace: 60, payout: 165 },
    { month: '06/26', original: 218, marketplace: 62, payout: 170 },
    { month: '07/26', original: 190, marketplace: 58, payout: 155 },
    { month: '08/26', original: 225, marketplace: 65, payout: 180 },
    { month: '09/26', original: 240, marketplace: 68, payout: 192 },
    { month: '10/26', original: 232, marketplace: 64, payout: 185 },
    { month: '11/26', original: 250, marketplace: 70, payout: 200 },
    { month: '12/26', original: 267, marketplace: 75, payout: 215 }
  ],
  Quý: [
    { month: 'Q1/25', original: 178, marketplace: 44, payout: 142 }, { month: 'Q2/25', original: 192, marketplace: 48, payout: 154 },
    { month: 'Q3/25', original: 215, marketplace: 56, payout: 173 }, { month: 'Q4/25', original: 238, marketplace: 61, payout: 191 },
    { month: 'Q1/26', original: 251, marketplace: 66, payout: 204 }, { month: 'Q2/26', original: 268, marketplace: 72, payout: 220 }
  ]
};
