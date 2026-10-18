import { Injectable, signal } from '@angular/core';
import { Room, RoomEvent, Track } from 'livekit-client';
import { RoomConnection } from './study-room.service';

export interface RoomRealtimeEnvelope {
  type: 'sync-request' | 'canvas-snapshot' | 'canvas-upsert' | 'canvas-remove' | 'ink' | 'timer' | 'reaction' | 'theme' | 'permissions' | 'chat' | 'cursor' | 'media-state' | 'participant-position' | 'screen-state' | 'participant-kick';
  payload: unknown;
}

export interface RemoteScreenStream { participantId: string; stream: MediaStream; }

@Injectable()
export class StudyRoomMediaService {
  readonly micOn = signal(false);
  readonly camOn = signal(false);
  readonly sharingScreen = signal(false);
  readonly connected = signal(false);
  readonly error = signal('');
  readonly remoteScreens = signal<RemoteScreenStream[]>([]);
  readonly activeSpeakerIds = signal<ReadonlySet<string>>(new Set());
  private room: Room | null = null;
  private remoteHost: HTMLElement | null = null;
  private readonly remoteCameras = signal<Record<string, MediaStream>>({});
  private realtimeHandler: ((event: RoomRealtimeEnvelope, senderId: string) => void) | null = null;
  private screenEndedHandler: (() => void) | null = null;
  private trackStateHandler: ((participantId: string, state: { micOn?: boolean; camOn?: boolean }) => void) | null = null;
  private participantDisconnectedHandler: ((participantId: string) => void) | null = null;
  private participantConnectedHandler: ((participantId: string) => void) | null = null;
  private reconnectedHandler: (() => void) | null = null;
  private intentionalDisconnect = false;

  get localVideo(): MediaStream | null {
    const track = this.room?.localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack;
    return track ? new MediaStream([track.mediaStreamTrack]) : null;
  }
  get sharedScreen(): MediaStream | null {
    const track = this.room?.localParticipant.getTrackPublication(Track.Source.ScreenShare)?.videoTrack;
    return track ? new MediaStream([track.mediaStreamTrack]) : null;
  }

  setRemoteHost(host: HTMLElement): void { this.remoteHost = host; }
  setRealtimeHandler(handler: (event: RoomRealtimeEnvelope, senderId: string) => void): void { this.realtimeHandler = handler; }
  setScreenEndedHandler(handler: () => void): void { this.screenEndedHandler = handler; }
  setTrackStateHandler(handler: (participantId: string, state: { micOn?: boolean; camOn?: boolean }) => void): void { this.trackStateHandler = handler; }
  setParticipantDisconnectedHandler(handler: (participantId: string) => void): void { this.participantDisconnectedHandler = handler; }
  setParticipantConnectedHandler(handler: (participantId: string) => void): void { this.participantConnectedHandler = handler; }
  setReconnectedHandler(handler: () => void): void { this.reconnectedHandler = handler; }
  cameraStream(participantId: string): MediaStream | null { return this.remoteCameras()[participantId] || null; }

  async connect(connection: RoomConnection): Promise<void> {
    await this.dispose();
    this.intentionalDisconnect = false;
    this.error.set('');
    const room = new Room({ adaptiveStream: true, dynacast: true });
    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      const stream = new MediaStream([track.mediaStreamTrack]);
      if (track.kind === Track.Kind.Video && publication.source === Track.Source.Camera) {
        this.remoteCameras.update(cameras => ({ ...cameras, [participant.identity]: stream }));
        return;
      }
      if (track.kind === Track.Kind.Video && publication.source === Track.Source.ScreenShare) {
        this.remoteScreens.update(screens => [...screens.filter(screen => screen.participantId !== participant.identity), { participantId: participant.identity, stream }]);
        return;
      }
      if (track.kind === Track.Kind.Audio && this.remoteHost) {
        const element = track.attach();
        element.classList.add('remote-track');
        element.style.display = 'none';
        this.remoteHost.appendChild(element);
      }
    });
    room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      track.detach().forEach(element => element.remove());
      if (publication.source === Track.Source.Camera) {
        this.remoteCameras.update(cameras => {
          const next = { ...cameras };
          delete next[participant.identity];
          return next;
        });
      }
      if (publication.source === Track.Source.ScreenShare) this.remoteScreens.update(screens => screens.filter(screen => screen.participantId !== participant.identity));
    });
    room.on(RoomEvent.TrackMuted, (publication, participant) => this.applyPublicationState(participant.identity, publication.source, false));
    room.on(RoomEvent.TrackUnmuted, (publication, participant) => this.applyPublicationState(participant.identity, publication.source, true));
    room.on(RoomEvent.LocalTrackUnpublished, publication => {
      this.applyPublicationState(room.localParticipant.identity, publication.source, false);
      if (publication.source === Track.Source.ScreenShare && this.sharingScreen()) {
        this.sharingScreen.set(false);
        this.screenEndedHandler?.();
      }
    });
    room.on(RoomEvent.ParticipantDisconnected, participant => {
      this.remoteCameras.update(cameras => {
        const next = { ...cameras };
        delete next[participant.identity];
        return next;
      });
      this.remoteScreens.update(screens => screens.filter(screen => screen.participantId !== participant.identity));
      this.activeSpeakerIds.update(ids => {
        const next = new Set(ids);
        next.delete(participant.identity);
        return next;
      });
      this.trackStateHandler?.(participant.identity, { micOn: false, camOn: false });
      this.participantDisconnectedHandler?.(participant.identity);
    });
    room.on(RoomEvent.ParticipantConnected, participant => this.participantConnectedHandler?.(participant.identity));
    room.on(RoomEvent.DataReceived, (payload, participant, _kind, topic) => {
      if (topic !== 'thinkup-room-state') return;
      try {
        const parsed: unknown = JSON.parse(new TextDecoder().decode(payload));
        if (!parsed || typeof parsed !== 'object' || !('type' in parsed) || !('payload' in parsed)) return;
        this.realtimeHandler?.(parsed as RoomRealtimeEnvelope, participant?.identity || '');
      } catch { /* Ignore malformed peer data. */ }
    });
    room.on(RoomEvent.ActiveSpeakersChanged, speakers => this.activeSpeakerIds.set(new Set(speakers.map(speaker => speaker.identity))));
    room.on(RoomEvent.Reconnecting, () => {
      this.connected.set(false);
      this.error.set('Đang kết nối lại phòng học...');
    });
    room.on(RoomEvent.Reconnected, () => {
      this.connected.set(true);
      this.error.set('');
      this.reconnectedHandler?.();
    });
    room.on(RoomEvent.Disconnected, () => {
      this.connected.set(false);
      if (!this.intentionalDisconnect) this.error.set('Đã mất kết nối phòng học. Vui lòng kiểm tra mạng và thử lại.');
    });
    try {
      await room.connect(connection.livekitUrl, connection.token);
      this.room = room;
      this.connected.set(true);
    } catch {
      await room.disconnect();
      this.error.set('Không thể kết nối phòng học trực tuyến. Vui lòng thử lại.');
      throw new Error('Không thể kết nối LiveKit.');
    }
  }

  async sendRealtime(event: RoomRealtimeEnvelope, reliable = true): Promise<void> {
    if (!this.room || !this.connected()) return;
    try {
      await this.room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(event)), {
        reliable,
        topic: 'thinkup-room-state',
      });
    } catch { this.error.set('Không thể đồng bộ thay đổi với các thành viên khác.'); }
  }

  private applyPublicationState(participantId: string, source: Track.Source, enabled: boolean): void {
    if (source === Track.Source.Microphone) {
      if (participantId === this.room?.localParticipant.identity) this.micOn.set(enabled);
      this.trackStateHandler?.(participantId, { micOn: enabled });
    }
    if (source === Track.Source.Camera) {
      if (participantId === this.room?.localParticipant.identity) this.camOn.set(enabled);
      this.trackStateHandler?.(participantId, { camOn: enabled });
    }
  }

  async toggleMic(): Promise<void> {
    if (!this.room) { this.error.set('Chưa kết nối phòng học.'); return; }
    this.error.set('');
    try {
      const enabled = !this.micOn();
      await this.room.localParticipant.setMicrophoneEnabled(enabled);
      this.micOn.set(enabled);
    } catch { this.error.set('Không thể truy cập micro. Kiểm tra quyền của trình duyệt.'); }
  }

  async toggleCamera(): Promise<void> {
    if (!this.room) { this.error.set('Chưa kết nối phòng học.'); return; }
    this.error.set('');
    try {
      const enabled = !this.camOn();
      await this.room.localParticipant.setCameraEnabled(enabled);
      this.camOn.set(enabled);
    } catch { this.error.set('Không thể truy cập camera. Kiểm tra quyền của trình duyệt.'); }
  }

  async toggleScreen(): Promise<void> {
    if (!this.room) { this.error.set('Chưa kết nối phòng học.'); return; }
    this.error.set('');
    try {
      const enabled = !this.sharingScreen();
      await this.room.localParticipant.setScreenShareEnabled(enabled);
      this.sharingScreen.set(enabled);
      if (enabled) {
        const mediaTrack = this.room.localParticipant.getTrackPublication(Track.Source.ScreenShare)?.videoTrack?.mediaStreamTrack;
        mediaTrack?.addEventListener('ended', () => { this.sharingScreen.set(false); this.screenEndedHandler?.(); }, { once: true });
      }
    } catch { this.error.set('Chưa thể chia sẻ màn hình.'); }
  }

  async dispose(): Promise<void> {
    this.intentionalDisconnect = true;
    await this.room?.disconnect();
    this.room = null;
    this.remoteHost?.replaceChildren();
    this.remoteCameras.set({});
    this.remoteScreens.set([]);
    this.activeSpeakerIds.set(new Set());
    this.micOn.set(false);
    this.camOn.set(false);
    this.sharingScreen.set(false);
    this.connected.set(false);
  }
}
