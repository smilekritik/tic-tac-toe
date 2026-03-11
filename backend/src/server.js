const http = require('http');
const app = require('./app');
const { initSocket } = require('./lib/socket');
const env = require('./config/env');
const prisma = require('./lib/prisma');
const { logger, withRequestContext, getLogger } = require('./lib/logger');

const server = http.createServer(app);

initSocket(server, env.frontendUrl);

async function start() {
  try {
    await prisma.$connect();
    withRequestContext({}, () => {
      const log = getLogger('app');
      log.info({ event: 'db_connected' }, 'Database connected');
    });
  } catch (err) {
    withRequestContext({}, () => {
      const log = getLogger('app');
      log.error(
        {
          event: 'db_error',
          message: err.message,
        },
        'Database connection error',
      );
    });
    process.exit(1);
  }

  server.listen(env.port, () => {
    logger.info(
      {
        event: 'server_start',
        port: env.port,
      },
      'Server started',
    );
  });
}

function shutdown(signal) {
  logger.info(
    {
      event: 'server_shutdown',
      signal,
    },
    'Server shutting down',
  );

  server.close(() => {
    prisma
      .$disconnect()
      .catch(() => {})
      .finally(() => {
        process.exit(0);
      });
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();
