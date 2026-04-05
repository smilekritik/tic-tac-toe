import type { BaseGameState } from './engine/types';

export type MatchPlayerRef = {
  userId: string;
  username: string;
  socketId?: string;
};

export type GameModeRef = {
  id?: string;
  code: string;
  name: string;
  isRanked?: boolean;
  isEnabled?: boolean;
};

export type GameChatMessage = {
  id: string;
  userId: string;
  username: string;
  text: string;
  createdAt: string;
};

export type ManagedTimeout = ReturnType<typeof setTimeout>;

export type ReconnectTimers = Record<string, ManagedTimeout | undefined>;
export type ReconnectDeadlines = Record<string, number | undefined>;
export type ChatLastSentAt = Record<string, number | undefined>;

export type ActiveMatchState = {
  matchId: string;
  playerX: MatchPlayerRef;
  playerO: MatchPlayerRef;
  gameMode: GameModeRef | null;
  gameState: BaseGameState | null;
  startedAt: Date | null;
  timer: ManagedTimeout | null;
  turnDeadlineAt: number | null;
  connectedPlayers: Set<string>;
  disconnectedPlayers: Set<string>;
  reconnectTimers: ReconnectTimers;
  reconnectDeadlines: ReconnectDeadlines;
  chatMessages: GameChatMessage[];
  chatLastSentAt: ChatLastSentAt;
};

export type ActiveMatchSnapshot = {
  matchId: string;
  match: ActiveMatchState | null;
};
