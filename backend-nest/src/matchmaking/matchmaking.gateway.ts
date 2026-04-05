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
import { deleteUsersWithRelations } from '../common/helpers/delete-users-with-relations';
import { isEmailVerificationExpired } from '../common/helpers/email-verification-window';
import { nowDate, nowMs } from '../common/time/dayjs';
import { socketGatewayConfig } from '../config/socket-gateway.config';
import { GameStateService } from '../game/game-state.service';
import { isSupportedMode } from '../game/engine/game-modes';
import { AppLoggerService } from '../logger/logger.service';
import { PrismaService } from '../prisma/prisma.service';
import { MatchmakingService } from './matchmaking.service';
import { SocketAuthService } from './socket-auth.service';
import type { AuthenticatedSocket } from './interfaces/authenticated-socket.interface';

@WebSocketGateway(socketGatewayConfig)
export class MatchmakingGateway
implements OnGatewayInit<Server>, OnGatewayConnection<AuthenticatedSocket>, OnGatewayDisconnect<AuthenticatedSocket> {
  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly socketAuth: SocketAuthService,
    private readonly matchmakingService: MatchmakingService,
    private readonly gameStateService: GameStateService,
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {}

  afterInit(server: Server): void {
    server.use(async (client, next) => {
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
    this.logger.getLogger('socket').info(
      {
        event: 'socket_connected',
        userId: user.id,
        username: user.username,
        socketId: client.id,
      },
      'Socket connected',
    );
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    const user = client.data.user;
    if (!user) {
      return;
    }

    this.matchmakingService.removeFromQueue(user.id);
    this.logger.getLogger('socket').info(
      {
        event: 'socket_disconnected',
        userId: user.id,
        username: user.username,
      },
      'Socket disconnected',
    );
  }

  @SubscribeMessage('matchmaking:join')
  async handleJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body?: { modeCode?: string },
  ): Promise<void> {
    const user = client.data.user;
    if (!user) {
      client.emit('matchmaking:error', { code: 'UNAUTHORIZED' });
      return;
    }

    if (this.matchmakingService.isInQueue(user.id)) {
      client.emit('matchmaking:error', { code: 'ALREADY_IN_QUEUE' });
      return;
    }

    const requestedModeCode = typeof body?.modeCode === 'string' ? body.modeCode : 'classic';
    if (!isSupportedMode(requestedModeCode)) {
      client.emit('matchmaking:error', { code: 'INVALID_GAME_MODE' });
      return;
    }

    const activeMatch = this.gameStateService.getActiveMatchForUser(user.id);
    if (activeMatch?.match) {
      const code = this.hasReconnectWindow(activeMatch.match, user.id)
        ? 'RECONNECT_WINDOW_ACTIVE'
        : 'ACTIVE_MATCH_EXISTS';

      client.emit('matchmaking:error', {
        code,
        matchId: activeMatch.matchId,
      });
      return;
    }

    const activeBan = await this.prisma.userBan.findFirst({
      where: {
        userId: user.id,
        active: true,
        startsAt: { lte: nowDate() },
        endsAt: { gt: nowDate() },
      },
      select: {
        reason: true,
        endsAt: true,
      },
    });

    if (activeBan) {
      client.emit('matchmaking:error', {
        code: 'GAME_BANNED',
        reason: activeBan.reason,
        endsAt: activeBan.endsAt,
      });
      return;
    }

    const account = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!account) {
      client.emit('matchmaking:error', { code: 'USER_NOT_ELIGIBLE' });
      return;
    }

    if (isEmailVerificationExpired(account)) {
      await this.prisma.$transaction(async (tx) => {
        await deleteUsersWithRelations(tx, [account.id]);
      }).catch(() => undefined);

      client.emit('matchmaking:error', { code: 'USER_NOT_ELIGIBLE' });
      return;
    }

    if (!account.emailVerified) {
      client.emit('matchmaking:error', { code: 'EMAIL_NOT_VERIFIED' });
      return;
    }

    const gameMode = await this.prisma.gameMode.findUnique({
      where: { code: requestedModeCode },
      select: {
        id: true,
        code: true,
        name: true,
        isRanked: true,
        isEnabled: true,
      },
    });

    if (!gameMode || !gameMode.isEnabled) {
      client.emit('matchmaking:error', { code: 'INVALID_GAME_MODE' });
      return;
    }

    this.matchmakingService.addToQueue(user.id, user.username, client.id, gameMode);
    client.emit('matchmaking:queued');

    const result = await this.matchmakingService.tryMatch(user.id);
    if (!result) {
      return;
    }

    const { match, player1, player2 } = result;
    this.gameStateService.createMatch(match.id, player1, player2, result.gameMode);

    const payload = (symbol: 'X' | 'O', opponent: string) => ({
      matchId: match.id,
      symbol,
      opponent,
      gameMode: result.gameMode,
    });

    this.server.to(`user:${player1.userId}`).emit('matchmaking:matched', payload('X', player2.username));
    this.server.to(`user:${player2.userId}`).emit('matchmaking:matched', payload('O', player1.username));
  }

  @SubscribeMessage('matchmaking:leave')
  handleLeave(@ConnectedSocket() client: AuthenticatedSocket): void {
    const user = client.data.user;
    if (!user) {
      client.emit('matchmaking:error', { code: 'UNAUTHORIZED' });
      return;
    }

    this.matchmakingService.removeFromQueue(user.id);
    client.emit('matchmaking:left');
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket): void {
    client.emit('pong', { time: nowMs() });
  }

  private hasReconnectWindow(
    match: {
      reconnectDeadlines?: Record<string, number | undefined>;
    },
    userId: string,
  ): boolean {
    const deadline = match.reconnectDeadlines?.[userId];
    return Boolean(deadline && deadline > nowMs());
  }
}
