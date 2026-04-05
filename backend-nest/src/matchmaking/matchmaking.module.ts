import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GameModule } from '../game/game.module';
import { MatchmakingGateway } from './matchmaking.gateway';
import { MatchmakingService } from './matchmaking.service';
import { SocketAuthService } from './socket-auth.service';

@Module({
  imports: [AuthModule, GameModule],
  providers: [
    SocketAuthService,
    MatchmakingService,
    MatchmakingGateway,
  ],
})
export class MatchmakingModule {}
