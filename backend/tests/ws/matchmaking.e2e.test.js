const prisma = require('../../src/lib/prisma');
const matchmakingService = require('../../src/modules/matchmaking/matchmaking.service');
const { createUser, createVerifiedUser } = require('../helpers/db');
const { registerWsHooks } = require('../helpers/ws-hooks');
const {
  connectSocket,
  createAccessToken,
  disconnectSocket,
  startWsTestServer,
  waitForConnectError,
  waitForEvent,
} = require('../helpers/ws');

registerWsHooks();

describe('matchmaking websocket e2e', () => {
  let wsServer;
  const sockets = [];

  function track(socket) {
    sockets.push(socket);
    return socket;
  }

  beforeAll(async () => {
    wsServer = await startWsTestServer();
  });

  afterEach(() => {
    while (sockets.length) {
      disconnectSocket(sockets.pop());
    }
  });

  afterAll(async () => {
    await wsServer.close();
  });

  it('rejects unauthorized socket connections', async () => {
    const error = await waitForConnectError(wsServer.url, 'invalid-token');

    expect(error.message).toBe('UNAUTHORIZED');
  });

  it('rejects invalid game mode', async () => {
    const user = await createVerifiedUser(prisma, {
      email: 'user@example.com',
      username: 'player',
    });
    const socket = track(await connectSocket(wsServer.url, createAccessToken(user)));

    const errorPromise = waitForEvent(socket, 'matchmaking:error', {
      predicate: (payload) => payload?.code === 'INVALID_GAME_MODE',
    });

    socket.emit('matchmaking:join', { modeCode: 'unknown-mode' });

    await expect(errorPromise).resolves.toMatchObject({ code: 'INVALID_GAME_MODE' });
  });

  it('rejects unverified users on matchmaking join', async () => {
    const user = await createUser(prisma, {
      email: 'user@example.com',
      username: 'player',
      emailVerified: false,
    });
    const socket = track(await connectSocket(wsServer.url, createAccessToken(user)));

    const errorPromise = waitForEvent(socket, 'matchmaking:error', {
      predicate: (payload) => payload?.code === 'EMAIL_NOT_VERIFIED',
    });

    socket.emit('matchmaking:join', { modeCode: 'classic' });

    await expect(errorPromise).resolves.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });
  });

  it('rejects banned users on matchmaking join', async () => {
    const admin = await createVerifiedUser(prisma, {
      email: 'admin@example.com',
      username: 'admin',
      role: 'admin',
    });
    const user = await createVerifiedUser(prisma, {
      email: 'user@example.com',
      username: 'player',
    });

    await prisma.userBan.create({
      data: {
        userId: user.id,
        reason: 'toxicity',
        bannedBy: admin.id,
        startsAt: new Date(Date.now() - 1000),
        endsAt: new Date(Date.now() + 60 * 1000),
        active: true,
      },
    });

    const socket = track(await connectSocket(wsServer.url, createAccessToken(user)));

    const errorPromise = waitForEvent(socket, 'matchmaking:error', {
      predicate: (payload) => payload?.code === 'GAME_BANNED',
    });

    socket.emit('matchmaking:join', { modeCode: 'classic' });

    await expect(errorPromise).resolves.toMatchObject({ code: 'GAME_BANNED', reason: 'toxicity' });
  });

  it('queues a player and rejects duplicate queue joins', async () => {
    const user = await createVerifiedUser(prisma, {
      email: 'user@example.com',
      username: 'player',
    });
    const socket = track(await connectSocket(wsServer.url, createAccessToken(user)));

    const queuedPromise = waitForEvent(socket, 'matchmaking:queued');
    socket.emit('matchmaking:join', { modeCode: 'classic' });
    await queuedPromise;

    expect(matchmakingService.isInQueue(user.id)).toBe(true);

    const duplicatePromise = waitForEvent(socket, 'matchmaking:error', {
      predicate: (payload) => payload?.code === 'ALREADY_IN_QUEUE',
    });
    socket.emit('matchmaking:join', { modeCode: 'classic' });

    await expect(duplicatePromise).resolves.toMatchObject({ code: 'ALREADY_IN_QUEUE' });
  });

  it('leaves the queue', async () => {
    const user = await createVerifiedUser(prisma, {
      email: 'user@example.com',
      username: 'player',
    });
    const socket = track(await connectSocket(wsServer.url, createAccessToken(user)));

    const queuedPromise = waitForEvent(socket, 'matchmaking:queued');
    socket.emit('matchmaking:join', { modeCode: 'classic' });
    await queuedPromise;

    const leftPromise = waitForEvent(socket, 'matchmaking:left');
    socket.emit('matchmaking:leave');

    await leftPromise;
    expect(matchmakingService.isInQueue(user.id)).toBe(false);
  });

  it('matches two eligible players and blocks repeat matchmaking when a match already exists', async () => {
    const firstUser = await createVerifiedUser(prisma, {
      email: 'first@example.com',
      username: 'first',
    });
    const secondUser = await createVerifiedUser(prisma, {
      email: 'second@example.com',
      username: 'second',
    });

    const firstSocket = track(await connectSocket(wsServer.url, createAccessToken(firstUser)));
    const secondSocket = track(await connectSocket(wsServer.url, createAccessToken(secondUser)));

    const firstMatchedPromise = waitForEvent(firstSocket, 'matchmaking:matched');
    const secondMatchedPromise = waitForEvent(secondSocket, 'matchmaking:matched');

    firstSocket.emit('matchmaking:join', { modeCode: 'classic' });
    await waitForEvent(firstSocket, 'matchmaking:queued');

    secondSocket.emit('matchmaking:join', { modeCode: 'classic' });
    await waitForEvent(secondSocket, 'matchmaking:queued');

    const [firstMatched, secondMatched] = await Promise.all([firstMatchedPromise, secondMatchedPromise]);

    expect(firstMatched.matchId).toBeTruthy();
    expect(firstMatched.matchId).toBe(secondMatched.matchId);
    expect(['X', 'O']).toContain(firstMatched.symbol);
    expect(['X', 'O']).toContain(secondMatched.symbol);

    const errorPromise = waitForEvent(firstSocket, 'matchmaking:error', {
      predicate: (payload) => payload?.code === 'ACTIVE_MATCH_EXISTS',
    });
    firstSocket.emit('matchmaking:join', { modeCode: 'classic' });

    await expect(errorPromise).resolves.toMatchObject({
      code: 'ACTIVE_MATCH_EXISTS',
      matchId: firstMatched.matchId,
    });
  });
});
