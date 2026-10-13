import { Component, HostListener, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommerceService } from '../../../core/services/commerce.service';

@Component({
  selector: 'app-purchase-transaction-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './purchase-transaction-detail.component.html',
  styleUrl: './purchase-transaction-detail.component.css',
})
export class PurchaseTransactionDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly commerce = inject(CommerceService);
  readonly detail = this.commerce.getTransactionDetail(this.route.snapshot.paramMap.get('id') ?? '');
  readonly invoiceOpen = signal(false);
  readonly copied = signal('');

  @HostListener('document:keydown.escape')
  closeInvoice(): void { this.invoiceOpen.set(false); }

  async copy(value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      this.copied.set(value);
      window.setTimeout(() => this.copied.set(''), 1600);
    } catch { this.copied.set(''); }
  }

  downloadInvoice(): void {
    const detail = this.detail;
    if (!detail || detail.status !== 'success') return;
    const lines = ['HÓA ĐƠN ĐIỆN TỬ THINKUP', `Mã hóa đơn: ${detail.invoice.code}`, `Mã giao dịch: ${detail.transactionCode}`, `Người mua: ${detail.invoice.buyer.name}`, `Email: ${detail.invoice.buyer.email}`, `Phương thức: ${detail.paymentMethod}`, ...detail.order.courses.map(course => `${course.title}: ${course.price}`), `Tổng thanh toán: ${detail.order.total}`];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${detail.invoice.code}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
