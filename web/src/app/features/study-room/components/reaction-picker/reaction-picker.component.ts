import { Component, output } from '@angular/core';

@Component({ selector: 'app-reaction-picker', standalone: true, templateUrl: './reaction-picker.component.html', styleUrl: './reaction-picker.component.css' })
export class ReactionPickerComponent {
  readonly select = output<string>();
  readonly close = output<void>();
  readonly emojis = ['🔥', '❤️', '👏', '💯', '💡', '🎉', '😂', '🚀'];
  choose(emoji: string): void { this.select.emit(emoji); this.close.emit(); }
}
