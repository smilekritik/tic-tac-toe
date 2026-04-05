import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { AppError } from '../common/errors/app-error';
import { ApiUnauthorizedErrorResponse } from '../docs/openapi.decorators';
import { LeaderboardResponseDto } from '../docs/openapi.models';
import { LeaderboardService } from './leaderboard.service';

@ApiTags('Leaderboard')
@Controller('api/leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get ranked leaderboard for a game mode' })
  @ApiBearerAuth('bearerAuth')
  @ApiQuery({ name: 'mode', required: false, description: 'Game mode code filter.' })
  @ApiOkResponse({ description: 'Returns leaderboard entries and current viewer placement.', type: LeaderboardResponseDto })
  @ApiUnauthorizedErrorResponse()
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
