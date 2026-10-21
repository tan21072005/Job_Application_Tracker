import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { assertCheckProfile, buildCheckArgs, buildCheckEnvironment, checkEvidence } from '../agent-control/check-profile.mjs';
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
const check = { checkId: 'build:api', candidateDigest, fixtureRoot: '/fixtures', scratchRoot: '/scratch' };
const env = buildCheckEnvironment(check);
const { args, mounts } = buildCheckArgs({
  image: DEFAULT_IMAGE,
  runId,
  candidate,
  scratch,
  fixtures,
  command: ['node', '/fixtures/isolated-check.mjs'],
  check
});

let guardError = null;
try {
  assertCheckProfile(args, {
    forbidden: forbiddenHostPaths(repo, process.env.USERPROFILE ?? ''),
    image: DEFAULT_IMAGE,
    expectedMounts: mounts
  });
} catch (error) {
  guardError = String(error && error.message ? error.message : error);
}

let result = { status: null, stdout: '', stderr: '' };
if (!guardError) {
  const executed = spawnSync('docker', args, { encoding: 'utf8', timeout: 120_000, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
  result = { status: executed.status, stdout: executed.stdout ?? '', stderr: executed.stderr ?? '' };
}

let observed = null;
try {
  const start = String(result.stdout).indexOf('{');
  const end = String(result.stdout).lastIndexOf('}');
  observed = start >= 0 && end >= 0 ? JSON.parse(String(result.stdout).slice(start, end + 1)) : null;
} catch {
  observed = null;
}

const evidence = checkEvidence({
  checkId: env.CHECK_ID,
  candidateDigest,
  image: DEFAULT_IMAGE,
  observed,
  exitCode: result.status,
  stdout: result.stdout,
  stderr: result.stderr
});
evidence.runId = runId;
evidence.base = base;
evidence.guardError = guardError;
evidence.mounts = mounts.map(mount => ({ target: mount.target, readOnly: mount.readOnly, source: canonicalSource(mount.source) }));
evidence.forbiddenHostPaths = forbiddenHostPaths(repo, process.env.USERPROFILE ?? '');
evidence.stdoutTail = String(result.stdout).slice(-400);
evidence.stderrTail = String(result.stderr).slice(-400);

if (process.env.JT_CHECK_EVIDENCE) writeFileSync(process.env.JT_CHECK_EVIDENCE, JSON.stringify(evidence, null, 2) + '\n');
process.stdout.write(JSON.stringify(evidence, null, 2) + '\n');

const failed = Boolean(guardError) || result.status !== 0 || observed?.candidateWrite?.ok === true || observed?.hostWrite?.ok === true;
if (failed) {
  process.stderr.write(`isolated check did not pass: ${guardError ?? `exit ${result.status}`}\n`);
  process.exitCode = 1;
}
if (!keep) rmSync(base, { recursive: true, force: true });
