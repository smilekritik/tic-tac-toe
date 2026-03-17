const prisma = require('../../lib/prisma');
const classicMode = require('../game/engine/classic.mode');

function createError(code, status) {
  const err = new Error(code);
  err.code = code;
  err.status = status;
  return err;
}

function clampPagination(pageValue, limitValue) {
  const page = Number.parseInt(pageValue, 10);
  const limit = Number.parseInt(limitValue, 10);

  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: Number.isInteger(limit) && limit > 0 ? Math.min(limit, 20) : 10,
  };
}

function mapMatchHistoryItem(match, userId) {
  const isPlayerX = match.playerX.id === userId;
  const opponent = isPlayerX ? match.playerO : match.playerX;
  const ratingDelta = isPlayerX ? match.ratingDeltaX : match.ratingDeltaO;

  let result = 'loss';
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

async function getMatchHistoryByUserId(userId, query = {}) {
  const { page, limit } = clampPagination(query.page, query.limit);
  const skip = (page - 1) * limit;
  const where = {
    status: 'finished',
    OR: [
      { playerXId: userId },
      { playerOId: userId },
    ],
  };

  const [total, matches] = await Promise.all([
    prisma.match.count({ where }),
    prisma.match.findMany({
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
    items: matches.map((match) => mapMatchHistoryItem(match, userId)),
    page,
    limit,
    total,
    hasMore: skip + matches.length < total,
  };
}

async function getPublicMatchHistory(username, query = {}) {
  const user = await prisma.user.findUnique({
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

  if (!user) throw createError('USER_NOT_FOUND', 404);
  if (!user.profile?.publicProfileEnabled) throw createError('PROFILE_PRIVATE', 403);

  return getMatchHistoryByUserId(user.id, query);
}

function buildBoardFromMoves(moves) {
  const board = Array(9).fill(null);

  for (const move of moves) {
    const position = move.positionX * 3 + move.positionY;
    board[position] = move.symbol;
  }

  return board;
}

async function getMatchDetails(matchId, viewerUserId = null) {
  const match = await prisma.match.findUnique({
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

  if (!match) throw createError('MATCH_NOT_FOUND', 404);

  const isParticipant = viewerUserId
    && (match.playerX.id === viewerUserId || match.playerO.id === viewerUserId);
  const isPublicMatch = match.playerX.profile?.publicProfileEnabled || match.playerO.profile?.publicProfileEnabled;

  if (!isParticipant && !isPublicMatch) {
    throw createError('PROFILE_PRIVATE', 403);
  }

  const board = buildBoardFromMoves(match.moves);
  const winResult = classicMode.checkWinner(board);

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
      board,
    },
    winLine: winResult?.line || null,
  };
}

module.exports = {
  getMatchHistoryByUserId,
  getPublicMatchHistory,
  getMatchDetails,
};
