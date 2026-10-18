import { Injectable, computed, signal } from '@angular/core';

export interface UserNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  href?: string;
}

const STORAGE_PREFIX = 'thinkup_notifications_';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly activeUserId = signal<string | null>(null);
  readonly items = signal<UserNotification[]>([]);
  readonly unreadCount = computed(() => this.items().filter(item => !item.readAt).length);

  setUser(userId: string | null): void {
    if (this.activeUserId() === userId) return;
    this.activeUserId.set(userId);
    this.items.set(userId ? this.read(userId) : []);
  }

  syncFromStorage(): void {
    const userId = this.activeUserId();
    if (userId) this.items.set(this.read(userId));
  }

  addForUser(userId: string, notification: Omit<UserNotification, 'readAt'>): void {
    const existing = this.read(userId);
    if (existing.some(item => item.id === notification.id)) return;
    const next = [{ ...notification, readAt: null }, ...existing];
    this.write(userId, next);
    if (this.activeUserId() === userId) this.items.set(next);
  }

  markRead(id: string): void {
    this.update(items => items.map(item => item.id === id && !item.readAt
      ? { ...item, readAt: new Date().toISOString() }
      : item));
  }

  markAllRead(): void {
    this.update(items => items.map(item => item.readAt
      ? item
      : { ...item, readAt: new Date().toISOString() }));
  }

  private update(transform: (items: UserNotification[]) => UserNotification[]): void {
    const userId = this.activeUserId();
    if (!userId) return;
    const next = transform(this.items());
    this.items.set(next);
    this.write(userId, next);
  }

  private read(userId: string): UserNotification[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const value: unknown = JSON.parse(localStorage.getItem(STORAGE_PREFIX + userId) || '[]');
      return Array.isArray(value) ? value.filter((item): item is UserNotification =>
        typeof item?.id === 'string' && typeof item?.title === 'string' && typeof item?.message === 'string'
      ) : [];
    } catch {
      return [];
    }
  }

  private write(userId: string, items: UserNotification[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(items));
    } catch {
      // Storage unavailable: keep the in-memory notification state for this tab.
    }
  }
}
