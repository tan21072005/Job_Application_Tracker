import { createHash, randomUUID } from 'node:crypto';
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { assertCheckProfile, buildCheckArgs, buildCheckEnvironment, checkEvidence, runIsolatedCheck } from '../agent-control/check-profile.mjs';
import { DEFAULT_IMAGE, canonicalSource, forbiddenHostPaths, toContainerPath } from '../agent-control/docker-adapter.mjs';

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
const hostProbePath = toContainerPath(join(repo, '.check-host-probe'));
const check = { checkId: 'build:api', candidateDigest, fixtureRoot: '/fixtures', scratchRoot: '/scratch', hostProbePath };
const env = buildCheckEnvironment(check);
const { args, mounts } = buildCheckArgs({
  image: DEFAULT_IMAGE,
  runId,
  candidate,
  scratch,
  fixtures,
  command: ['node', '/fixtures/isolated-check.mjs'],
  check,
  mode: 'create'
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

let execution = { containerId: null, observation: null, stdout: '', stderr: '', status: null };
if (!guardError) {
  try {
    execution = runIsolatedCheck({ docker: 'docker', args });
  } catch (error) {
    guardError = String(error && error.message ? error.message : error);
  }
}

let observed = null;
try {
  const start = String(execution.stdout).indexOf('{');
  const end = String(execution.stdout).lastIndexOf('}');
  observed = start >= 0 && end >= 0 ? JSON.parse(String(execution.stdout).slice(start, end + 1)) : null;
} catch {
  observed = null;
}

const evidence = checkEvidence({
  checkId: env.CHECK_ID,
  candidateDigest,
  image: DEFAULT_IMAGE,
  observed,
  exitCode: execution.status,
  stdout: execution.stdout,
  stderr: execution.stderr
});
evidence.runId = runId;
evidence.base = base;
evidence.guardError = guardError;
evidence.containerId = execution.containerId;
evidence.observedContainer = execution.observation;
evidence.observedMounts = (execution.observation?.mounts ?? []).map(mount => ({
  kind: mount.kind,
  source: mount.source,
  target: mount.target,
  readOnly: mount.readOnly
}));
evidence.declaredMounts = mounts.map(mount => ({ target: mount.target, readOnly: mount.readOnly, source: canonicalSource(mount.source) }));
evidence.forbiddenHostPaths = forbiddenHostPaths(repo, process.env.USERPROFILE ?? '');
evidence.stdoutTail = String(execution.stdout).slice(-400);
evidence.stderrTail = String(execution.stderr).slice(-400);

if (process.env.JT_CHECK_EVIDENCE) writeFileSync(process.env.JT_CHECK_EVIDENCE, JSON.stringify(evidence, null, 2) + '\n');
process.stdout.write(JSON.stringify(evidence, null, 2) + '\n');

const environmentKeys = observed?.environment ? Object.keys(observed.environment) : [];
const failed = Boolean(guardError)
  || execution.status !== 0
  || observed === null
  || observed?.candidateWrite?.ok === true
  || observed?.hostWrite?.ok === true
  || environmentKeys.length > 0;
if (failed) {
  process.stderr.write(`isolated check did not pass: ${guardError ?? `exit ${execution.status}`}\n`);
  process.exitCode = 1;
}
if (!keep) rmSync(base, { recursive: true, force: true });
