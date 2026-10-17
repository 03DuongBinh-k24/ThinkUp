import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TransactionDetail, TransactionRow } from '../../../core/models/commerce.model';

interface PurchaseCoursePayload { title?: string; }
interface PurchaseRowPayload {
  order_id: string;
  transaction_id: string;
  payment_method: string;
  amount: number;
  status: string;
  courses: PurchaseCoursePayload[];
  created_at: string | null;
}
interface PurchaseListPayload { transactions: PurchaseRowPayload[]; total: number; }
interface PurchaseSummaryPayload {
  totalTransactions: number;
  totalSpent: number;
  totalCoursesPurchased: number;
}

const money = (value: number): string => `${new Intl.NumberFormat('vi-VN').format(value)}đ`;

@Injectable({ providedIn: 'root' })
export class PurchaseHistoryService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/user/purchase`;

  list(): Observable<TransactionRow[]> {
    return this.http.get<PurchaseListPayload>(this.base).pipe(
      map(response => response.transactions.map(row => {
        const created = row.created_at ? new Date(row.created_at) : null;
        const timestamp = created && !Number.isNaN(created.getTime()) ? created.getTime() : 0;
        return {
          id: row.order_id || row.transaction_id,
          courses: row.courses.map(course => course.title || ''),
          paymentMethod: row.payment_method,
          amount: money(row.amount),
          status: row.status,
          date: timestamp ? created!.toLocaleDateString('vi-VN') : '—',
          time: timestamp ? created!.toLocaleTimeString('vi-VN', { hour12: false }) : '—',
          timestamp,
        };
      }))
    );
  }

  summary(): Observable<PurchaseSummaryPayload> {
    return this.http.get<PurchaseSummaryPayload>(`${this.base}/summary`);
  }

  detail(id: string): Observable<TransactionDetail> {
    return this.http.get<TransactionDetail>(`${environment.apiUrl}/user/billing/${encodeURIComponent(id)}`);
  }
}
