const http = require('http');
const app = require('./app');
const { initSocket } = require('./lib/socket');
const env = require('./config/env');

const server = http.createServer(app);

initSocket(server, env.frontendUrl);

server.listen(env.port, () => {
  console.log(`[server] running on port ${env.port}`);
});
