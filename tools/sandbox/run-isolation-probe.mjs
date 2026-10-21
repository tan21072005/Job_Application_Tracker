import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { createDockerAdapter, canonicalSource } from '../agent-control/docker-adapter.mjs';

const repo = process.argv[2] ?? process.cwd();
const runRoot = process.argv[3] ?? 'D:/Long-term';
const adapterRoot = process.argv[4] ?? repo;
const keepRunDirectory = process.argv.includes('--keep');

const PROBE_TARGETS = ['host-repo-read', 'common-git-read', 'control-state-read', 'host-credential-read', 'host-write'];
const TARGET_PATHS = {
  'host-repo-read': repo,
  'common-git-read': join(repo, '.git'),
  'control-state-read': join(repo, '.agent-state'),
  'host-credential-read': join(repo, 'accounts.txt'),
  'host-write': repo
};

const runId = randomUUID();
const base = join(runRoot, `JobTrack-isolation-${runId.slice(0, 8)}`);
const projection = join(base, 'projection');
const scratch = join(base, 'scratch');
mkdirSync(join(projection, 'apps/web/src'), { recursive: true });
mkdirSync(join(projection, 'packages/jobtrack-contract/src'), { recursive: true });
mkdirSync(scratch, { recursive: true });

const files = [
  { path: 'apps/web/src/module.js', content: 'export const value = 1;\n' },
  { path: 'apps/web/src/panel.tsx', content: 'export const panel = () => null;\n' },
  { path: 'packages/jobtrack-contract/src/index.ts', content: 'export const contract = 1;\n' }
];
const manifest = files.map(file => {
  writeFileSync(join(projection, ...file.path.split('/')), file.content);
  return { path: file.path, sha256: createHash('sha256').update(file.content).digest('hex') };
});

const hostPaths = PROBE_TARGETS
  .filter(targetId => {
    try {
      canonicalSource(TARGET_PATHS[targetId]);
      return true;
    } catch {
      return false;
    }
  })
  .map(targetId => ({ targetId, hostPath: canonicalSource(TARGET_PATHS[targetId]) }));

const adapter = createDockerAdapter({ repo: adapterRoot, forbiddenPaths: [canonicalSource(repo)] });
let probe = null;
let failure = null;
try {
  probe = await adapter.probe({
    runId,
    projection,
    scratch,
    manifest,
    hostPaths,
    timeoutMs: 120_000
  });
} catch (error) {
  failure = String(error && error.message ? error.message : error);
}

const observed = probe?.probe?.observations ?? {};
const report = {
  kind: 'adapter-probe-not-readiness-receipt',
  runId,
  adapter: adapter.id,
  image: adapter.image,
  argvHash: probe?.argvHash ?? null,
  container: probe?.observation ?? null,
  base,
  projection: canonicalSource(projection),
  scratch: canonicalSource(scratch),
  manifest,
  hostPaths,
  failure,
  observed
};
writeFileSync(join(base, 'adapter-probe.json'), JSON.stringify(report, null, 2) + '\n');
if (process.env.JT_PROBE_EVIDENCE) writeFileSync(process.env.JT_PROBE_EVIDENCE, JSON.stringify(report, null, 2) + '\n');

if (failure) {
  process.stdout.write(JSON.stringify({ ok: false, failure, base }, null, 2) + '\n');
  process.exitCode = 1;
} else {
  process.stdout.write(JSON.stringify({
    ok: true,
    runId,
    base,
    projection: report.projection,
    scratch: report.scratch,
    summary: {
      projectionRead: observed.projectionRead?.outcome ?? null,
      scratchWrite: observed.scratchWrite?.outcome ?? null,
      projectionWrite: observed.projectionWrite?.outcome ?? null,
      hostPaths: (observed.hostPaths ?? []).map(entry => `${entry.targetId}:${entry.outcome}`),
      hostWrite: observed.hostWrite?.outcome ?? null,
      liveness: observed.liveness ?? [],
      observedMounts: probe?.observation?.mounts ?? []
    }
  }, null, 2) + '\n');
}

if (!keepRunDirectory) rmSync(base, { recursive: true, force: true });
