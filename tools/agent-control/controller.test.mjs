import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { AgentController } from './controller.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const task = (id = 'web-one', feature = 'web') => ({ id, feature, objective: 'Add an isolated source module.', acceptance: ['Module exists in its feature checkout.'], checks: [feature === 'web' ? 'test:web' : 'build:api'], dependencies: [] });
function write(root, path, text) { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); }
function git(root, args) {
  const result = spawnSync('rtk', ['proxy', 'git', '-c', `safe.directory=${root.replaceAll('\\', '/')}`, '-c', 'core.autocrlf=false', ...args], { cwd: root, shell: false, windowsHide: true, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
function setup(adapters = {}) {
  const root = mkdtempSync(join(tmpdir(), 'jobtrack-agents-test-'));
  write(root, '.gitignore', '.agent-state/\n.worktrees/\n');
  write(root, 'package.json', '{}\n');
  write(root, 'tools/agent-control/test-config.json', '{}\n');
  write(root, 'apps/web/src/existing.js', 'export const version = 1;\n');
  write(root, 'apps/api/src/existing.js', 'export const version = 1;\n');
  git(root, ['init', '-b', 'main']);
  git(root, ['config', 'user.name', 'Agent Fixture']);
  git(root, ['config', 'user.email', 'agent-fixture@example.test']);
  git(root, ['add', '--', '.gitignore', 'package.json', 'tools', 'apps']);
  git(root, ['commit', '-m', 'fixture baseline']);
  return new AgentController(root, adapters);
}
const okCheck = async () => ({ code: 0, timedOut: false, output: 'passed', error: '' });
const response = (verdict, changes = [], prompt = '') => ({ verdict, changes, prompt, summary: 'fixture result' });

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
