import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type { ChatResponseDTO, ChatHistoryDTO } from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 950;

const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw Error('Test server did not start.');
const base = `http://127.0.0.1:${address.port}`;
const origin = 'http://127.0.0.1:64364';

let userA: { userId: string; cookie: string };
let userB: { userId: string; cookie: string };

test.before(async () => {
  userA = await registerUser();
  userB = await registerUser();
});

test.after(async () => {
  for (const id of testUsers) {
    await pool.query('DELETE FROM chat_messages WHERE user_id=$1', [id]);
    await pool.query('DELETE FROM ai_grants WHERE user_id=$1', [id]);
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
  }
  server.closeAllConnections?.();
  await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
  await pool.end();
  await serverPool.end();
});

async function registerUser(): Promise<{ userId: string; cookie: string }> {
  const email = `chat_test_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.17.${forwardedIp++}`
    },
    body: JSON.stringify({ email, password: 'StrongPassword123!' })
  });
  assert.equal(res.status, 201);
  const data = await res.json() as { id: string };
  testUsers.push(data.id);
  const cookie = res.headers.get('set-cookie');
  if (!cookie) throw new Error('Missing session cookie on registration');
  return { userId: data.id, cookie };
}

test('chat: POST /api/ai/chat requires authentication', async () => {
  const res = await fetch(`${base}/api/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin
    },
    body: JSON.stringify({ message: 'Xin chào' })
  });
  assert.equal(res.status, 401);
});

test('chat: GET /api/ai/chat/history requires authentication', async () => {
  const res = await fetch(`${base}/api/ai/chat/history`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('chat: DELETE /api/ai/chat/history requires authentication', async () => {
  const res = await fetch(`${base}/api/ai/chat/history`, {
    method: 'DELETE',
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('chat: POST /api/ai/chat rejects empty or invalid message with 422', async () => {
  const res = await fetch(`${base}/api/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({ message: '    ' })
  });
  assert.equal(res.status, 422);
});

test('chat: POST /api/ai/chat processes message, issues ephemeral grant, and responds with local fallback', async () => {
  const res = await fetch(`${base}/api/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      message: 'Hôm nay tôi cần làm gì?'
    })
  });

  assert.equal(res.status, 200);
  const data = await res.json() as ChatResponseDTO;
  assert.ok(data.reply);
  assert.ok(data.reply.includes('Kế hoạch') || data.reply.includes('hồ sơ'));
  assert.equal(data.provenance, 'local_fallback');
  assert.ok(Array.isArray(data.suggestedPrompts));

  const grantRes = await pool.query(
    'SELECT id, client, scopes FROM ai_grants WHERE user_id = $1 AND client = $2',
    [userA.userId, 'n8n-agent']
  );
  assert.ok(grantRes.rowCount && grantRes.rowCount > 0);
  assert.equal(grantRes.rows[0].client, 'n8n-agent');
});

test('chat: GET /api/ai/chat/history returns persisted turns and enforces tenant isolation', async () => {
  const historyA = await fetch(`${base}/api/ai/chat/history`, {
    headers: {
      Cookie: userA.cookie,
      Origin: origin
    }
  });
  assert.equal(historyA.status, 200);
  const dataA = await historyA.json() as ChatHistoryDTO;
  assert.ok(dataA.total >= 2);
  assert.ok(dataA.messages.some(m => m.sender === 'user' && m.message.includes('Hôm nay')));
  assert.ok(dataA.messages.some(m => m.sender === 'assistant'));

  const historyB = await fetch(`${base}/api/ai/chat/history`, {
    headers: {
      Cookie: userB.cookie,
      Origin: origin
    }
  });
  assert.equal(historyB.status, 200);
  const dataB = await historyB.json() as ChatHistoryDTO;
  assert.equal(dataB.total, 0);
  assert.equal(dataB.messages.length, 0);
});

test('chat: DELETE /api/ai/chat/history clears conversation history for user session', async () => {
  const delRes = await fetch(`${base}/api/ai/chat/history`, {
    method: 'DELETE',
    headers: {
      Cookie: userA.cookie,
      Origin: origin
    }
  });
  assert.equal(delRes.status, 200);
  const delData = await delRes.json() as { success: boolean; cleared: number };
  assert.equal(delData.success, true);
  assert.ok(delData.cleared >= 2);

  const historyAfter = await fetch(`${base}/api/ai/chat/history`, {
    headers: {
      Cookie: userA.cookie,
      Origin: origin
    }
  });
  assert.equal(historyAfter.status, 200);
  const dataAfter = await historyAfter.json() as ChatHistoryDTO;
  assert.equal(dataAfter.total, 0);
  assert.equal(dataAfter.messages.length, 0);
});
