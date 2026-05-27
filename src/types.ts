export type GameMode = 'easy' | 'normal' | 'hard';

export interface WordItem {
  id: string;
  word: string; // e.g. "사과"
  english: string; // e.g. "Apple"
  sender: 'ai' | 'user';
  timestamp: string; // e.g. "10:42 AM"
  definition?: string; // e.g. "붉고 달콤한 과일"
}

export interface GameSession {
  id: string;
  mode: GameMode;
  score: number;
  turn: number;
  history: WordItem[];
  status: 'playing' | 'ended';
  timeRemaining: number;
  winner?: 'user' | 'ai' | 'time_out';
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  mode: GameMode;
  turns: number;
  date: string;
}
