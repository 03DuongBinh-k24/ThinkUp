import { Component, ElementRef, HostListener, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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

        <!-- Discovery filters: compact status controls plus a scalable topic picker. -->
        <section class="relative z-20 mb-8 rounded-[18px] border border-[#3D58A7] bg-[#102C90] p-5 text-white shadow-[0_14px_35px_rgba(15,35,111,0.18)] sm:p-7" aria-labelledby="room-discovery-title">
          <div class="grid items-center gap-5 lg:grid-cols-[minmax(0,0.86fr)_minmax(440px,1.14fr)] lg:gap-12">
            <h2 id="room-discovery-title" class="text-[clamp(28px,2.45vw,44px)] font-extrabold leading-tight tracking-[-0.035em]">Khám phá không gian học</h2>
            <label class="flex h-[58px] items-center gap-4 rounded-[15px] border border-[#526BBA] bg-[#29439B] px-5 text-[#B2C0E5]">
              <span class="sr-only">Tìm phòng học</span>
              <svg class="h-7 w-7 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>
              <input type="search" [(ngModel)]="searchKeyword" placeholder="Tìm theo tên phòng, chủ đề hoặc kỹ năng..." class="min-w-0 w-full border-0 bg-transparent text-[clamp(16px,1.25vw,21px)] font-medium text-white outline-none placeholder:text-[#AAB8DD]" />
            </label>
          </div>

          <div class="mt-7 grid items-center gap-4 xl:grid-cols-[minmax(610px,1fr)_1px_minmax(240px,290px)_auto]">
            <div class="grid grid-cols-[1fr_.92fr_1.38fr_.9fr] gap-3" role="group" aria-label="Lọc theo trạng thái">
              @for (filter of roomFilters; track filter.id) {
                <button type="button" (click)="selectedRoomFilter.set(filter.id)" [attr.aria-pressed]="selectedRoomFilter() === filter.id" class="min-h-[52px] rounded-[13px] border border-[#4B63B2] bg-[#243E98] px-3 text-[clamp(13px,1vw,18px)] font-bold text-white transition hover:border-[#75D0FF]" [ngClass]="{ '!border-[#5CC9FF] !bg-white !text-[#092675]': selectedRoomFilter() === filter.id }">{{ filter.label }}</button>
              }
            </div>
            <span class="hidden h-[52px] w-px bg-[#4A61AE] xl:block" aria-hidden="true"></span>

            <div class="relative">
              <button type="button" (click)="toggleTopicMenu()" aria-haspopup="dialog" [attr.aria-expanded]="isTopicMenuOpen()" class="flex min-h-[52px] w-full items-center gap-3 rounded-[13px] border border-[#4B63B2] bg-[#243E98] px-4 text-[clamp(13px,1vw,18px)] font-bold text-white transition hover:border-[#75D0FF]">
                <svg class="h-5 w-5 shrink-0 text-[#4DD2FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="6" height="6" rx="1"></rect><rect x="15" y="3" width="6" height="6" rx="1"></rect><rect x="3" y="15" width="6" height="6" rx="1"></rect><rect x="15" y="15" width="6" height="6" rx="1"></rect></svg>
                <span class="min-w-0 flex-1 truncate text-left">{{ topicTriggerLabel() }}</span>
                <svg class="h-5 w-5 shrink-0 transition-transform" [class.rotate-180]="isTopicMenuOpen()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>
              </button>

              @if (isTopicMenuOpen()) {
                <div class="absolute right-0 top-[calc(100%+10px)] z-30 w-[min(410px,calc(100vw-48px))] rounded-2xl border border-[#4967BA] bg-[#102B83] p-3.5 shadow-[0_24px_55px_rgba(4,15,66,0.38)]" role="dialog" aria-label="Chọn chủ đề">
                  <label class="flex h-11 items-center gap-3 rounded-[10px] border border-[#4F68BB] bg-[#213D97] px-3.5 text-[#DBE6FF]">
                    <span class="sr-only">Tìm chủ đề</span>
                    <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>
                    <input type="search" [(ngModel)]="topicSearchKeyword" placeholder="Tìm chủ đề..." class="min-w-0 w-full border-0 bg-transparent text-sm text-white outline-none placeholder:text-[#AAB8DD]" />
                  </label>
                  <div class="mt-3 max-h-[270px] overflow-y-auto pr-2 [scrollbar-color:#8CA5DC_transparent] [scrollbar-width:thin]">
                    <label class="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg bg-[#193D9F] px-2.5 py-2 text-sm font-semibold text-white"><input type="checkbox" [checked]="pendingTopics().length === 0" (change)="clearPendingTopics()" class="h-[19px] w-[19px] accent-[#55D5FF]" /><span>Tất cả chủ đề</span></label>
                    @for (topic of visibleTopics(); track topic) {
                      <label class="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-white hover:bg-[#193D9F]"><input type="checkbox" [checked]="pendingTopics().includes(topic)" (change)="togglePendingTopic(topic)" class="h-[19px] w-[19px] accent-[#55D5FF]" /><span>{{ topic === 'Focus Session' ? 'Focus' : topic }}</span></label>
                    } @empty {
                      <p class="px-3 py-7 text-center text-sm text-[#B8C5E8]">Không tìm thấy chủ đề phù hợp.</p>
                    }
                  </div>
                  <div class="mt-3 flex justify-end gap-2.5 border-t border-[#3653A3] pt-3">
                    <button type="button" (click)="closeTopicMenu()" class="min-h-10 min-w-[88px] rounded-[9px] border border-[#5870BD] text-sm font-bold text-white">Hủy</button>
                    <button type="button" (click)="applyTopicFilter()" class="min-h-10 min-w-[88px] rounded-[9px] border border-[#55D5FF] bg-[#55D5FF] text-sm font-bold text-[#082574]">Áp dụng</button>
                  </div>
                </div>
              }
            </div>

            <button type="button" (click)="resetFilters()" class="inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-[13px] border border-[#4B63B2] bg-[#30489D] px-5 text-[clamp(13px,1vw,18px)] font-bold text-white transition hover:border-[#75D0FF]">
              <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path><path d="M3 3v5h5"></path></svg>
              Làm mới
            </button>
          </div>
        </section>

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
              <button (click)="resetFilters()" class="mt-3 text-sm text-[#0088E8] underline font-semibold">
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
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly topics = STUDY_ROOM_TOPICS.filter((topic) => topic !== 'Tất cả');
  readonly roomFilters = [
    { id: 'trending', label: 'Trending' },
    { id: 'new', label: 'Mới mở' },
    { id: 'active', label: 'Đang hoạt động' },
    { id: 'available', label: 'Còn chỗ' }
  ] as const;
  readonly selectedRoomFilter = signal<'trending' | 'new' | 'active' | 'available'>('trending');
  readonly selectedTopics = signal<readonly string[]>([]);
  readonly pendingTopics = signal<readonly string[]>([]);
  readonly isTopicMenuOpen = signal(false);
  readonly isCreateModalOpen = signal<boolean>(false);

  searchKeyword = '';
  topicSearchKeyword = '';
  newRoomName = '';
  newRoomCategory = 'Lập trình';
  newRoomDesc = '';

  readonly allRooms = this.studyRoomService.rooms;

  readonly visibleTopics = computed(() => {
    const query = this.topicSearchKeyword.trim().toLocaleLowerCase('vi');
    return query ? this.topics.filter((topic) => topic.toLocaleLowerCase('vi').includes(query)) : this.topics;
  });

  readonly topicTriggerLabel = computed(() => {
    const topics = this.selectedTopics();
    if (topics.length === 0) return 'Chủ đề: Tất cả';
    if (topics.length === 1) return `Chủ đề: ${topics[0]}`;
    return `Chủ đề: ${topics.length} đã chọn`;
  });

  readonly filteredRooms = computed(() => {
    const list = this.allRooms();
    const topics = this.selectedTopics();
    const query = this.searchKeyword.trim().toLocaleLowerCase('vi');
    const filter = this.selectedRoomFilter();

    return list.filter((r, index) => {
      const matchTopic = topics.length === 0 || topics.some((topic) => r.tags.includes(topic) || r.category === topic);
      const matchQuery =
        !query ||
        r.name.toLocaleLowerCase('vi').includes(query) ||
        r.description.toLocaleLowerCase('vi').includes(query) ||
        r.tags.some((t) => t.toLocaleLowerCase('vi').includes(query));
      const matchStatus = filter === 'trending'
        ? r.rating >= 4.8
        : filter === 'new'
          ? index < 3
          : filter === 'active'
            ? r.status !== 'idle'
            : r.currentUsers < r.maxUsers;
      return matchTopic && matchQuery && matchStatus;
    });
  });

  @HostListener('document:click', ['$event'])
  closeTopicMenuOnOutsideClick(event: MouseEvent): void {
    if (this.isTopicMenuOpen() && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.closeTopicMenu();
    }
  }

  @HostListener('document:keydown.escape')
  closeTopicMenuOnEscape(): void {
    this.closeTopicMenu();
  }

  toggleTopicMenu(): void {
    if (this.isTopicMenuOpen()) {
      this.closeTopicMenu();
      return;
    }
    this.pendingTopics.set([...this.selectedTopics()]);
    this.topicSearchKeyword = '';
    this.isTopicMenuOpen.set(true);
  }

  closeTopicMenu(): void {
    this.isTopicMenuOpen.set(false);
    this.topicSearchKeyword = '';
  }

  togglePendingTopic(topic: string): void {
    const selected = this.pendingTopics();
    this.pendingTopics.set(selected.includes(topic) ? selected.filter((item) => item !== topic) : [...selected, topic]);
  }

  clearPendingTopics(): void {
    this.pendingTopics.set([]);
  }

  applyTopicFilter(): void {
    this.selectedTopics.set([...this.pendingTopics()]);
    this.closeTopicMenu();
  }

  resetFilters(): void {
    this.selectedRoomFilter.set('trending');
    this.selectedTopics.set([]);
    this.pendingTopics.set([]);
    this.searchKeyword = '';
    this.closeTopicMenu();
  }

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
