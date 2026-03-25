const path = require('path');
const { spawnSync } = require('child_process');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '..', '.env.test');
dotenv.config({ path: envPath });

const sharedEnv = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV || 'test',
};

function run(command, args) {
  const executable = process.platform === 'win32' ? `${command}.cmd` : command;
  const result = spawnSync(executable, args, {
    cwd: path.resolve(__dirname, '..'),
    env: sharedEnv,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

run('npx', ['prisma', 'generate']);
run('npx', ['prisma', 'migrate', 'deploy']);
run('npm', ['run', 'test:ws']);
