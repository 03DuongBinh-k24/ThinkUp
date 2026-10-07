import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommerceService } from '../../../core/services/commerce.service';
import { FavoritesService } from '../../../core/services/favorites.service';
import { CartItem } from '../../../core/models/commerce.model';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css',
})
export class CartComponent implements OnInit {
  private commerce = inject(CommerceService);
  private favorites = inject(FavoritesService);
  private router = inject(Router);

  loading = signal(true);
  selectedIds = signal<string[]>([]);
  voucherCode = signal('');
  voucherDiscount = signal(0);
  voucherApplied = signal(false);

  readonly cartItems = this.commerce.cartItems;
  readonly isAllSelected = computed(() =>
    this.cartItems().length > 0 && this.selectedIds().length === this.cartItems().length
  );

  readonly selectedTotal = computed(() => {
    const ids = this.selectedIds();
    return this.cartItems()
      .filter(item => ids.includes(item.id))
      .reduce((sum, item) => sum + item.salePrice, 0);
  });

  readonly finalTotal = computed(() => {
    const total = this.selectedTotal() - this.voucherDiscount();
    return total > 0 ? total : 0;
  });

  ngOnInit(): void {
    this.commerce.getCart().subscribe({
      next: () => {
        this.selectedIds.set(this.cartItems().map(item => item.id));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleSelect(id: string): void {
    this.selectedIds.update(ids =>
      ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]
    );
  }

  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.selectedIds.set([]);
    } else {
      this.selectedIds.set(this.cartItems().map(item => item.id));
    }
  }

  removeItem(courseId: string): void {
    this.commerce.removeFromCart(courseId).subscribe();
    this.selectedIds.update(ids => ids.filter(id => id !== courseId));
  }

  addToFavorites(item: CartItem): void {
    this.favorites.toggleFavorite(item).subscribe();
  }

  applyVoucher(): void {
    const code = this.voucherCode().trim().toUpperCase();
    if (code === 'THINKUP50' || code === 'WELCOME') {
      const discount = Math.round(this.selectedTotal() * 0.1); // 10%
      this.voucherDiscount.set(discount);
      this.voucherApplied.set(true);
    } else if (code) {
      alert('Mã giảm giá không hợp lệ hoặc đã hết hạn.');
    }
  }

  proceedToCheckout(): void {
    const ids = this.selectedIds();
    if (ids.length === 0) return;
    this.commerce.setCheckoutCourses(ids);
    this.router.navigate(['/main/checkout']);
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
  }
}
