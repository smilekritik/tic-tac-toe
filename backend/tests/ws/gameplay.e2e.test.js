const prisma = require('../../src/lib/prisma');
const { createVerifiedUser } = require('../helpers/db');
const { registerWsHooks } = require('../helpers/ws-hooks');
const {
  connectSocket,
  createAccessToken,
  disconnectSocket,
  startWsTestServer,
  waitForEvent,
} = require('../helpers/ws');

registerWsHooks();

describe('gameplay websocket e2e', () => {
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

  async function createMatchedPlayers(modeCode = 'classic') {
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

    const firstQueuedPromise = waitForEvent(firstSocket, 'matchmaking:queued');
    firstSocket.emit('matchmaking:join', { modeCode });
    await firstQueuedPromise;

    const secondQueuedPromise = waitForEvent(secondSocket, 'matchmaking:queued');
    secondSocket.emit('matchmaking:join', { modeCode });
    await secondQueuedPromise;

    const [firstMatched, secondMatched] = await Promise.all([firstMatchedPromise, secondMatchedPromise]);

    const socketX = firstMatched.symbol === 'X' ? firstSocket : secondSocket;
    const socketO = firstMatched.symbol === 'O' ? firstSocket : secondSocket;
    const userX = firstMatched.symbol === 'X' ? firstUser : secondUser;
    const userO = firstMatched.symbol === 'O' ? firstUser : secondUser;

    return {
      matchId: firstMatched.matchId,
      firstSocket,
      secondSocket,
      firstUser,
      secondUser,
      socketX,
      socketO,
      userX,
      userO,
    };
  }

  async function joinMatch(socketX, socketO, matchId) {
    const stateXPromise = waitForEvent(socketX, 'game:state');
    const stateOPromise = waitForEvent(socketO, 'game:state');

    socketX.emit('game:join', { matchId });
    socketO.emit('game:join', { matchId });

    const [stateX, stateO] = await Promise.all([stateXPromise, stateOPromise]);

    return {
      stateX,
      stateO,
    };
  }

  async function playMove(socket, matchId, position) {
    const statePromise = waitForEvent(socket, 'game:state');
    socket.emit('game:move', { matchId, position });
    return statePromise;
  }

  it('starts a match when both players join, rejects wrong turn and invalid cells', async () => {
    const { matchId, socketX, socketO } = await createMatchedPlayers();
    const { stateX, stateO } = await joinMatch(socketX, socketO, matchId);

    expect(stateX.board).toEqual(Array(9).fill(null));
    expect(stateO.board).toEqual(Array(9).fill(null));
    expect(stateX.currentSymbol).toBe('X');

    const wrongTurnPromise = waitForEvent(socketO, 'game:error', {
      predicate: (payload) => payload?.code === 'NOT_YOUR_TURN',
    });
    socketO.emit('game:move', { matchId, position: 0 });
    await expect(wrongTurnPromise).resolves.toMatchObject({ code: 'NOT_YOUR_TURN' });

    const invalidMovePromise = waitForEvent(socketX, 'game:error', {
      predicate: (payload) => payload?.code === 'INVALID_MOVE',
    });
    socketX.emit('game:move', { matchId, position: 9 });
    await expect(invalidMovePromise).resolves.toMatchObject({ code: 'INVALID_MOVE' });
  });

  it('completes a win flow and persists the winner', async () => {
    const { matchId, socketX, socketO, userX } = await createMatchedPlayers();
    await joinMatch(socketX, socketO, matchId);

    await playMove(socketX, matchId, 0);
    await playMove(socketO, matchId, 3);
    await playMove(socketX, matchId, 1);
    await playMove(socketO, matchId, 4);

    const finalStatePromise = waitForEvent(socketX, 'game:state', {
      predicate: (payload) => payload?.winLine?.join(',') === '0,1,2',
    });
    const endedPromise = waitForEvent(socketX, 'game:ended', {
      predicate: (payload) => payload?.reason === 'win',
    });

    socketX.emit('game:move', { matchId, position: 2 });

    await expect(finalStatePromise).resolves.toMatchObject({
      board: ['X', 'X', 'X', 'O', 'O', null, null, null, null],
      winLine: [0, 1, 2],
    });
    await expect(endedPromise).resolves.toMatchObject({
      reason: 'win',
      winnerId: userX.id,
    });

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    expect(match.status).toBe('finished');
    expect(match.resultType).toBe('win');
    expect(match.winnerId).toBe(userX.id);
  });

  it('completes a draw flow', async () => {
    const { matchId, socketX, socketO } = await createMatchedPlayers();
    await joinMatch(socketX, socketO, matchId);

    const moveSequence = [
      [socketX, 0],
      [socketO, 1],
      [socketX, 2],
      [socketO, 4],
      [socketX, 3],
      [socketO, 5],
      [socketX, 7],
      [socketO, 6],
    ];

    for (const [socket, position] of moveSequence) {
      await playMove(socket, matchId, position);
    }

    const endedPromise = waitForEvent(socketX, 'game:ended', {
      predicate: (payload) => payload?.reason === 'draw',
    });

    socketX.emit('game:move', { matchId, position: 8 });

    await expect(endedPromise).resolves.toMatchObject({
      reason: 'draw',
      winnerId: null,
    });
  });

  it('supports reconnecting within the reconnect window and restores state', async () => {
    const { matchId, socketX, socketO, userO } = await createMatchedPlayers();
    await joinMatch(socketX, socketO, matchId);

    await playMove(socketX, matchId, 0);

    const disconnectedPromise = waitForEvent(socketX, 'game:opponent-disconnected', {
      predicate: (payload) => payload?.userId === userO.id,
    });
    socketO.disconnect();
    await disconnectedPromise;

    const reconnectedSocket = track(await connectSocket(wsServer.url, createAccessToken(userO)));
    const reconnectedPromise = waitForEvent(socketX, 'game:opponent-reconnected', {
      predicate: (payload) => payload?.userId === userO.id,
    });
    const restoredStatePromise = waitForEvent(reconnectedSocket, 'game:state');

    reconnectedSocket.emit('game:join', { matchId });

    await reconnectedPromise;
    await expect(restoredStatePromise).resolves.toMatchObject({
      board: ['X', null, null, null, null, null, null, null, null],
      currentSymbol: 'O',
    });
  });

  it('ends the match on turn timeout using fake timers', async () => {
    const { matchId, socketX, socketO, userO } = await createMatchedPlayers();
    vi.useFakeTimers();
    await joinMatch(socketX, socketO, matchId);

    const endedPromise = waitForEvent(socketX, 'game:ended', {
      predicate: (payload) => payload?.reason === 'timeout',
    });

    await vi.advanceTimersByTimeAsync(250);

    await expect(endedPromise).resolves.toMatchObject({
      reason: 'timeout',
      winnerId: userO.id,
    });

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    expect(match.status).toBe('finished');
    expect(match.resultType).toBe('timeout');
  });

  it('ends the match as abandon when reconnect window expires using fake timers', async () => {
    const { matchId, socketX, socketO, userO } = await createMatchedPlayers();
    await joinMatch(socketX, socketO, matchId);

    vi.useFakeTimers();

    const disconnectedPromise = waitForEvent(socketO, 'game:opponent-disconnected', {
      predicate: (payload) => payload?.userId,
    });
    const endedPromise = waitForEvent(socketO, 'game:ended', {
      predicate: (payload) => payload?.reason === 'abandon',
    });

    socketX.disconnect();
    await disconnectedPromise;
    await vi.advanceTimersByTimeAsync(250);

    await expect(endedPromise).resolves.toMatchObject({
      reason: 'abandon',
      winnerId: userO.id,
    });
  });
});
