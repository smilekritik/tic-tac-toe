import { addMilliseconds, nowDate, subtractMilliseconds } from '../../src/common/time/dayjs';
import { createVerifiedUser, createUser, resetDb, seedGameModes } from '../helpers/db';
import {
  connectSocket,
  createAccessToken,
  disconnectSocket,
  startWsTestServer,
  waitForConnectError,
  waitForEvent,
} from '../helpers/ws';

const describeWs = process.env.RUN_WS_E2E === 'true' ? describe : describe.skip;

describeWs('matchmaking websocket e2e', () => {
  let wsServer: Awaited<ReturnType<typeof startWsTestServer>>;
  const sockets: Array<Awaited<ReturnType<typeof connectSocket>>> = [];

  function track<T>(socket: T): T {
    sockets.push(socket as Awaited<ReturnType<typeof connectSocket>>);
    return socket;
  }

  beforeAll(async () => {
    wsServer = await startWsTestServer();
  });

  beforeEach(async () => {
    wsServer.matchmakingService.resetForTests();
    wsServer.gameStateService.resetForTests();
    await resetDb(wsServer.prisma);
    await seedGameModes(wsServer.prisma);
  });

  afterEach(() => {
    while (sockets.length) {
      disconnectSocket(sockets.pop());
    }

    wsServer.matchmakingService.resetForTests();
    wsServer.gameStateService.resetForTests();
    vi.useRealTimers();
  });

  afterAll(async () => {
    await wsServer.close();
  });

  it('rejects unauthorized socket connections', async () => {
    const error = await waitForConnectError(wsServer.url, 'invalid-token');

    expect(error.message).toBe('UNAUTHORIZED');
  });

  it('rejects invalid game mode', async () => {
    const user = await createVerifiedUser(wsServer.prisma, {
      email: 'user@example.com',
      username: 'player',
    });
    const socket = track(await connectSocket(wsServer.url, createAccessToken(wsServer.tokenService, user)));

    const errorPromise = waitForEvent<{ code: string }>(socket, 'matchmaking:error', {
      predicate: (payload) => payload?.code === 'INVALID_GAME_MODE',
    });

    socket.emit('matchmaking:join', { modeCode: 'unknown-mode' });

    await expect(errorPromise).resolves.toMatchObject({ code: 'INVALID_GAME_MODE' });
  });

  it('rejects unverified users on matchmaking join', async () => {
    const user = await createUser(wsServer.prisma, {
      email: 'user@example.com',
      username: 'player',
      emailVerified: false,
    });
    const socket = track(await connectSocket(wsServer.url, createAccessToken(wsServer.tokenService, user)));

    const errorPromise = waitForEvent<{ code: string }>(socket, 'matchmaking:error', {
      predicate: (payload) => payload?.code === 'EMAIL_NOT_VERIFIED',
    });

    socket.emit('matchmaking:join', { modeCode: 'classic' });

    await expect(errorPromise).resolves.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });
  });

  it('rejects banned users on matchmaking join', async () => {
    const admin = await createVerifiedUser(wsServer.prisma, {
      email: 'admin@example.com',
      username: 'admin',
      role: 'admin',
    });
    const user = await createVerifiedUser(wsServer.prisma, {
      email: 'user@example.com',
      username: 'player',
    });

    await wsServer.prisma.userBan.create({
      data: {
        userId: user.id,
        reason: 'toxicity',
        bannedBy: admin.id,
        startsAt: subtractMilliseconds(nowDate(), 1000).toDate(),
        endsAt: addMilliseconds(nowDate(), 60 * 1000).toDate(),
        active: true,
      },
    });

    const socket = track(await connectSocket(wsServer.url, createAccessToken(wsServer.tokenService, user)));

    const errorPromise = waitForEvent<{ code: string; reason: string }>(socket, 'matchmaking:error', {
      predicate: (payload) => payload?.code === 'GAME_BANNED',
    });

    socket.emit('matchmaking:join', { modeCode: 'classic' });

    await expect(errorPromise).resolves.toMatchObject({ code: 'GAME_BANNED', reason: 'toxicity' });
  });

  it('queues a player and rejects duplicate queue joins', async () => {
    const user = await createVerifiedUser(wsServer.prisma, {
      email: 'user@example.com',
      username: 'player',
    });
    const socket = track(await connectSocket(wsServer.url, createAccessToken(wsServer.tokenService, user)));

    const queuedPromise = waitForEvent(socket, 'matchmaking:queued');
    socket.emit('matchmaking:join', { modeCode: 'classic' });
    await queuedPromise;

    expect(wsServer.matchmakingService.isInQueue(user.id)).toBe(true);

    const duplicatePromise = waitForEvent<{ code: string }>(socket, 'matchmaking:error', {
      predicate: (payload) => payload?.code === 'ALREADY_IN_QUEUE',
    });
    socket.emit('matchmaking:join', { modeCode: 'classic' });

    await expect(duplicatePromise).resolves.toMatchObject({ code: 'ALREADY_IN_QUEUE' });
  });

  it('leaves the queue', async () => {
    const user = await createVerifiedUser(wsServer.prisma, {
      email: 'user@example.com',
      username: 'player',
    });
    const socket = track(await connectSocket(wsServer.url, createAccessToken(wsServer.tokenService, user)));

    const queuedPromise = waitForEvent(socket, 'matchmaking:queued');
    socket.emit('matchmaking:join', { modeCode: 'classic' });
    await queuedPromise;

    const leftPromise = waitForEvent(socket, 'matchmaking:left');
    socket.emit('matchmaking:leave');

    await leftPromise;
    expect(wsServer.matchmakingService.isInQueue(user.id)).toBe(false);
  });

  it('matches two eligible players and blocks repeat matchmaking when a match already exists', async () => {
    const firstUser = await createVerifiedUser(wsServer.prisma, {
      email: 'first@example.com',
      username: 'first',
    });
    const secondUser = await createVerifiedUser(wsServer.prisma, {
      email: 'second@example.com',
      username: 'second',
    });

    const firstSocket = track(await connectSocket(wsServer.url, createAccessToken(wsServer.tokenService, firstUser)));
    const secondSocket = track(await connectSocket(wsServer.url, createAccessToken(wsServer.tokenService, secondUser)));

    const firstMatchedPromise = waitForEvent<{ matchId: string; symbol: 'X' | 'O' }>(firstSocket, 'matchmaking:matched');
    const secondMatchedPromise = waitForEvent<{ matchId: string; symbol: 'X' | 'O' }>(secondSocket, 'matchmaking:matched');

    firstSocket.emit('matchmaking:join', { modeCode: 'classic' });
    await waitForEvent(firstSocket, 'matchmaking:queued');

    secondSocket.emit('matchmaking:join', { modeCode: 'classic' });
    await waitForEvent(secondSocket, 'matchmaking:queued');

    const [firstMatched, secondMatched] = await Promise.all([firstMatchedPromise, secondMatchedPromise]);

    expect(firstMatched.matchId).toBeTruthy();
    expect(firstMatched.matchId).toBe(secondMatched.matchId);
    expect(['X', 'O']).toContain(firstMatched.symbol);
    expect(['X', 'O']).toContain(secondMatched.symbol);

    const errorPromise = waitForEvent<{ code: string; matchId: string }>(firstSocket, 'matchmaking:error', {
      predicate: (payload) => payload?.code === 'ACTIVE_MATCH_EXISTS',
    });
    firstSocket.emit('matchmaking:join', { modeCode: 'classic' });

    await expect(errorPromise).resolves.toMatchObject({
      code: 'ACTIVE_MATCH_EXISTS',
      matchId: firstMatched.matchId,
    });
  });
});
