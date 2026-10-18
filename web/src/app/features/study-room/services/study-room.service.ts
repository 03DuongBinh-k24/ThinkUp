import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { StudyRoomItem } from '../models/study-room.model';

interface RoomPayload extends Partial<StudyRoomItem> {
  roomId: string;
  name: string;
  capacity?: number;
  topic?: string;
  goal?: string;
  roomTheme?: string;
  hasPassword?: boolean;
}
interface RoomCreateRequest {
  name: string;
  type: 'public' | 'private';
  goal: string;
  topic: string;
  tags: string[];
  capacity: number;
  roomTheme: string;
  password?: string;
  creatorName: string;
}
export interface RoomParticipant {
  userId: string; name: string; displayName: string; initials: string;
  avatar: string; role: 'owner' | 'moderator' | 'member';
  roleLabel: string; isSelf: boolean; position: { x: number; y: number };
  currentCourse?: string; progress?: number; isVIP?: boolean;
}
export interface RoomMessage {
  id: string; senderId: string; senderName: string; content: string; createdAt: string;
}
export interface RoomConnection {
  token: string; livekitUrl: string; roomId: string; role: 'owner' | 'moderator' | 'member';
  position: { x: number; y: number };
}
export interface RoomPermissions {
  voiceEnabled: boolean; cameraEnabled: boolean; chatEnabled: boolean;
  whiteboardLocked: boolean; participantShareScreen: boolean;
  participantUpload: boolean; approvalRequired: boolean;
}
export interface EffectiveRoomPermissions {
  role: 'owner' | 'moderator' | 'member';
  roomPermissions: RoomPermissions;
  effectivePermissions: { canManagePermissions: boolean; canChangeTheme: boolean };
  permissionMatrix: { feature: string; label: string; owner: boolean; moderator: boolean; member: boolean | string }[];
}

function mapRoom(room: RoomPayload): StudyRoomItem {
  return {
    roomId: room.roomId,
    name: room.name,
    type: room.type === 'private' ? 'private' : 'public',
    maxUsers: room.maxUsers ?? room.capacity ?? 20,
    currentUsers: room.currentUsers ?? 0,
    status: room.status ?? 'idle',
    tags: room.tags ?? [],
    category: room.category ?? room.topic ?? '',
    theme: room.theme ?? room.roomTheme ?? 'white',
    description: room.description ?? room.goal ?? '',
    rating: room.rating ?? 5,
    creator: room.creator ?? 'Chủ phòng',
    waitlistCount: room.waitlistCount,
    requiresPassword: room.requiresPassword ?? room.hasPassword,
    inviteMode: room.inviteMode,
    approvalRequired: room.approvalRequired,
    joinRequests: (room.joinRequests ?? []).filter(request => request.status === 'pending'),
  };
}

@Injectable({ providedIn: 'root' })
export class StudyRoomService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/study-room`;
  private readonly roomsSig = signal<StudyRoomItem[]>([]);
  private readonly joinedRoomsSig = signal<Record<string, StudyRoomItem>>({});
  readonly rooms = computed(() => this.roomsSig());

  loadRooms(): Observable<StudyRoomItem[]> {
    return this.http.get<{ success: boolean; data: RoomPayload[] }>(`${this.base}/cards`, {
      params: new HttpParams().set('limit', 100),
    }).pipe(
      map(response => response.data.map(mapRoom)),
      tap(rooms => this.roomsSig.set(rooms))
    );
  }

  getRoomById(roomId: string): StudyRoomItem | null {
    return this.roomsSig().find(room => room.roomId === roomId) || null;
  }

  getJoinedRoom(roomId: string): StudyRoomItem | null {
    const inMemory = this.joinedRoomsSig()[roomId];
    if (inMemory) return inMemory;
    try {
      const raw = sessionStorage.getItem(`study_room_joined_${roomId}`);
      if (!raw) return null;
      const room = JSON.parse(raw) as StudyRoomItem;
      if (room?.roomId !== roomId) return null;
      this.joinedRoomsSig.update(rooms => ({ ...rooms, [roomId]: room }));
      return room;
    } catch { return null; }
  }

  clearJoinedRoom(roomId: string): void {
    this.joinedRoomsSig.update(rooms => {
      const next = { ...rooms };
      delete next[roomId];
      return next;
    });
    try { sessionStorage.removeItem(`study_room_joined_${roomId}`); } catch { /* Storage may be unavailable in strict privacy mode. */ }
  }

  createRoom(request: RoomCreateRequest): Observable<StudyRoomItem> {
    return this.http.post<{ success: boolean; data: RoomPayload }>(`${this.base}/create`, request).pipe(
      map(response => mapRoom(response.data)),
      tap(room => this.rememberJoinedRoom(room))
    );
  }

  joinRoom(codeOrLink: string, password = ''): Observable<StudyRoomItem> {
    return this.http.post<{ success: boolean; room: RoomPayload }>(`${this.base}/join`, { codeOrLink, password }).pipe(
      map(response => mapRoom(response.room)),
      tap(room => this.rememberJoinedRoom(room))
    );
  }

  requestJoin(roomId: string, userId: string, userName: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${encodeURIComponent(roomId)}/request-join`, { userId, userName });
  }

  handleJoinRequest(roomId: string, targetUserId: string, action: 'approve' | 'reject'): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${encodeURIComponent(roomId)}/handle-request`, { targetUserId, action }).pipe(
      tap(() => {
        const room = this.getJoinedRoom(roomId);
        if (!room) return;
        this.rememberJoinedRoom({ ...room, joinRequests: (room.joinRequests ?? []).filter(request => request.userId !== targetUserId) });
      })
    );
  }

  leaveRoom(roomId: string, userId: string): Observable<unknown> {
    return this.http.post(`${this.base}/${encodeURIComponent(roomId)}/leave`, { userId });
  }

  connection(roomId: string, userId: string, userName: string): Observable<RoomConnection> {
    return this.http.post<{ data: RoomConnection }>(`${this.base}/token`, { roomId, userId, userName }).pipe(
      map(response => response.data)
    );
  }

  participants(roomId: string, userId: string): Observable<RoomParticipant[]> {
    return this.http.get<{ data: { participants: RoomParticipant[] } }>(`${this.base}/${encodeURIComponent(roomId)}/participants`, {
      params: { userId },
    }).pipe(map(response => response.data.participants));
  }

  updatePosition(roomId: string, userId: string, position: { x: number; y: number }): Observable<{ x: number; y: number }> {
    return this.http.put<{ data: { position: { x: number; y: number } } }>(`${this.base}/${encodeURIComponent(roomId)}/position`, {
      userId, x: Math.round(position.x), y: Math.round(position.y),
    }).pipe(map(response => response.data.position));
  }

  messages(roomId: string, userId: string): Observable<RoomMessage[]> {
    return this.http.get<{ data: RoomMessage[] }>(`${this.base}/${encodeURIComponent(roomId)}/messages`, {
      params: { userId },
    }).pipe(map(response => response.data.map(message => ({ ...message, id: String(message.id) }))));
  }

  sendMessage(roomId: string, userId: string, senderName: string, content: string): Observable<RoomMessage> {
    return this.http.post<{ data: RoomMessage }>(`${this.base}/${encodeURIComponent(roomId)}/messages`, {
      userId, senderName, content,
    }).pipe(map(response => ({ ...response.data, id: String(response.data.id) })));
  }

  changeTheme(roomId: string, theme: string): Observable<unknown> {
    return this.http.put(`${this.base}/${encodeURIComponent(roomId)}/theme`, { theme }).pipe(
      tap(() => this.cacheTheme(roomId, theme))
    );
  }

  cacheTheme(roomId: string, theme: string): void {
    const room = this.getJoinedRoom(roomId);
    if (room) this.rememberJoinedRoom({ ...room, theme });
  }

  permissions(roomId: string, userId: string): Observable<EffectiveRoomPermissions> {
    return this.http.get<{ data: EffectiveRoomPermissions }>(`${this.base}/${encodeURIComponent(roomId)}/permissions`, {
      params: { userId },
    }).pipe(map(response => response.data));
  }

  updatePermissions(roomId: string, permissions: Partial<RoomPermissions>): Observable<RoomPermissions> {
    return this.http.put<{ data: RoomPermissions }>(`${this.base}/${encodeURIComponent(roomId)}/permissions`, permissions).pipe(
      map(response => response.data)
    );
  }

  private rememberRoom(room: StudyRoomItem): void {
    this.roomsSig.update(rooms => [room, ...rooms.filter(item => item.roomId !== room.roomId)]);
  }

  private rememberJoinedRoom(room: StudyRoomItem): void {
    this.rememberRoom(room);
    this.joinedRoomsSig.update(rooms => ({ ...rooms, [room.roomId]: room }));
    try { sessionStorage.setItem(`study_room_joined_${room.roomId}`, JSON.stringify(room)); } catch { /* Keep the in-memory room usable. */ }
  }
}
