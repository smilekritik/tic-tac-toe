const http = require('http');
const { io: createClient } = require('socket.io-client');
const app = require('../../src/app');
const { initSocket, resetSocketForTests } = require('../../src/lib/socket');
const tokenService = require('../../src/modules/auth/token.service');

function waitForEvent(emitter, event, { timeout = 1500, predicate } = {}) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      emitter.off(event, handler);
      reject(new Error(`Timed out waiting for "${event}"`));
    }, timeout);

    const handler = (payload) => {
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

async function startWsTestServer() {
  const server = http.createServer(app);
  initSocket(server, process.env.FRONTEND_URL || 'http://localhost:3000');

  await new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', (err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });

  const address = server.address();
  const url = `http://127.0.0.1:${address.port}`;

  return {
    server,
    url,
    async close() {
      await resetSocketForTests();
      if (!server.listening) {
        return;
      }

      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err && err.message !== 'Server is not running.') {
            reject(err);
            return;
          }

          resolve();
        });
      });
    },
  };
}

function createAccessToken(user) {
  return tokenService.generateAccessToken({
    id: user.id,
    role: user.role || 'user',
  });
}

function connectSocket(url, token, { timeout = 1500 } = {}) {
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

function waitForConnectError(url, token, { timeout = 1500 } = {}) {
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

function disconnectSocket(socket) {
  if (socket?.connected) {
    socket.disconnect();
    return;
  }

  socket?.close?.();
}

module.exports = {
  connectSocket,
  createAccessToken,
  disconnectSocket,
  startWsTestServer,
  waitForConnectError,
  waitForEvent,
};
