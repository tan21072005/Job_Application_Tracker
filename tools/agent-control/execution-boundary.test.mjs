import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertBoundaryBinding,
  assertReceiptMatchesBinding,
  buildTrustedBinding,
  createExecutionBoundary,
  stageProjection
} from './execution-boundary.mjs';
import { controlPlaneFingerprint, probeProgramHash } from './fingerprint.mjs';
import { createDockerAdapter, DEFAULT_IMAGE } from './docker-adapter.mjs';
import { createReadinessIssuer, dockerBinaryHash } from './issuer.mjs';

const repositoryRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));

const dockerReachable = spawnSync('docker', ['version', '--format', '{{.Server.Version}}'], { encoding: 'utf8', timeout: 30_000, windowsHide: true }).status === 0;

function sourceFixture() {
  const root = mkdtempSync(join(tmpdir(), 'jobtrack-boundary-'));
  const worktree = join(root, 'worktree');
  const destination = join(root, 'projection');
  const scratch = join(root, 'scratch');
  mkdirSync(join(worktree, 'apps/web/src'), { recursive: true });
  writeFileSync(join(worktree, 'apps/web/src/module.js'), 'export const value = 1;\n');
  return { root, worktree, destination, scratch };
}

const bindingFixture = (overrides = {}) => ({
  taskId: 'web-one',
  feature: 'web',
  base: 'base-sha',
  sourceDigest: '1'.repeat(64),
  projectionManifestHash: '2'.repeat(64),
  policyHash: '3'.repeat(64),
  environmentHash: '4'.repeat(64),
  purpose: 'worker-read',
  profileHash: '5'.repeat(64),
  adapterId: 'jobtrack-docker-adapter-v1',
  imageDigest: '6'.repeat(64),
  cliHash: '7'.repeat(64),
  nodeHash: '8'.repeat(64),
  ...overrides
});

const receiptFixture = (binding, overrides = {}) => ({
  schemaVersion: 2,
  runId: '3f6b1c2a-9d4e-4a7b-8c5d-1e2f3a4b5c6d',
  issuedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 600_000).toISOString(),
  binding,
  derived: { readIsolation: true, writeIsolation: true, childCleanup: true, modelTransport: true, egress: true, gateA: true },
  ...overrides
});

test('the projection stages the declared files and verifies the copied bytes', () => {
  const { worktree, destination, root } = sourceFixture();
  const staged = stageProjection({ files: ['apps/web/src/module.js'], sourceRoot: worktree, destination, allowedRoot: root });
  assert.equal(staged.manifest.length, 1);
  assert.match(staged.manifest[0].sha256, /^[a-f0-9]{64}$/);
  assert.match(staged.manifestHash, /^[a-f0-9]{64}$/);
  assert.throws(() => stageProjection({ files: ['apps/web/src/missing.js'], sourceRoot: worktree, destination, allowedRoot: root }), /source file is missing/);
  assert.throws(() => stageProjection({ files: [], sourceRoot: worktree, destination, allowedRoot: root }), /at least one file/);
  assert.throws(() => stageProjection({ files: ['../outside.js'], sourceRoot: worktree, destination, allowedRoot: root }), /must live inside the worktree/);
});

test('the trusted binding is validated', () => {
  const binding = bindingFixture();
  assert.equal(assertBoundaryBinding(binding), binding);
  assert.throws(() => assertBoundaryBinding({ ...binding, purpose: 'worker-write' }), /purpose is invalid/);
  assert.throws(() => assertBoundaryBinding({ ...binding, policyHash: 'not-a-hash' }), /not a hash/);
  const withoutTask = { ...binding };
  delete withoutTask.taskId;
  assert.throws(() => buildTrustedBinding(withoutTask), /missing taskId/);
});

test('a projection destination outside the operator run root is refused and nothing is deleted', () => {
  const { worktree, root } = sourceFixture();
  const victim = join(root, 'victim');
  mkdirSync(victim, { recursive: true });
  writeFileSync(join(victim, 'keep.txt'), 'keep\n');
  const outside = join(root, '..', `jobtrack-outside-${Date.now()}`);
  assert.throws(() => stageProjection({ files: ['apps/web/src/module.js'], sourceRoot: worktree, destination: victim, allowedRoot: join(root, 'runs') }), /must live inside the operator run root/);
  assert.throws(() => stageProjection({ files: ['apps/web/src/module.js'], sourceRoot: worktree, destination: outside, allowedRoot: join(root, 'runs') }), /must live inside the operator run root/);
  assert.throws(() => stageProjection({ files: ['apps/web/src/module.js'], sourceRoot: worktree, destination: join(root, 'runs'), allowedRoot: join(root, 'runs') }), /must live inside the operator run root/);
  assert.throws(() => stageProjection({ files: ['apps/web/src/module.js'], sourceRoot: worktree, destination: join(root, 'runs', 'projection') }), /needs the operator run root/);
  assert.equal(existsSync(join(victim, 'keep.txt')), true);
});

test('a real repository fixed check runs and passes in the isolated profile', { skip: dockerReachable ? false : 'Docker is not reachable in this environment' }, async () => {
  const runRoot = join('D:/Long-term', `jobtrack-boundary-repo-${Date.now()}`);
  mkdirSync(runRoot, { recursive: true });
  const projection = join(runRoot, 'projection');
  const scratch = join(runRoot, 'scratch');
  mkdirSync(projection, { recursive: true });
  mkdirSync(scratch, { recursive: true });
  const denied = [repositoryRoot, process.env.USERPROFILE ?? repositoryRoot].map(path => path.replaceAll('\\', '/'));
  const credentialFile = join(runRoot, 'accounts.txt');
  writeFileSync(credentialFile, 'fixture-only\n');
  const egressServer = createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end('{}');
  });
  let outcome = null;
  try {
    await new Promise(done => egressServer.listen(0, '0.0.0.0', done));
    const egressPort = egressServer.address().port;
    const catalog = {
      taskId: 'repo-check',
      feature: 'extension',
      base: 'base-sha',
      sourceDigest: '1'.repeat(64),
      projectionManifestHash: '2'.repeat(64),
      policyHash: controlPlaneFingerprint(repositoryRoot),
      environmentHash: '4'.repeat(64),
      purpose: 'check-runner',
      profileHash: '5'.repeat(64),
      adapterId: 'jobtrack-docker-adapter-v1',
      imageDigest: DEFAULT_IMAGE.split('@sha256:')[1],
      cliHash: '7'.repeat(64),
      nodeHash: '8'.repeat(64),
      verifierImplementationHash: controlPlaneFingerprint(repositoryRoot),
      modelEndpoint: 'http://127.0.0.1:9/v1',
      generalEgressEndpoint: `http://${process.env.JT_EGRESS_HOST ?? '192.168.1.251'}:${egressPort}/general`,
      deniedHostPaths: {
        'host-repo-read': denied[0],
        'host-home-read': denied[1],
        'control-plane-root': denied[0],
        'common-git-read': `${denied[0]}/.git`,
        'control-state-read': `${repositoryRoot.replaceAll('\\', '/')}/tools`,
        'host-credential-read': credentialFile.replaceAll('\\', '/'),
        'projection-write': projection.replaceAll('\\', '/'),
        'host-write': denied[0]
      },
      mountSources: { projection: projection.replaceAll('\\', '/'), scratch: scratch.replaceAll('\\', '/') },
      dockerBinaryHash: dockerBinaryHash('docker'),
      probeProgramHash: probeProgramHash(repositoryRoot)
    };
    const adapter = createDockerAdapter({ repo: repositoryRoot, runRoot, image: DEFAULT_IMAGE, deniedPaths: denied });
    const issuer = createReadinessIssuer({
      catalog,
      key: 'k'.repeat(48),
      adapterRoot: repositoryRoot,
      evidenceRoot: join(runRoot, 'evidence'),
      contextDirectory: join(runRoot, 'context'),
      adapter,
      broker: { probe: async () => ({ connected: true }) }
    });
    const boundary = createExecutionBoundary({
      context: (state, request) => ({ ...catalog, taskId: state.id, purpose: request.purpose, projectionManifestHash: request.projectionManifestHash, sourceDigest: request.sourceDigest }),
      projection: { allowedRoot: resolve(runRoot), destinationFor: () => projection, scratchFor: () => scratch },
      adapter,
      issuer
    });
    outcome = await boundary.run({ worktree: repositoryRoot, id: 'repo-check' }, {
      purpose: 'check-runner',
      check: 'test:extension',
      files: [
        'packages/jobtrack-extension/extension.test.mjs',
        'packages/jobtrack-extension/manifest.json',
        'packages/jobtrack-extension/content.js',
        'packages/jobtrack-extension/options.js',
        'packages/jobtrack-extension/popup.js',
        'packages/jobtrack-extension/options.html',
        'packages/jobtrack-extension/popup.html',
        'packages/jobtrack-extension/README.md'
      ],
      sourceDigest: '1'.repeat(64),
      command: ['node', '--test', 'packages/jobtrack-extension/extension.test.mjs']
    });
  } finally {
    egressServer.closeAllConnections?.();
    egressServer.close();
    rmSync(runRoot, { recursive: true, force: true });
  }
  assert.equal(outcome.launched.status, 0, outcome.launched.stderr);
  const extensionTestSource = readFileSync(
    join(repositoryRoot, 'packages/jobtrack-extension/extension.test.mjs'),
    'utf8'
  );
  const expectedTestCount = (extensionTestSource.match(/^test\(/gm) ?? []).length;
  assert.ok(expectedTestCount >= 2, 'the extension suite must declare more than one test');
  const reportedTests = outcome.launched.stdout.match(/^\s*[ℹ#]\s*tests (\d+)/m);
  const reportedPassed = outcome.launched.stdout.match(/^\s*[ℹ#]\s*pass (\d+)/m);
  assert.ok(reportedTests, 'the check must report how many tests it ran');
  assert.ok(reportedPassed, 'the check must report how many tests passed');
  assert.equal(Number(reportedTests[1]), expectedTestCount, 'the check must run every declared extension test');
  assert.equal(Number(reportedPassed[1]), Number(reportedTests[1]), 'every extension check test must pass in the isolated profile');
  assert.match(outcome.launched.stdout, /^\s*[ℹ#]\s*fail 0$/m);
  assert.equal(outcome.receipt.derived.gateA, true);
});

test('a check resolves an installed dependency from an approved dependency root', { skip: dockerReachable ? false : 'Docker is not reachable in this environment' }, async () => {
  const runRoot = join('D:/Long-term', `jobtrack-boundary-deps-${Date.now()}`);
  const projection = join(runRoot, 'projection');
  const scratch = join(runRoot, 'scratch');
  const source = join(runRoot, 'source');
  const dependencyRoot = join(runRoot, 'deps');
  mkdirSync(join(projection, 'apps/web/src'), { recursive: true });
  mkdirSync(join(source, 'apps/web/src'), { recursive: true });
  mkdirSync(join(dependencyRoot, 'fixture-dep'), { recursive: true });
  mkdirSync(scratch, { recursive: true });
  writeFileSync(join(source, 'apps/web/src/module.cjs'), "const { value } = require('fixture-dep');\nprocess.stdout.write('DEP-' + value);\n");
  writeFileSync(join(dependencyRoot, 'fixture-dep', 'package.json'), JSON.stringify({ name: 'fixture-dep', version: '1.0.0', main: 'index.js' }, null, 2) + '\n');
  writeFileSync(join(dependencyRoot, 'fixture-dep', 'index.js'), "module.exports = { value: 'FROM-APPROVED-ROOT' };\n");
  const denied = [repositoryRoot, process.env.USERPROFILE ?? repositoryRoot].map(path => path.replaceAll('\\', '/'));
  const credentialFile = join(runRoot, 'accounts.txt');
  writeFileSync(credentialFile, 'fixture-only\n');
  const egressServer = createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end('{}');
  });
  let outcome = null;
  try {
    await new Promise(done => egressServer.listen(0, '0.0.0.0', done));
    const egressPort = egressServer.address().port;
    const catalog = {
      taskId: 'deps-check',
      feature: 'web',
      base: 'base-sha',
      sourceDigest: '1'.repeat(64),
      projectionManifestHash: '2'.repeat(64),
      policyHash: controlPlaneFingerprint(repositoryRoot),
      environmentHash: '4'.repeat(64),
      purpose: 'check-runner',
      profileHash: '5'.repeat(64),
      adapterId: 'jobtrack-docker-adapter-v1',
      imageDigest: DEFAULT_IMAGE.split('@sha256:')[1],
      cliHash: '7'.repeat(64),
      nodeHash: '8'.repeat(64),
      verifierImplementationHash: controlPlaneFingerprint(repositoryRoot),
      modelEndpoint: 'http://127.0.0.1:9/v1',
      generalEgressEndpoint: `http://${process.env.JT_EGRESS_HOST ?? '192.168.1.251'}:${egressPort}/general`,
      deniedHostPaths: {
        'host-repo-read': denied[0],
        'host-home-read': denied[1],
        'control-plane-root': denied[0],
        'common-git-read': `${denied[0]}/.git`,
        'control-state-read': `${repositoryRoot.replaceAll('\\', '/')}/tools`,
        'host-credential-read': credentialFile.replaceAll('\\', '/'),
        'projection-write': projection.replaceAll('\\', '/'),
        'host-write': denied[0]
      },
      mountSources: { projection: projection.replaceAll('\\', '/'), scratch: scratch.replaceAll('\\', '/') },
      dockerBinaryHash: dockerBinaryHash('docker'),
      probeProgramHash: probeProgramHash(repositoryRoot)
    };
    const adapter = createDockerAdapter({ repo: repositoryRoot, runRoot, image: DEFAULT_IMAGE, deniedPaths: denied });
    const issuer = createReadinessIssuer({
      catalog,
      key: 'k'.repeat(48),
      adapterRoot: repositoryRoot,
      evidenceRoot: join(runRoot, 'evidence'),
      contextDirectory: join(runRoot, 'context'),
      adapter,
      broker: { probe: async () => ({ connected: true }) }
    });
    const boundary = createExecutionBoundary({
      context: (state, request) => ({ ...catalog, taskId: state.id, purpose: request.purpose, projectionManifestHash: request.projectionManifestHash, sourceDigest: request.sourceDigest }),
      projection: {
        allowedRoot: resolve(runRoot),
        destinationFor: () => projection,
        scratchFor: () => scratch,
        dependencyRoots: [{ name: 'deps', path: dependencyRoot }]
      },
      adapter,
      issuer
    });
    outcome = await boundary.run({ worktree: source, id: 'deps-check' }, {
      purpose: 'check-runner',
      check: 'test:web',
      files: ['apps/web/src/module.cjs'],
      sourceDigest: '1'.repeat(64),
      command: ['node', 'apps/web/src/module.cjs']
    });
  } finally {
    egressServer.closeAllConnections?.();
    egressServer.close();
    rmSync(runRoot, { recursive: true, force: true });
  }
  assert.equal(outcome.launched.status, 0, outcome.launched.stderr);
  assert.match(outcome.launched.stdout, /DEP-FROM-APPROVED-ROOT/);
});

test('a receipt must match the binding, be unexpired and record a passing gate', () => {
  const binding = bindingFixture();
  const receipt = receiptFixture(binding);
  assert.equal(assertReceiptMatchesBinding(receipt, binding), receipt);
  assert.throws(() => assertReceiptMatchesBinding(receipt, bindingFixture({ taskId: 'other' })), /does not match the trusted binding: taskId/);
  assert.throws(() => assertReceiptMatchesBinding(receiptFixture(binding, { expiresAt: new Date(Date.now() - 1000).toISOString() }), binding), /has expired/);
  assert.throws(() => assertReceiptMatchesBinding(receiptFixture(binding, { derived: { gateA: false } }), binding), /does not record a passing gate/);
  assert.throws(() => assertReceiptMatchesBinding(null, binding), /receipt is missing/);
});

test('the boundary issues, verifies and launches in that order and creates the scratch', async () => {
  const { worktree, destination, scratch, root } = sourceFixture();
  const order = [];
  const boundary = createExecutionBoundary({
    context: (state, request) => bindingFixture({ purpose: request.purpose, projectionManifestHash: request.projectionManifestHash, sourceDigest: request.sourceDigest }),
    projection: { allowedRoot: root, destinationFor: () => destination, scratchFor: () => scratch },
    adapter: { launch: async () => { order.push('launch'); return { status: 0, stdout: 'ok', stderr: '' }; } },
    issuer: {
      issue: async input => { order.push('issue'); return { receipt: receiptFixture(bindingFixture({ taskId: input.taskId, sourceDigest: input.sourceDigest, projectionManifestHash: input.projectionManifestHash, purpose: input.purpose })) }; },
      verify: async receipt => { order.push('verify'); return { receipt }; }
    }
  });
  const outcome = await boundary.run({ worktree, id: 'web-one' }, { purpose: 'worker-read', files: ['apps/web/src/module.js'], sourceDigest: '1'.repeat(64) });
  assert.deepEqual(order, ['issue', 'verify', 'launch']);
  assert.equal(outcome.staged.manifest.length, 1);
  assert.equal(existsSync(scratch), true);
  assert.equal(outcome.binding.purpose, 'worker-read');
  assert.equal(outcome.binding.projectionManifestHash, outcome.staged.manifestHash);
});

test('the boundary propagates a launch failure and never falls back', async () => {
  const { worktree, destination, scratch, root } = sourceFixture();
  const boundary = createExecutionBoundary({
    context: () => bindingFixture(),
    projection: { allowedRoot: root, destinationFor: () => destination, scratchFor: () => scratch },
    adapter: { launch: async () => { throw Error('container refused the launch'); } },
    issuer: {
      issue: async input => ({ receipt: receiptFixture(bindingFixture({ taskId: input.taskId })) }),
      verify: async receipt => ({ receipt })
    }
  });
  await assert.rejects(() => boundary.run({ worktree, id: 'web-one' }, { purpose: 'worker-read', files: ['apps/web/src/module.js'], sourceDigest: '1'.repeat(64) }), /container refused the launch/);
});

test('the boundary refuses an issuer that produced no receipt', async () => {
  const { worktree, destination, scratch, root } = sourceFixture();
  const boundary = createExecutionBoundary({
    context: () => bindingFixture(),
    projection: { allowedRoot: root, destinationFor: () => destination, scratchFor: () => scratch },
    adapter: { launch: async () => ({ status: 0 }) },
    issuer: { issue: async () => ({ receipt: null, diagnostics: 'probe failed' }), verify: async receipt => ({ receipt }) }
  });
  await assert.rejects(() => boundary.run({ worktree, id: 'web-one' }, { purpose: 'worker-read', files: ['apps/web/src/module.js'], sourceDigest: '1'.repeat(64) }), /produced no readiness receipt/);
});

test('a fixed check runs against the staged projection and passes', { skip: dockerReachable ? false : 'Docker is not reachable in this environment' }, async () => {
  const runRoot = join('D:/Long-term', `jobtrack-boundary-check-${Date.now()}`);
  mkdirSync(runRoot, { recursive: true });
  const projection = join(runRoot, 'projection');
  const scratch = join(runRoot, 'scratch');
  const worktree = join(runRoot, 'worktree');
  mkdirSync(join(projection, 'apps/web/src'), { recursive: true });
  mkdirSync(join(worktree, 'apps/web/src'), { recursive: true });
  mkdirSync(scratch, { recursive: true });
  writeFileSync(join(projection, 'apps/web/src/module.js'), 'export const value = 1;\n');
  writeFileSync(join(worktree, 'apps/web/src/module.js'), 'export const value = 1;\n');
  const denied = [repositoryRoot, process.env.USERPROFILE ?? repositoryRoot].map(path => path.replaceAll('\\', '/'));
  const controlStatePath = existsSync(join(repositoryRoot, '.agent-state')) ? join(repositoryRoot, '.agent-state') : join(repositoryRoot, 'tools');
  const credentialFile = join(runRoot, 'accounts.txt');
  writeFileSync(credentialFile, 'fixture-only\n');
  const egressServer = createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end('{}');
  });
  await new Promise(resolve => egressServer.listen(0, '0.0.0.0', resolve));
  const egressPort = egressServer.address().port;
  const catalog = {
    taskId: 'web-one',
    feature: 'web',
    base: 'base-sha',
    sourceDigest: '1'.repeat(64),
    projectionManifestHash: '2'.repeat(64),
    policyHash: controlPlaneFingerprint(repositoryRoot),
    environmentHash: '4'.repeat(64),
    purpose: 'check-runner',
    profileHash: '5'.repeat(64),
    adapterId: 'jobtrack-docker-adapter-v1',
    imageDigest: DEFAULT_IMAGE.split('@sha256:')[1],
    cliHash: '7'.repeat(64),
    nodeHash: '8'.repeat(64),
    verifierImplementationHash: controlPlaneFingerprint(repositoryRoot),
    modelEndpoint: 'http://127.0.0.1:9/v1',
    generalEgressEndpoint: `http://${process.env.JT_EGRESS_HOST ?? '192.168.1.251'}:${egressPort}/general`,
    deniedHostPaths: {
      'host-repo-read': denied[0],
      'host-home-read': denied[1],
      'common-git-read': `${denied[0]}/.git`,
      'control-state-read': controlStatePath.replaceAll('\\', '/'),
      'host-credential-read': credentialFile.replaceAll('\\', '/'),
      'projection-write': projection.replaceAll('\\', '/'),
      'host-write': denied[0]
    },
    mountSources: { projection: projection.replaceAll('\\', '/'), scratch: scratch.replaceAll('\\', '/') },
    dockerBinaryHash: dockerBinaryHash('docker'),
    probeProgramHash: probeProgramHash(repositoryRoot)
  };
  const adapter = createDockerAdapter({ repo: repositoryRoot, runRoot, image: DEFAULT_IMAGE, deniedPaths: denied });
  const issuer = createReadinessIssuer({
    catalog,
    key: 'k'.repeat(48),
    adapterRoot: repositoryRoot,
    evidenceRoot: join(runRoot, 'evidence'),
    contextDirectory: join(runRoot, 'context'),
    adapter,
    broker: { probe: async () => ({ connected: true }) }
  });
  const boundary = createExecutionBoundary({
    context: (state, request) => ({ ...catalog, taskId: state.id, purpose: request.purpose, projectionManifestHash: request.projectionManifestHash, sourceDigest: request.sourceDigest }),
    projection: { allowedRoot: runRoot, destinationFor: () => projection, scratchFor: () => scratch },
    adapter,
    issuer
  });
  let outcome;
  try {
    outcome = await boundary.run({ worktree, id: 'web-one' }, {
      purpose: 'check-runner',
      files: ['apps/web/src/module.js'],
      sourceDigest: '1'.repeat(64),
      command: ['node', '-e', 'const fs = require("node:fs"); process.stdout.write(fs.existsSync("apps/web/src/module.js") ? "CANDIDATE-VISIBLE" : "CANDIDATE-MISSING");']
    });
  } finally {
    egressServer.close();
    rmSync(runRoot, { recursive: true, force: true });
  }
  assert.equal(outcome.launched.status, 0);
  assert.match(outcome.launched.stdout, /CANDIDATE-VISIBLE/);
  assert.equal(outcome.receipt.binding.purpose, 'check-runner');
});


test('the boundary completes a run against the real issuer and the real adapter in a real container', { skip: dockerReachable ? false : 'Docker is not reachable in this environment' }, async () => {
  const runRoot = join('D:/Long-term', `jobtrack-boundary-live-${Date.now()}`);
  mkdirSync(runRoot, { recursive: true });
  const projection = join(runRoot, 'projection');
  const scratch = join(runRoot, 'scratch');
  const worktree = join(runRoot, 'worktree');
  mkdirSync(join(projection, 'apps/web/src'), { recursive: true });
  mkdirSync(join(worktree, 'apps/web/src'), { recursive: true });
  mkdirSync(scratch, { recursive: true });
  writeFileSync(join(projection, 'apps/web/src/module.js'), 'export const value = 1;\n');
  writeFileSync(join(worktree, 'apps/web/src/module.js'), 'export const value = 1;\n');
  const denied = [repositoryRoot, process.env.USERPROFILE ?? repositoryRoot].map(path => path.replaceAll('\\', '/'));
  const controlStatePath = existsSync(join(repositoryRoot, '.agent-state')) ? join(repositoryRoot, '.agent-state') : join(repositoryRoot, 'tools');
  const credentialFile = join(runRoot, 'accounts.txt');
  writeFileSync(credentialFile, 'fixture-only\n');
  const egressServer = createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end('{}');
  });
  await new Promise(resolve => egressServer.listen(0, '0.0.0.0', resolve));
  const egressPort = egressServer.address().port;
  const catalog = {
    taskId: 'web-one',
    feature: 'web',
    base: 'base-sha',
    sourceDigest: '1'.repeat(64),
    projectionManifestHash: '2'.repeat(64),
    policyHash: controlPlaneFingerprint(repositoryRoot),
    environmentHash: '4'.repeat(64),
    purpose: 'worker-read',
    profileHash: '5'.repeat(64),
    adapterId: 'jobtrack-docker-adapter-v1',
    imageDigest: DEFAULT_IMAGE.split('@sha256:')[1],
    cliHash: '7'.repeat(64),
    nodeHash: '8'.repeat(64),
    verifierImplementationHash: controlPlaneFingerprint(repositoryRoot),
    modelEndpoint: 'http://127.0.0.1:9/v1',
    generalEgressEndpoint: `http://${process.env.JT_EGRESS_HOST ?? '192.168.1.251'}:${egressPort}/general`,
    deniedHostPaths: {
      'host-repo-read': denied[0],
      'host-home-read': denied[1],
      'common-git-read': `${denied[0]}/.git`,
      'control-state-read': controlStatePath.replaceAll('\\', '/'),
      'host-credential-read': credentialFile.replaceAll('\\', '/'),
      'projection-write': projection.replaceAll('\\', '/'),
      'host-write': denied[0]
    },
    mountSources: { projection: projection.replaceAll('\\', '/'), scratch: scratch.replaceAll('\\', '/') },
    dockerBinaryHash: dockerBinaryHash('docker'),
    probeProgramHash: probeProgramHash(repositoryRoot)
  };
  const adapter = createDockerAdapter({ repo: repositoryRoot, runRoot, image: DEFAULT_IMAGE, deniedPaths: denied });
  const issuer = createReadinessIssuer({
    catalog,
    key: 'k'.repeat(48),
    adapterRoot: repositoryRoot,
    evidenceRoot: join(runRoot, 'evidence'),
    contextDirectory: join(runRoot, 'context'),
    adapter,
    broker: { probe: async () => ({ connected: true }) }
  });
  const boundary = createExecutionBoundary({
    context: (state, request) => ({ ...catalog, taskId: state.id, purpose: request.purpose, projectionManifestHash: request.projectionManifestHash, sourceDigest: request.sourceDigest }),
    projection: { allowedRoot: runRoot, destinationFor: () => projection, scratchFor: () => scratch },
    adapter,
    issuer
  });
  let outcome;
  try {
    outcome = await boundary.run({ worktree, id: 'web-one' }, {
      purpose: 'worker-read',
      files: ['apps/web/src/module.js'],
      sourceDigest: '1'.repeat(64),
      instruction: 'hello from the boundary',
      command: ['node', '-e', 'process.stdin.on("data", chunk => { process.stdout.write("GOT:" + chunk.toString().trim()); process.exit(0); });']
    });
  } finally {
    egressServer.close();
    rmSync(runRoot, { recursive: true, force: true });
  }
  assert.equal(outcome.launched.status, 0);
  assert.match(outcome.launched.stdout, /GOT:hello from the boundary/);
  assert.equal(outcome.receipt.derived.gateA, true);
  assert.equal(outcome.receipt.binding.taskId, 'web-one');
  assert.equal(outcome.receipt.binding.purpose, 'worker-read');
});
