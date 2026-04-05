const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..', '..');
const backendNestRoot = path.resolve(__dirname, '..');
const prismaSchemaPath = path.resolve(repoRoot, 'prisma', 'schema.prisma');
const rootGeneratedClient = path.resolve(repoRoot, 'node_modules', '.prisma', 'client');
const backendGeneratedClient = path.resolve(backendNestRoot, 'node_modules', '.prisma', 'client');

const prismaExecutable = path.resolve(
  backendNestRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'prisma.cmd' : 'prisma',
);

const command = process.platform === 'win32' ? 'cmd.exe' : prismaExecutable;
const args = process.platform === 'win32'
  ? ['/c', prismaExecutable, 'generate', '--schema', prismaSchemaPath]
  : ['generate', '--schema', prismaSchemaPath];

const result = spawnSync(command, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    PRISMA_GENERATE_SKIP_AUTOINSTALL: '1',
  },
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

if (!fs.existsSync(rootGeneratedClient)) {
  console.error(`Generated Prisma client was not found at ${rootGeneratedClient}`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(backendGeneratedClient), { recursive: true });
fs.rmSync(backendGeneratedClient, { recursive: true, force: true });
fs.cpSync(rootGeneratedClient, backendGeneratedClient, { recursive: true, force: true });
