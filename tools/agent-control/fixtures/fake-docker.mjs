import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const statePath = process.env.JT_FAKE_DOCKER_STATE;
if (!statePath) {
  process.stderr.write('JT_FAKE_DOCKER_STATE is required.\n');
  process.exit(2);
}

const readState = () => (existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : { containers: {} });
const state = readState();
const [verb, ...rest] = process.argv.slice(2);
const save = () => writeFileSync(statePath, JSON.stringify(state));

if (verb === 'create') {
  const id = createHash('sha256').update(`${Date.now()}-${Math.random()}`).digest('hex');
  state.containers[id] = { args: rest };
  save();
  process.stdout.write(`${id}\n`);
} else if (verb === 'inspect') {
  const id = rest[0];
  const container = state.containers[id];
  if (!container) {
    process.stderr.write(`Error response from daemon: No such container: ${id}\n`);
    process.exit(1);
  }
  const mounts = container.args
    .filter((value, index) => container.args[index - 1] === '--mount')
    .map(value => {
      const source = /source=([^,]+)/.exec(value)?.[1] ?? '';
      const destination = /target=([^,]+)/.exec(value)?.[1] ?? '';
      return { Type: 'bind', Source: source, Destination: destination, RW: !value.includes('readonly') };
    });
  const image = container.args.find(value => value.includes('@sha256:')) ?? null;
  process.stdout.write(JSON.stringify([{
    Id: id,
    Image: `sha256:${process.env.JT_FAKE_DOCKER_IMAGE_ID ?? ''}`,
    Config: { Image: image, User: process.env.JT_FAKE_DOCKER_USER ?? '65534:65534', Env: ['HOME=/nonexistent'], Labels: { 'jobtrack.fixture': 'true' } },
    HostConfig: {
      NetworkMode: process.env.JT_FAKE_DOCKER_NETWORK ?? 'none',
      CapDrop: ['ALL'],
      SecurityOpt: ['no-new-privileges'],
      ReadonlyRootfs: true,
      Memory: 536870912,
      PidsLimit: 256,
      NanoCpus: 1000000000,
      Tmpfs: { '/tmp': 'rw,noexec,nosuid,size=64m' }
    },
    Mounts: mounts
  }]));
} else if (verb === 'start') {
  const outputPath = process.env.JT_FAKE_DOCKER_OUTPUT;
  process.stdout.write(outputPath && existsSync(outputPath) ? readFileSync(outputPath, 'utf8') : '{"checks":{},"observations":{}}');
} else if (verb === 'rm') {
  for (const id of rest) delete state.containers[id];
  save();
  process.stdout.write(`${rest.join('\n')}\n`);
} else {
  process.stderr.write(`fake docker: unsupported verb ${verb}\n`);
  process.exit(2);
}
