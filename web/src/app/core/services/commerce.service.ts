import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { CartItem, OrderSummary, Voucher, TransactionRow, TransactionDetail } from '../models/commerce.model';
import { Course } from '../models/course.model';
import { MOCK_COURSES } from '../data/mock/mock-courses';
import { MOCK_BILLING_DETAILS, MOCK_BILLING_EMAIL, MOCK_BILLING_ROWS } from '../data/mock/mock-billing';

function formatMoney(value: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
}

function normalizeCommerceCourse(course: Course): CartItem {
  return {
    ...course,
    displayTitle: course.displayTitle || course.title,
    instructorInitial: course.instructorInitial || course.instructor?.charAt(0) || 'T',
    students: course.students || `${course.studentsCount?.toLocaleString('vi-VN') || 0} học viên`,
    thumbnail: course.thumbnail || course.id,
    theme: course.theme || 'from-[#155DFC] to-[#14B8A6]',
    shortLabel: course.shortLabel || course.icon || course.title?.split(' ').slice(0, 2).join(' '),
  };
}

@Injectable({ providedIn: 'root' })
export class CommerceService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // State
  private _cartItems = signal<CartItem[]>([]);
  private _checkoutIds = signal<string[]>([]);
  private _transactions = signal<TransactionRow[]>([]);
  private _transactionDetails = signal<Record<string, TransactionDetail>>({});

  readonly cartItems = this._cartItems.asReadonly();
  readonly cartCount = computed(() => this._cartItems().length);
  readonly checkoutIds = this._checkoutIds.asReadonly();
  readonly checkoutCourses = computed(() => {
    const ids = this._checkoutIds();
    const items = this._cartItems();
    if (ids.length === 0) return items; // Default to all if none selected
    return items.filter(item => ids.includes(item.id));
  });
  // TODO(pre-deploy): Nhớ bỏ giao dịch mẫu khi lịch sử thanh toán lấy từ API theo tài khoản.
  readonly transactions = () => {
    const email = this.currentUserEmail();
    const ownTransactions = this._transactions().filter(row =>
      this._transactionDetails()[row.id]?.invoice.buyer.email.toLowerCase() === email,
    );
    return email === MOCK_BILLING_EMAIL
      ? [...ownTransactions, ...MOCK_BILLING_ROWS.filter(row => !ownTransactions.some(own => own.id === row.id))]
      : ownTransactions;
  };

  constructor() {
    this.loadFromStorage();
  }

  private currentUserEmail(): string {
    try {
      const user = JSON.parse(localStorage.getItem('thinkup_current_user') || 'null') as { email?: string } | null;
      return user?.email?.toLowerCase() || '';
    } catch { return ''; }
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem('thinkup-commerce');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.state) {
          if (data.state.cartCourses?.length) this._cartItems.set(data.state.cartCourses);
          if (data.state.completedTransactions) this._transactions.set(data.state.completedTransactions);
          if (data.state.transactionDetails) this._transactionDetails.set(data.state.transactionDetails);
          return;
        }
      }
      // TODO(pre-deploy): Nhớ xóa giỏ hàng mẫu khi có dữ liệu giỏ hàng thật.
      // Initial sample cart items
      const sample = MOCK_COURSES.slice(0, 2).map(normalizeCommerceCourse);
      this._cartItems.set(sample);
      this._checkoutIds.set(sample.map(s => s.id));
      this.persistState();
    } catch {
      const sample = MOCK_COURSES.slice(0, 2).map(normalizeCommerceCourse);
      this._cartItems.set(sample);
    }
  }

  private persistState(): void {
    try {
      const state = {
        state: {
          cartCourses: this._cartItems(),
          checkoutCourseIds: this._checkoutIds(),
          completedTransactions: this._transactions(),
          transactionDetails: this._transactionDetails(),
        }
      };
      localStorage.setItem('thinkup-commerce', JSON.stringify(state));
    } catch {}
  }

  // Cart API
  getCart(): Observable<{ success: boolean; data: CartItem[] }> {
    return this.http.get<{ success: boolean; data: CartItem[] }>(`${this.apiUrl}/user/cart`, { withCredentials: true }).pipe(
      tap(res => {
        if (res.success && res.data) {
          this._cartItems.set(res.data.map(normalizeCommerceCourse));
          this.persistState();
        }
      }),
      catchError(() => of({ success: true, data: this._cartItems() }))
    );
  }

  addToCart(courseId: string): Observable<{ success: boolean; data: CartItem[]; added: boolean }> {
    const course = MOCK_COURSES.find(c => c.id === courseId);
    if (course) {
      const normalized = normalizeCommerceCourse(course);
      if (!this._cartItems().some(i => i.id === courseId)) {
        this._cartItems.update(items => [normalized, ...items]);
        this.persistState();
      }
    }

    return this.http.post<{ success: boolean; data: CartItem[]; added: boolean }>(
      `${this.apiUrl}/user/cart`, { courseId }, { withCredentials: true }
    ).pipe(
      tap(res => {
        if (res.success && res.data) {
          this._cartItems.set(res.data.map(normalizeCommerceCourse));
          this.persistState();
        }
      }),
      catchError(() => of({ success: true, data: this._cartItems(), added: true }))
    );
  }

  removeFromCart(courseId: string): Observable<{ success: boolean; data: CartItem[] }> {
    this._cartItems.update(items => items.filter(item => item.id !== courseId));
    this._checkoutIds.update(ids => ids.filter(id => id !== courseId));
    this.persistState();

    return this.http.delete<{ success: boolean; data: CartItem[] }>(
      `${this.apiUrl}/user/cart`, { body: { courseId }, withCredentials: true }
    ).pipe(
      catchError(() => of({ success: true, data: this._cartItems() }))
    );
  }

  setCheckoutCourses(courseIds: string[]): void {
    this._checkoutIds.set(courseIds);
    this.persistState();
  }

  // TODO(pre-deploy): Nhớ xóa giao dịch và hóa đơn mock khi tích hợp thanh toán thật.
  completePurchase(params: {
    courses: CartItem[];
    summary: OrderSummary;
    paymentMethod: string;
    voucher?: Voucher;
    orderId?: string;
    buyerEmail?: string;
  }): TransactionDetail {
    const now = new Date();
    const timestamp = now.getTime();
    const suffix = String(timestamp).slice(-8);
    const id = params.orderId || `GD${suffix}`;

    let buyerName = 'Khách hàng ThinkUp';
    let buyerEmail = params.buyerEmail || 'user@thinkup.vn';
    let buyerPhone = '';

    try {
      const userStr = localStorage.getItem('thinkup_current_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        buyerName = user.full_name || user.fullName || user.name || buyerName;
        if (!params.buyerEmail) buyerEmail = user.email || buyerEmail;
        buyerPhone = user.phone || user.phone_number || '';
      }
    } catch {}

    const timeStr = now.toLocaleString('vi-VN', { hour12: false });
    const dateStr = now.toLocaleDateString('vi-VN');
    const timeOnly = now.toLocaleTimeString('vi-VN', { hour12: false });

    const row: TransactionRow = {
      id,
      courses: params.courses.map(c => c.displayTitle || c.title),
      paymentMethod: params.paymentMethod,
      amount: formatMoney(params.summary.total),
      status: 'success',
      date: dateStr,
      time: timeOnly,
      timestamp,
    };

    const detail: TransactionDetail = {
      id,
      transactionCode: `THKUP-${suffix}`,
      paymentMethod: params.paymentMethod,
      createdAt: timeStr,
      paidAt: timeStr,
      completedAt: timeStr,
      paymentContent: `Đơn hàng ${suffix}`,
      status: 'success',
      order: {
        countLabel: `${params.courses.length} khóa học`,
        courses: params.courses.map(c => ({
          id: c.id,
          title: c.displayTitle || c.title,
          instructor: c.instructor,
          price: formatMoney(c.salePrice),
          originalPrice: formatMoney(c.originalPrice),
          badge: c.shortLabel || c.icon || 'Course',
          tone: 'blue',
        })),
        subtotal: formatMoney(params.summary.subtotal),
        courseDiscount: formatMoney(0),
        voucherDiscount: `-${formatMoney(params.summary.voucherDiscount)}`,
        voucherCode: params.voucher?.code || '',
        total: formatMoney(params.summary.total),
      },
      payment: {
        bank: params.paymentMethod,
        accountNumber: '—',
        accountName: 'THINKUP',
        transferContent: `THINKUP ${suffix}`,
        paidAmount: formatMoney(params.summary.total),
        bankTransactionCode: `FT${timestamp}`,
        paidAt: timeStr,
      },
      invoice: {
        code: `HD-${suffix}`,
        issuedAt: timeStr,
        status: 'Đã phát hành',
        buyer: { name: buyerName, email: buyerEmail, phone: buyerPhone },
      },
    };

    this._transactions.update(txs => [row, ...txs]);
    this._transactionDetails.update(details => ({ ...details, [id]: detail }));
    this.persistState();
    return detail;
  }

  finalizeCheckout(): void {
    const checkoutIds = this._checkoutIds();
    this._cartItems.update(items => items.filter(item => !checkoutIds.includes(item.id)));
    this._checkoutIds.set([]);
    this.persistState();
  }

  getTransactionDetail(id: string): TransactionDetail | undefined {
    const email = this.currentUserEmail();
    const detail = this._transactionDetails()[id] ?? (email === MOCK_BILLING_EMAIL ? MOCK_BILLING_DETAILS[id] : undefined);
    return detail?.invoice.buyer.email.toLowerCase() === email ? detail : undefined;
  }
}
