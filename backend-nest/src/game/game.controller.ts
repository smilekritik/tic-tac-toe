import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { AppError } from '../common/errors/app-error';
import { ApiUnauthorizedErrorResponse } from '../docs/openapi.decorators';
import { ActiveMatchResponseDto } from '../docs/openapi.models';
import { GameStateService } from './game-state.service';

@ApiTags('Game')
@Controller('api/game')
export class GameController {
  constructor(private readonly gameStateService: GameStateService) {}

  @Get('active')
  @ApiOperation({ summary: 'Get currently active or reconnectable match id for the current user' })
  @ApiBearerAuth('bearerAuth')
  @ApiOkResponse({ description: 'Returns active match id or null when no active match exists.', type: ActiveMatchResponseDto })
  @ApiUnauthorizedErrorResponse()
  @UseGuards(JwtAuthGuard)
  async getActiveMatch(
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<{ matchId: string | null }> {
    const userId = user?.sub || user?.id;
    if (!userId) {
      throw new AppError('UNAUTHORIZED', 401);
    }

    const active = this.gameStateService.getActiveMatchForUser(userId);
    if (!active || !active.match) {
      return { matchId: null };
    }

    return { matchId: active.matchId };
  }
}
