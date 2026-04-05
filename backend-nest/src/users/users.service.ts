import { Injectable } from '@nestjs/common';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';

type RatingRecord = {
  eloRating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  maxWinStreak: number;
  gameMode: {
    code: string;
    name: string;
  };
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicProfile(username: string): Promise<Record<string, unknown>> {
    const [user, gameModes] = await Promise.all([
      this.prisma.user.findUnique({
        where: { username },
        select: {
          username: true,
          createdAt: true,
          profile: {
            select: {
              avatarPath: true,
              publicProfileEnabled: true,
            },
          },
          ratings: {
            select: {
              eloRating: true,
              gamesPlayed: true,
              wins: true,
              losses: true,
              draws: true,
              winStreak: true,
              maxWinStreak: true,
              gameMode: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.gameMode.findMany({
        where: {
          isEnabled: true,
          isRanked: true,
        },
        select: {
          code: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404);
    }

    if (!user.profile?.publicProfileEnabled) {
      throw new AppError('PROFILE_PRIVATE', 403);
    }

    return {
      ...user,
      ratings: this.hydrateRatings(gameModes, user.ratings),
    };
  }

  private hydrateRatings(
    gameModes: Array<{ code: string; name: string }>,
    ratings: RatingRecord[] = [],
  ): RatingRecord[] {
    const ratingByMode = new Map(ratings.map((rating) => [rating.gameMode.code, rating]));

    return gameModes.map((gameMode) => {
      const existingRating = ratingByMode.get(gameMode.code);
      if (existingRating) {
        return existingRating;
      }

      return {
        eloRating: 1000,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winStreak: 0,
        maxWinStreak: 0,
        gameMode: {
          code: gameMode.code,
          name: gameMode.name,
        },
      };
    });
  }
}
