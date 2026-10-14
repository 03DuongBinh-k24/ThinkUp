import { Component, inject, input, output, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CanvasItemKind } from '../add-to-canvas-menu/add-to-canvas-menu.component';
import { LucideEraser, LucideImage, LucideLink, LucidePalette, LucideTrash2 } from '@lucide/angular';

export interface CanvasItem { id: string; kind: CanvasItemKind; content: string; x: number; y: number; width: number; height: number; color?: string; url?: string; strokes?: string[]; }

@Component({ selector: 'app-canvas-item', standalone: true, imports: [LucideEraser, LucideImage, LucideLink, LucidePalette, LucideTrash2], templateUrl: './canvas-item.component.html', styleUrl: './canvas-item.component.css' })
export class CanvasItemComponent {
  readonly item = input.required<CanvasItem>();
  readonly scale = input(1);
  readonly itemChange = output<Partial<CanvasItem>>();
  readonly remove = output<void>();
  readonly selected = signal(false);
  readonly editing = signal(false);
  readonly drawing = signal(false);
  readonly drawMode = signal(false);
  readonly paletteOpen = signal(false);
  readonly urlInput = signal('');
  readonly urlError = signal('');
  readonly colors = ['#fff4a8', '#ffd6e8', '#d2f5df', '#d8eaff', '#e8dcff'];
  private readonly sanitizer = inject(DomSanitizer);
  private points: string[] = [];
  private priorStrokes: string[] = [];
  private gesture: { mode: 'move' | 'resize'; clientX: number; clientY: number; x: number; y: number; width: number; height: number } | null = null;
  onInput(event: Event): void { this.itemChange.emit({ content: (event.target as HTMLTextAreaElement).value }); }
  saveUrl(): void {
    const raw=this.urlInput().trim();
    try {
      const url=new URL(raw);
      if(!['https:','http:'].includes(url.protocol))throw new Error('Đường dẫn phải bắt đầu bằng http hoặc https.');
      if(this.item().kind==='youtube' && !/(?:^|\.)youtube\.com$|(?:^|\.)youtu\.be$/.test(url.hostname))throw new Error('Vui lòng nhập link YouTube hợp lệ.');
      this.urlError.set('');this.itemChange.emit({ url: raw });this.editing.set(false);
    } catch { this.urlError.set('Vui lòng nhập đường dẫn hợp lệ.'); }
  }
  editUrl():void {this.urlInput.set(this.item().url || '');this.urlError.set('');this.editing.set(true);}
  startGesture(event:PointerEvent,mode:'move'|'resize'):void {
    event.preventDefault();event.stopPropagation();this.selected.set(true);
    const item=this.item();
    this.gesture={mode,clientX:event.clientX,clientY:event.clientY,x:item.x,y:item.y,width:item.width,height:item.height};
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
  }
  moveGesture(event:PointerEvent):void {
    if(!this.gesture)return;
    const dx=(event.clientX-this.gesture.clientX)/this.scale(),dy=(event.clientY-this.gesture.clientY)/this.scale();
    if(this.gesture.mode==='move')this.itemChange.emit({x:Math.max(0,this.gesture.x+dx),y:Math.max(0,this.gesture.y+dy)});
    else this.itemChange.emit({width:Math.max(120,this.gesture.width+dx),height:Math.max(80,this.gesture.height+dy)});
  }
  endGesture():void {this.gesture=null;}
  embedUrl(): SafeResourceUrl | null { const url = this.item().url || ''; const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/); return match ? this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${match[1]}?autoplay=0`) : null; }
  startStroke(event: PointerEvent): void { if (!this.drawMode()) return; this.drawing.set(true); this.priorStrokes = this.item().strokes || []; this.points = [this.point(event)]; (event.target as Element).setPointerCapture(event.pointerId); }
  moveStroke(event: PointerEvent): void { if (!this.drawing()) return; this.points.push(this.point(event)); this.itemChange.emit({ strokes: [...this.priorStrokes, this.points.join(' ')] }); }
  endStroke(): void { this.drawing.set(false); this.points = []; }
  private point(event: PointerEvent): string { const rect = (event.currentTarget as Element).getBoundingClientRect(); return `${((event.clientX - rect.left) / rect.width * 100).toFixed(2)},${((event.clientY - rect.top) / rect.height * 100).toFixed(2)}`; }
}
