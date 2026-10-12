import { Component, inject, input, output, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CanvasItemKind } from '../add-to-canvas-menu/add-to-canvas-menu.component';
import { LucideEraser, LucideImage, LucideLink, LucidePalette, LucideTrash2 } from '@lucide/angular';

export interface CanvasItem { id: string; kind: CanvasItemKind; content: string; x: number; y: number; width: number; height: number; color?: string; url?: string; strokes?: string[]; }

@Component({ selector: 'app-canvas-item', standalone: true, imports: [LucideEraser, LucideImage, LucideLink, LucidePalette, LucideTrash2], templateUrl: './canvas-item.component.html', styleUrl: './canvas-item.component.css' })
export class CanvasItemComponent {
  readonly item = input.required<CanvasItem>();
  readonly itemChange = output<Partial<CanvasItem>>();
  readonly remove = output<void>();
  readonly selected = signal(false);
  readonly editing = signal(false);
  readonly drawing = signal(false);
  readonly drawMode = signal(false);
  readonly paletteOpen = signal(false);
  readonly urlInput = signal('');
  readonly colors = ['#fff4a8', '#ffd6e8', '#d2f5df', '#d8eaff', '#e8dcff'];
  private readonly sanitizer = inject(DomSanitizer);
  private points: string[] = [];
  private priorStrokes: string[] = [];
  onInput(event: Event): void { this.itemChange.emit({ content: (event.target as HTMLTextAreaElement).value }); }
  saveUrl(): void { this.itemChange.emit({ url: this.urlInput().trim() }); this.editing.set(false); }
  embedUrl(): SafeResourceUrl | null { const url = this.item().url || ''; const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/); return match ? this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${match[1]}?autoplay=0`) : null; }
  startStroke(event: PointerEvent): void { if (!this.drawMode()) return; this.drawing.set(true); this.priorStrokes = this.item().strokes || []; this.points = [this.point(event)]; (event.target as Element).setPointerCapture(event.pointerId); }
  moveStroke(event: PointerEvent): void { if (!this.drawing()) return; this.points.push(this.point(event)); this.itemChange.emit({ strokes: [...this.priorStrokes, this.points.join(' ')] }); }
  endStroke(): void { this.drawing.set(false); this.points = []; }
  private point(event: PointerEvent): string { const rect = (event.currentTarget as Element).getBoundingClientRect(); return `${((event.clientX - rect.left) / rect.width * 100).toFixed(2)},${((event.clientY - rect.top) / rect.height * 100).toFixed(2)}`; }
}
