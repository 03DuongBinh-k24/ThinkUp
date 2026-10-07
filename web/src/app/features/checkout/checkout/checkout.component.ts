import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CommerceService } from '../../../core/services/commerce.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css',
})
export class CheckoutComponent {
  private commerce = inject(CommerceService);
  private router = inject(Router);

  selectedCategory = signal<'domestic' | 'wallet'>('domestic');
  selectedMethod = signal('bank-transfer');
  processing = signal(false);
  acceptedTerms = signal(true);

  readonly courses = this.commerce.checkoutCourses;
  readonly subtotal = computed(() =>
    this.courses().reduce((sum, c) => sum + c.salePrice, 0)
  );
  readonly total = computed(() => this.subtotal());

  readonly domesticMethods = [
    { id: 'bank-transfer', name: 'Chuyển khoản trực tiếp (QR Pay / VietQR)', desc: 'Chuyển khoản nhanh qua tài khoản ngân hàng hoặc quét mã QR' },
    { id: 'atm', name: 'Thẻ ATM / Internet Banking', desc: 'Thẻ ghi nợ nội địa phát hành bởi các ngân hàng Việt Nam' },
  ];

  readonly walletMethods = [
    { id: 'momo', name: 'Ví MoMo', desc: 'Thanh toán tức thì qua ứng dụng MoMo' },
    { id: 'zalopay', name: 'Ví ZaloPay', desc: 'Thanh toán qua ví ZaloPay hoặc ứng dụng Zalo' },
  ];

  selectMethod(id: string): void {
    this.selectedMethod.set(id);
  }

  confirmPayment(): void {
    if (this.courses().length === 0 || this.processing()) return;
    this.processing.set(true);

    setTimeout(() => {
      this.commerce.completePurchase({
        courses: this.courses(),
        summary: { subtotal: this.subtotal(), voucherDiscount: 0, total: this.total() },
        paymentMethod: this.selectedMethod(),
      });
      this.commerce.finalizeCheckout();
      this.processing.set(false);
      this.router.navigate(['/main/checkout/success']);
    }, 1200);
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
  }
}
