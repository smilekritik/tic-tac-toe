import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SocketAuthService } from '../matchmaking/socket-auth.service';
import { GameController } from './game.controller';
import { GameplayGateway } from './gameplay.gateway';
import { GameplayService } from './gameplay.service';
import { GameStateService } from './game-state.service';

@Module({
  imports: [AuthModule],
  controllers: [GameController],
  providers: [SocketAuthService, GameStateService, GameplayService, GameplayGateway],
  exports: [GameStateService, GameplayService],
})
export class GameModule {}
