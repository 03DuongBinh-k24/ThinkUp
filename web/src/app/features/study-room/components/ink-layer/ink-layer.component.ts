import { Component, input, output, signal } from '@angular/core';

export interface InkStroke { id: string; points: { x: number; y: number }[]; color: string; width: number; }

@Component({ selector: 'app-ink-layer', standalone: true, templateUrl: './ink-layer.component.html', styleUrl: './ink-layer.component.css' })
export class InkLayerComponent {
  readonly enabled = input(false);
  readonly optionsOpen = input(false);
  readonly scale = input(1);
  readonly pan = input({ x: 0, y: 0 });
  readonly strokes = input<InkStroke[]>([]);
  readonly strokesChange = output<InkStroke[]>();
  readonly strokeCommit = output<InkStroke[]>();
  readonly closeOptions = output<void>();
  readonly color = signal('#714cb6');
  readonly width = signal(3);
  readonly colors = ['#714cb6', '#e05297', '#2daa6e', '#e8913a', '#2563eb', '#292827'];
  private drawing = false;
  private baseStrokes: InkStroke[] = [];
  private activeStroke: InkStroke | null = null;
  start(event: PointerEvent): void {
    if (!this.enabled()) return;
    const layer = event.currentTarget as SVGSVGElement;
    layer.setPointerCapture(event.pointerId);
    this.drawing = true;
    this.baseStrokes = [...this.strokes()];
    this.activeStroke = { id: crypto.randomUUID(), points: [this.toCanvasPoint(event)], color: this.color(), width: this.width() };
    this.strokesChange.emit([...this.baseStrokes, this.activeStroke]);
  }
  move(event: PointerEvent): void {
    if (!this.drawing || !this.activeStroke) return;
    this.activeStroke = { ...this.activeStroke, points: [...this.activeStroke.points, this.toCanvasPoint(event)] };
    this.strokesChange.emit([...this.baseStrokes, this.activeStroke]);
  }
  end(): void {
    if (this.drawing && this.activeStroke) this.strokeCommit.emit([...this.baseStrokes, this.activeStroke]);
    this.drawing = false;
    this.activeStroke = null;
    this.baseStrokes = [];
  }
  points(stroke: InkStroke): string { return stroke.points.map(point => `${point.x},${point.y}`).join(' '); }
  setWidth(event: Event): void { this.width.set(Number((event.target as HTMLInputElement).value)); }
  clear(): void {
    this.drawing = false;
    this.activeStroke = null;
    this.baseStrokes = [];
    this.strokesChange.emit([]);
    this.strokeCommit.emit([]);
  }
  worldTransform(): string { return `translate(${this.pan().x} ${this.pan().y}) scale(${this.scale()})`; }

  private toCanvasPoint(event: PointerEvent): { x: number; y: number } {
    const scale = Math.max(this.scale(), 0.1);
    return { x: (event.clientX - this.pan().x) / scale, y: (event.clientY - this.pan().y) / scale };
  }
}
