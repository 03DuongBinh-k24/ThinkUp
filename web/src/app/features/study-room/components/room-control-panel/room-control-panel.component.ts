import { Component, input, output, signal } from '@angular/core';
import { MOCK_ROOM_PERMISSIONS } from '../../../../core/data/mock/mock-study-room-session';
import { LucideSettings, LucideCrown, LucideX, LucideUserPlus, LucidePlay, LucideCheck } from '@lucide/angular';

export interface RoomTheme { id: string; name: string; src: string; background?: string; grid?: string; type?: string; ambient?: string; }

@Component({ selector: 'app-room-control-panel', standalone: true, imports: [LucideSettings, LucideCrown, LucideX, LucideUserPlus, LucidePlay, LucideCheck], templateUrl: './room-control-panel.component.html', styleUrl: './room-control-panel.component.css' })
export class RoomControlPanelComponent {
  readonly roomId = input.required<string>();
  readonly roomName = input.required<string>();
  readonly memberCount = input.required<number>();
  readonly memberName = input.required<string>();
  readonly memberInitials = input.required<string>();
  readonly themes = input.required<readonly RoomTheme[]>();
  readonly selectedTheme = input.required<string>();
  readonly selectTheme = output<string>();
  readonly close = output<void>();
  readonly copyLink = output<void>();
  // TODO(pre-deploy): Nhớ xóa quyền mô phỏng này khi thay bằng cấu hình phòng và kiểm tra quyền từ API.
  readonly permissions = signal({ ...MOCK_ROOM_PERMISSIONS });
  toggle(key: keyof ReturnType<typeof this.permissions>): void { this.permissions.update(current => ({ ...current, [key]: !current[key] })); }
}
