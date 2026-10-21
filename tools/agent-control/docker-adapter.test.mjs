import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ADAPTER_ID,
  ALLOWED_DOCKER_FLAGS,
  ALLOWED_LAUNCH_ENV_KEYS,
  assertAllowedLaunchEnv,
  CONTAINER_UID,
  DEFAULT_IMAGE,
  NETWORK_MODE,
  PROJECTION_TARGET,
  SCRATCH_TARGET,
  assertBinds,
  assertDirectory,
  assertInsideRoot,
  assertNoForbiddenReference,
  assertNoHostAccess,
  assertNotDeniedPath,
  assertPinnedImage,
  assertSingleImage,
  buildLaunchArgs,
  buildProbeArgs,
  createDockerAdapter,
  forbiddenHostPaths,
  looksLikeImageToken,
  parseContainerObservation,
  parseProbeOutput,
  pathIsInside,
  toContainerPath
} from './docker-adapter.mjs';

const IMAGE_DIGEST = DEFAULT_IMAGE.split('@sha256:')[1];

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'jobtrack-adapter-'));
  const runRoot = join(root, 'runs');
  const projection = join(runRoot, 'projection');
  const scratch = join(runRoot, 'scratch');
  mkdirSync(join(projection, 'apps/web/src'), { recursive: true });
  mkdirSync(scratch, { recursive: true });
  writeFileSync(join(projection, 'apps/web/src/module.js'), 'export const value = 1;\n');
  writeFileSync(join(scratch, '.keep'), '');
  return { root, runRoot, projection, scratch };
}

const flagValue = (args, flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

const expectedMounts = (projection, scratch) => [
  { kind: 'projection', source: projection, target: PROJECTION_TARGET, readOnly: true },
  { kind: 'scratch', source: scratch, target: SCRATCH_TARGET, readOnly: false }
];

const forbidden = forbiddenHostPaths('D:/Project/Job_Application_Tracker', '');

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
  assert.ok(args.includes('--read-only'));
  assert.equal(flagValue(args, '--network'), NETWORK_MODE);
  assert.equal(flagValue(args, '--cap-drop'), 'ALL');
  assert.equal(flagValue(args, '--security-opt'), 'no-new-privileges');
  assert.equal(flagValue(args, '--user'), `${CONTAINER_UID}:${CONTAINER_UID}`);
  assert.ok(flagValue(args, '--memory'));
  assert.ok(flagValue(args, '--pids-limit'));
  assert.ok(flagValue(args, '--cpus'));
  assert.ok(args.includes('JT_PROBE_CONFIG=Y2Zn'));
  assert.equal(args.at(-4), 'node');
  assert.equal(args.at(-3), '--input-type=module');
  assert.equal(args.at(-2), '--eval');
  assert.equal(args.at(-1), 'probe-program');
});

test('the probe mounts only the projection read only and the scratch writable', () => {
  const { projection, scratch } = fixture();
  const args = buildProbeArgs({ image: DEFAULT_IMAGE, runId: 'run-1', projection, scratch, config: 'Y2Zn', program: 'probe-program' });
  const mounts = args.filter((value, index) => args[index - 1] === '--mount');
  assert.equal(mounts.length, 2);
  assert.match(mounts[0], new RegExp(`target=${PROJECTION_TARGET},readonly`));
  assert.match(mounts[1], new RegExp(`target=${SCRATCH_TARGET}`));
  assert.equal(mounts[1].includes('readonly'), false);
});

test('the container image argument is present and pinned in every run', () => {
  const { projection, scratch } = fixture();
  const probe = buildProbeArgs({ image: DEFAULT_IMAGE, runId: 'run-image', projection, scratch, config: 'Y2Zn', program: 'probe-program' });
  assert.ok(probe.includes(DEFAULT_IMAGE), 'probe arguments must name the pinned image');
  assert.equal(probe.indexOf(DEFAULT_IMAGE) > probe.indexOf('--mount'), true);
  const launch = buildLaunchArgs({ image: DEFAULT_IMAGE, runId: 'run-image', projection, scratch, command: ['node', 'worker.mjs'] });
  assert.ok(launch.includes(DEFAULT_IMAGE), 'launch arguments must name the pinned image');
  assert.equal(launch.indexOf(DEFAULT_IMAGE) < launch.indexOf('worker.mjs'), true);
});

test('the guard refuses an undeclared mount, a wrong target and a wrong read only flag', () => {
  const { projection, scratch } = fixture();
  const args = buildProbeArgs({ image: DEFAULT_IMAGE, runId: 'run-1', projection, scratch, config: 'Y2Zn', program: 'probe-program' });
  const mounts = expectedMounts(projection, scratch);
  assert.equal(assertNoHostAccess(args, forbidden, mounts, { image: DEFAULT_IMAGE }), true);
  assert.throws(() => assertNoHostAccess([...args, '--mount', 'type=bind,source=D:/Project/Job_Application_Tracker,target=/host'], forbidden, mounts, { image: DEFAULT_IMAGE }), /exactly the expected bind set/);
  const swapped = args.map(value => value.includes('target=/scratch') ? value.replace('target=/scratch', 'target=/elsewhere') : value);
  assert.throws(() => assertNoHostAccess(swapped, forbidden, mounts, { image: DEFAULT_IMAGE }), /not the declared target/);
  const writableProjection = args.map(value => value.includes('target=/projection,readonly') ? value.replace(',readonly', '') : value);
  assert.throws(() => assertNoHostAccess(writableProjection, forbidden, mounts, { image: DEFAULT_IMAGE }), /must be read only/);
  assert.throws(() => assertNoHostAccess(args, forbidden, [mounts[0]], { image: DEFAULT_IMAGE }), /exactly the expected bind set/);
});

test('the guard refuses the alternate bind forms', () => {
  const { projection, scratch } = fixture();
  const args = buildProbeArgs({ image: DEFAULT_IMAGE, runId: 'run-1', projection, scratch, config: 'Y2Zn', program: 'probe-program' });
  const mounts = expectedMounts(projection, scratch);
  const withVolume = [...args];
  withVolume.splice(withVolume.indexOf('--mount'), 2, '--volume', `${projection}:${PROJECTION_TARGET}:ro`);
  assert.throws(() => assertNoHostAccess(withVolume, forbidden, mounts, { image: DEFAULT_IMAGE }), /outside the allow list/);
  assert.throws(() => assertBinds(['--volume', `${projection}:${PROJECTION_TARGET}:ro`], { allowedMounts: mounts, deniedPaths: forbidden }), /audited mount form/);
  const inlineForm = [...args];
  const mountIndex = inlineForm.indexOf('--mount');
  inlineForm.splice(mountIndex, 2, `--mount=type=bind,source=${projection},target=${PROJECTION_TARGET},readonly`);
  assert.equal(assertNoHostAccess(inlineForm, forbidden, mounts, { image: DEFAULT_IMAGE }), true);
  const inlineEscape = [...args];
  inlineEscape.splice(inlineEscape.indexOf('--mount'), 2, `--mount=type=bind,source=D:/Project/Job_Application_Tracker,target=${PROJECTION_TARGET},readonly`);
  assert.throws(() => assertNoHostAccess(inlineEscape, forbidden, mounts, { image: DEFAULT_IMAGE }), /not the declared source/);
  const imageIndex = args.indexOf(DEFAULT_IMAGE);
  const withVolumesFrom = [...args.slice(0, imageIndex), '--volumes-from', 'other-container', ...args.slice(imageIndex)];
  assert.throws(() => assertNoHostAccess(withVolumesFrom, forbidden, mounts, { image: DEFAULT_IMAGE }), /outside the allow list/);
});

test('the guard refuses a network, a second image, an env file and a forbidden host path', () => {
  const { projection, scratch } = fixture();
  const args = buildProbeArgs({ image: DEFAULT_IMAGE, runId: 'run-1', projection, scratch, config: 'Y2Zn', program: 'probe-program' });
  const mounts = expectedMounts(projection, scratch);
  const networked = args.map(value => value === NETWORK_MODE ? 'host' : value);
  assert.throws(() => assertNoHostAccess(networked, forbidden, mounts, { image: DEFAULT_IMAGE }), /without network access/);
  const twoNetworks = [...args, '--network', 'host'];
  assert.throws(() => assertNoHostAccess(twoNetworks, forbidden, mounts, { image: DEFAULT_IMAGE }), /exactly one network mode/);
  assert.throws(() => assertNoHostAccess([...args, 'node@sha256:' + 'b'.repeat(64)], forbidden, mounts, { image: DEFAULT_IMAGE }), /exactly the pinned image/);
  assert.throws(() => assertNoHostAccess([...args, 'node:24-alpine'], forbidden, mounts, { image: DEFAULT_IMAGE }), /exactly the pinned image/);
  assert.throws(() => assertNoHostAccess([...args, '--env-file', '.env'], forbidden, mounts, { image: DEFAULT_IMAGE }), /never receive an env file/);
  assert.throws(() => assertNoHostAccess([...args, '--env', 'DATA=accounts.txt'], forbidden, mounts, { image: DEFAULT_IMAGE }), /account file/);
  assert.throws(() => assertNoHostAccess([...args, '--mount', 'type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock'], forbidden, mounts, { image: DEFAULT_IMAGE }), /exactly the expected bind set/);
});

test('the forbidden host path check matches the canonical spelling in either direction', () => {
  const { projection, scratch } = fixture();
  const args = buildProbeArgs({ image: DEFAULT_IMAGE, runId: 'run-1', projection, scratch, config: 'Y2Zn', program: 'probe-program' });
  const home = forbiddenHostPaths('D:/Project/Job_Application_Tracker', 'C:/Users/Admin');
  assert.throws(() => assertNoForbiddenReference([...args, '--env', 'DATA=D:/Project/Job_Application_Tracker'], home), /forbidden host path/);
  assert.throws(() => assertNoForbiddenReference([...args, '--env', 'DATA=D:\\Project\\Job_Application_Tracker'], home), /forbidden host path/);
  assert.throws(() => assertNoForbiddenReference([...args, '--env', 'DATA=C:\\Users\\Admin'], home), /forbidden host path/);
  assert.throws(() => assertNoForbiddenReference([...args, '--env', 'SECRET=.env'], home), /dotenv/);
  assert.throws(() => assertNoForbiddenReference([...args, '--env', 'DATA=accounts.txt'], home), /account file/);
  assert.throws(() => assertNoForbiddenReference([...args, '--env', 'SOCKET=/var/run/docker.sock'], home), /Docker socket/);
  assert.throws(() => assertNoHostAccess([...args, '--mount', 'type=bind,source=/var/run/docker.sock,target=/x'], forbidden, expectedMounts(projection, scratch), { image: DEFAULT_IMAGE }), /exactly the expected bind set|not the declared source/);
});

test('the single image rule, the flag allow list and the bind rule stand on their own', () => {
  const { projection, scratch } = fixture();
  assert.equal(assertSingleImage(['run', DEFAULT_IMAGE, 'node'], DEFAULT_IMAGE), true);
  assert.throws(() => assertSingleImage(['run', DEFAULT_IMAGE, 'node@sha256:' + 'c'.repeat(64)], DEFAULT_IMAGE), /exactly the pinned image/);
  assert.throws(() => assertSingleImage(['run', 'node'], DEFAULT_IMAGE), /exactly the pinned image/);
  assert.equal(looksLikeImageToken('node:24-alpine'), true);
  assert.equal(looksLikeImageToken('65534:65534'), false);
  assert.equal(looksLikeImageToken('/scratch'), false);
  assert.equal(looksLikeImageToken('jobtrack.owner=jobtrack'), false);
  assert.ok(ALLOWED_DOCKER_FLAGS.includes('--mount'));
  assert.equal(ALLOWED_DOCKER_FLAGS.includes('--volumes-from'), false);
  const mounts = expectedMounts(projection, scratch);
  assert.equal(assertBinds(['--mount', `type=bind,source=${projection},target=${PROJECTION_TARGET},readonly`, '--mount', `type=bind,source=${scratch},target=${SCRATCH_TARGET}`], { allowedMounts: mounts, deniedPaths: forbidden }), true);
});

test('the run root is required and every mount source must live inside it', () => {
  const { root, runRoot, projection, scratch } = fixture();
  assert.equal(pathIsInside(runRoot, projection), true);
  assert.equal(pathIsInside(runRoot, scratch), true);
  assert.equal(pathIsInside(runRoot, root), false);
  assert.equal(pathIsInside(projection, scratch), false);
  assert.throws(() => assertInsideRoot(runRoot, root, 'Projection'), /must live inside the operator run root/);
  assert.throws(() => createDockerAdapter({ repo: process.cwd() }), /requires the operator run root/);
  assert.throws(() => assertNotDeniedPath(['D:/Project/Job_Application_Tracker'], 'D:/Project/Job_Application_Tracker/.git'), /denied host path/);
  assert.throws(() => assertNotDeniedPath(['D:/Project/Job_Application_Tracker'], 'D:/Project/Job_Application_Tracker'), /denied host path/);
  assert.equal(assertNotDeniedPath(['D:/Project/Job_Application_Tracker'], 'D:/Long-term/run/projection'), true);
});

test('the launch arguments carry the same containment controls and a command', () => {
  const { projection, scratch } = fixture();
  const args = buildLaunchArgs({ image: DEFAULT_IMAGE, runId: 'run-1', projection, scratch, command: ['node', 'worker.mjs'] });
  assert.ok(args.includes('--read-only'));
  assert.ok(args.includes('--rm'));
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

test('the container inspection becomes the observed facts', () => {
  const inspected = JSON.stringify([{
    Id: 'container-1',
    Image: `sha256:${IMAGE_DIGEST}`,
    Config: { Image: DEFAULT_IMAGE, User: '65534:65534', Env: ['HOME=/nonexistent'] },
    HostConfig: { NetworkMode: 'none', CapDrop: ['ALL'], SecurityOpt: ['no-new-privileges'], Memory: 536870912, PidsLimit: 256, NanoCpus: 1000000000, ReadonlyRootfs: true, Tmpfs: { '/tmp': 'rw,noexec,nosuid,size=64m' } },
    Mounts: [
      { Type: 'bind', Source: 'D:\\Long-term\\run\\projection', Destination: PROJECTION_TARGET, RW: false },
      { Type: 'bind', Source: 'D:\\Long-term\\run\\scratch', Destination: SCRATCH_TARGET, RW: true }
    ]
  }]);
  const observation = parseContainerObservation(inspected);
  assert.equal(observation.imageId, `sha256:${IMAGE_DIGEST}`);
  assert.equal(observation.networkMode, 'none');
  assert.equal(observation.readonlyRootfs, true);
  assert.deepEqual(observation.mounts.map(mount => mount.kind), ['projection', 'scratch']);
  assert.deepEqual(observation.mounts.map(mount => mount.readOnly), [true, false]);
});

test('the adapter refuses a missing or linked directory', () => {
  const { root, projection } = fixture();
  assert.throws(() => assertDirectory(join(root, 'missing')), /does not exist/);
  assert.ok(assertDirectory(projection).endsWith('/projection'));
});

test('the adapter probe refuses to run against a missing projection', async () => {
  const { runRoot } = fixture();
  const adapter = createDockerAdapter({ repo: process.cwd(), runRoot, home: '' });
  await assert.rejects(() => adapter.probe({ projection: join(tmpdir(), 'jobtrack-missing-projection'), scratch: process.cwd(), manifest: [] }), /does not exist/);
});

test('the adapter builds a launch plan without touching docker', async () => {
  const { runRoot, projection, scratch } = fixture();
  const adapter = createDockerAdapter({ repo: process.cwd(), runRoot, home: '' });
  const plan = await adapter.launch({ projection, scratch, command: ['node', 'worker.mjs'] });
  assert.equal(plan.runId.length > 0, true);
  assert.ok(plan.args.includes('--read-only'));
  assert.equal(plan.args.filter(value => value === '--mount').length, 2);
  assert.match(plan.argvHash, /^[a-f0-9]{64}$/);
});

test('the adapter refuses a projection that is outside the operator run root', async () => {
  const { runRoot } = fixture();
  const outside = join(tmpdir(), 'jobtrack-outside-projection');
  mkdirSync(outside, { recursive: true });
  const adapter = createDockerAdapter({ repo: process.cwd(), runRoot, home: '' });
  await assert.rejects(() => adapter.launch({ projection: outside, scratch: join(runRoot, 'scratch'), command: ['node', 'worker.mjs'] }), /must live inside the operator run root/);
});

test('the host path maps to a fixed container path', () => {
  assert.equal(toContainerPath('D:\\Project\\Job_Application_Tracker'), '/mnt/d/Project/Job_Application_Tracker');
  assert.equal(toContainerPath('C:\\Users\\Admin'), '/mnt/c/Users/Admin');
});

test('the probe program is shipped and reads its configuration from the environment', () => {
  const program = readFileSync(new URL('../sandbox/isolation-probe.mjs', import.meta.url), 'utf8');
  assert.match(program, /process\.env\.JT_PROBE_CONFIG/);
  for (const commandId of ['projection-read', 'scratch-write', 'projection-write', 'host-write', 'child-liveness', 'grandchild-liveness', 'transport-positive', 'transport-general-egress']) {
    assert.ok(program.includes(`'${commandId}'`), commandId);
  }
});
test('the launch refuses an environment variable outside the allow list', async () => {
  const { runRoot, projection, scratch } = fixture();
  const adapter = createDockerAdapter({ repo: process.cwd(), runRoot, home: '' });
  await assert.rejects(() => adapter.launch({ projection, scratch, command: ['node', 'worker.mjs'], env: { READINESS_KEY: 'secret' } }), /may only carry/);
  await assert.rejects(() => adapter.launch({ projection, scratch, command: ['node', 'worker.mjs'], env: { DATABASE_URL: 'postgres://user:pw@host/db' } }), /may only carry/);
  assert.equal(assertAllowedLaunchEnv({ HOME: '/nonexistent', CHECK_ID: 'build:api' }), true);
});