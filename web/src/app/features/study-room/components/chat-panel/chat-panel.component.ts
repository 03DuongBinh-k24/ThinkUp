import { Component, computed, input, output, signal } from '@angular/core';
import { LucideClock3, LucideMessageCircle, LucideSend, LucideUsers, LucideX } from '@lucide/angular';

export interface RoomChatMessage { id: string; sender: string; text: string; time: string; isMe?: boolean; }

@Component({ selector: 'app-chat-panel', standalone: true, imports: [LucideClock3, LucideMessageCircle, LucideSend, LucideUsers, LucideX], templateUrl: './chat-panel.component.html', styleUrl: './chat-panel.component.css' })
export class ChatPanelComponent {
  readonly messages = input.required<readonly RoomChatMessage[]>();
  readonly memberCount = input.required<number>();
  readonly close = output<void>();
  readonly send = output<string>();
  readonly draft = signal('');
  readonly lastTime = computed(() => this.messages().at(-1)?.time || 'Chưa có');
  onInput(event: Event): void { this.draft.set((event.target as HTMLTextAreaElement).value); }
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); this.submit(); }
  }
  submit(): void { const text = this.draft().trim(); if (text) { this.send.emit(text); this.draft.set(''); } }
}
