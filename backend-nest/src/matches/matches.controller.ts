import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { MatchesService } from './matches.service';

@Controller('api')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get('me/matches')
  @UseGuards(JwtAuthGuard)
  async getMyMatches(
    @CurrentUser() user?: AuthenticatedUser,
    @Query() query?: Record<string, string | string[] | undefined>,
  ) {
    const userId = user?.sub || user?.id;
    return this.matchesService.getMatchHistoryByUserId(userId || '', query || {});
  }

  @Get('users/:username/matches')
  async getUserMatches(
    @Param('username') username: string,
    @Query() query?: Record<string, string | string[] | undefined>,
  ) {
    return this.matchesService.getPublicMatchHistory(username, query || {});
  }

  @Get('matches/:matchId')
  @UseGuards(OptionalJwtAuthGuard)
  async getMatchDetails(
    @Param('matchId') matchId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const viewerUserId = user?.sub || user?.id || null;
    return this.matchesService.getMatchDetails(matchId, viewerUserId);
  }
}
