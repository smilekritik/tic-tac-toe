const { Server } = require('socket.io');
const tokenService = require('../modules/auth/token.service');
const prisma = require('./prisma');

let io;

function initSocket(httpServer, frontendUrl) {
  io = new Server(httpServer, {
    cors: {
      origin: frontendUrl,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('UNAUTHORIZED'));

      const payload = tokenService.verifyAccessToken(token);

      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, username: true, role: true },
      });

      if (!user) return next(new Error('UNAUTHORIZED'));

      socket.user = user;
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    const { id, username } = socket.user;
    console.log(`[socket] connected: ${username} (${socket.id})`);

    socket.join(`user:${id}`);

    socket.on('disconnect', (reason) => {
      console.log(`[socket] disconnected: ${username} — ${reason}`);
    });

    socket.on('ping', () => {
      socket.emit('pong', { time: Date.now() });
    });
  });

  return io;
}

function getIo() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

module.exports = { initSocket, getIo };
