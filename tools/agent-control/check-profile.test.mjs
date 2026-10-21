import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  CHECK_ENV_KEYS,
  CHECK_FIXTURE_TARGET,
  CHECK_PROJECTION_TARGET,
  CHECK_SCRATCH_TARGET,
  assertCheckEnvironment,
  assertCheckProfile,
  buildCheckArgs,
  buildCheckEnvironment
} from './check-profile.mjs';
import { DEFAULT_IMAGE, canonicalSource, forbiddenHostPaths } from './docker-adapter.mjs';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'jobtrack-check-'));
  const candidate = join(root, 'candidate');
  const scratch = join(root, 'scratch');
  const fixtures = join(root, 'fixtures');
  mkdirSync(join(candidate, 'apps/web/src'), { recursive: true });
  mkdirSync(scratch, { recursive: true });
  mkdirSync(fixtures, { recursive: true });
  writeFileSync(join(candidate, 'apps/web/src/module.js'), 'export const value = 1;\n');
  writeFileSync(join(fixtures, 'fixture.json'), '{}\n');
  return { root, candidate, scratch, fixtures };
}

const flagValue = (args, flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

const build = (options = {}) => {
  const { root, candidate, scratch, fixtures } = fixture();
  const built = buildCheckArgs({
    image: DEFAULT_IMAGE,
    runId: 'check-1',
    candidate,
    scratch,
    fixtures,
    command: ['node', 'check.mjs'],
    check: { checkId: 'build:api', candidateDigest: 'abc' },
    ...options
  });
  return { ...built, root, candidate, scratch, fixtures };
};

const forbidden = forbiddenHostPaths('D:/Project/Job_Application_Tracker', '');

test('the check profile mounts the candidate read only, the scratch writable and the fixtures read only', () => {
  const { args, mounts } = build();
  assert.equal(mounts.length, 3);
  const mountValues = args.filter((value, index) => args[index - 1] === '--mount');
  assert.equal(mountValues.length, 3);
  assert.match(mountValues[0], new RegExp(`target=${CHECK_PROJECTION_TARGET},readonly`));
  assert.equal(mountValues[1].includes('readonly'), false);
  assert.match(mountValues[1], new RegExp(`target=${CHECK_SCRATCH_TARGET}`));
  assert.match(mountValues[2], new RegExp(`target=${CHECK_FIXTURE_TARGET},readonly`));
});

test('the check profile keeps the containment controls of the worker profile', () => {
  const { args } = build();
  assert.ok(args.includes('--read-only'));
  assert.equal(flagValue(args, '--network'), 'none');
  assert.equal(flagValue(args, '--cap-drop'), 'ALL');
  assert.equal(flagValue(args, '--security-opt'), 'no-new-privileges');
  assert.equal(flagValue(args, '--user'), '65534:65534');
  assert.ok(args.includes('CHECK_ID=build:api'));
  assert.ok(args.includes('CANDIDATE_DIGEST=abc'));
});

test('the check profile names the pinned image before the command', () => {
  const { args } = build();
  assert.ok(args.includes(DEFAULT_IMAGE), 'check arguments must name the pinned image');
  assert.equal(args.indexOf(DEFAULT_IMAGE) < args.indexOf('check.mjs'), true);
});

test('the run mode removes the container and the create mode leaves the lifecycle to the runner', () => {
  const { args } = build();
  assert.ok(args.includes('--rm'), 'the run mode container must be removed when it exits');
  const created = build({ mode: 'create' });
  assert.equal(created.args[0], 'create');
  assert.equal(created.args.includes('--rm'), false);
});

test('the check environment never carries a database, provider or secret variable', () => {
  assert.throws(() => assertCheckEnvironment({ DATABASE_URL: 'postgres://x' }), /may only carry/);
  assert.throws(() => assertCheckEnvironment({ OPENAI_API_KEY: 'x' }), /may only carry/);
  assert.throws(() => assertCheckEnvironment({ READINESS_KEY: 'x' }), /may only carry/);
  assert.throws(() => assertCheckEnvironment({ NODE_OPTIONS: '--require x' }), /may only carry/);
  const env = buildCheckEnvironment({ checkId: 'build:api', candidateDigest: 'abc' });
  for (const key of Object.keys(env)) assert.equal(CHECK_ENV_KEYS.includes(key), true, key);
});

test('the check environment is built from the fixed allow list', () => {
  const { env } = build();
  assert.deepEqual(Object.keys(env).sort(), [...CHECK_ENV_KEYS].sort());
  assert.equal(env.HOME, '/nonexistent');
  assert.equal(env.HOST_PROBE_PATH, '');
});

test('the check profile refuses an undeclared mount, a network and a forbidden environment variable', () => {
  const { args, mounts } = build();
  const expectedMounts = mounts.map(mount => ({ ...mount, source: canonicalSource(mount.source) }));
  assert.equal(assertCheckProfile(args, { forbidden, image: DEFAULT_IMAGE, expectedMounts }), true);
  assert.throws(() => assertCheckProfile([...args, '--mount', 'type=bind,source=D:/Project/Job_Application_Tracker,target=/host'], { forbidden, image: DEFAULT_IMAGE, expectedMounts }), /exactly the expected bind set/);
  assert.throws(() => assertCheckProfile([...args, '--env', 'DATABASE_URL=postgres://x'], { forbidden, image: DEFAULT_IMAGE, expectedMounts }), /may only carry/);
  const networked = args.map(value => value === 'none' ? 'host' : value);
  assert.throws(() => assertCheckProfile(networked, { forbidden, image: DEFAULT_IMAGE, expectedMounts }), /without network access/);
});

test('the check profile refuses a declared mount set that does not match the arguments', () => {
  const { args, mounts, root } = build();
  const hostile = mounts.map(mount => ({ ...mount, source: join(root, 'scratch') }));
  assert.throws(() => assertCheckProfile(args, { forbidden, image: DEFAULT_IMAGE, expectedMounts: hostile }), /not the declared source/);
});

test('the check profile needs a command and a pinned image', () => {
  const { candidate, scratch, fixtures } = fixture();
  assert.throws(() => buildCheckArgs({ image: DEFAULT_IMAGE, runId: 'check-4', candidate, scratch, fixtures, command: [], check: { checkId: 'x', candidateDigest: 'abc' } }), /needs a command/);
  assert.throws(() => buildCheckArgs({ image: 'node:24-alpine', runId: 'check-5', candidate, scratch, fixtures, command: ['node', 'x'], check: { checkId: 'x', candidateDigest: 'abc' } }), /immutable sha256 digest/);
});
