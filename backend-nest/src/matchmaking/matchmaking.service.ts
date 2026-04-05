import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { GameModeRef, MatchPlayerRef } from '../game/game-state.types';
import { nowMs } from '../common/time/dayjs';

type QueueEntry = MatchPlayerRef & {
  socketId?: string;
  gameMode: GameModeRef;
  joinedAt: number;
};

type MatchmakingResult = {
  match: {
    id: string;
  };
  player1: QueueEntry;
  player2: QueueEntry;
  gameMode: GameModeRef;
};

@Injectable()
export class MatchmakingService {
  private readonly queue = new Map<string, QueueEntry>();

  constructor(private readonly prisma: PrismaService) {}

  addToQueue(userId: string, username: string, socketId: string, gameMode: GameModeRef): void {
    this.queue.set(userId, {
      userId,
      username,
      socketId,
      gameMode,
      joinedAt: nowMs(),
    });
  }

  removeFromQueue(userId: string): void {
    this.queue.delete(userId);
  }

  isInQueue(userId: string): boolean {
    return this.queue.has(userId);
  }

  async tryMatch(currentUserId: string): Promise<MatchmakingResult | null> {
    const currentPlayer = this.queue.get(currentUserId);
    if (!currentPlayer) {
      return null;
    }

    for (const [candidateId, candidate] of this.queue.entries()) {
      if (candidateId === currentUserId) {
        continue;
      }

      if (candidate.gameMode?.code !== currentPlayer.gameMode?.code) {
        continue;
      }

      const player1 = currentPlayer;
      const player2 = candidate;

      this.removeFromQueue(currentUserId);
      this.removeFromQueue(candidateId);

      const match = await this.prisma.match.create({
        data: {
          gameModeId: player1.gameMode.id || '',
          matchType: 'ranked',
          playerXId: player1.userId,
          playerOId: player2.userId,
          status: 'waiting',
        },
        select: {
          id: true,
        },
      });

      return {
        match,
        player1,
        player2,
        gameMode: player1.gameMode,
      };
    }

    return null;
  }

  resetForTests(): void {
    this.queue.clear();
  }
}
