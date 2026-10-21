import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import {
  assertNoHostAccess,
  assertPinnedImage,
  buildRunArgs,
  canonicalSource,
  forbiddenHostPaths,
  inspectContainer,
  parseEnvArgs,
  NETWORK_MODE,
  CANDIDATE_TARGET,
  FIXTURE_TARGET,
  SCRATCH_TARGET
} from './docker-adapter.mjs';

export const CHECK_PROJECTION_TARGET = CANDIDATE_TARGET;
export const CHECK_SCRATCH_TARGET = SCRATCH_TARGET;
export const CHECK_FIXTURE_TARGET = FIXTURE_TARGET;

export const CHECK_ENV_KEYS = Object.freeze(['HOME', 'CHECK_ID', 'CANDIDATE_DIGEST', 'FIXTURE_ROOT', 'SCRATCH_ROOT', 'HOST_PROBE_PATH']);

export const FORBIDDEN_CHECK_ENV = Object.freeze([
  'DATABASE_URL',
  'TEST_DATABASE_URL',
  'PGHOST',
  'PGPASSWORD',
  'PGUSER',
  'POSTGRES_PASSWORD',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'N8N_API_KEY',
  'JWT_SECRET',
  'READINESS_KEY',
  'NODE_OPTIONS'
]);

export function assertCheckEnvironment(env) {
  const keys = Object.keys(env ?? {});
  for (const key of keys) {
    if (!CHECK_ENV_KEYS.includes(key)) throw Error(`Check environment may only carry ${CHECK_ENV_KEYS.join(', ')}.`);
  }
  return env;
}

export function buildCheckEnvironment({ checkId, candidateDigest, fixtureRoot = CHECK_FIXTURE_TARGET, scratchRoot = CHECK_SCRATCH_TARGET, hostProbePath = '' }) {
  const env = {
    HOME: '/nonexistent',
    CHECK_ID: checkId,
    CANDIDATE_DIGEST: candidateDigest,
    FIXTURE_ROOT: fixtureRoot,
    SCRATCH_ROOT: scratchRoot,
    HOST_PROBE_PATH: hostProbePath
  };
  return assertCheckEnvironment(env);
}

export function buildCheckArgs(options) {
  const { image, runId, candidate, scratch, fixtures, command, mode = 'run' } = options;
  assertPinnedImage(image);
  if (!Array.isArray(command) || !command.length) throw Error('Check profile needs a command.');
  const env = buildCheckEnvironment(options.check ?? {});
  const mounts = [
    { kind: 'candidate', source: candidate, target: CHECK_PROJECTION_TARGET, readOnly: true },
    { kind: 'scratch', source: scratch, target: CHECK_SCRATCH_TARGET, readOnly: false },
    { kind: 'fixtures', source: fixtures, target: CHECK_FIXTURE_TARGET, readOnly: true }
  ];
  const args = [
    mode,
    ...(mode === 'run' ? ['--rm'] : []),
    ...buildRunArgs({ image, runId }).slice(1),
    ...mounts.flatMap(mount => ['--mount', `type=bind,source=${mount.source},target=${mount.target}${mount.readOnly ? ',readonly' : ''}`]),
    ...Object.entries(env).flatMap(([key, value]) => ['--env', `${key}=${value}`]),
    image,
    ...command
  ];
  return { args, mounts, env };
}

export function runIsolatedCheck(options) {
  const { docker, args, timeoutMs = 120_000 } = options;
  const runDocker = (argv, timeout) => {
    const result = spawnSync(docker, argv, { encoding: 'utf8', timeout, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
    if (result.error) throw Error(`Docker invocation failed: ${result.error.message}`);
    return result;
  };
  const created = runDocker(args, timeoutMs);
  const containerId = String(created.stdout ?? '').trim().split(/\s+/)[0] ?? '';
  if (created.status !== 0 || !containerId) {
    throw Error(`Check container could not be created: ${String(created.stderr).slice(-400)}`);
  }
  let observation = null;
  let stdout = '';
  let stderr = '';
  let status = null;
  try {
    observation = inspectContainer(docker, containerId);
    const started = runDocker(['start', '-a', containerId], timeoutMs);
    stdout = started.stdout ?? '';
    stderr = started.stderr ?? '';
    status = started.status;
  } finally {
    runDocker(['rm', '-f', containerId], 60_000);
  }
  return { containerId, observation, stdout, stderr, status };
}

export function assertCheckProfile(args, { forbidden, image, expectedMounts = [] }) {
  assertNoHostAccess(args, forbidden, expectedMounts, { image });
  for (const entry of parseEnvArgs(args)) {
    if (!CHECK_ENV_KEYS.includes(entry.key)) throw Error(`Check environment may only carry ${CHECK_ENV_KEYS.join(', ')}.`);
  }
  if (!args.includes('--read-only')) throw Error('Check profile must run with a read only root filesystem.');
  const networkIndex = args.indexOf('--network');
  if (networkIndex < 0 || args[networkIndex + 1] !== NETWORK_MODE) throw Error('Check profile must run without network access.');
  return true;
}

export function checkEvidence(result) {
  return {
    kind: 'isolated-check-profile-not-readiness-receipt',
    checkId: result.checkId,
    candidateDigest: result.candidateDigest,
    image: result.image,
    observed: result.observed,
    exitCode: result.exitCode,
    stdoutHash: createHash('sha256').update(String(result.stdout ?? '')).digest('hex'),
    stderrHash: createHash('sha256').update(String(result.stderr ?? '')).digest('hex')
  };
}
