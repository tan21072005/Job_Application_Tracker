import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  CHECK_FIXTURE_TARGET,
  CHECK_PROJECTION_TARGET,
  CHECK_SCRATCH_TARGET,
  FORBIDDEN_CHECK_ENV,
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

test('the check profile names the pinned image before the command', () => {
  const { candidate, scratch, fixtures } = fixture();
  const { args } = buildCheckArgs({
    image: DEFAULT_IMAGE,
    runId: 'check-image',
    candidate,
    scratch,
    fixtures,
    command: ['node', 'check.mjs'],
    env: buildCheckEnvironment({ checkId: 'build:api', candidateDigest: 'abc' })
  });
  assert.ok(args.includes(DEFAULT_IMAGE), 'check arguments must name the pinned image');
  assert.equal(args.indexOf(DEFAULT_IMAGE) < args.indexOf('check.mjs'), true);
});

test('the check profile mounts the candidate read only, the scratch writable and the fixtures read only', () => {
  const { candidate, scratch, fixtures } = fixture();
  const { args, mounts } = buildCheckArgs({
    image: DEFAULT_IMAGE,
    runId: 'check-1',
    candidate,
    scratch,
    fixtures,
    command: ['node', 'check.mjs'],
    env: buildCheckEnvironment({ checkId: 'build:api', candidateDigest: 'abc' })
  });
  assert.equal(mounts.length, 3);
  const mountValues = args.filter((value, index) => args[index - 1] === '--mount');
  assert.equal(mountValues.length, 3);
  assert.match(mountValues[0], new RegExp(`target=${CHECK_PROJECTION_TARGET},readonly`));
  assert.equal(mountValues[1].includes('readonly'), false);
  assert.match(mountValues[1], new RegExp(`target=${CHECK_SCRATCH_TARGET}`));
  assert.match(mountValues[2], new RegExp(`target=${CHECK_FIXTURE_TARGET},readonly`));
});

test('the check profile keeps the containment controls of the worker profile', () => {
  const { candidate, scratch, fixtures } = fixture();
  const { args } = buildCheckArgs({
    image: DEFAULT_IMAGE,
    runId: 'check-2',
    candidate,
    scratch,
    fixtures,
    command: ['node', 'check.mjs'],
    env: buildCheckEnvironment({ checkId: 'build:api', candidateDigest: 'abc' })
  });
  assert.ok(args.includes('--read-only'));
  assert.equal(flagValue(args, '--network'), 'none');
  assert.equal(flagValue(args, '--cap-drop'), 'ALL');
  assert.equal(flagValue(args, '--security-opt'), 'no-new-privileges');
  assert.equal(flagValue(args, '--user'), '65534:65534');
  assert.ok(args.includes('CHECK_ID=build:api'));
  assert.ok(args.includes('CANDIDATE_DIGEST=abc'));
});

test('the check environment never carries a database, provider or secret variable', () => {
  assert.throws(() => assertCheckEnvironment({ DATABASE_URL: 'postgres://x' }), /must not carry DATABASE_URL/);
  assert.throws(() => assertCheckEnvironment({ OPENAI_API_KEY: 'x' }), /must not carry OPENAI_API_KEY/);
  assert.throws(() => assertCheckEnvironment({ READINESS_KEY: 'x' }), /must not carry READINESS_KEY/);
  assert.throws(() => assertCheckEnvironment({ NODE_OPTIONS: '--require x' }), /must not carry NODE_OPTIONS/);
  const env = buildCheckEnvironment({ checkId: 'build:api', candidateDigest: 'abc' });
  for (const key of Object.keys(env)) assert.equal(FORBIDDEN_CHECK_ENV.includes(key), false, key);
});

test('the check profile refuses an undeclared mount and a forbidden environment variable', () => {
  const { candidate, scratch, fixtures } = fixture();
  const { args } = buildCheckArgs({
    image: DEFAULT_IMAGE,
    runId: 'check-3',
    candidate,
    scratch,
    fixtures,
    command: ['node', 'check.mjs'],
    env: buildCheckEnvironment({ checkId: 'build:api', candidateDigest: 'abc' })
  });
  const forbidden = forbiddenHostPaths('D:/Project/Job_Application_Tracker', 'C:/Users/Admin');
  assert.equal(assertCheckProfile(args, { forbidden, allowedMountSources: [candidate, scratch, fixtures] }), true);
  assert.throws(() => assertCheckProfile([...args, '--mount', 'type=bind,source=D:/Project/Job_Application_Tracker,target=/host'], { forbidden, allowedMountSources: [candidate, scratch, fixtures] }), /not declared|exactly the projection/);
  assert.throws(() => assertCheckProfile([...args, '--env', 'DATABASE_URL=postgres://x'], { forbidden, allowedMountSources: [candidate, scratch, fixtures] }), /must not carry DATABASE_URL/);
});

test('the check profile needs a command and a pinned image', () => {
  const { candidate, scratch, fixtures } = fixture();
  assert.throws(() => buildCheckArgs({ image: DEFAULT_IMAGE, runId: 'check-4', candidate, scratch, fixtures, command: [] }), /needs a command/);
  assert.throws(() => buildCheckArgs({ image: 'node:24-alpine', runId: 'check-5', candidate, scratch, fixtures, command: ['node', 'x'] }), /immutable sha256 digest/);
});
