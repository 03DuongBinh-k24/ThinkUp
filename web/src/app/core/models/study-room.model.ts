export interface StudyRoomItem {
  roomId: string;
  name: string;
  type: 'public' | 'private';
  maxUsers: number;
  currentUsers: number;
  status: 'focus' | 'break' | 'idle';
  tags: string[];
  category: string;
  theme: string;
  description: string;
  rating: number;
  creator: string;
  waitlistCount?: number;
  password?: string;
  requiresPassword?: boolean;
}

export interface PomodoroConfig {
  focusTime: number; // minutes
  shortBreak: number;
  longBreak: number;
}
