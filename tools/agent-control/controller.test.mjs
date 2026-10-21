import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { AgentController } from './controller.mjs';
import { signReadinessReceipt } from './readiness.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const readinessKey = 'k'.repeat(48);
process.env.READINESS_KEY = readinessKey;
const task = (id = 'web-one', feature = 'web') => ({ id, feature, objective: 'Add an isolated source module.', acceptance: ['Module exists in its feature checkout.'], checks: [feature === 'web' ? 'test:web' : 'build:api'], dependencies: [] });
function write(root, path, text) { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); }
function git(root, args) {
  const result = spawnSync('rtk', ['proxy', 'git', '-c', `safe.directory=${root.replaceAll('\\', '/')}`, '-c', 'core.autocrlf=false', ...args], { cwd: root, shell: false, windowsHide: true, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
function readyReceipt(controller, state, overrides = {}) {
  const payload = {
    schemaVersion: 1,
    issuedAt: new Date(Date.now() - 60_000).toISOString(),
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    taskId: state.id,
    feature: state.feature,
    policyHash: controller.fingerprint(),
    environmentFingerprint: controller.environmentFingerprint(),
    projectionManifestHash: null,
    targets: [{ path: 'readiness/evidence.json', sha256: digest('evidence') }],
    isolation: {
      readIsolation: 'denied',
      writeIsolation: 'denied',
      egress: 'denied-with-positive-control',
      childCleanup: 'verified'
    },
    sandboxProbePass: true,
    evidence: { canaryReportHash: digest('report'), capturedAt: new Date().toISOString(), verifier: 'fixture-verifier' },
    ...overrides
  };
  return signReadinessReceipt(payload, readinessKey);
}
function setup(adapters = {}) {
  const root = mkdtempSync(join(tmpdir(), 'jobtrack-agents-test-'));
  write(root, '.gitignore', '.agent-state/\n.worktrees/\n');
  write(root, 'package.json', '{}\n');
  write(root, 'tools/agent-control/test-config.json', '{}\n');
  write(root, 'apps/web/src/existing.js', 'export const version = 1;\n');
  write(root, 'apps/api/src/existing.js', 'export const version = 1;\n');
  write(root, '.agent-state/readiness/evidence.json', 'evidence');
  git(root, ['init', '-b', 'main']);
  git(root, ['config', 'user.name', 'Agent Fixture']);
  git(root, ['config', 'user.email', 'agent-fixture@example.test']);
  git(root, ['add', '--', '.gitignore', 'package.json', 'tools', 'apps']);
  git(root, ['commit', '-m', 'fixture baseline']);
  const controller = new AgentController(root, adapters);
  const provided = adapters.readiness;
  controller.adapters.readiness = provided ?? (async state => readyReceipt(controller, state));
  return controller;
}
const okCheck = async () => ({ code: 0, timedOut: false, output: 'passed', error: '' });
const response = (verdict, changes = [], prompt = '') => ({ verdict, changes, prompt, summary: 'fixture result' });

test('sandbox probes use the executable supplied by the running Codex app', async () => {
  const executable = join(mkdtempSync(join(tmpdir(), 'jobtrack-codex-path-')), 'codex.exe');
  writeFileSync(executable, 'fixture executable is never run');
  const previous = process.env.CODEX_CLI_PATH;
  let c;
  try {
    process.env.CODEX_CLI_PATH = executable;
    c = setup();
  } finally {
    if (previous === undefined) delete process.env.CODEX_CLI_PATH;
    else process.env.CODEX_CLI_PATH = previous;
  }
  const requested = [];
  c.execute = async (command, args) => {
    requested.push({ command, args });
    return { code: 0, timedOut: false, output: 'fixture version', error: '' };
  };
  await c.sandboxProbe();
  assert.equal(requested.length, 1);
  assert.equal(requested[0].command, executable);
  assert.deepEqual(requested[0].args.slice(0, 3), ['sandbox', '--permission-profile', ':read-only']);
});

test('an explicit invalid Codex executable fails closed instead of using PATH', () => {
  const previous = process.env.CODEX_CLI_PATH;
  try {
    for (const configured of ['relative-codex', 'codex', join(tmpdir(), 'missing-codex-runtime', 'codex.exe')]) {
      process.env.CODEX_CLI_PATH = configured;
      assert.throws(() => setup(), /absolute Codex executable/);
    }
  } finally {
    if (previous === undefined) delete process.env.CODEX_CLI_PATH;
    else process.env.CODEX_CLI_PATH = previous;
  }
});

test('a missing readiness receipt blocks the run before any model is invoked', async () => {
  const roles = [];
  const c = setup({ readiness: async () => null, worker: async role => { roles.push(role); return response('plan'); } });
  const result = await c.run(task());
  assert.equal(result.status, 'blocked-readiness');
  assert.match(result.error, /Readiness receipt is missing/);
  assert.deepEqual(roles, []);
  assert.equal(existsSync(join(c.root, 'apps/web/src/new.js')), false);
});

test('an expired readiness receipt blocks the run before any model is invoked', async () => {
  const roles = [];
  const c = setup({ worker: async role => { roles.push(role); return response('plan'); } });
  c.adapters.readiness = async state => readyReceipt(c, state, { expiresAt: new Date(Date.now() - 1000).toISOString() });
  const result = await c.run(task());
  assert.equal(result.status, 'blocked-readiness');
  assert.match(result.error, /expired/);
  assert.deepEqual(roles, []);
});

test('a readiness receipt for another control plane is blocked', async () => {
  const roles = [];
  const c = setup({ worker: async role => { roles.push(role); return response('plan'); } });
  c.adapters.readiness = async state => readyReceipt(c, state, { policyHash: digest('other-control-plane') });
  const result = await c.run(task());
  assert.equal(result.status, 'blocked-readiness');
  assert.match(result.error, /control plane/);
  assert.deepEqual(roles, []);
});

test('a receipt that only proves a sandbox probe is blocked', async () => {
  const roles = [];
  const c = setup({ worker: async role => { roles.push(role); return response('plan'); } });
  c.adapters.readiness = async state => readyReceipt(c, state, {
    isolation: { readIsolation: 'not-verified', writeIsolation: 'not-verified', egress: 'not-verified', childCleanup: 'not-verified' }
  });
  const result = await c.run(task());
  assert.equal(result.status, 'blocked-readiness');
  assert.match(result.error, /readIsolation/);
  assert.deepEqual(roles, []);
});

test('a missing signing key is refused instead of skipping the gate', async () => {
  const previous = process.env.READINESS_KEY;
  delete process.env.READINESS_KEY;
  try {
    const roles = [];
    const c = setup({ worker: async role => { roles.push(role); return response('plan'); } });
    const result = await c.run(task());
    assert.equal(result.status, 'blocked-readiness');
    assert.match(result.error, /at least 32 characters/);
    assert.deepEqual(roles, []);
  } finally {
    process.env.READINESS_KEY = previous;
  }
});

test('the readiness gate is verified before the planner role runs', async () => {
  const order = [];
  const c = setup({ check: okCheck, worker: async role => { order.push(`worker:${role}`); return response(role === 'coder' ? 'changes' : role === 'reviewer' ? 'pass' : 'plan', role === 'coder' ? [{ path: 'apps/web/src/new.js', beforeSha256: null, content: 'export const value = 2;\n' }] : [], 'Implement the isolated module.'); } });
  c.adapters.readiness = async state => { order.push('readiness'); return readyReceipt(c, state); };
  const result = await c.run(task());
  assert.equal(result.status, 'committed', result.error);
  assert.equal(order[0], 'readiness');
  assert.equal(order.at(-1), 'worker:reviewer');
  for (const [index, event] of order.entries()) if (event.startsWith('worker:')) assert.equal(order[index - 1], 'readiness');
});

test('child execution never inherits the controller signing key', async () => {
  const c = setup();
  const result = await c.execute(process.execPath, ['-e', 'process.stdout.write(String(Object.hasOwn(process.env,"READINESS_KEY")))'], c.root);
  assert.equal(result.code, 0, result.error);
  assert.equal(result.output, 'false');
});

test('direct worker calls require readiness before reading source or invoking a worker', async () => {
  let calls = 0;
  const c = setup({ readiness: async () => null, worker: async () => { calls++; return response('plan'); } });
  const state = c.prepare(task());
  await assert.rejects(() => c.role('planner', state, 'Inspect source'), /Readiness receipt is missing/);
  assert.equal(calls, 0);
});

test('revoking readiness after the planner prevents the coder call', async () => {
  const calls = [];
  const c = setup({ worker: async role => { calls.push(role); c.adapters.readiness = async () => null; return response('plan'); } });
  const result = await c.run(task());
  assert.equal(result.status, 'blocked-readiness');
  assert.deepEqual(calls, ['planner']);
});

test('manual checks require readiness before executing changed source', async () => {
  let calls = 0;
  const c = setup({ readiness: async () => null, check: async () => { calls++; return okCheck(); } });
  const state = c.prepare(task());
  c.apply(state.id, [{ path: 'apps/web/src/new.js', beforeSha256: null, content: 'export {};' }]);
  await assert.rejects(() => c.check(state.id), /Readiness receipt is missing/);
  assert.equal(calls, 0);
});

test('readiness is verified independently before each fixed check', async () => {
  let calls = 0;
  const c = setup({ check: async () => { calls++; c.adapters.readiness = async () => null; return okCheck(); } });
  const state = c.prepare({ ...task(), checks: ['test:web', 'build:web'] });
  c.apply(state.id, [{ path: 'apps/web/src/new.js', beforeSha256: null, content: 'export {};' }]);
  await assert.rejects(() => c.check(state.id), /Readiness receipt is missing/);
  assert.equal(calls, 1);
});

test('doctor semantics separate probe, isolation and live worker evidence', async () => {
  const c = setup({ check: okCheck, worker: async role => response(role === 'coder' ? 'changes' : role === 'reviewer' ? 'pass' : 'plan', role === 'coder' ? [{ path: 'apps/web/src/new.js', beforeSha256: null, content: 'export const value = 2;\n' }] : [], 'Implement the isolated module.') });
  assert.equal(c.isolationReady(), false);
  assert.equal(c.liveWorkerRunVerified(), false);
  const receipt = readyReceipt(c, { id: 'web-one', feature: 'web' });
  const receiptPath = join(c.stateDir, 'readiness', 'web-one.json');
  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
  c.adapters.readiness = async () => JSON.parse(readFileSync(receiptPath, 'utf8'));
  const result = await c.run(task());
  assert.equal(result.status, 'committed', result.error);
  assert.equal(c.liveWorkerRunVerified(), true);
  assert.equal(c.isolationReady(), true);
});

test('reconcile records a commit that reached main after the task was abandoned', () => {
  const c = setup();
  const s = c.prepare(task());
  c.abandon(s.id);
  git(s.worktree, ['commit', '--allow-empty', '-m', 'feature work']);
  git(c.root, ['merge', '--ff-only', s.branch]);
  const reconciled = c.reconcile(s.id);
  assert.equal(reconciled.branchCommits.length, 1);
  assert.equal(reconciled.integratedCommit.length, 40);
  const status = c.status().find(entry => entry.id === s.id);
  assert.equal(status.commit, reconciled.integratedCommit);
  assert.equal(c.git(c.root, ['branch', '--show-current']), 'main');
  assert.equal(existsSync(s.worktree), true);
});

test('reconcile leaves an unintegrated branch without a commit', () => {
  const c = setup();
  const s = c.prepare(task());
  c.abandon(s.id);
  git(s.worktree, ['commit', '--allow-empty', '-m', 'feature work']);
  const reconciled = c.reconcile(s.id);
  assert.equal(reconciled.branchCommits.length, 1);
  assert.equal(reconciled.integratedCommit, null);
  const status = c.status().find(entry => entry.id === s.id);
  assert.equal(status.commit, null);
});

test('reconcile works after the task worktree was removed', () => {
  const c = setup();
  const s = c.prepare(task());
  git(s.worktree, ['commit', '--allow-empty', '-m', 'feature work']);
  git(c.root, ['merge', '--ff-only', s.branch]);
  c.abandon(s.id);
  rmSync(s.worktree, { recursive: true, force: true });
  const reconciled = c.reconcile(s.id);
  assert.equal(reconciled.integratedCommit.length, 40);
  const status = c.status().find(entry => entry.id === s.id);
  assert.equal(status.commit, reconciled.integratedCommit);
});

test('prepare creates an isolated branch and rejects duplicate feature ownership', () => {
  const c = setup();
  const s = c.prepare(task());
  assert.equal(c.git(s.worktree, ['branch', '--show-current']), 'feature/web/web-one');
  assert.throws(() => c.prepare(task('web-two')), /already owned/);
  assert.throws(() => c.prepare(task()), /already exists/);
  assert.equal(c.git(c.root, ['branch', '--show-current']), 'main');
});

test('broker rejects an entire batch before writing if a path or baseline is invalid', () => {
  const c = setup();
  const s = c.prepare(task());
  const valid = { path: 'apps/web/src/new.js', beforeSha256: null, content: 'export const value = 2;\n' };
  assert.throws(() => c.apply(s.id, [valid, { path: 'apps/api/src/other.js', beforeSha256: null, content: 'export {};' }]), /ownership/);
  assert.equal(existsSync(join(s.worktree, valid.path)), false);
  assert.throws(() => c.apply(s.id, [{ path: 'apps/web/src/existing.js', beforeSha256: '0'.repeat(64), content: 'export {};' }]), /[Hh]ash|[Ss]tale|[Bb]aseline/);
});

test('bounded worker loop applies, checks, independently reviews and commits only feature files', async () => {
  const roles = [];
  const c = setup({ check: okCheck, worker: async role => {
    roles.push(role);
    if (role === 'coder') return response('changes', [{ path: 'apps/web/src/new.js', beforeSha256: null, content: 'export const value = 2;\n' }]);
    return response(role === 'reviewer' ? 'pass' : 'plan', [], 'Implement the isolated module.');
  }});
  const result = await c.run(task());
  assert.equal(result.status, 'committed', result.error);
  assert.deepEqual(roles, ['planner', 'coder', 'reviewer']);
  assert.equal(existsSync(join(c.root, 'apps/web/src/new.js')), false);
  assert.match(result.commit, /^[a-f0-9]{40}$/);
  assert.equal(c.git(result.worktree, ['show', '--format=', '--name-only', result.commit]), 'apps/web/src/new.js');
});

test('manual checks cannot authorize a commit without independent review', async () => {
  const c = setup({ check: okCheck });
  const s = c.prepare(task());
  c.apply(s.id, [{ path: 'apps/web/src/new.js', beforeSha256: null, content: 'export {};' }]);
  await c.check(s.id);
  assert.throws(() => c.commit(s.id), /reviewer/);
});

test('the same failing check stops after two coding attempts', async () => {
  let c;
  c = setup({ check: async () => ({ code: 1, timedOut: false, output: 'FAIL stable fixture', error: '' }), worker: async (role, state) => {
    if (role === 'coder') {
      const path = 'apps/web/src/existing.js';
      const text = readFileSync(join(state.worktree, path));
      return response('changes', [{ path, beforeSha256: digest(text), content: `export const version = ${state.attempts + 1};\n` }]);
    }
    return response(role === 'reflector' ? 'repair' : 'plan', [], 'Repair the fixture.');
  }});
  const result = await c.run(task());
  assert.equal(result.status, 'blocked-stalled');
  assert.equal(result.attempts, 2);
  assert.equal(result.commit, undefined);
});

test('a source change during review invalidates checked evidence', async () => {
  const c = setup({ check: okCheck, worker: async (role, state) => {
    if (role === 'coder') return response('changes', [{ path: 'apps/web/src/new.js', beforeSha256: null, content: 'export const value = 1;' }]);
    if (role === 'reviewer') { write(state.worktree, 'apps/web/src/new.js', 'export const value = 2;'); return response('pass'); }
    return response('plan');
  }});
  const result = await c.run(task());
  assert.equal(result.status, 'blocked');
  assert.match(result.error, /during review/);
  assert.equal(result.commit, undefined);
});

test('changes to protected check scripts prevent checks and commit', async () => {
  const c = setup({ check: okCheck });
  const s = c.prepare(task());
  write(s.worktree, 'package.json', '{"scripts":{"test:web":"echo fake"}}');
  await assert.rejects(() => c.check(s.id), /Protected check/);
});

test('committed dependency must be integrated into the controller base first', async () => {
  const c = setup({ check: okCheck, worker: async role => role === 'coder' ? response('changes', [{ path: 'apps/web/src/new.js', beforeSha256: null, content: 'export {};' }]) : response(role === 'reviewer' ? 'pass' : 'plan') });
  await c.run(task());
  const dependent = task('api-one', 'api');
  dependent.dependencies = ['web-one'];
  assert.throws(() => c.prepare(dependent), /needs maintainer integration/);
});

test('abandoned tasks cannot write or check after another owner receives the lane', async () => {
  const c = setup({ check: okCheck });
  const old = c.prepare(task());
  c.abandon(old.id);
  c.prepare(task('web-two'));
  assert.throws(() => c.apply(old.id, [{ path: 'apps/web/src/new.js', beforeSha256: null, content: 'export {};' }]), /Terminal/);
  await assert.rejects(() => c.check(old.id), /Terminal/);
  assert.throws(() => c.commit(old.id), /Terminal/);
});

test('manual source edits cannot bypass the proposal policy', async () => {
  const c = setup({ check: okCheck });
  const s = c.prepare(task());
  c.apply(s.id, [{ path: 'apps/web/src/new.js', beforeSha256: null, content: 'export {};' }]);
  write(s.worktree, 'apps/web/src/new.js', 'export const unreviewed = true;');
  await assert.rejects(() => c.check(s.id), /Unbrokered/);
  assert.throws(() => c.commit(s.id), /Unbrokered/);
});
