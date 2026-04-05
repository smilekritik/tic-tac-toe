import { Injectable } from '@nestjs/common';
import { AppError } from '../common/errors/app-error';
import { createEngine } from '../game/engine/game.engine';
import { getModeModule } from '../game/engine/game-modes';
import { PrismaService } from '../prisma/prisma.service';

type PaginationQuery = Record<string, string | string[] | undefined>;

type MatchHistoryResponse = {
  items: Array<{
    matchId: string;
    gameMode: {
      code: string;
      name: string;
    };
    matchType: string;
    opponent: {
      username: string;
      avatarPath: string | null;
    };
    result: 'win' | 'loss' | 'draw';
    resultType: string | null;
    startedAt: Date | null;
    finishedAt: Date | null;
    durationSeconds: number | null;
    moveCount: number;
    ratingDelta: number | null;
  }>;
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  clampPagination(query: PaginationQuery): { page: number; limit: number } {
    const page = Number.parseInt(this.getFirstQueryValue(query.page) || '', 10);
    const limit = Number.parseInt(this.getFirstQueryValue(query.limit) || '', 10);

    return {
      page: Number.isInteger(page) && page > 0 ? page : 1,
      limit: Number.isInteger(limit) && limit > 0 ? Math.min(limit, 20) : 10,
    };
  }

  async getMatchHistoryByUserId(userId: string, query: PaginationQuery = {}): Promise<MatchHistoryResponse> {
    const { page, limit } = this.clampPagination(query);
    const skip = (page - 1) * limit;
    const where = {
      status: 'finished' as const,
      OR: [
        { playerXId: userId },
        { playerOId: userId },
      ],
    };

    const [total, matches] = await Promise.all([
      this.prisma.match.count({ where }),
      this.prisma.match.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { finishedAt: 'desc' },
          { startedAt: 'desc' },
        ],
        select: {
          id: true,
          matchType: true,
          winnerId: true,
          resultType: true,
          startedAt: true,
          finishedAt: true,
          durationSeconds: true,
          ratingDeltaX: true,
          ratingDeltaO: true,
          gameMode: {
            select: {
              code: true,
              name: true,
            },
          },
          playerX: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  avatarPath: true,
                },
              },
            },
          },
          playerO: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  avatarPath: true,
                },
              },
            },
          },
          _count: {
            select: {
              moves: true,
            },
          },
        },
      }),
    ]);

    return {
      items: matches.map((match) => this.mapMatchHistoryItem(match, userId)),
      page,
      limit,
      total,
      hasMore: skip + matches.length < total,
    };
  }

  async getPublicMatchHistory(username: string, query: PaginationQuery = {}): Promise<MatchHistoryResponse> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        profile: {
          select: {
            publicProfileEnabled: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404);
    }

    if (!user.profile?.publicProfileEnabled) {
      throw new AppError('PROFILE_PRIVATE', 403);
    }

    return this.getMatchHistoryByUserId(user.id, query);
  }

  async getMatchDetails(matchId: string, viewerUserId: string | null = null): Promise<Record<string, unknown>> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        matchType: true,
        status: true,
        winnerId: true,
        resultType: true,
        startedAt: true,
        finishedAt: true,
        durationSeconds: true,
        ratingDeltaX: true,
        ratingDeltaO: true,
        gameMode: {
          select: {
            code: true,
            name: true,
          },
        },
        playerX: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                avatarPath: true,
                publicProfileEnabled: true,
              },
            },
          },
        },
        playerO: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                avatarPath: true,
                publicProfileEnabled: true,
              },
            },
          },
        },
        winner: {
          select: {
            username: true,
          },
        },
        moves: {
          orderBy: {
            moveNumber: 'asc',
          },
          select: {
            id: true,
            moveNumber: true,
            playerId: true,
            symbol: true,
            positionX: true,
            positionY: true,
            createdAt: true,
          },
        },
      },
    });

    if (!match) {
      throw new AppError('MATCH_NOT_FOUND', 404);
    }

    const isParticipant = Boolean(
      viewerUserId && (match.playerX.id === viewerUserId || match.playerO.id === viewerUserId),
    );
    const isPublicMatch = Boolean(
      match.playerX.profile?.publicProfileEnabled || match.playerO.profile?.publicProfileEnabled,
    );

    if (!isParticipant && !isPublicMatch) {
      throw new AppError('PROFILE_PRIVATE', 403);
    }

    const finalState = this.buildStateFromMoves(match.gameMode.code, match.moves);

    return {
      id: match.id,
      matchType: match.matchType,
      status: match.status,
      resultType: match.resultType,
      startedAt: match.startedAt,
      finishedAt: match.finishedAt,
      durationSeconds: match.durationSeconds,
      ratingDeltaX: match.ratingDeltaX,
      ratingDeltaO: match.ratingDeltaO,
      gameMode: match.gameMode,
      playerX: {
        id: match.playerX.id,
        username: match.playerX.username,
        avatarPath: match.playerX.profile?.avatarPath || null,
      },
      playerO: {
        id: match.playerO.id,
        username: match.playerO.username,
        avatarPath: match.playerO.profile?.avatarPath || null,
      },
      winner: match.winner ? { username: match.winner.username } : null,
      moves: match.moves,
      finalState: {
        board: finalState.board,
      },
      winLine: finalState.winResult?.line || null,
    };
  }

  private buildStateFromMoves(
    modeCode: string,
    moves: Array<{
      symbol: string;
      positionX: number;
      positionY: number;
    }>,
  ): { board: Array<'X' | 'O' | null>; winResult: { winner: 'X' | 'O'; line: [number, number, number] } | null } {
    const engine = createEngine(getModeModule(modeCode));
    let state = engine.init();

    for (const move of moves) {
      const position = move.positionX * 3 + move.positionY;
      state = engine.applyMove(state, position, move.symbol as 'X' | 'O');
    }

    const serializedState = engine.serialize(state);

    return {
      board: serializedState.board,
      winResult: engine.checkWinner(serializedState.board),
    };
  }

  private mapMatchHistoryItem(
    match: {
      id: string;
      matchType: string;
      winnerId: string | null;
      resultType: string | null;
      startedAt: Date | null;
      finishedAt: Date | null;
      durationSeconds: number | null;
      ratingDeltaX: number | null;
      ratingDeltaO: number | null;
      gameMode: { code: string; name: string };
      playerX: { id: string; username: string; profile: { avatarPath: string | null } | null };
      playerO: { id: string; username: string; profile: { avatarPath: string | null } | null };
      _count: { moves: number };
    },
    userId: string,
  ) {
    const isPlayerX = match.playerX.id === userId;
    const opponent = isPlayerX ? match.playerO : match.playerX;
    const ratingDelta = isPlayerX ? match.ratingDeltaX : match.ratingDeltaO;

    let result: 'win' | 'loss' | 'draw' = 'loss';
    if (match.resultType === 'draw') {
      result = 'draw';
    } else if (match.winnerId === userId) {
      result = 'win';
    }

    return {
      matchId: match.id,
      gameMode: match.gameMode,
      matchType: match.matchType,
      opponent: {
        username: opponent.username,
        avatarPath: opponent.profile?.avatarPath || null,
      },
      result,
      resultType: match.resultType,
      startedAt: match.startedAt,
      finishedAt: match.finishedAt,
      durationSeconds: match.durationSeconds,
      moveCount: match._count.moves,
      ratingDelta,
    };
  }

  private getFirstQueryValue(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }
}
