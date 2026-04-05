import { Injectable } from '@nestjs/common';
import type { GameMode, MatchType, UserRating } from '@prisma/client';
import { ELO_K_FACTOR, TURN_TIMEOUT_MS, CHAT_RATE_LIMIT_MS } from './game.constants';
import { nowDate, nowMs } from '../common/time/dayjs';
import { PrismaService } from '../prisma/prisma.service';
import { GameStateService } from './game-state.service';
import type { ActiveMatchState, GameChatMessage } from './game-state.types';
import { createEngine } from './engine/game.engine';
import { getModeModule } from './engine/game-modes';
import { sanitizeChatText } from './chat.sanitizer';

type MatchScoreResult = {
  scoreX: number;
  scoreO: number;
};

type RatingDeltaResult = {
  ratingDeltaX: number | null;
  ratingDeltaO: number | null;
};

@Injectable()
export class GameplayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gameStateService: GameStateService,
  ) {}

  getMatchEngine(match: ActiveMatchState) {
    return createEngine(getModeModule(match?.gameMode?.code || 'classic'));
  }

  serializeMatchState(match: ActiveMatchState): Record<string, unknown> {
    const engine = this.getMatchEngine(match);
    const serializedState = engine.serialize(match.gameState!);

    return {
      ...serializedState,
      playerX: match.playerX.username,
      playerO: match.playerO.username,
      turnDeadlineAt: match.turnDeadlineAt,
      nextRemovalPosition: serializedState.nextRemovalPosition ?? null,
      gameMode: match.gameMode
        ? {
            code: match.gameMode.code,
            name: match.gameMode.name,
          }
        : null,
    };
  }

  buildTimerPayload(matchId: string, match: ActiveMatchState): {
    matchId: string;
    currentSymbol: string;
    turnDeadlineAt: number;
  } | null {
    if (!match.gameState || !match.turnDeadlineAt) {
      return null;
    }

    return {
      matchId,
      currentSymbol: match.gameState.currentSymbol,
      turnDeadlineAt: match.turnDeadlineAt,
    };
  }

  async maybeStartMatch(matchId: string): Promise<ActiveMatchState | null> {
    const match = this.gameStateService.getMatch(matchId);
    if (!match || match.gameState || match.connectedPlayers.size < 2) {
      return null;
    }

    const startedAt = nowDate();

    await this.prisma.match.update({
      where: { id: matchId },
      data: {
        status: 'active',
        startedAt,
      },
    });

    const updated = this.gameStateService.updateMatch(matchId, {
      gameState: this.getMatchEngine(match).init(),
      startedAt,
    });

    if (!updated) {
      return null;
    }

    return this.startTurnTimer(matchId, async () => {
      const current = this.gameStateService.getMatch(matchId);
      if (!current || !current.gameState) {
        return;
      }

      const winner = current.gameState.currentSymbol === 'X' ? current.playerO : current.playerX;
      await this.endMatch(matchId, winner.userId, 'timeout');
    });
  }

  startTurnTimer(matchId: string, onTimeout: () => Promise<void> | void): ActiveMatchState | null {
    const match = this.gameStateService.getMatch(matchId);
    if (!match || !match.gameState) {
      return null;
    }

    const turnDeadlineAt = nowMs() + TURN_TIMEOUT_MS;
    const timer = setTimeout(async () => {
      await onTimeout();
    }, TURN_TIMEOUT_MS);

    return this.gameStateService.setTurnTimer(matchId, timer, turnDeadlineAt);
  }

  clearTurnTimer(matchId: string): ActiveMatchState | null {
    return this.gameStateService.clearTurnTimer(matchId);
  }

  startReconnectTimer(
    matchId: string,
    disconnectedUserId: string,
    onExpire: () => Promise<void> | void,
  ): ActiveMatchState | null {
    const reconnectDeadlineAt = nowMs() + TURN_TIMEOUT_MS;
    const timer = setTimeout(async () => {
      await onExpire();
    }, TURN_TIMEOUT_MS);

    return this.gameStateService.setReconnectTimer(
      matchId,
      disconnectedUserId,
      timer,
      reconnectDeadlineAt,
    );
  }

  clearReconnectTimer(matchId: string, userId: string): ActiveMatchState | null {
    return this.gameStateService.clearReconnectTimer(matchId, userId);
  }

  createChatMessage(match: ActiveMatchState, userId: string, username: string, text: unknown): GameChatMessage | null {
    const normalizedText = sanitizeChatText(text);
    if (!normalizedText) {
      return null;
    }

    const lastSentAt = match.chatLastSentAt?.[userId] || 0;
    if (nowMs() - lastSentAt < CHAT_RATE_LIMIT_MS) {
      return null;
    }

    return {
      id: `${nowMs()}-${userId}`,
      userId,
      username,
      text: normalizedText,
      createdAt: nowDate().toISOString(),
    };
  }

  markChatSent(matchId: string, userId: string, message: GameChatMessage): ActiveMatchState | null {
    this.gameStateService.appendChatMessage(matchId, message);
    return this.gameStateService.setChatLastSentAt(matchId, userId, nowMs());
  }

  async saveMoveToDb(
    matchId: string,
    playerId: string,
    symbol: string,
    position: number,
    moveNumber: number,
  ): Promise<void> {
    const positionX = Math.floor(position / 3);
    const positionY = position % 3;

    await this.prisma.matchMove.create({
      data: {
        matchId,
        moveNumber,
        playerId,
        symbol,
        positionX,
        positionY,
      },
    }).catch(() => undefined);
  }

  async endMatch(
    matchId: string,
    winnerId: string | null,
    reason: 'win' | 'draw' | 'timeout' | 'abandon',
  ): Promise<{ winnerId: string | null; reason: string; board: Array<'X' | 'O' | null> | undefined } | null> {
    const match = this.gameStateService.getMatch(matchId);
    if (!match) {
      return null;
    }

    this.gameStateService.clearTurnTimer(matchId);
    this.gameStateService.clearReconnectTimers(matchId);

    const durationSeconds = match.startedAt
      ? Math.max(0, Math.floor((nowMs() - match.startedAt.getTime()) / 1000))
      : null;
    const { ratingDeltaX, ratingDeltaO } = await this.applyMatchRatingResult(matchId, match, winnerId, reason);

    await this.prisma.match.update({
      where: { id: matchId },
      data: {
        status: 'finished',
        winnerId: winnerId || null,
        resultType: reason,
        finishedAt: nowDate(),
        durationSeconds,
        ratingDeltaX,
        ratingDeltaO,
      },
    });

    const payload = {
      winnerId,
      reason,
      board: match.gameState?.board,
    };

    this.gameStateService.deleteMatch(matchId);
    return payload;
  }

  private getMatchScores(
    match: ActiveMatchState,
    winnerId: string | null,
    reason: string,
  ): MatchScoreResult | null {
    if (reason === 'draw') {
      return { scoreX: 0.5, scoreO: 0.5 };
    }

    if (!winnerId) {
      return null;
    }

    if (winnerId === match.playerX.userId) {
      return { scoreX: 1, scoreO: 0 };
    }

    if (winnerId === match.playerO.userId) {
      return { scoreX: 0, scoreO: 1 };
    }

    return null;
  }

  private calculateExpectedScore(playerRating: number, opponentRating: number): number {
    return 1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
  }

  private calculateRatingDelta(playerRating: number, opponentRating: number, actualScore: number): number {
    const expectedScore = this.calculateExpectedScore(playerRating, opponentRating);
    return Math.round(ELO_K_FACTOR * (actualScore - expectedScore));
  }

  private buildRatingUpdate(rating: UserRating, score: number, delta: number) {
    const isWin = score === 1;
    const isDraw = score === 0.5;
    const nextWinStreak = isWin ? rating.winStreak + 1 : 0;

    return {
      eloRating: rating.eloRating + delta,
      gamesPlayed: rating.gamesPlayed + 1,
      wins: rating.wins + (isWin ? 1 : 0),
      losses: rating.losses + (score === 0 ? 1 : 0),
      draws: rating.draws + (isDraw ? 1 : 0),
      winStreak: nextWinStreak,
      maxWinStreak: Math.max(rating.maxWinStreak, nextWinStreak),
    };
  }

  private async applyMatchRatingResult(
    matchId: string,
    match: ActiveMatchState,
    winnerId: string | null,
    reason: string,
  ): Promise<RatingDeltaResult> {
    const dbMatch = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: {
        gameModeId: true,
        matchType: true,
        startedAt: true,
        gameMode: {
          select: {
            isRanked: true,
          },
        },
      },
    });

    const scores = this.getMatchScores(match, winnerId, reason);
    if (!dbMatch || !scores) {
      return { ratingDeltaX: null, ratingDeltaO: null };
    }

    if (!dbMatch.startedAt || dbMatch.matchType !== 'ranked' || !dbMatch.gameMode?.isRanked) {
      return { ratingDeltaX: null, ratingDeltaO: null };
    }

    return this.prisma.$transaction(async (tx) => {
      const [ratingX, ratingO] = await Promise.all([
        tx.userRating.upsert({
          where: {
            userId_gameModeId: {
              userId: match.playerX.userId,
              gameModeId: dbMatch.gameModeId,
            },
          },
          update: {},
          create: {
            userId: match.playerX.userId,
            gameModeId: dbMatch.gameModeId,
          },
        }),
        tx.userRating.upsert({
          where: {
            userId_gameModeId: {
              userId: match.playerO.userId,
              gameModeId: dbMatch.gameModeId,
            },
          },
          update: {},
          create: {
            userId: match.playerO.userId,
            gameModeId: dbMatch.gameModeId,
          },
        }),
      ]);

      const ratingDeltaX = this.calculateRatingDelta(ratingX.eloRating, ratingO.eloRating, scores.scoreX);
      const ratingDeltaO = -ratingDeltaX;

      await Promise.all([
        tx.userRating.update({
          where: { id: ratingX.id },
          data: this.buildRatingUpdate(ratingX, scores.scoreX, ratingDeltaX),
        }),
        tx.userRating.update({
          where: { id: ratingO.id },
          data: this.buildRatingUpdate(ratingO, scores.scoreO, ratingDeltaO),
        }),
      ]);

      return { ratingDeltaX, ratingDeltaO };
    });
  }
}
