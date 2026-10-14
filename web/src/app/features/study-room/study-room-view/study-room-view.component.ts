import { Component, ElementRef, ViewChild, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StudyRoomService } from '../services/study-room.service';
import { StudyRoomItem } from '../models/study-room.model';
import { LucideCopy, LucidePanelRight, LucidePlus, LucideMinus, LucideLocateFixed, LucideMic, LucideMicOff, LucideVideo, LucideVideoOff, LucideScreenShare, LucideMousePointer2, LucidePencil, LucideSmile, LucideMessageCircle, LucideSettings, LucideLogOut, LucideHeadphones, LucidePlay, LucidePause, LucideRotateCcw, LucideCrown, LucideBookOpen, LucideCoffee, LucideSkipForward, LucideX, LucideSend } from '@lucide/angular';
import { AddToCanvasMenuComponent, CanvasItemKind } from '../components/add-to-canvas-menu/add-to-canvas-menu.component';
import { CanvasItem, CanvasItemComponent } from '../components/canvas-item/canvas-item.component';
import { LofiPlayerComponent } from '../components/lofi-player/lofi-player.component';
import { RoomControlPanelComponent } from '../components/room-control-panel/room-control-panel.component';
import { PIXEL_DREAMLAND_MEDIA } from '../data/study-room-media';
import { ReactionPickerComponent } from '../components/reaction-picker/reaction-picker.component';
import { InkLayerComponent } from '../components/ink-layer/ink-layer.component';
import { StudyRoomMediaService } from '../services/study-room-media.service';
import { MOCK_STUDY_ROOM_USER } from '../../../core/data/mock/mock-study-room-session';
import { ChatPanelComponent, RoomChatMessage } from '../components/chat-panel/chat-panel.component';

@Component({
  selector: 'app-study-room-view',
  standalone: true,
  providers: [StudyRoomMediaService],
  imports: [CommonModule, FormsModule, AddToCanvasMenuComponent, CanvasItemComponent, LofiPlayerComponent, RoomControlPanelComponent, ReactionPickerComponent, InkLayerComponent, ChatPanelComponent, LucideCopy, LucidePanelRight, LucidePlus, LucideMinus, LucideLocateFixed, LucideMic, LucideMicOff, LucideVideo, LucideVideoOff, LucideScreenShare, LucideMousePointer2, LucidePencil, LucideSmile, LucideMessageCircle, LucideSettings, LucideLogOut, LucideHeadphones, LucidePlay, LucidePause, LucideRotateCcw, LucideCrown, LucideBookOpen, LucideCoffee, LucideSkipForward],
  templateUrl: './study-room-view.component.html',
  styleUrl: './study-room-view.component.css'
})
export class StudyRoomViewComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly studyRoomService = inject(StudyRoomService);
  private readonly media = inject(StudyRoomMediaService);
  @ViewChild('localVideo') localVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('screenVideo') screenVideo?: ElementRef<HTMLVideoElement>;

  readonly roomId = signal<string>('');
  readonly member = MOCK_STUDY_ROOM_USER;
  readonly memberPosition = { x: 200 + Math.random() * 200, y: 150 + Math.random() * 150 };
  readonly timerMode = signal<'focus' | 'break'>('focus');
  readonly timeLeft = signal<number>(25 * 60);
  readonly isRunning = signal<boolean>(false);
  // TODO(pre-deploy): Nhớ xóa số thành viên mô phỏng này khi có trạng thái phiên phòng từ realtime service.
  readonly memberCount = computed(() => 1);
  readonly controlOpen = signal(false);
  readonly chatOpen = signal(false);
  readonly leaveOpen = signal(false);
  readonly micOn = this.media.micOn;
  readonly camOn = this.media.camOn;
  readonly penMode = signal(false);
  readonly addOpen = signal(false);
  readonly emojiOpen = signal(false);
  readonly reaction = signal<string | null>(null);
  readonly lofiOpen = signal(false);
  readonly sharingScreen = this.media.sharingScreen;
  readonly mediaError = this.media.error;
  readonly canvasItems = signal<CanvasItem[]>([]);
  readonly zoom = signal(100);
  readonly selectedTheme = signal('white');
  readonly themes = [
    { id: 'white', name: 'Trắng mặc định', src: '', background: '#ffffff', grid: 'rgba(148,163,184,.34)', type: 'gradient' },
    { id: 'minimal', name: 'Minimal', src: '', background: 'linear-gradient(135deg,#f8fafc,#e0f2fe 48%,#fefce8)', grid: 'rgba(148,163,184,.46)', type: 'gradient' },
    { id: 'coffee', name: 'Coffee Shop', src: '', background: 'linear-gradient(135deg,#fff7ed,#fed7aa 42%,#bae6fd)', grid: 'rgba(180,83,9,.25)', type: 'gradient', ambient: 'Cafe noise' },
    { id: 'library', name: 'Library', src: '', background: 'linear-gradient(135deg,#f5f3ff,#ddd6fe 46%,#fef3c7)', grid: 'rgba(124,58,237,.24)', type: 'gradient', ambient: 'Library noise' },
    { id: 'night', name: 'Night Owl', src: '', background: 'radial-gradient(circle at top left,#1e3a8a,#0f172a 38%,#111827)', grid: 'rgba(125,211,252,.26)', type: 'gradient', ambient: 'Night rain' },
    { id: 'nature', name: 'Zen Garden', src: '', background: 'linear-gradient(135deg,#ecfccb,#bbf7d0 44%,#bae6fd)', grid: 'rgba(22,163,74,.25)', type: 'gradient', ambient: 'Forest stream' },
    { id: 'space', name: 'Space Lab', src: '', background: 'radial-gradient(circle at 20% 20%,#4338ca,#111827 36%,#020617)', grid: 'rgba(196,181,253,.24)', type: 'gradient', ambient: 'Deep ambient' },
    { id: 'lofi-night', name: 'Lofi Night', src: 'https://i.pinimg.com/originals/55/fc/4b/55fc4bee7c31f0850262da53fa1e3180.gif', ambient: 'Lofi room' },
    { id: 'sky-room', name: 'Sky Room', src: 'https://i.pinimg.com/originals/05/3e/50/053e50e89442c41be8b9f10df1c1250f.gif', ambient: 'Soft wind' },
    { id: 'cloud-window', name: 'Cloud Window', src: 'https://i.pinimg.com/originals/9a/a3/5e/9aa35edded370761aff4065510146b56.gif', ambient: 'Soft breeze' },
    { id: 'cozy-window', name: 'Cozy Window', src: 'https://i.pinimg.com/originals/41/f7/72/41f7728ec0b73ee02e86cad71292f90b.gif', ambient: 'Quiet room' },
    { id: 'pragmata-horizon', name: 'Pragmata Horizon', src: 'https://motionbgs.com/media/9514/pragmata-horizon.960x540.mp4', background: '#07111f', grid: '', type: 'video', ambient: 'Space wind' },
    { id: 'cherry-blossom-tree', name: 'Cherry Blossom Tree', src: 'https://motionbgs.com/media/9121/large-cherry-blossom-tree.960x540.mp4', background: '#fee2f0', grid: '', type: 'video', ambient: 'Spring wind' },
    { id: 'genshin-impact', name: 'Genshin Impact', src: 'https://genshin.hoyoverse.com/_nuxt/videos/bg.3e78e80.mp4', background: '#0f172a', grid: '', type: 'video', ambient: 'Genshin BGM' },
    { id: 'pixel-dreamland', name: 'Pixel Dreamland', src: PIXEL_DREAMLAND_MEDIA, background: '#2a1238', grid: '', type: 'image', ambient: 'Dream loop' },
    { id: 'pixel-skyline', name: 'Pixel Skyline', src: 'https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/618395ed-3302-4408-bcd8-4ce51cc8b364/deu0y55-b42b6713-150e-402c-a975-3b63e9f604b8.gif?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiIvZi82MTgzOTVlZC0zMzAyLTQ0MDgtYmNkOC00Y2U1MWNjOGIzNjQvZGV1MHk1NS1iNDJiNjcxMy0xNTBlLTQwMmMtYTk3NS0zYjYzZTlmNjA0YjguZ2lmIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmZpbGUuZG93bmxvYWQiXX0.CZ994VGfFJwCat43jdDgN7SUu_Jim0wbHjBnv2ttBWw', type: 'image', ambient: 'City loop' },
    { id: 'pixel-quiet-night', name: 'Pixel Quiet Night', src: 'https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/618395ed-3302-4408-bcd8-4ce51cc8b364/deoioou-d38e35ff-bf55-4160-835a-dec07338a5fe.gif?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiIvZi82MTgzOTVlZC0zMzAyLTQ0MDgtYmNkOC00Y2U1MWNjOGIzNjQvZGVvaW9vdS1kMzhlMzVmZi1iZjU1LTQxNjAtODM1YS1kZWMwNzMzOGE1ZmUuZ2lmIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmZpbGUuZG93bmxvYWQiXX0.eFiIuQVeJVBzV05DW6RYJjlY6CatDJaLAYi12HAKu1c', type: 'image', ambient: 'Night loop' },
    { id: 'thinkup-clean', name: 'ThinkUp Clean', src: '/assets/study-room/lobby-background-clean.png', background: '#ffffff', grid: '', type: 'image' },
    { id: 'anime-room', name: 'Anime Room', src: '/assets/study-room/lobby-hero-reference.gif', ambient: 'Night room' },
    { id: 'cozy-rainy-window', name: 'Cửa sổ mưa lofi', src: 'https://i.pinimg.com/originals/cc/95/db/cc95db51995bf889d8f2217955c2ec1e.gif', ambient: 'Soft rain lofi' },
  ];
  readonly activeTheme = computed(() => this.themes.find(item => item.id === this.selectedTheme()) || this.themes[0]);
  readonly isDarkTheme = computed(() => ['night', 'space', 'lofi-night', 'cozy-window', 'pragmata-horizon', 'anime-room', 'cozy-rainy-window', 'pixel-dreamland'].includes(this.selectedTheme()));
  readonly background = computed(() => this.activeTheme().src && this.activeTheme().type !== 'video' ? `url('${this.activeTheme().src}') center / cover no-repeat` : this.activeTheme().background);
  readonly grid = computed(() => this.activeTheme().type === 'gradient' ? `radial-gradient(${this.activeTheme().grid} 1.5px, transparent 1.5px)` : 'none');

  private timerInterval: ReturnType<typeof setInterval> | null = null;

  readonly room = computed(() => {
    const id = this.roomId();
    return id ? this.studyRoomService.getRoomById(id) : null;
  });

  readonly formattedTime = computed(() => {
    const total = this.timeLeft();
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  });

  readonly messages = signal<RoomChatMessage[]>([]);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('roomId') || '';
      this.roomId.set(id);
      const storedTheme = sessionStorage.getItem('study_room_theme');
      if (storedTheme && this.themes.some(theme => theme.id === storedTheme)) this.selectedTheme.set(storedTheme);
    });
  }

  ngOnDestroy(): void {
    this.stopTimer();
    this.media.dispose();
  }

  toggleTimer(): void {
    if (this.isRunning()) {
      this.stopTimer();
    } else {
      this.startTimer();
    }
  }

  startTimer(): void {
    this.isRunning.set(true);
    this.timerInterval = setInterval(() => {
      if (this.timeLeft() > 0) {
        this.timeLeft.set(this.timeLeft() - 1);
      } else {
        this.stopTimer();
        alert('Đã kết thúc phiên học! Nghỉ ngơi một chút nhé.');
      }
    }, 1000);
  }

  stopTimer(): void {
    this.isRunning.set(false);
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  resetTimer(): void {
    this.stopTimer();
    this.timeLeft.set(this.timerMode() === 'focus' ? 25 * 60 : 5 * 60);
  }

  setTimerMode(mode: 'focus' | 'break'): void {
    this.stopTimer();
    this.timerMode.set(mode);
    this.timeLeft.set(mode === 'focus' ? 25 * 60 : 5 * 60);
  }

  sendMessage(text: string): void {
    if (!text.trim()) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    this.messages.set([
      ...this.messages(),
      {
        id: String(Date.now()),
        sender: 'Tôi',
        text: text.trim(),
        time,
        isMe: true
      }
    ]);
  }
  changeZoom(delta: number): void { this.zoom.set(Math.max(50, Math.min(200, this.zoom() + delta))); }
  async toggleMic(): Promise<void> { await this.media.toggleMic(); }
  async toggleCamera(): Promise<void> { await this.media.toggleCamera(); if (this.localVideo?.nativeElement) this.localVideo.nativeElement.srcObject = this.media.localVideo; }
  async toggleScreen(): Promise<void> { await this.media.toggleScreen(); if (this.screenVideo?.nativeElement) this.screenVideo.nativeElement.srcObject = this.media.sharedScreen; }
  selectTheme(themeId: string): void { this.selectedTheme.set(themeId); sessionStorage.setItem('study_room_theme', themeId); }
  addCanvasItem(kind: CanvasItemKind): void {
    const sizes: Record<CanvasItemKind, [number, number]> = { text: [240, 80], note: [200, 180], image: [280, 180], gif: [280, 180], youtube: [480, 300], whiteboard: [360, 240] };
    const [width, height] = sizes[kind];
    const colors = ['#fff4a8', '#ffd6e8', '#d2f5df', '#d8eaff', '#e8dcff'];
    const item: CanvasItem = { id: crypto.randomUUID(), kind, content: kind === 'text' ? 'Headline' : '', x: Math.round(window.innerWidth / 2 - width / 2), y: Math.round(window.innerHeight / 2 - height / 2), width, height, color: colors[Math.floor(Math.random() * colors.length)], url: undefined, strokes: kind === 'whiteboard' ? [] : undefined };
    this.canvasItems.update(items => [...items, item]);
  }
  updateCanvasItem(id: string, change: Partial<CanvasItem>): void { this.canvasItems.update(items => items.map(item => item.id === id ? { ...item, ...change } : item)); }
  removeCanvasItem(id: string): void { this.canvasItems.update(items => items.filter(item => item.id !== id)); }
  showReaction(emoji: string): void { this.reaction.set(emoji); window.setTimeout(() => this.reaction.set(null), 2200); }
  leaveRoom(): void { this.router.navigate(['/learning/study-room']); }
  async copyLink(): Promise<void> { await navigator.clipboard.writeText(location.href); }
}
