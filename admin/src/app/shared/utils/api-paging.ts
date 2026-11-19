import { firstValueFrom, Observable } from 'rxjs';

/** Kích thước trang tối đa backend cho phép khi cần tải toàn bộ danh sách. */
export const API_FETCH_PAGE_SIZE = 100;

export interface ApiPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

/**
 * Tải hết các trang của một endpoint phân trang.
 *
 * Vì sao tải hết: các bảng Admin hiện lọc/sắp xếp phía client và cần KPI trên toàn bộ
 * dữ liệu. Backend đã có phân trang server-side; khi dữ liệu lớn hơn vài nghìn dòng cần
 * chuyển sang query server-side (TODO ghi trong từng adapter).
 */
export async function collectAllPages<T>(
  fetchPage: (page: number, pageSize: number) => Promise<ApiPage<T>>,
  pageSize: number = API_FETCH_PAGE_SIZE,
  maxPages = 40,
  /** Số trang tải song song; giữ 1 để tuần tự, tăng khi dữ liệu nhiều trang và endpoint chịu được. */
  concurrency = 1
): Promise<{ items: T[]; total: number }> {
  const first = await fetchPage(1, pageSize);
  const total = first.total ?? first.items.length;
  const pages = Math.min(first.pages || Math.ceil((total || first.items.length) / pageSize), maxPages);
  if (pages <= 1) { return { items: [...first.items], total }; }

  // Giữ đúng thứ tự trang: ghi theo index rồi nối, không phụ thuộc thứ tự request xong.
  const collected: Array<T[] | undefined> = new Array(pages + 1);
  collected[1] = first.items;
  let cursor = 2;
  const worker = async (): Promise<void> => {
    while (cursor <= pages) {
      const page = cursor; cursor += 1;
      const result = await fetchPage(page, pageSize);
      collected[page] = result.items;
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, pages - 1)) }, worker));

  const items = collected.slice(1, pages + 1).flatMap(page => page ?? []);
  return { items, total };
}

/** Chuyển một Observable phân trang thành Promise theo `ApiPage`. */
export function toApiPage<TItem, TResponse>(
  request: Observable<TResponse>,
  normalize: (response: TResponse) => ApiPage<TItem>
): Promise<ApiPage<TItem>> {
  return firstValueFrom(request).then(normalize);
}
