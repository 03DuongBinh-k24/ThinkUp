import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StudyRoomService } from '../../core/services/study-room.service';
import { AuthService } from '../../core/services/auth.service';
import { StudyRoomItem } from '../../core/models/study-room.model';
import { STUDY_ROOM_TOPICS } from '../../core/data/mock-study-rooms';

@Component({
  selector: 'app-study-room-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans">
      <main class="mx-auto w-full max-w-[1380px] px-5 py-8 sm:px-8">
        <!-- Hero Section -->
        <section class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0A2540] p-8 text-white sm:p-12 shadow-xl mb-10">
          <div class="relative z-10 max-w-2xl">
            <span class="inline-flex items-center gap-2 rounded-full bg-[#0088E8]/20 px-4 py-1.5 text-xs font-semibold text-[#38BDF8] border border-[#38BDF8]/30 mb-4">
              <span>🚀 Không Gian Học Ảo Tương Tác</span>
            </span>
            <h1 class="text-3xl font-extrabold tracking-tight sm:text-5xl leading-tight text-white">
              Phòng Học Ảo (Study Room)
            </h1>
            <p class="mt-4 text-base text-slate-300 sm:text-lg leading-relaxed">
              Cùng hàng ngàn học viên tập trung học tập, kích hoạt đồng hồ Pomodoro, chia sẻ kiến thức và bứt phá mục tiêu mỗi ngày.
            </p>
            <div class="mt-8 flex flex-wrap gap-4">
              <button
                (click)="openCreateModal()"
                type="button"
                class="inline-flex items-center gap-2 rounded-xl bg-[#0088E8] px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-[#0077CC]"
              >
                <span>+ Tạo phòng học mới</span>
              </button>
              <button
                (click)="quickJoinAvailable()"
                type="button"
                class="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                <span>⚡ Vào nhanh phòng có sẵn</span>
              </button>
            </div>
          </div>
          <!-- Decorative shapes -->
          <div class="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[#0088E8]/20 blur-3xl pointer-events-none"></div>
          <div class="absolute right-32 bottom-0 h-64 w-64 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none"></div>
        </section>

        <!-- Topic Tabs & Search -->
        <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <!-- Topic Pills -->
          <div class="flex flex-wrap items-center gap-2">
            @for (topic of topics; track topic) {
              <button
                type="button"
                (click)="selectedTopic.set(topic)"
                class="rounded-full px-4 py-2 text-xs font-medium transition"
                [ngClass]="{
                  'bg-[#0088E8] text-white shadow-sm': selectedTopic() === topic,
                  'bg-white text-slate-600 border border-slate-200 hover:border-slate-300': selectedTopic() !== topic
                }"
              >
                {{ topic }}
              </button>
            }
          </div>

          <!-- Search Input -->
          <div class="w-full sm:w-72">
            <input
              type="text"
              [(ngModel)]="searchKeyword"
              placeholder="Tìm theo tên phòng hoặc tag..."
              class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0088E8] focus:outline-none focus:ring-2 focus:ring-[#8ACEFF]/30"
            />
          </div>
        </div>

        <!-- Rooms Grid -->
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          @for (room of filteredRooms(); track room.roomId) {
            <article class="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:shadow-md">
              <div class="flex items-center justify-between mb-3">
                <span
                  class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                  [ngClass]="{
                    'bg-emerald-50 text-emerald-700 border border-emerald-200': room.status === 'focus',
                    'bg-amber-50 text-amber-700 border border-amber-200': room.status === 'break',
                    'bg-slate-50 text-slate-600 border border-slate-200': room.status === 'idle'
                  }"
                >
                  <span class="h-1.5 w-1.5 rounded-full" [ngClass]="{
                    'bg-emerald-500': room.status === 'focus',
                    'bg-amber-500': room.status === 'break',
                    'bg-slate-400': room.status === 'idle'
                  }"></span>
                  <span>{{ room.status === 'focus' ? 'Đang học tập' : room.status === 'break' ? 'Giờ giải lao' : 'Phòng tự do' }}</span>
                </span>

                <span class="text-xs font-medium text-slate-500">
                  👥 {{ room.currentUsers }}/{{ room.maxUsers }} người
                </span>
              </div>

              <h2 class="text-lg font-bold text-slate-900 line-clamp-1 mb-1">
                {{ room.name }}
              </h2>
              <p class="text-xs text-slate-500 line-clamp-2 mb-4 flex-1">
                {{ room.description }}
              </p>

              <!-- Tags -->
              <div class="flex flex-wrap gap-1.5 mb-5">
                @for (tag of room.tags; track tag) {
                  <span class="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    #{{ tag }}
                  </span>
                }
              </div>

              <!-- Action Card Footer -->
              <div class="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
                <span class="text-xs text-slate-500">Tạo bởi: <strong>{{ room.creator }}</strong></span>
                <button
                  type="button"
                  (click)="joinRoom(room)"
                  class="inline-flex items-center gap-1 text-sm font-semibold text-[#0088E8] hover:text-[#0077CC] transition"
                >
                  <span>Tham gia</span>
                  <span>→</span>
                </button>
              </div>
            </article>
          } @empty {
            <div class="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white p-16 text-center text-slate-500">
              <p class="text-base font-medium">Không tìm thấy phòng học phù hợp.</p>
              <button (click)="selectedTopic.set('Tất cả'); searchKeyword = ''" class="mt-3 text-sm text-[#0088E8] underline font-semibold">
                Xem toàn bộ phòng học
              </button>
            </div>
          }
        </div>

        <!-- Create Room Modal Dialog -->
        @if (isCreateModalOpen()) {
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
              <h3 class="text-xl font-bold text-slate-900 mb-1">Tạo phòng học ảo mới</h3>
              <p class="text-xs text-slate-500 mb-6">Tạo không gian riêng tư hoặc công khai để học cùng bạn bè.</p>

              <form (ngSubmit)="handleCreateRoom()" class="space-y-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Tên phòng học *</label>
                  <input
                    type="text"
                    [(ngModel)]="newRoomName"
                    name="name"
                    required
                    placeholder="Ví dụ: Luyện đề IELTS 8.0"
                    class="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#0088E8]"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Chủ đề *</label>
                  <select
                    [(ngModel)]="newRoomCategory"
                    name="category"
                    class="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#0088E8]"
                  >
                    <option value="Lập trình">Lập trình</option>
                    <option value="UI/UX & Thiết kế">UI/UX & Thiết kế</option>
                    <option value="TOEIC / IELTS">TOEIC / IELTS</option>
                    <option value="Tự học">Tự học</option>
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Mô tả phòng</label>
                  <textarea
                    [(ngModel)]="newRoomDesc"
                    name="desc"
                    rows="3"
                    placeholder="Mục tiêu của phòng học hôm nay..."
                    class="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#0088E8]"
                  ></textarea>
                </div>

                <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    (click)="isCreateModalOpen.set(false)"
                    class="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    class="rounded-xl bg-[#0088E8] px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#0077CC]"
                  >
                    Tạo phòng ngay
                  </button>
                </div>
              </form>
            </div>
          </div>
        }
      </main>
    </div>
  `
})
export class StudyRoomLobbyComponent {
  private readonly studyRoomService = inject(StudyRoomService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly topics = STUDY_ROOM_TOPICS;
  readonly selectedTopic = signal<string>('Tất cả');
  readonly isCreateModalOpen = signal<boolean>(false);

  searchKeyword = '';
  newRoomName = '';
  newRoomCategory = 'Lập trình';
  newRoomDesc = '';

  readonly allRooms = this.studyRoomService.rooms;

  readonly filteredRooms = computed(() => {
    const list = this.allRooms();
    const topic = this.selectedTopic();
    const query = this.searchKeyword.trim().toLowerCase();

    return list.filter((r) => {
      const matchTopic = topic === 'Tất cả' || r.tags.includes(topic) || r.category === topic;
      const matchQuery =
        !query ||
        r.name.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.tags.some((t) => t.toLowerCase().includes(query));
      return matchTopic && matchQuery;
    });
  });

  joinRoom(room: StudyRoomItem): void {
    this.router.navigate(['/learning/study-room', room.roomId]);
  }

  quickJoinAvailable(): void {
    const available = this.allRooms().find((r) => r.currentUsers < r.maxUsers);
    if (available) {
      this.joinRoom(available);
    }
  }

  openCreateModal(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/learning/study-room' } });
      return;
    }
    this.isCreateModalOpen.set(true);
  }

  handleCreateRoom(): void {
    if (!this.newRoomName.trim()) return;

    const created = this.studyRoomService.createRoom({
      roomId: 'room-' + Date.now(),
      name: this.newRoomName.trim(),
      type: 'public',
      maxUsers: 25,
      currentUsers: 1,
      status: 'focus',
      tags: [this.newRoomCategory, 'Focus Session'],
      category: this.newRoomCategory,
      theme: 'space',
      description: this.newRoomDesc.trim() || 'Cùng nhau học tập trung và hiệu quả.',
      creator: 'Tôi'
    });

    this.isCreateModalOpen.set(false);
    this.joinRoom(created);
  }
}
