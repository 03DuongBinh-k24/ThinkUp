import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly toastsSignal = signal<ToastItem[]>([]);
  readonly toasts = this.toastsSignal.asReadonly();

  showToast(toast: { type?: ToastType; message: string; duration?: number }): void {
    const id = Date.now() + Math.random();
    const newItem: ToastItem = {
      id,
      type: toast.type || 'info',
      message: toast.message
    };

    this.toastsSignal.update(items => [...items, newItem]);

    const duration = toast.duration ?? 4000;
    setTimeout(() => {
      this.removeToast(id);
    }, duration);
  }

  removeToast(id: number): void {
    this.toastsSignal.update(items => items.filter(t => t.id !== id));
  }
}
