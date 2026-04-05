import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { io as createClient, type Socket } from 'socket.io-client';
import { AppModule } from '../../src/app.module';
import { GameStateService } from '../../src/game/game-state.service';
import { MatchmakingService } from '../../src/matchmaking/matchmaking.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TokenService } from '../../src/auth/token.service';

export function waitForEvent<T = unknown>(
  emitter: { on: (event: string, handler: (payload: T) => void) => void; off: (event: string, handler: (payload: T) => void) => void },
  event: string,
  {
    timeout = 1500,
    predicate,
  }: {
    timeout?: number;
    predicate?: (payload: T) => boolean;
  } = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      emitter.off(event, handler);
      reject(new Error(`Timed out waiting for "${event}"`));
    }, timeout);

    const handler = (payload: T) => {
      if (predicate && !predicate(payload)) {
        return;
      }

      clearTimeout(timer);
      emitter.off(event, handler);
      resolve(payload);
    };

    emitter.on(event, handler);
  });
}

export async function startWsTestServer(): Promise<{
  app: INestApplication;
  url: string;
  prisma: PrismaService;
  tokenService: TokenService;
  gameStateService: GameStateService;
  matchmakingService: MatchmakingService;
  close: () => Promise<void>;
}> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  await app.listen(0, '127.0.0.1');

  const address = app.getHttpServer().address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const url = `http://127.0.0.1:${port}`;

  return {
    app,
    url,
    prisma: app.get(PrismaService),
    tokenService: app.get(TokenService),
    gameStateService: app.get(GameStateService),
    matchmakingService: app.get(MatchmakingService),
    async close() {
      await app.close();
    },
  };
}

export function createAccessToken(
  tokenService: TokenService,
  user: { id: string; role?: string },
): string {
  return tokenService.generateAccessToken({
    id: user.id,
    role: user.role || 'user',
  });
}

export function connectSocket(
  url: string,
  token?: string,
  { timeout = 1500 }: { timeout?: number } = {},
): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = createClient(url, {
      auth: token ? { token } : {},
      forceNew: true,
      reconnection: false,
      transports: ['websocket'],
    });

    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Timed out waiting for socket connection'));
    }, timeout);

    socket.once('connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });

    socket.once('connect_error', (error) => {
      clearTimeout(timer);
      reject(Object.assign(error, { socket }));
    });
  });
}

export function waitForConnectError(
  url: string,
  token?: string,
  { timeout = 1500 }: { timeout?: number } = {},
): Promise<Error> {
  return new Promise((resolve, reject) => {
    const socket = createClient(url, {
      auth: token ? { token } : {},
      forceNew: true,
      reconnection: false,
      transports: ['websocket'],
    });

    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Timed out waiting for socket connect_error'));
    }, timeout);

    socket.once('connect', () => {
      clearTimeout(timer);
      socket.disconnect();
      reject(new Error('Socket connected unexpectedly'));
    });

    socket.once('connect_error', (error) => {
      clearTimeout(timer);
      socket.disconnect();
      resolve(error);
    });
  });
}

export function disconnectSocket(socket?: Socket): void {
  if (socket?.connected) {
    socket.disconnect();
    return;
  }

  socket?.close();
}
