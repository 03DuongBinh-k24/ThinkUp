import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { RoomParticipant, RoomPermissions, StudyRoomService } from '../../services/study-room.service';
import { StudyRoomJoinRequest } from '../../models/study-room.model';
import { LucideSettings, LucideCrown, LucideX, LucideUserPlus, LucideCheck, LucideShieldCheck, LucideUserRound, LucideCircleX, LucideMinus } from '@lucide/angular';

export interface RoomTheme { id: string; name: string; src: string; background?: string; grid?: string; type?: string; fit?: string; ambient?: string; }

@Component({ selector: 'app-room-control-panel', standalone: true, imports: [LucideSettings, LucideCrown, LucideX, LucideUserPlus, LucideCheck, LucideShieldCheck, LucideUserRound, LucideCircleX, LucideMinus], templateUrl: './room-control-panel.component.html', styleUrl: './room-control-panel.component.css' })
export class RoomControlPanelComponent implements OnInit {
  private readonly rooms = inject(StudyRoomService);
  private readonly auth = inject(AuthService);
  readonly roomId = input.required<string>();
  readonly roomName = input.required<string>();
  readonly memberCount = input.required<number>();
  readonly members = input<RoomParticipant[]>([]);
  readonly joinRequests = input<StudyRoomJoinRequest[]>([]);
  readonly memberName = input.required<string>();
  readonly memberInitials = input.required<string>();
  readonly themes = input.required<readonly RoomTheme[]>();
  readonly selectedTheme = input.required<string>();
  readonly selectTheme = output<string>();
  readonly close = output<void>();
  readonly copyLink = output<void>();
  readonly removeMember = output<RoomParticipant>();
  readonly permissionsLoaded = output<RoomPermissions>();
  readonly permissionsChange = output<RoomPermissions>();
  readonly permissions = signal<RoomPermissions>({
    voiceEnabled: false, cameraEnabled: false, chatEnabled: false,
    whiteboardLocked: false, participantShareScreen: false,
    participantUpload: false, approvalRequired: false,
  });
  readonly role = signal('Thành viên');
  readonly roleKey = signal<'owner' | 'moderator' | 'member'>('member');
  readonly canManage = signal(false);
  readonly canChangeTheme = signal(false);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly handlingRequest = signal<string | null>(null);
  readonly error = signal('');
  readonly matrix = signal<{ feature: string; label: string; owner: boolean; moderator: boolean; member: boolean | string }[]>([]);

  ngOnInit(): void { this.load(); }

  load(): void {
    const userId = this.auth.currentUser()?.id;
    if (!userId) { this.loading.set(false); this.error.set('Vui lòng đăng nhập để xem quyền phòng.'); return; }
    this.loading.set(true);
    this.rooms.permissions(this.roomId(), userId).subscribe({
      next: result => {
        this.permissions.set(result.roomPermissions);
        this.permissionsLoaded.emit(result.roomPermissions);
        this.role.set(result.role === 'owner' ? 'Chủ phòng' : result.role === 'moderator' ? 'Moderator' : 'Thành viên');
        this.roleKey.set(result.role);
        this.canManage.set(result.effectivePermissions.canManagePermissions);
        this.canChangeTheme.set(result.effectivePermissions.canChangeTheme);
        this.matrix.set(result.permissionMatrix);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.error.set('Không thể tải quyền phòng học.'); },
    });
  }

  toggle(key: keyof RoomPermissions): void {
    if (!this.canManage() || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.rooms.updatePermissions(this.roomId(), { [key]: !this.permissions()[key] }).subscribe({
      next: updated => { this.permissions.set(updated); this.permissionsChange.emit(updated); this.saving.set(false); },
      error: () => { this.saving.set(false); this.error.set('Không thể cập nhật quyền phòng. Vui lòng thử lại.'); },
    });
  }

  decideRequest(request: StudyRoomJoinRequest, action: 'approve' | 'reject'): void {
    if (this.roleKey() !== 'owner' || this.handlingRequest()) return;
    this.handlingRequest.set(request.userId);
    this.error.set('');
    this.rooms.handleJoinRequest(this.roomId(), request.userId, action).subscribe({
      next: () => this.handlingRequest.set(null),
      error: () => {
        this.handlingRequest.set(null);
        this.error.set(action === 'approve' ? 'Không thể duyệt yêu cầu vào phòng.' : 'Không thể từ chối yêu cầu vào phòng.');
      },
    });
  }
}
