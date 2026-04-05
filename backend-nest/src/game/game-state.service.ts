import { Injectable, OnModuleDestroy } from '@nestjs/common';
import type {
  ActiveMatchSnapshot,
  ActiveMatchState,
  ChatLastSentAt,
  GameChatMessage,
  GameModeRef,
  ManagedTimeout,
  MatchPlayerRef,
  ReconnectDeadlines,
  ReconnectTimers,
} from './game-state.types';
import type { BaseGameState } from './engine/types';

@Injectable()
export class GameStateService implements OnModuleDestroy {
  private readonly matches = new Map<string, ActiveMatchState>();
  private readonly userActiveMatch = new Map<string, string>();

  createMatch(
    matchId: string,
    playerX: MatchPlayerRef,
    playerO: MatchPlayerRef,
    gameMode: GameModeRef | null,
  ): ActiveMatchState {
    const match: ActiveMatchState = {
      matchId,
      playerX,
      playerO,
      gameMode,
      gameState: null,
      startedAt: null,
      timer: null,
      turnDeadlineAt: null,
      connectedPlayers: new Set<string>(),
      disconnectedPlayers: new Set<string>(),
      reconnectTimers: {},
      reconnectDeadlines: {},
      chatMessages: [],
      chatLastSentAt: {},
    };

    this.matches.set(matchId, match);
    this.userActiveMatch.set(playerX.userId, matchId);
    this.userActiveMatch.set(playerO.userId, matchId);

    return match;
  }

  getMatch(matchId: string): ActiveMatchState | null {
    return this.matches.get(matchId) || null;
  }

  getMatchByUserId(userId: string): ActiveMatchState | null {
    const active = this.getActiveMatchForUser(userId);
    return active?.match || null;
  }

  getActiveMatchForUser(userId: string): ActiveMatchSnapshot | null {
    const matchId = this.userActiveMatch.get(userId);
    if (!matchId) {
      return null;
    }

    return {
      matchId,
      match: this.matches.get(matchId) || null,
    };
  }

  updateMatch(matchId: string, updates: Partial<ActiveMatchState>): ActiveMatchState | null {
    const match = this.matches.get(matchId);
    if (!match) {
      return null;
    }

    const nextMatch: ActiveMatchState = {
      ...match,
      ...updates,
    };

    this.matches.set(matchId, nextMatch);
    return nextMatch;
  }

  setGameState(matchId: string, gameState: BaseGameState | null): ActiveMatchState | null {
    return this.updateMatch(matchId, { gameState });
  }

  setStartedAt(matchId: string, startedAt: Date | null): ActiveMatchState | null {
    return this.updateMatch(matchId, { startedAt });
  }

  setTurnTimer(matchId: string, timer: ManagedTimeout | null, turnDeadlineAt: number | null): ActiveMatchState | null {
    this.clearTurnTimer(matchId);
    return this.updateMatch(matchId, {
      timer,
      turnDeadlineAt,
    });
  }

  clearTurnTimer(matchId: string): ActiveMatchState | null {
    const match = this.matches.get(matchId);
    if (!match) {
      return null;
    }

    if (match.timer) {
      clearTimeout(match.timer);
    }

    return this.updateMatch(matchId, {
      timer: null,
      turnDeadlineAt: null,
    });
  }

  setReconnectTimer(
    matchId: string,
    userId: string,
    timer: ManagedTimeout | null,
    reconnectDeadlineAt: number | null,
  ): ActiveMatchState | null {
    const match = this.matches.get(matchId);
    if (!match) {
      return null;
    }

    const reconnectTimers: ReconnectTimers = { ...match.reconnectTimers };
    const reconnectDeadlines: ReconnectDeadlines = { ...match.reconnectDeadlines };

    if (reconnectTimers[userId]) {
      clearTimeout(reconnectTimers[userId]);
    }

    reconnectTimers[userId] = timer || undefined;
    reconnectDeadlines[userId] = reconnectDeadlineAt || undefined;

    return this.updateMatch(matchId, {
      reconnectTimers,
      reconnectDeadlines,
    });
  }

  clearReconnectTimer(matchId: string, userId: string): ActiveMatchState | null {
    const match = this.matches.get(matchId);
    if (!match) {
      return null;
    }

    const reconnectTimers: ReconnectTimers = { ...match.reconnectTimers };
    const reconnectDeadlines: ReconnectDeadlines = { ...match.reconnectDeadlines };

    if (reconnectTimers[userId]) {
      clearTimeout(reconnectTimers[userId]);
    }

    delete reconnectTimers[userId];
    delete reconnectDeadlines[userId];

    return this.updateMatch(matchId, {
      reconnectTimers,
      reconnectDeadlines,
    });
  }

  clearReconnectTimers(matchId: string): ActiveMatchState | null {
    const match = this.matches.get(matchId);
    if (!match) {
      return null;
    }

    for (const timer of Object.values(match.reconnectTimers || {})) {
      if (timer) {
        clearTimeout(timer);
      }
    }

    return this.updateMatch(matchId, {
      reconnectTimers: {},
      reconnectDeadlines: {},
    });
  }

  setPlayerConnected(matchId: string, userId: string): ActiveMatchState | null {
    const match = this.matches.get(matchId);
    if (!match) {
      return null;
    }

    const connectedPlayers = new Set(match.connectedPlayers);
    const disconnectedPlayers = new Set(match.disconnectedPlayers);
    connectedPlayers.add(userId);
    disconnectedPlayers.delete(userId);

    return this.updateMatch(matchId, {
      connectedPlayers,
      disconnectedPlayers,
    });
  }

  setPlayerDisconnected(matchId: string, userId: string): ActiveMatchState | null {
    const match = this.matches.get(matchId);
    if (!match) {
      return null;
    }

    const connectedPlayers = new Set(match.connectedPlayers);
    const disconnectedPlayers = new Set(match.disconnectedPlayers);
    connectedPlayers.delete(userId);
    disconnectedPlayers.add(userId);

    return this.updateMatch(matchId, {
      connectedPlayers,
      disconnectedPlayers,
    });
  }

  appendChatMessage(matchId: string, message: GameChatMessage, limit = 50): ActiveMatchState | null {
    const match = this.matches.get(matchId);
    if (!match) {
      return null;
    }

    const chatMessages = [...match.chatMessages, message].slice(-limit);
    return this.updateMatch(matchId, { chatMessages });
  }

  setChatLastSentAt(matchId: string, userId: string, sentAt: number): ActiveMatchState | null {
    const match = this.matches.get(matchId);
    if (!match) {
      return null;
    }

    const chatLastSentAt: ChatLastSentAt = {
      ...match.chatLastSentAt,
      [userId]: sentAt,
    };

    return this.updateMatch(matchId, { chatLastSentAt });
  }

  deleteMatch(matchId: string): void {
    const match = this.matches.get(matchId);
    if (match) {
      this.clearManagedTimers(match);
      this.userActiveMatch.delete(match.playerX.userId);
      this.userActiveMatch.delete(match.playerO.userId);
    }

    this.matches.delete(matchId);
  }

  resetForTests(): void {
    for (const match of this.matches.values()) {
      this.clearManagedTimers(match);
    }

    this.matches.clear();
    this.userActiveMatch.clear();
  }

  onModuleDestroy(): void {
    this.resetForTests();
  }

  private clearManagedTimers(match: ActiveMatchState): void {
    if (match.timer) {
      clearTimeout(match.timer);
    }

    for (const timer of Object.values(match.reconnectTimers || {})) {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }
}
