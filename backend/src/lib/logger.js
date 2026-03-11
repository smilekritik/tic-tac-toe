const fs = require('fs');
const path = require('path');
const pino = require('pino');
const { AsyncLocalStorage } = require('async_hooks');

const logsDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const fileStream = fs.createWriteStream(path.join(logsDir, 'app.log'), {
  flags: 'a',
});

const baseLogger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
    messageKey: 'message',
  },
  pino.multistream([
    { stream: process.stdout },
    { stream: fileStream },
  ]),
);

const asyncLocalStorage = new AsyncLocalStorage();

function getStore() {
  return asyncLocalStorage.getStore() || {};
}

function withRequestContext(context, fn) {
  const store = {
    ...getStore(),
    ...context,
  };
  return asyncLocalStorage.run(store, fn);
}

function getLogger(service) {
  const store = getStore();
  const bindings = {
    service,
    requestId: store.requestId,
    userId: store.userId,
    ip: store.ip,
    route: store.route,
    method: store.method,
  };
  return baseLogger.child(bindings);
}

module.exports = { logger: baseLogger, getLogger, withRequestContext };

