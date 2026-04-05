import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { MatchesService } from './matches.service';

@ApiTags('Matches')
@Controller('api')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get('me/matches')
  @ApiOperation({ summary: 'Get current user match history' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'cursor', required: false, description: 'Pagination cursor.' })
  @ApiQuery({ name: 'limit', required: false, description: 'Page size.' })
  @ApiQuery({ name: 'mode', required: false, description: 'Game mode filter.' })
  @ApiOkResponse({ description: 'Returns paginated match history for the current user.' })
  @UseGuards(JwtAuthGuard)
  async getMyMatches(
    @CurrentUser() user?: AuthenticatedUser,
    @Query() query?: Record<string, string | string[] | undefined>,
  ) {
    const userId = user?.sub || user?.id;
    return this.matchesService.getMatchHistoryByUserId(userId || '', query || {});
  }

  @Get('users/:username/matches')
  @ApiOperation({ summary: 'Get public match history by username' })
  @ApiParam({ name: 'username', description: 'Public username.' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Pagination cursor.' })
  @ApiQuery({ name: 'limit', required: false, description: 'Page size.' })
  @ApiQuery({ name: 'mode', required: false, description: 'Game mode filter.' })
  @ApiOkResponse({ description: 'Returns public match history if profile privacy allows it.' })
  async getUserMatches(
    @Param('username') username: string,
    @Query() query?: Record<string, string | string[] | undefined>,
  ) {
    return this.matchesService.getPublicMatchHistory(username, query || {});
  }

  @Get('matches/:matchId')
  @ApiOperation({ summary: 'Get match details by id' })
  @ApiParam({ name: 'matchId', description: 'Match identifier.' })
  @ApiOkResponse({ description: 'Returns persisted match details and reconstructed final state.' })
  @UseGuards(OptionalJwtAuthGuard)
  async getMatchDetails(
    @Param('matchId') matchId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const viewerUserId = user?.sub || user?.id || null;
    return this.matchesService.getMatchDetails(matchId, viewerUserId);
  }
}
