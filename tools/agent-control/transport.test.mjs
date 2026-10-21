import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertAllowlistedEndpoint, assertTransportRootInsideScratch, createTransportBroker } from './transport.mjs';

const allowlist = [
  { kind: 'https-endpoint', host: 'model-endpoint.invalid', port: 443, path: '/v1' },
  { kind: 'local-transport', host: '127.0.0.1', port: 8099 }
];

function scratchFixture() {
  const root = mkdtempSync(join(tmpdir(), 'jobtrack-transport-'));
  mkdirSync(join(root, 'scratch'), { recursive: true });
  return { root, scratch: join(root, 'scratch') };
}

test('only an allowlisted endpoint is accepted', () => {
  const resolved = assertAllowlistedEndpoint('https://model-endpoint.invalid/v1/chat', allowlist);
  assert.equal(resolved.host, 'model-endpoint.invalid');
  assert.equal(resolved.port, 443);
  assert.equal(resolved.kind, 'https-endpoint');
  assert.equal(resolved.path, '/v1/chat');
  assert.equal(assertAllowlistedEndpoint('http://127.0.0.1:8099/transport', allowlist).kind, 'local-transport');
  for (const endpoint of ['https://other.invalid/v1', 'https://model-endpoint.invalid:8443/v1', 'http://model-endpoint.invalid/v1', 'https://model-endpoint.invalid/other']) {
    assert.throws(() => assertAllowlistedEndpoint(endpoint, allowlist), /allowlist|https/, endpoint);
  }
});

test('an endpoint with credentials, a query or whitespace is refused', () => {
  for (const endpoint of ['https://user:pass@model-endpoint.invalid/v1', 'https://model-endpoint.invalid/v1?x=1', 'https://model endpoint.invalid/v1', 'not a url']) {
    assert.throws(() => assertAllowlistedEndpoint(endpoint, allowlist), /Transport endpoint/, endpoint);
  }
});

test('the transport root must be a dedicated directory inside the scratch', () => {
  const { scratch } = scratchFixture();
  assert.equal(assertTransportRootInsideScratch(join(scratch, 'transport'), scratch), join(scratch, 'transport'));
  assert.throws(() => assertTransportRootInsideScratch(join(scratch, '..', 'other'), scratch), /inside the container scratch/);
  assert.throws(() => assertTransportRootInsideScratch(scratch, scratch), /dedicated subdirectory/);
  assert.throws(() => assertTransportRootInsideScratch(join(tmpdir(), 'elsewhere'), scratch), /inside the container scratch/);
});

test('the broker round trip travels over the scratch channel and never trusts a worker supplied target', async () => {
  const { scratch } = scratchFixture();
  const broker = createTransportBroker({ allowlist, endpoint: 'https://model-endpoint.invalid/v1/chat', pollMs: 10, timeoutMs: 5000 });
  const request = broker.request({ scratchRoot: scratch, runId: 'run-1', role: 'planner', prompt: 'plan the module' });
  await new Promise(done => setTimeout(done, 50));
  const runDirectory = join(scratch, 'transport', 'transport', 'run-1');
  assert.equal(existsSync(join(runDirectory, 'request.json')), true);
  const written = JSON.parse(readFileSync(join(runDirectory, 'request.json'), 'utf8'));
  assert.equal(written.endpoint, 'https://model-endpoint.invalid/v1/chat');
  assert.equal(written.role, 'planner');
  writeFileSync(join(runDirectory, 'response.json'), JSON.stringify({ verdict: 'plan', prompt: 'do it' }));
  const result = await request;
  assert.equal(result.response.verdict, 'plan');
  assert.equal(result.request.requestHash.length, 64);
  assert.equal(existsSync(join(runDirectory, 'response.json')), false);
});

test('the broker refuses a request without a scratch root and times out without a response', async () => {
  const { scratch } = scratchFixture();
  const broker = createTransportBroker({ allowlist, endpoint: 'https://model-endpoint.invalid/v1/chat', pollMs: 10, timeoutMs: 120 });
  await assert.rejects(() => broker.request({ runId: 'run-2' }), /scratch root/);
  await assert.rejects(() => broker.request({ scratchRoot: scratch, runId: 'run-3' }), /timed out/);
});

test('the broker probe reports the host positive control for the allowlisted endpoint', async () => {
  const connected = createTransportBroker({ allowlist, endpoint: 'https://model-endpoint.invalid/v1/chat', connect: async () => ({ connected: true }) });
  const probe = await connected.probe();
  assert.equal(probe.connected, true);
  assert.equal(probe.host, 'model-endpoint.invalid');
  const offline = createTransportBroker({ allowlist, endpoint: 'https://model-endpoint.invalid/v1/chat', connect: async () => ({ connected: false, code: 'ECONNREFUSED' }) });
  const failed = await offline.probe();
  assert.equal(failed.connected, false);
  assert.equal(failed.code, 'ECONNREFUSED');
  const none = createTransportBroker({ allowlist });
  assert.equal((await none.probe()).connected, false);
});

test('a broker with an endpoint outside the allowlist refuses to start a request', async () => {
  const { scratch } = scratchFixture();
  const broker = createTransportBroker({ allowlist, endpoint: 'https://not-allowed.invalid/v1', pollMs: 10, timeoutMs: 200 });
  await assert.rejects(() => broker.request({ scratchRoot: scratch, runId: 'run-4' }), /allowlist/);
});
