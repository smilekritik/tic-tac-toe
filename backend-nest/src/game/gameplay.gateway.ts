import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server } from 'socket.io';
import { nowMs } from '../common/time/dayjs';
import { AppLoggerService } from '../logger/logger.service';
import { SocketAuthService } from '../matchmaking/socket-auth.service';
import type { AuthenticatedSocket } from '../matchmaking/interfaces/authenticated-socket.interface';
import { GameStateService } from './game-state.service';
import { GameplayService } from './gameplay.service';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class GameplayGateway
implements OnGatewayInit<Server>, OnGatewayConnection<AuthenticatedSocket>, OnGatewayDisconnect<AuthenticatedSocket> {
  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly socketAuth: SocketAuthService,
    private readonly gameStateService: GameStateService,
    private readonly gameplayService: GameplayService,
    private readonly logger: AppLoggerService,
  ) {}

  afterInit(server: Server): void {
    server.use(async (client, next) => {
      const existingUser = (client as AuthenticatedSocket).data?.user;
      if (existingUser) {
        next();
        return;
      }

      const user = await this.socketAuth.authenticate(client.handshake.auth?.token);
      if (!user) {
        next(new Error('UNAUTHORIZED'));
        return;
      }

      (client as AuthenticatedSocket).data.user = user;
      next();
    });
  }

  handleConnection(client: AuthenticatedSocket): void {
    const user = client.data.user;
    if (!user) {
      client.disconnect(true);
      return;
    }

    client.join(`user:${user.id}`);
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    const user = client.data.user;
    if (!user) {
      return;
    }

    const active = this.gameStateService.getActiveMatchForUser(user.id);
    if (!active?.match) {
      return;
    }

    const { matchId, match } = active;
    this.gameStateService.setPlayerDisconnected(matchId, user.id);
    this.server.to(`match:${matchId}`).emit('game:opponent-disconnected', { userId: user.id });

    this.gameplayService.startReconnectTimer(matchId, user.id, async () => {
      const current = this.gameStateService.getMatch(matchId);
      if (!current) {
        return;
      }

      const winner = current.playerX.userId === user.id ? current.playerO : current.playerX;
      const endedPayload = await this.gameplayService.endMatch(matchId, winner.userId, 'abandon');
      if (endedPayload) {
        this.server.to(`match:${matchId}`).emit('game:ended', endedPayload);
      }
    });

    this.logger.getLogger('socket').info(
      {
        event: 'game_player_disconnected',
        userId: user.id,
        matchId,
        disconnectedCount: match.disconnectedPlayers.size + 1,
      },
      'Gameplay disconnect handled',
    );
  }

  @SubscribeMessage('game:join')
  async handleJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body?: { matchId?: string },
  ): Promise<void> {
    const user = client.data.user;
    const matchId = body?.matchId;

    if (!user || !matchId) {
      client.emit('game:error', { code: 'MATCH_NOT_FOUND' });
      return;
    }

    const match = this.gameStateService.getMatch(matchId);
    if (!match) {
      client.emit('game:error', { code: 'MATCH_NOT_FOUND' });
      return;
    }

    const isPlayer = match.playerX.userId === user.id || match.playerO.userId === user.id;
    if (!isPlayer) {
      client.emit('game:error', { code: 'NOT_A_PLAYER' });
      return;
    }

    client.join(`match:${matchId}`);

    const wasDisconnected = match.disconnectedPlayers.has(user.id);
    this.gameStateService.setPlayerConnected(matchId, user.id);
    this.gameplayService.clearReconnectTimer(matchId, user.id);

    if (wasDisconnected) {
      client.to(`match:${matchId}`).emit('game:opponent-reconnected', { userId: user.id });
    }

    const maybeStarted = await this.gameplayService.maybeStartMatch(matchId);
    const updatedMatch = maybeStarted || this.gameStateService.getMatch(matchId);
    if (!updatedMatch?.gameState) {
      return;
    }

    client.emit('game:chat-history', {
      messages: updatedMatch.chatMessages || [],
    });

    const serializedState = this.gameplayService.serializeMatchState(updatedMatch);
    this.server.to(`match:${matchId}`).emit('game:state', serializedState);

    const timerPayload = this.gameplayService.buildTimerPayload(matchId, updatedMatch);
    if (timerPayload) {
      client.emit('game:timer-update', timerPayload);
    }
  }

  @SubscribeMessage('game:move')
  async handleMove(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body?: { matchId?: string; position?: number },
  ): Promise<void> {
    const user = client.data.user;
    const matchId = body?.matchId;
    const position = body?.position;

    if (!user || !matchId) {
      client.emit('game:error', { code: 'MATCH_NOT_FOUND' });
      return;
    }

    const match = this.gameStateService.getMatch(matchId);
    if (!match) {
      client.emit('game:error', { code: 'MATCH_NOT_FOUND' });
      return;
    }

    if (!match.gameState) {
      client.emit('game:error', { code: 'GAME_NOT_STARTED' });
      return;
    }

    const isX = match.playerX.userId === user.id;
    const isO = match.playerO.userId === user.id;
    if (!isX && !isO) {
      client.emit('game:error', { code: 'NOT_A_PLAYER' });
      return;
    }

    const playerSymbol = isX ? 'X' : 'O';
    const engine = this.gameplayService.getMatchEngine(match);

    if (match.gameState.currentSymbol !== playerSymbol) {
      client.emit('game:error', { code: 'NOT_YOUR_TURN' });
      return;
    }

    if (!engine.validateMove(match.gameState, Number(position))) {
      client.emit('game:error', { code: 'INVALID_MOVE' });
      return;
    }

    const newState = engine.applyMove(match.gameState, Number(position), playerSymbol);
    this.gameStateService.setGameState(matchId, newState);
    await this.gameplayService.saveMoveToDb(matchId, user.id, playerSymbol, Number(position), newState.moveCount);

    const winResult = engine.checkWinner(newState.board);
    if (winResult) {
      const winnerId = winResult.winner === 'X' ? match.playerX.userId : match.playerO.userId;
      this.gameplayService.clearTurnTimer(matchId);
      this.server.to(`match:${matchId}`).emit('game:state', {
        ...this.gameplayService.serializeMatchState({
          ...match,
          gameState: newState,
          turnDeadlineAt: null,
        }),
        turnDeadlineAt: null,
        winLine: winResult.line,
      });

      const endedPayload = await this.gameplayService.endMatch(matchId, winnerId, 'win');
      if (endedPayload) {
        this.server.to(`match:${matchId}`).emit('game:ended', endedPayload);
      }
      return;
    }

    if (engine.checkDraw(newState.board)) {
      this.gameplayService.clearTurnTimer(matchId);
      const updatedAfterDraw = this.gameStateService.getMatch(matchId);
      if (updatedAfterDraw) {
        this.server.to(`match:${matchId}`).emit('game:state', this.gameplayService.serializeMatchState(updatedAfterDraw));
      }

      const endedPayload = await this.gameplayService.endMatch(matchId, null, 'draw');
      if (endedPayload) {
        this.server.to(`match:${matchId}`).emit('game:ended', endedPayload);
      }
      return;
    }

    const updatedMatch = this.gameplayService.startTurnTimer(matchId, async () => {
      const current = this.gameStateService.getMatch(matchId);
      if (!current || !current.gameState) {
        return;
      }

      const winner = current.gameState.currentSymbol === 'X' ? current.playerO : current.playerX;
      const endedPayload = await this.gameplayService.endMatch(matchId, winner.userId, 'timeout');
      if (endedPayload) {
        this.server.to(`match:${matchId}`).emit('game:ended', endedPayload);
      }
    });

    const refreshedMatch = updatedMatch || this.gameStateService.getMatch(matchId);
    if (!refreshedMatch) {
      return;
    }

    this.server.to(`match:${matchId}`).emit('game:state', this.gameplayService.serializeMatchState(refreshedMatch));

    const timerPayload = this.gameplayService.buildTimerPayload(matchId, refreshedMatch);
    if (timerPayload) {
      this.server.to(`match:${matchId}`).emit('game:timer-update', timerPayload);
    }
  }

  @SubscribeMessage('game:chat-send')
  handleChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body?: { matchId?: string; text?: unknown },
  ): void {
    const user = client.data.user;
    const matchId = body?.matchId;

    if (!user || !matchId) {
      client.emit('game:error', { code: 'MATCH_NOT_FOUND' });
      return;
    }

    const match = this.gameStateService.getMatch(matchId);
    if (!match) {
      client.emit('game:error', { code: 'MATCH_NOT_FOUND' });
      return;
    }

    const isPlayer = match.playerX.userId === user.id || match.playerO.userId === user.id;
    if (!isPlayer) {
      client.emit('game:error', { code: 'NOT_A_PLAYER' });
      return;
    }

    const message = this.gameplayService.createChatMessage(match, user.id, user.username, body?.text);
    if (!message) {
      const lastSentAt = match.chatLastSentAt?.[user.id] || 0;
      if (nowMs() - lastSentAt < 1000) {
        client.emit('game:error', { code: 'CHAT_RATE_LIMIT' });
      }
      return;
    }

    this.gameplayService.markChatSent(matchId, user.id, message);
    this.server.to(`match:${matchId}`).emit('game:chat-message', message);
  }
}
