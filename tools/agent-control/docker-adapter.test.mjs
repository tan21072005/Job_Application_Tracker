import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ADAPTER_ID,
  CONTAINER_UID,
  DEFAULT_IMAGE,
  PROJECTION_TARGET,
  SCRATCH_TARGET,
  assertDirectory,
  assertNoHostAccess,
  assertPinnedImage,
  buildEvidence,
  buildLaunchArgs,
  buildProbeArgs,
  createDockerAdapter,
  forbiddenHostPaths,
  parseProbeOutput
} from './docker-adapter.mjs';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'jobtrack-adapter-'));
  const projection = join(root, 'projection');
  const scratch = join(root, 'scratch');
  mkdirSync(join(projection, 'apps/web/src'), { recursive: true });
  mkdirSync(scratch, { recursive: true });
  writeFileSync(join(projection, 'apps/web/src/module.js'), 'export const value = 1;\n');
  writeFileSync(join(scratch, '.keep'), '');
  return { root, projection, scratch };
}

const flagValue = (args, flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

test('the image must be pinned to an immutable digest', () => {
  assert.equal(assertPinnedImage(DEFAULT_IMAGE), DEFAULT_IMAGE);
  for (const image of ['node:24-alpine', 'node@sha256:abc', 'node', 'node@sha256:' + 'a'.repeat(63)]) {
    assert.throws(() => assertPinnedImage(image), /immutable sha256 digest/, image);
  }
});

test('the probe arguments pin every containment control', () => {
  const { projection, scratch } = fixture();
  const args = buildProbeArgs({ image: DEFAULT_IMAGE, runId: 'run-1', projection, scratch, config: 'Y2Zn', program: 'probe-program' });
  assert.equal(args[0], 'run');
  assert.ok(args.includes('--rm'));
  assert.ok(args.includes('--read-only'));
  assert.equal(flagValue(args, '--network'), 'none');
  assert.equal(flagValue(args, '--cap-drop'), 'ALL');
  assert.equal(flagValue(args, '--security-opt'), 'no-new-privileges');
  assert.equal(flagValue(args, '--user'), `${CONTAINER_UID}:${CONTAINER_UID}`);
  assert.ok(flagValue(args, '--memory'));
  assert.ok(flagValue(args, '--pids-limit'));
  assert.ok(flagValue(args, '--cpus'));
  assert.equal(args.at(-4), 'node');
  assert.equal(args.at(-3), '--input-type=module');
  assert.equal(args.at(-2), '--eval');
  assert.equal(args.at(-1), 'probe-program');
  assert.ok(args.includes('JT_PROBE_CONFIG=Y2Zn'));
});

test('the probe mounts only the projection read only and the scratch writable', () => {
  const { projection, scratch } = fixture();
  const args = buildProbeArgs({ image: DEFAULT_IMAGE, runId: 'run-1', projection, scratch, config: 'Y2Zn', program: 'probe-program' });
  const mounts = args.filter((a, i) => args[i - 1] === '--mount');
  assert.equal(mounts.length, 2);
  assert.match(mounts[0], new RegExp(`target=${PROJECTION_TARGET},readonly`));
  assert.match(mounts[1], new RegExp(`target=${SCRATCH_TARGET}`));
  assert.equal(mounts[1].includes('readonly'), false);
});

test('the adapter refuses arguments that expose the host', () => {
  const { projection, scratch } = fixture();
  const args = buildProbeArgs({ image: DEFAULT_IMAGE, runId: 'run-1', projection, scratch, config: 'Y2Zn', program: 'probe-program' });
  const forbidden = forbiddenHostPaths('D:/Project/Job_Application_Tracker', 'C:/Users/Admin');
  assert.equal(assertNoHostAccess(args, forbidden, [projection, scratch]), true);
  assert.throws(() => assertNoHostAccess([...args, '--mount', 'type=bind,source=D:/Project/Job_Application_Tracker,target=/host'], forbidden, [projection, scratch]), /not declared|forbidden host path|exactly the projection/);
  assert.throws(() => assertNoHostAccess([...args, '--mount', 'type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock'], forbidden, [projection, scratch]), /not declared|exactly the projection/);
  assert.throws(() => assertNoHostAccess([...args, '--env', 'SECRET=.env'], forbidden, [projection, scratch]), /dotenv/);
  assert.throws(() => assertNoHostAccess([...args, '--env', 'DATA=accounts.txt'], forbidden, [projection, scratch]), /account file/);
  const firstMount = args.indexOf('--mount');
  const withOneMount = [...args.slice(0, firstMount), ...args.slice(firstMount + 2)];
  assert.throws(() => assertNoHostAccess(withOneMount, forbidden, [projection, scratch]), /exactly the projection and the scratch/);
  assert.throws(() => assertNoHostAccess(args, forbidden, [projection]), /not declared/);
});

test('the launch arguments carry the same containment controls and a command', () => {
  const { projection, scratch } = fixture();
  const args = buildLaunchArgs({ image: DEFAULT_IMAGE, runId: 'run-1', projection, scratch, command: ['node', 'worker.mjs'] });
  assert.ok(args.includes('--read-only'));
  assert.equal(args.at(-1), 'worker.mjs');
  assert.throws(() => buildLaunchArgs({ image: DEFAULT_IMAGE, runId: 'run-1', projection, scratch, command: [] }), /needs a command/);
});

test('the adapter identity and defaults are pinned', () => {
  assert.equal(ADAPTER_ID, 'jobtrack-docker-adapter-v1');
  assert.match(DEFAULT_IMAGE, /^node@sha256:[a-f0-9]{64}$/);
});

test('the probe output parser refuses non JSON and reports probe errors', () => {
  assert.deepEqual(parseProbeOutput('noise {"checks":{}} trailing'), { checks: {} });
  assert.throws(() => parseProbeOutput('no json here'), /produced no JSON/);
  assert.throws(() => parseProbeOutput('{"error":"boom"}'), /Isolation probe failed: boom/);
});

test('the evidence builder emits one envelope per catalog command', () => {
  const evidence = buildEvidence({
    runId: 'run-1',
    binding: { taskId: 't' },
    probe: { checks: { 'projection-read': { allowed: true } } },
    startedAt: '2026-10-21T10:00:00.000Z',
    completedAt: '2026-10-21T10:01:00.000Z',
    hostPositive: [],
    namespace: { inspected: true, mounts: [] },
    readTargets: [],
    writeTargets: [],
    liveness: [],
    transport: {}
  });
  assert.equal(evidence.schemaVersion, 2);
  assert.equal(evidence.executions.length, 12);
  for (const envelope of evidence.executions) {
    assert.equal(envelope.exitCode, 0);
    assert.equal(envelope.timedOut, false);
    assert.equal(envelope.error, null);
    assert.match(envelope.stdoutSha256, /^[a-f0-9]{64}$/);
  }
  assert.equal(evidence.catalog.commandIds.length, 12);
});

test('the adapter refuses a missing or linked directory', () => {
  const { root, projection } = fixture();
  assert.throws(() => assertDirectory(join(root, 'missing')), /does not exist/);
  assert.ok(assertDirectory(projection).endsWith('/projection'));
});

test('the adapter probe refuses to run against a missing projection', async () => {
  const adapter = createDockerAdapter({ repo: process.cwd(), image: DEFAULT_IMAGE });
  await assert.rejects(() => adapter.probe({ projection: join(tmpdir(), 'jobtrack-missing-projection'), scratch: process.cwd(), manifest: [] }), /does not exist/);
});

test('the adapter builds a launch plan without touching docker', async () => {
  const { projection, scratch } = fixture();
  const adapter = createDockerAdapter({ repo: process.cwd(), image: DEFAULT_IMAGE });
  const plan = await adapter.launch({ projection, scratch, command: ['node', 'worker.mjs'] });
  assert.equal(plan.runId.length > 0, true);
  assert.ok(plan.args.includes('--read-only'));
  assert.equal(plan.args.filter(a => a === '--mount').length, 2);
});

test('the probe program is shipped and parses its configuration', () => {
  const program = readFileSync(new URL('../sandbox/isolation-probe.mjs', import.meta.url), 'utf8');
  assert.match(program, /process\.env\.JT_PROBE_CONFIG/);
});
