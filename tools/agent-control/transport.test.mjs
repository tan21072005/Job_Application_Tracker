import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertAllowlistedEndpoint, assertRunId, assertTransportRootInsideScratch, createTransportBroker, normalizeEndpointPath } from './transport.mjs';

const allowlist = [
  { kind: 'https-endpoint', host: 'model-endpoint.invalid', port: 443, path: '/v1' },
  { kind: 'local-transport', host: '127.0.0.1', port: 8099 }
];
const secret = 's'.repeat(48);
const runId = '3f6b1c2a-9d4e-4a7b-8c5d-1e2f3a4b5c6d';

function scratchFixture() {
  const root = mkdtempSync(join(tmpdir(), 'jobtrack-transport-'));
  mkdirSync(join(root, 'scratch'), { recursive: true });
  return { root, scratch: join(root, 'scratch') };
}

const sign = payload => createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');

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

test('the endpoint path cannot escape the allowlist path', () => {
  assert.equal(normalizeEndpointPath('/v1/../admin'), '/admin');
  assert.throws(() => assertAllowlistedEndpoint('https://model-endpoint.invalid/v1/../admin', allowlist), /outside the allowlist path/);
  assert.throws(() => assertAllowlistedEndpoint('https://model-endpoint.invalid/v1x', allowlist), /outside the allowlist path/);
});

test('the run id must be a uuid', () => {
  assert.equal(assertRunId(runId), runId);
  for (const value of ['run-1', '../../etc', '3f6b1c2a-9d4e-4a7b-8c5d', '']) {
    assert.throws(() => assertRunId(value), /uuid/, value);
  }
});

test('the transport root must be a dedicated directory inside the scratch', () => {
  const { scratch } = scratchFixture();
  assert.equal(assertTransportRootInsideScratch(join(scratch, 'transport'), scratch), join(scratch, 'transport'));
  assert.throws(() => assertTransportRootInsideScratch(join(scratch, '..', 'other'), scratch), /inside the container scratch/);
  assert.throws(() => assertTransportRootInsideScratch(scratch, scratch), /dedicated subdirectory/);
  assert.throws(() => assertTransportRootInsideScratch(join(tmpdir(), 'elsewhere'), scratch), /inside the container scratch/);
});

test('the broker needs a response authentication secret', () => {
  assert.throws(() => createTransportBroker({ allowlist, endpoint: 'https://model-endpoint.invalid/v1/chat' }), /authentication secret/);
  assert.throws(() => createTransportBroker({ allowlist, endpoint: 'https://model-endpoint.invalid/v1/chat', secret: 'short' }), /authentication secret/);
});

test('the broker round trip travels over the scratch channel and never trusts a worker supplied target', async () => {
  const { scratch } = scratchFixture();
  const broker = createTransportBroker({ allowlist, endpoint: 'https://model-endpoint.invalid/v1/chat', secret, pollMs: 10, timeoutMs: 5000 });
  const pending = broker.request({ scratchRoot: scratch, runId, role: 'planner', prompt: 'plan the module' });
  await new Promise(done => setTimeout(done, 60));
  const runDirectory = join(scratch, 'transport', 'transport', runId);
  assert.equal(existsSync(join(runDirectory, 'request.json')), true);
  const written = JSON.parse(readFileSync(join(runDirectory, 'request.json'), 'utf8'));
  assert.equal(written.request.endpoint, 'https://model-endpoint.invalid/v1/chat');
  assert.equal(written.request.role, 'planner');
  assert.equal(written.requestHash.length, 64);
  assert.equal(written.token, sign({ requestHash: written.requestHash, runId }));
  writeFileSync(join(runDirectory, 'response.json'), JSON.stringify({
    requestHash: written.requestHash,
    token: written.token,
    body: { verdict: 'plan' }
  }));
  const result = await pending;
  assert.equal(result.response.verdict, 'plan');
  assert.equal(result.request.requestHash, written.requestHash);
  assert.equal(existsSync(join(runDirectory, 'response.json')), false);
});

test('an unauthenticated or foreign response is refused', async () => {
  const { scratch } = scratchFixture();
  const broker = createTransportBroker({ allowlist, endpoint: 'https://model-endpoint.invalid/v1/chat', secret, pollMs: 10, timeoutMs: 3000 });
  const foreign = broker.request({ scratchRoot: scratch, runId, role: 'planner' });
  await new Promise(done => setTimeout(done, 60));
  const runDirectory = join(scratch, 'transport', 'transport', runId);
  writeFileSync(join(runDirectory, 'response.json'), JSON.stringify({ requestHash: 'a'.repeat(64), token: 'b'.repeat(64), body: {} }));
  await assert.rejects(() => foreign, /does not belong to this request/);

  const second = broker.request({ scratchRoot: scratch, runId, role: 'planner' });
  await new Promise(done => setTimeout(done, 60));
  const request = JSON.parse(readFileSync(join(runDirectory, 'request.json'), 'utf8'));
  writeFileSync(join(runDirectory, 'response.json'), JSON.stringify({ requestHash: request.requestHash, token: 'c'.repeat(64), body: {} }));
  await assert.rejects(() => second, /not authenticated/);
});

test('the broker refuses a request without a scratch root and times out without a response', async () => {
  const { scratch } = scratchFixture();
  const broker = createTransportBroker({ allowlist, endpoint: 'https://model-endpoint.invalid/v1/chat', secret, pollMs: 10, timeoutMs: 120 });
  await assert.rejects(() => broker.request({ runId }), /scratch root/);
  await assert.rejects(() => broker.request({ scratchRoot: scratch, runId }), /timed out/);
});

test('the broker probe reports the host positive control for the allowlisted endpoint', async () => {
  const connected = createTransportBroker({ allowlist, endpoint: 'https://model-endpoint.invalid/v1/chat', secret, connect: async () => ({ connected: true }) });
  const probe = await connected.probe();
  assert.equal(probe.connected, true);
  assert.equal(probe.host, 'model-endpoint.invalid');
  const offline = createTransportBroker({ allowlist, endpoint: 'https://model-endpoint.invalid/v1/chat', secret, connect: async () => ({ connected: false, code: 'ECONNREFUSED' }) });
  const failed = await offline.probe();
  assert.equal(failed.connected, false);
  assert.equal(failed.code, 'ECONNREFUSED');
  const none = createTransportBroker({ allowlist, secret });
  assert.equal((await none.probe()).connected, false);
});

test('a broker with an endpoint outside the allowlist refuses to start a request', async () => {
  const { scratch } = scratchFixture();
  const broker = createTransportBroker({ allowlist, endpoint: 'https://not-allowed.invalid/v1', secret, pollMs: 10, timeoutMs: 200 });
  await assert.rejects(() => broker.request({ scratchRoot: scratch, runId }), /allowlist/);
});

test('a request never writes outside the transport directory of its run', async () => {
  const { scratch } = scratchFixture();
  const broker = createTransportBroker({ allowlist, endpoint: 'https://model-endpoint.invalid/v1/chat', secret, pollMs: 10, timeoutMs: 200 });
  await assert.rejects(() => broker.request({ scratchRoot: scratch, runId: '../../escape' }), /uuid/);
});
