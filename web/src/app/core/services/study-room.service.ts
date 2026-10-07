import { Injectable, signal, computed } from '@angular/core';
import { StudyRoomItem } from '../models/study-room.model';
import { MOCK_STUDY_ROOMS } from '../data/mock-study-rooms';

@Injectable({
  providedIn: 'root'
})
export class StudyRoomService {
  private readonly roomsSig = signal<StudyRoomItem[]>(MOCK_STUDY_ROOMS);

  readonly rooms = computed(() => this.roomsSig());

  getRoomById(roomId: string): StudyRoomItem | null {
    return this.roomsSig().find((r) => r.roomId === roomId) || null;
  }

  createRoom(newRoom: Omit<StudyRoomItem, 'rating'>): StudyRoomItem {
    const room: StudyRoomItem = {
      ...newRoom,
      rating: 5.0
    };
    this.roomsSig.set([room, ...this.roomsSig()]);
    return room;
  }
}
