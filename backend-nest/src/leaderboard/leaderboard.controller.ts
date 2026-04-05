import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { AppError } from '../common/errors/app-error';
import { LeaderboardService } from './leaderboard.service';

@Controller('api/leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getLeaderboard(
    @CurrentUser() user?: AuthenticatedUser,
    @Query('mode') mode?: string,
  ) {
    const viewerUserId = user?.sub || user?.id;
    if (!viewerUserId) {
      throw new AppError('UNAUTHORIZED', 401);
    }

    return this.leaderboardService.getLeaderboard({
      viewerUserId,
      gameModeCode: mode,
    });
  }
}
