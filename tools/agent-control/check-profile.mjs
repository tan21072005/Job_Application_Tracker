import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { assertNoHostAccess, assertPinnedImage, buildRunArgs, canonicalSource, forbiddenHostPaths, CONTAINER_UID, CONTAINER_GID, DEFAULT_MEMORY, DEFAULT_PIDS, DEFAULT_CPUS, DEFAULT_TMPFS } from './docker-adapter.mjs';

export const CHECK_PROJECTION_TARGET = '/candidate';
export const CHECK_SCRATCH_TARGET = '/scratch';
export const CHECK_FIXTURE_TARGET = '/fixtures';
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
  for (const forbidden of FORBIDDEN_CHECK_ENV) {
    if (keys.includes(forbidden)) throw Error(`Check environment must not carry ${forbidden}.`);
  }
  return env;
}

export function buildCheckEnvironment({ checkId, candidateDigest, fixtureRoot = CHECK_FIXTURE_TARGET, scratchRoot = CHECK_SCRATCH_TARGET }) {
  const env = {
    HOME: '/nonexistent',
    CHECK_ID: checkId,
    CANDIDATE_DIGEST: candidateDigest,
    FIXTURE_ROOT: fixtureRoot,
    SCRATCH_ROOT: scratchRoot
  };
  return assertCheckEnvironment(env);
}

export function buildCheckArgs(options) {
  const { image, runId, candidate, scratch, fixtures, command, network = 'none', env } = options;
  assertPinnedImage(image);
  if (!Array.isArray(command) || !command.length) throw Error('Check profile needs a command.');
  const mounts = [
    { source: candidate, target: CHECK_PROJECTION_TARGET, readOnly: true },
    { source: scratch, target: CHECK_SCRATCH_TARGET, readOnly: false },
    { source: fixtures, target: CHECK_FIXTURE_TARGET, readOnly: true }
  ];
  const args = [
    ...buildRunArgs({ image, runId, network }),
    ...mounts.flatMap(mount => ['--mount', `type=bind,source=${mount.source},target=${mount.target}${mount.readOnly ? ',readonly' : ''}`]),
    ...Object.entries(env ?? {}).flatMap(([key, value]) => ['--env', `${key}=${value}`]),
    image,
    ...command
  ];
  return { args, mounts };
}

export function assertCheckProfile(args, { forbidden, allowedMountSources }) {
  assertNoHostAccess(args, forbidden, allowedMountSources);
  const envValues = args.filter((value, index) => args[index - 1] === '--env');
  for (const value of envValues) {
    const key = value.split('=')[0];
    if (FORBIDDEN_CHECK_ENV.includes(key)) throw Error(`Check environment must not carry ${key}.`);
  }
  if (!args.includes('--read-only')) throw Error('Check profile must run with a read only root filesystem.');
  if (!args.includes('--network')) throw Error('Check profile must declare its network.');
  return true;
}

export function checkEvidence(result) {
  const evidence = {
    kind: 'isolated-check-profile-not-readiness-receipt',
    checkId: result.checkId,
    candidateDigest: result.candidateDigest,
    image: result.image,
    observed: result.observed,
    exitCode: result.exitCode,
    stdoutHash: createHash('sha256').update(String(result.stdout ?? '')).digest('hex'),
    stderrHash: createHash('sha256').update(String(result.stderr ?? '')).digest('hex')
  };
  return evidence;
}
