import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { EXPORT_FORMAT_OPTIONS, ExportFormat, ExportFormatOption } from '../../utils/export-formats';

@Component({
  selector: 'app-export-menu',
  standalone: true,
  templateUrl: './export-menu.component.html',
  styleUrl: './export-menu.component.css'
})
export class ExportMenuComponent {
  /** Nhãn truy cập (aria) của nút, mô tả đúng dữ liệu đang xuất. */
  @Input() label = 'Xuất dữ liệu';
  /** Hiển thị nhãn trên trigger khi toolbar có đủ không gian; mặc định giữ dạng icon-only. */
  @Input() showText = false;
  /** Kiểu nút: primary (xanh đặc) cho thao tác chính, secondary (nền trắng) cho toolbar phụ. */
  @Input() variant: 'primary' | 'secondary' = 'primary';
  /** Khoá xuất dữ liệu khi nghiệp vụ đang bị chặn (ví dụ checksum kiểm toán sai lệch). */
  @Input() disabled = false;
  /**
   * Danh sách định dạng mời chọn. Màn hình dùng endpoint export chỉ trả CSV (người dùng) truyền
   * `['csv']` để không mời một định dạng backend không tạo ra.
   */
  @Input() formats: ReadonlyArray<ExportFormat> | null = null;
  @Output() readonly formatChange = new EventEmitter<ExportFormat>();
  readonly open = signal(false);

  get options(): ReadonlyArray<ExportFormatOption> {
    if (!this.formats?.length) return EXPORT_FORMAT_OPTIONS;
    return EXPORT_FORMAT_OPTIONS.filter((option) => this.formats?.includes(option.format));
  }

  toggle(): void {
    if (this.disabled) return;
    this.open.update(value => !value);
  }
  close(): void { this.open.set(false); }
  choose(format: ExportFormat): void {
    this.formatChange.emit(format);
    this.close();
  }
}
