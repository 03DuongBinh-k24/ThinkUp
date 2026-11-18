import { CartItem } from '../models/commerce.model';

export interface CartDemoAdapter {
  read(): CartItem[];
  write(items: CartItem[]): void;
  find(courseId: string): CartItem | undefined;
}

export function getCartDemoAdapter(): CartDemoAdapter | null {
  return null;
}
