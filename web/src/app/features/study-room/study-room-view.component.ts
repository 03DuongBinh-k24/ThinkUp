import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StudyRoomService } from '../../core/services/study-room.service';
import { StudyRoomItem } from '../../core/models/study-room.model';

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  isMe?: boolean;
}

@Component({
  selector: 'app-study-room-view',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="flex h-[calc(100vh-65px)] flex-col bg-[#0F172A] text-slate-100 font-sans overflow-hidden">
      <!-- Top Action Bar -->
      <header class="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-[#1E293B]/80 px-6 backdrop-blur">
        <div class="flex items-center gap-3">
          <a routerLink="/learning/study-room" class="text-xs text-slate-400 hover:text-white transition">
            ← Rời phòng
          </a>
          <span class="text-slate-600">|</span>
          <h1 class="text-sm font-bold text-white flex items-center gap-2">
            <span>{{ room()?.name || 'Phòng học ảo' }}</span>
            <span class="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/30">
              ● Trực tiếp
            </span>
          </h1>
        </div>

        <div class="flex items-center gap-4 text-xs text-slate-300">
          <span>👥 {{ memberCount() }} người đang trong phòng</span>
        </div>
      </header>

      <!-- Main Layout: Workspace and Side Panels -->
      <div class="flex flex-1 overflow-hidden">
        <!-- Main Center Workspace: Pomodoro Timer & Focus Atmosphere -->
        <main class="flex flex-1 flex-col items-center justify-center p-6 relative">
          <!-- Background Ambient Glow -->
          <div class="pointer-events-none absolute h-96 w-96 rounded-full bg-[#0088E8]/10 blur-3xl"></div>

          <!-- Pomodoro Card -->
          <div class="relative z-10 flex flex-col items-center rounded-3xl border border-slate-700/60 bg-[#1E293B]/60 p-8 sm:p-12 shadow-2xl backdrop-blur-md max-w-md w-full text-center">
            <span class="rounded-full bg-slate-800 px-4 py-1 text-xs font-semibold text-[#38BDF8] border border-slate-700 mb-4">
              {{ timerMode() === 'focus' ? '🎯 Phiên tập trung' : '☕ Giờ giải lao' }}
            </span>

            <!-- Timer Countdown Display -->
            <div class="font-mono text-6xl sm:text-7xl font-extrabold tracking-wider text-white my-4">
              {{ formattedTime() }}
            </div>

            <!-- Controls -->
            <div class="mt-6 flex items-center gap-4">
              <button
                type="button"
                (click)="toggleTimer()"
                class="rounded-2xl px-8 py-3.5 text-sm font-bold text-white shadow-lg transition"
                [ngClass]="isRunning() ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#0088E8] hover:bg-[#0077CC]'"
              >
                {{ isRunning() ? 'Tạm dừng' : 'Bắt đầu' }}
              </button>

              <button
                type="button"
                (click)="resetTimer()"
                class="rounded-2xl border border-slate-700 bg-slate-800 px-5 py-3.5 text-sm font-semibold text-slate-300 hover:bg-slate-700 transition"
              >
                Đặt lại
              </button>
            </div>

            <!-- Mode Switchers -->
            <div class="mt-8 flex gap-2 border-t border-slate-700/60 pt-6">
              <button
                type="button"
                (click)="setTimerMode('focus')"
                class="rounded-xl px-4 py-1.5 text-xs font-semibold transition"
                [ngClass]="timerMode() === 'focus' ? 'bg-[#0088E8] text-white' : 'text-slate-400 hover:text-white'"
              >
                Focus (25m)
              </button>
              <button
                type="button"
                (click)="setTimerMode('break')"
                class="rounded-xl px-4 py-1.5 text-xs font-semibold transition"
                [ngClass]="timerMode() === 'break' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'"
              >
                Nghỉ ngắn (5m)
              </button>
            </div>
          </div>
        </main>

        <!-- Right Side Panel: Realtime Room Chat -->
        <aside class="flex w-80 shrink-0 flex-col border-l border-slate-800 bg-[#1E293B]/40 backdrop-blur">
          <div class="border-b border-slate-800 px-4 py-3">
            <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400">Trò chuyện nhóm</h2>
          </div>

          <!-- Messages Stream -->
          <div class="flex-1 overflow-y-auto p-4 space-y-3">
            @for (msg of messages(); track msg.id) {
              <div class="flex flex-col text-xs" [ngClass]="msg.isMe ? 'items-end' : 'items-start'">
                <div class="flex items-center gap-1.5 text-[11px] text-slate-400 mb-0.5">
                  <span class="font-semibold text-slate-300">{{ msg.sender }}</span>
                  <span>{{ msg.time }}</span>
                </div>
                <div
                  class="rounded-xl px-3 py-2 max-w-[85%]"
                  [ngClass]="msg.isMe ? 'bg-[#0088E8] text-white' : 'bg-slate-800 text-slate-200 border border-slate-700'"
                >
                  {{ msg.text }}
                </div>
              </div>
            }
          </div>

          <!-- Message Input -->
          <form (ngSubmit)="sendMessage()" class="border-t border-slate-800 p-3">
            <div class="flex gap-2">
              <input
                type="text"
                [(ngModel)]="chatInput"
                name="msg"
                placeholder="Nhắn tin cho cả phòng..."
                class="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-[#0088E8]"
              />
              <button
                type="submit"
                class="rounded-xl bg-[#0088E8] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0077CC]"
              >
                Gửi
              </button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  `
})
export class StudyRoomViewComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly studyRoomService = inject(StudyRoomService);

  readonly roomId = signal<string>('');
  readonly timerMode = signal<'focus' | 'break'>('focus');
  readonly timeLeft = signal<number>(25 * 60);
  readonly isRunning = signal<boolean>(false);
  readonly memberCount = signal<number>(8);

  chatInput = '';
  private timerInterval: any = null;

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

  readonly messages = signal<ChatMessage[]>([
    { id: '1', sender: 'Dev Nguyen', text: 'Chào mọi người, chúc buổi học năng suất nhé! 🔥', time: '10:00' },
    { id: '2', sender: 'Linh UX', text: 'Mình đang làm wireframe Figma, có ai cần review chéo không?', time: '10:02' },
    { id: '3', sender: 'Tôi', text: 'Sẵn sàng phiên Pomodoro 25 phút!', time: '10:05', isMe: true }
  ]);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('roomId') || '';
      this.roomId.set(id);
    });
  }

  ngOnDestroy(): void {
    this.stopTimer();
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

  sendMessage(): void {
    if (!this.chatInput.trim()) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    this.messages.set([
      ...this.messages(),
      {
        id: String(Date.now()),
        sender: 'Tôi',
        text: this.chatInput.trim(),
        time,
        isMe: true
      }
    ]);
    this.chatInput = '';
  }
}
