import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { createDockerAdapter, canonicalSource, buildEvidence } from '../agent-control/docker-adapter.mjs';

const repo = process.argv[2] ?? process.cwd();
const runRoot = process.argv[3] ?? 'D:/Long-term';
const keepRunDirectory = process.argv.includes('--keep');

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

const hostPaths = [
  { hostPath: canonicalSource(repo), containerPath: '/mnt/d/Project/Job_Application_Tracker' },
  { hostPath: canonicalSource(join(repo, '.git')), containerPath: '/mnt/d/Project/Job_Application_Tracker/.git' },
  { hostPath: canonicalSource(join(repo, '.agent-state')), containerPath: '/mnt/d/Project/Job_Application_Tracker/.agent-state' },
  { hostPath: canonicalSource(join(repo, 'accounts.txt')), containerPath: '/mnt/d/Project/Job_Application_Tracker/accounts.txt' }
].filter(entry => entry.hostPath);

const adapterRoot = process.argv[4] ?? repo;
const adapter = createDockerAdapter({
  repo: adapterRoot,
  image: process.env.JT_CONTAINER_IMAGE || undefined,
  forbiddenPaths: [canonicalSource(repo)]
});
let probe;
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
  base,
  projection: canonicalSource(projection),
  scratch: canonicalSource(scratch),
  manifest,
  hostPaths: hostPaths.map(entry => ({ hostPath: entry.hostPath, containerPath: entry.containerPath })),
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
      hostPaths: (observed.hostPaths ?? []).map(entry => `${entry.containerPath ?? entry.hostPath}:${entry.outcome}`),
      hostWrite: observed.hostWrite?.outcome ?? null,
      liveness: observed.liveness ?? []
    }
  }, null, 2) + '\n');
}

if (!keepRunDirectory) rmSync(base, { recursive: true, force: true });
