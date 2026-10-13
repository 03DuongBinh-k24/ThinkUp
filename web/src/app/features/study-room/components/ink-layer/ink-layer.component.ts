import { Component, input, signal } from '@angular/core';

interface Stroke { points: { x: number; y: number }[]; color: string; width: number; }

@Component({ selector: 'app-ink-layer', standalone: true, templateUrl: './ink-layer.component.html', styleUrl: './ink-layer.component.css' })
export class InkLayerComponent {
  readonly enabled = input(false);
  readonly color = signal('#714cb6');
  readonly width = signal(3);
  readonly strokes = signal<Stroke[]>([]);
  readonly colors = ['#714cb6', '#e05297', '#2daa6e', '#e8913a', '#2563eb', '#292827'];
  private drawing = false;
  start(event: PointerEvent): void {
    if (!this.enabled()) return;
    (event.target as SVGSVGElement).setPointerCapture(event.pointerId);
    this.drawing = true;
    this.strokes.update(current => [...current, { points: [{ x: event.clientX, y: event.clientY }], color: this.color(), width: this.width() }]);
  }
  move(event: PointerEvent): void {
    if (!this.drawing) return;
    this.strokes.update(current => current.map((stroke, index) => index === current.length - 1 ? { ...stroke, points: [...stroke.points, { x: event.clientX, y: event.clientY }] } : stroke));
  }
  end(): void { this.drawing = false; }
  points(stroke: Stroke): string { return stroke.points.map(point => `${point.x},${point.y}`).join(' '); }
  setWidth(event: Event): void { this.width.set(Number((event.target as HTMLInputElement).value)); }
  clear(): void { this.strokes.set([]); }
}
