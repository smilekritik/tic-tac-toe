import { Module } from '@nestjs/common';
import { GameStateService } from './game-state.service';

@Module({
  providers: [GameStateService],
  exports: [GameStateService],
})
export class GameModule {}
