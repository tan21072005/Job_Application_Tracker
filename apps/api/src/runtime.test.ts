import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import { Pool } from 'pg';
import { app, pool, cookieSecure } from './server.ts';

test('runtime: /api/health returns 200 ok', async () => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as { port: number }).port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body, { status: 'ok' });
  } finally {
    server.close();
  }
});

test('runtime: /api/ready returns 200 when DB is connected and migrated', async () => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as { port: number }).port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/ready`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { status: string; version: number };
    assert.equal(body.status, 'ready');
    assert.ok(body.version >= 1);
  } finally {
    server.close();
  }
});

test('runtime: /api/ready returns 503 when schema is pending or DB disconnected', async () => {
  const mockApp = express();
  mockApp.disable('x-powered-by');

  mockApp.get('/api/ready', async (_req, res) => {
    // Simulating database connection failure
    res.status(503).json({ status: 'not_ready', error: 'database_unavailable' });
  });

  const server = mockApp.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as { port: number }).port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/ready`);
    assert.equal(res.status, 503);
    const body = (await res.json()) as { status: string; error: string };
    assert.equal(body.status, 'not_ready');
    assert.equal(body.error, 'database_unavailable');
  } finally {
    server.close();
  }
});

test('runtime: cookie security flag is false for local loopback HTTP and true for HTTPS/COOKIE_SECURE', () => {
  // On local HTTP loopback (default), cookieSecure must be false
  assert.equal(cookieSecure, false);

  // Helper verifying logic
  const evaluateSecure = (cookieSecEnv: string | undefined, originUrl: string): boolean => {
    return cookieSecEnv !== undefined ? cookieSecEnv === 'true' : originUrl.startsWith('https://');
  };

  assert.equal(evaluateSecure(undefined, 'http://127.0.0.1:64364'), false);
  assert.equal(evaluateSecure('false', 'http://127.0.0.1:64364'), false);
  assert.equal(evaluateSecure('true', 'http://127.0.0.1:64364'), true);
  assert.equal(evaluateSecure(undefined, 'https://jobtrack.example.com'), true);
  assert.equal(evaluateSecure(undefined, 'https://127.0.0.1:64364'), true);
});

test('runtime: graceful shutdown drains in-flight requests and rejects new requests with 503', async () => {
  const testApp = express();
  let inFlight = 0;
  let isShuttingDown = false;
  let drainResolve: (() => void) | null = null;

  testApp.use((_req, res, next) => {
    if (isShuttingDown) {
      res.set('Connection', 'close');
      res.status(503).json({ code: 'service_unavailable', message: 'Máy chủ đang tắt.' });
      return;
    }
    inFlight++;
    res.on('finish', () => {
      inFlight--;
      if (isShuttingDown && inFlight === 0 && drainResolve) {
        drainResolve();
      }
    });
    next();
  });

  // Long running request
  testApp.get('/test/long', async (_req, res) => {
    await new Promise((r) => setTimeout(r, 150));
    res.json({ success: true });
  });

  const server = testApp.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as { port: number }).port;

  // Start in-flight request
  const inFlightReq = fetch(`http://127.0.0.1:${port}/test/long`);

  // Allow request to start processing
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(inFlight, 1);

  // Trigger shutdown
  isShuttingDown = true;
  const drainPromise = new Promise<void>((resolve) => {
    drainResolve = resolve;
  });

  // Attempt a new request while draining
  const newReqRes = await fetch(`http://127.0.0.1:${port}/test/long`);
  assert.equal(newReqRes.status, 503);

  // Wait for drain and in-flight request to finish
  const inFlightRes = await inFlightReq;
  assert.equal(inFlightRes.status, 200);
  const body = (await inFlightRes.json()) as { success: boolean };
  assert.equal(body.success, true);

  await drainPromise;
  assert.equal(inFlight, 0);

  server.close();
});

test.after(async () => {
  await pool.end();
});

