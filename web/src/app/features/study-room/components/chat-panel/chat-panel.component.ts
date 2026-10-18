import { Component, ElementRef, afterNextRender, computed, effect, input, output, signal, viewChild } from '@angular/core';
import { LucideClock3, LucideMessageCircle, LucideSend, LucideUsers, LucideX } from '@lucide/angular';

export interface RoomChatMessage { id: string; senderId: string; sender: string; text: string; time: string; initials: string; color: string; isMe?: boolean; }

@Component({ selector: 'app-chat-panel', standalone: true, imports: [LucideClock3, LucideMessageCircle, LucideSend, LucideUsers, LucideX], templateUrl: './chat-panel.component.html', styleUrl: './chat-panel.component.css' })
export class ChatPanelComponent {
  readonly messagesHost = viewChild<ElementRef<HTMLDivElement>>('messagesHost');
  readonly draftInput = viewChild<ElementRef<HTMLTextAreaElement>>('draftInput');
  readonly messages = input.required<readonly RoomChatMessage[]>();
  readonly memberCount = input.required<number>();
  readonly close = output<void>();
  readonly send = output<string>();
  readonly draft = signal('');
  readonly lastTime = computed(() => this.messages().at(-1)?.time || 'Chưa có');
  constructor() {
    afterNextRender(() => {
      this.draftInput()?.nativeElement.focus();
      this.scrollToLatest();
    });
    effect(() => {
      this.messages();
      queueMicrotask(() => this.scrollToLatest());
    });
  }
  onInput(event: Event): void { this.draft.set((event.target as HTMLTextAreaElement).value); }
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); this.submit(); }
  }
  submit(): void { const text = this.draft().trim(); if (text) { this.send.emit(text); this.draft.set(''); } }
  private scrollToLatest(): void {
    const host = this.messagesHost()?.nativeElement;
    if (host) host.scrollTo({ top: host.scrollHeight, behavior: 'smooth' });
  }
}
