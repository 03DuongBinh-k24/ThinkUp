import { Component, output } from '@angular/core';

export type CanvasItemKind = 'text' | 'note' | 'image' | 'gif' | 'youtube' | 'whiteboard';

@Component({
  selector: 'app-add-to-canvas-menu',
  standalone: true,
  templateUrl: './add-to-canvas-menu.component.html',
  styleUrl: './add-to-canvas-menu.component.css'
})
export class AddToCanvasMenuComponent {
  readonly addItem = output<CanvasItemKind>();
  readonly close = output<void>();
  readonly items: { key: CanvasItemKind; label: string; desc: string }[] = [
    { key: 'text', label: 'Text', desc: 'Tiêu đề' },
    { key: 'note', label: 'Ghi chú', desc: 'Ý tưởng nhanh' },
    { key: 'image', label: 'Ảnh', desc: 'PNG / JPG' },
    { key: 'gif', label: 'GIF', desc: 'Từ Giphy' },
    { key: 'youtube', label: 'YouTube', desc: 'Video nhúng' },
    { key: 'whiteboard', label: 'Bảng', desc: 'Vẽ tự do' }
  ];
  select(kind: CanvasItemKind): void { this.addItem.emit(kind); this.close.emit(); }
}
