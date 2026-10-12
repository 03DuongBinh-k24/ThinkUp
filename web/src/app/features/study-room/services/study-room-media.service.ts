import { Injectable, signal } from '@angular/core';

@Injectable()
export class StudyRoomMediaService {
  readonly micOn = signal(false);
  readonly camOn = signal(false);
  readonly sharingScreen = signal(false);
  readonly error = signal('');
  private micTrack: MediaStreamTrack | null = null;
  private camTrack: MediaStreamTrack | null = null;
  private screenStream: MediaStream | null = null;
  private cameraStream: MediaStream | null = null;

  get localVideo(): MediaStream | null { return this.cameraStream; }
  get sharedScreen(): MediaStream | null { return this.screenStream; }

  async toggleMic(): Promise<void> {
    this.error.set('');
    try {
      if (!this.micTrack) this.micTrack = (await navigator.mediaDevices.getUserMedia({ audio: true })).getAudioTracks()[0];
      this.micTrack.enabled = !this.micOn();
      this.micOn.set(this.micTrack.enabled);
    } catch { this.error.set('Không thể truy cập micro. Kiểm tra quyền của trình duyệt.'); }
  }

  async toggleCamera(): Promise<void> {
    this.error.set('');
    try {
      if (!this.camTrack) {
        this.cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        this.camTrack = this.cameraStream.getVideoTracks()[0];
      }
      this.camTrack.enabled = !this.camOn();
      this.camOn.set(this.camTrack.enabled);
    } catch { this.error.set('Không thể truy cập camera. Kiểm tra quyền của trình duyệt.'); }
  }

  async toggleScreen(): Promise<void> {
    this.error.set('');
    if (this.sharingScreen()) { this.stopScreen(); return; }
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      this.screenStream.getVideoTracks()[0].onended = () => this.stopScreen();
      this.sharingScreen.set(true);
    } catch { this.error.set('Chưa thể chia sẻ màn hình.'); }
  }

  stopScreen(): void { this.screenStream?.getTracks().forEach(track => track.stop()); this.screenStream = null; this.sharingScreen.set(false); }
  dispose(): void { this.micTrack?.stop(); this.camTrack?.stop(); this.stopScreen(); this.micOn.set(false); this.camOn.set(false); }
}
