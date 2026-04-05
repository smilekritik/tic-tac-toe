import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { AppError } from '../common/errors/app-error';
import { GameStateService } from './game-state.service';

@Controller('api/game')
export class GameController {
  constructor(private readonly gameStateService: GameStateService) {}

  @Get('active')
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
