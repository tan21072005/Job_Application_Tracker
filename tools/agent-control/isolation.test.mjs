import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ISOLATION_CAPABILITY_SPEC,
  ISOLATION_OPERATIONS,
  assertIsolationOperation,
  assertIsolationReady,
  createFakeIsolationAdapter,
  evaluateIsolationProbe
} from './isolation.mjs';

const probeWith = overrides => ({
  environmentFingerprint: 'fixture-environment-fingerprint',
  results: ISOLATION_CAPABILITY_SPEC.targets.map(target => ({
    id: target.id,
    actual: overrides[target.id] ?? target.expectation
  }))
});

test('the capability spec covers every isolation target group', () => {
  const ids = ISOLATION_CAPABILITY_SPEC.targets.map(target => target.id);
  for (const required of ['host-repo', 'host-credentials', 'common-git', 'sibling-worktree', 'control-state', 'home-credential-store', 'path-traversal', 'projection-read', 'projection-write', 'scratch-write', 'host-write', 'egress-allowlist', 'egress-general']) {
    assert.ok(ids.includes(required), required);
  }
  for (const target of ISOLATION_CAPABILITY_SPEC.targets) {
    assert.ok(['denied', 'allowed'].includes(target.expectation), target.id);
    assert.ok(['read', 'write', 'network'].includes(target.kind), target.id);
    assert.ok(target.description, target.id);
  }
});

test('a complete probe is ready', () => {
  const verdict = evaluateIsolationProbe(probeWith({}));
  assert.equal(verdict.ready, true);
  assert.deepEqual(verdict.failures, []);
  assert.equal(verdict.environmentFingerprint, 'fixture-environment-fingerprint');
});

test('a missing target is not ready', () => {
  const probe = probeWith({});
  probe.results = probe.results.filter(result => result.id !== 'common-git');
  const verdict = evaluateIsolationProbe(probe);
  assert.equal(verdict.ready, false);
  assert.match(verdict.failures.join(' '), /common-git: no evidence/);
});

test('a target with the wrong outcome is not ready', () => {
  const verdict = evaluateIsolationProbe(probeWith({ 'host-repo': 'allowed' }));
  assert.equal(verdict.ready, false);
  assert.match(verdict.failures.join(' '), /host-repo: expected denied, observed allowed/);
});

test('general egress must be denied', () => {
  const verdict = evaluateIsolationProbe(probeWith({ 'egress-general': 'allowed' }));
  assert.equal(verdict.ready, false);
  assert.match(verdict.failures.join(' '), /egress-general/);
});

test('egress needs a positive control', () => {
  const verdict = evaluateIsolationProbe(probeWith({ 'egress-allowlist': 'denied' }));
  assert.equal(verdict.ready, false);
  assert.match(verdict.failures.join(' '), /egress positive control is missing/);
});

test('a probe without an environment fingerprint is refused', () => {
  const probe = probeWith({});
  delete probe.environmentFingerprint;
  assert.throws(() => evaluateIsolationProbe(probe), /environment fingerprint/);
});

test('a probe without results is refused', () => {
  assert.throws(() => evaluateIsolationProbe({ environmentFingerprint: 'x' }), /no results/);
  assert.throws(() => evaluateIsolationProbe(null), /missing/);
});

test('a probe that reports a target twice is refused', () => {
  const probe = probeWith({});
  probe.results.push({ id: 'host-repo', actual: 'denied' });
  assert.throws(() => evaluateIsolationProbe(probe), /twice/);
});

test('assertIsolationReady reports every failure', () => {
  assert.throws(() => assertIsolationReady(probeWith({ 'host-repo': 'allowed', 'control-state': 'allowed' })), /host-repo.*control-state/s);
});

test('the fake adapter satisfies the spec and can be broken per target', async () => {
  const adapter = createFakeIsolationAdapter();
  const verdict = evaluateIsolationProbe(await adapter.probe());
  assert.equal(verdict.ready, true);
  const broken = createFakeIsolationAdapter({ 'sibling-worktree': 'allowed' });
  const brokenVerdict = evaluateIsolationProbe(await broken.probe());
  assert.equal(brokenVerdict.ready, false);
  assert.match(brokenVerdict.failures.join(' '), /sibling-worktree/);
});

test('the fake adapter only accepts catalogued operations', async () => {
  const adapter = createFakeIsolationAdapter();
  const launched = await adapter.launch('coder', { projectionRoot: 'C:/projection' });
  const result = await launched.execute('read-file', ['apps/web/src/module.js']);
  assert.equal(result.code, 0);
  assert.match(result.output, /read-file/);
  await assert.rejects(() => launched.execute('run-shell', ['whoami']), /not in the catalog/);
  await assert.rejects(() => launched.execute('read-file', []), /do not match the catalog/);
  await assert.rejects(() => launched.execute('read-file', ['a', 'b']), /do not match the catalog/);
  await assert.rejects(() => launched.execute('read-file', [42]), /argument path is invalid/);
});

test('the fake adapter refuses a launch without a role or projection root', async () => {
  const adapter = createFakeIsolationAdapter();
  await assert.rejects(() => adapter.launch('', { projectionRoot: 'C:/projection' }), /needs a role/);
  await assert.rejects(() => adapter.launch('coder', {}), /needs a projection root/);
});

test('the operation catalog is fixed', () => {
  assert.deepEqual(Object.keys(ISOLATION_OPERATIONS).sort(), ['diff', 'list-directory', 'read-file', 'search-text']);
  assert.deepEqual(assertIsolationOperation('search-text', ['needle']), { operation: 'search-text', args: ['needle'] });
});
