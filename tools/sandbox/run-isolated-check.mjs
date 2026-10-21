import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildCheckArgs, buildCheckEnvironment, checkEvidence } from '../agent-control/check-profile.mjs';
import { DEFAULT_IMAGE, canonicalSource, forbiddenHostPaths } from '../agent-control/docker-adapter.mjs';

const repo = process.argv[2] ?? process.cwd();
const runRoot = process.argv[3] ?? 'D:/Long-term';
const adapterRoot = process.argv[4] ?? repo;
const keep = process.argv.includes('--keep');

const runId = randomUUID();
const base = join(runRoot, `JobTrack-check-${runId.slice(0, 8)}`);
const candidate = join(base, 'candidate');
const scratch = join(base, 'scratch');
const fixtures = join(base, 'fixtures');
mkdirSync(join(candidate, 'apps/web/src'), { recursive: true });
mkdirSync(scratch, { recursive: true });
mkdirSync(fixtures, { recursive: true });
const content = 'export const value = 1;\n';
writeFileSync(join(candidate, 'apps/web/src/module.js'), content);
writeFileSync(join(fixtures, 'fixture.json'), '{}\n');
copyFileSync(join(adapterRoot, 'tools/sandbox/isolated-check.mjs'), join(fixtures, 'isolated-check.mjs'));

const candidateDigest = createHash('sha256').update(content).digest('hex');
const env = buildCheckEnvironment({ checkId: 'build:api', candidateDigest, fixtureRoot: '/fixtures', scratchRoot: '/scratch' });
const { args } = buildCheckArgs({
  image: process.env.JT_CONTAINER_IMAGE || DEFAULT_IMAGE,
  runId,
  candidate,
  scratch,
  fixtures,
  command: ['node', '/fixtures/isolated-check.mjs'],
  env
});

const result = spawnSync('docker', args, { encoding: 'utf8', timeout: 120_000, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
let observed = null;
try {
  const start = String(result.stdout ?? '').indexOf('{');
  const end = String(result.stdout ?? '').lastIndexOf('}');
  observed = start >= 0 && end >= 0 ? JSON.parse(String(result.stdout).slice(start, end + 1)) : null;
} catch {
  observed = null;
}

const evidence = checkEvidence({
  checkId: env.CHECK_ID,
  candidateDigest,
  image: process.env.JT_CONTAINER_IMAGE || DEFAULT_IMAGE,
  observed,
  exitCode: result.status,
  stdout: result.stdout,
  stderr: result.stderr
});
evidence.kind = 'isolated-check-profile-not-readiness-receipt';
evidence.runId = runId;
evidence.base = base;
evidence.mounts = [
  { target: '/candidate', readOnly: true, source: canonicalSource(candidate) },
  { target: '/scratch', readOnly: false, source: canonicalSource(scratch) },
  { target: '/fixtures', readOnly: true, source: canonicalSource(fixtures) }
];
evidence.forbiddenHostPaths = forbiddenHostPaths(repo, process.env.USERPROFILE ?? '');
evidence.stdoutTail = String(result.stdout ?? '').slice(-400);
evidence.stderrTail = String(result.stderr ?? '').slice(-400);

if (process.env.JT_CHECK_EVIDENCE) writeFileSync(process.env.JT_CHECK_EVIDENCE, JSON.stringify(evidence, null, 2) + '\n');
process.stdout.write(JSON.stringify(evidence, null, 2) + '\n');
if (!keep) rmSync(base, { recursive: true, force: true });
