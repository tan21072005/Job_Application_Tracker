import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type {
  SystemDesignScenarioDTO,
  SystemDesignSessionDTO,
  SystemDesignEvaluationDTO,
  SystemCapacityEstimateDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 2700;

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
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
  }
  server.closeAllConnections?.();
  await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
  await pool.end();
  await serverPool.end();
});

async function registerUser(): Promise<{ userId: string; cookie: string }> {
  const email = `system_design_test_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.30.${forwardedIp++}`
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

test('system-design: GET /api/system-design/scenarios requires authentication', async () => {
  const res = await fetch(`${base}/api/system-design/scenarios`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('system-design: GET /api/system-design/scenarios returns all 5 pre-seeded scenarios', async () => {
  const res = await fetch(`${base}/api/system-design/scenarios`, {
    headers: {
      Origin: origin,
      Cookie: userA.cookie
    }
  });
  assert.equal(res.status, 200);
  const data = await res.json() as SystemDesignScenarioDTO[];
  assert.equal(data.length, 5);
  const scenarioIds = data.map(s => s.id);
  assert.ok(scenarioIds.includes('url_shortener'));
  assert.ok(scenarioIds.includes('flash_sale'));
  assert.ok(scenarioIds.includes('ride_hailing_matching'));
  assert.ok(scenarioIds.includes('distributed_notification_system'));
  assert.ok(scenarioIds.includes('custom_system'));
});

test('system-design: POST /api/system-design/estimate calculates capacity numbers', async () => {
  const res = await fetch(`${base}/api/system-design/estimate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      dailyActiveUsers: 50000000,
      readsPerUserPerDay: 20,
      writesPerUserPerDay: 1,
      avgReadPayloadBytes: 1024,
      avgWritePayloadBytes: 512,
      peakLoadMultiplier: 4,
      dataRetentionYears: 3,
      cacheWorkingSetPercentage: 15
    })
  });

  assert.equal(res.status, 200);
  const data = await res.json() as SystemCapacityEstimateDTO;
  assert.ok(data.averageReadQps > 0);
  assert.ok(data.peakTotalQps > 0);
  assert.ok(data.recommendedAppServers >= 2);
  assert.ok(data.recommendedCacheNodes >= 2);
});

test('system-design: complete session lifecycle with multi-tenant isolation', async () => {
  const createRes = await fetch(`${base}/api/system-design/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      title: 'TinyURL System Architecture Study',
      scenarioId: 'url_shortener',
      targetRole: 'Staff Software Engineer',
      difficulty: 'senior'
    })
  });

  assert.equal(createRes.status, 201);
  const createdSession = await createRes.json() as SystemDesignSessionDTO;
  assert.equal(createdSession.title, 'TinyURL System Architecture Study');
  assert.equal(createdSession.scenarioId, 'url_shortener');
  assert.equal(createdSession.userId, userA.userId);
  assert.ok(createdSession.blueprint.scope.functionalRequirements.length >= 3);

  const listRes = await fetch(`${base}/api/system-design/sessions`, {
    headers: {
      Origin: origin,
      Cookie: userA.cookie
    }
  });
  assert.equal(listRes.status, 200);
  const listA = await listRes.json() as SystemDesignSessionDTO[];
  assert.ok(listA.some(s => s.id === createdSession.id));

  const crossListRes = await fetch(`${base}/api/system-design/sessions`, {
    headers: {
      Origin: origin,
      Cookie: userB.cookie
    }
  });
  assert.equal(crossListRes.status, 200);
  const listB = await crossListRes.json() as SystemDesignSessionDTO[];
  assert.equal(listB.some(s => s.id === createdSession.id), false);

  const crossGetRes = await fetch(`${base}/api/system-design/sessions/${createdSession.id}`, {
    headers: {
      Origin: origin,
      Cookie: userB.cookie
    }
  });
  assert.equal(crossGetRes.status, 404);

  const patchRes = await fetch(`${base}/api/system-design/sessions/${createdSession.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      title: 'TinyURL Production Blueprint v2'
    })
  });
  assert.equal(patchRes.status, 200);
  const patched = await patchRes.json() as SystemDesignSessionDTO;
  assert.equal(patched.title, 'TinyURL Production Blueprint v2');

  const crossPatchRes = await fetch(`${base}/api/system-design/sessions/${createdSession.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userB.cookie
    },
    body: JSON.stringify({
      title: 'Hacked by User B'
    })
  });
  assert.equal(crossPatchRes.status, 404);

  const evalRes = await fetch(`${base}/api/system-design/sessions/${createdSession.id}/evaluate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      targetRole: 'Staff Software Engineer'
    })
  });
  assert.equal(evalRes.status, 200);
  const evalData = await evalRes.json() as SystemDesignEvaluationDTO;
  assert.ok(evalData.overallScore >= 80);
  assert.equal(evalData.pillars.length, 5);
  assert.ok(evalData.topStrengths.length > 0);

  const crossEvalRes = await fetch(`${base}/api/system-design/sessions/${createdSession.id}/evaluate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userB.cookie
    }
  });
  assert.equal(crossEvalRes.status, 404);

  const exportRes = await fetch(`${base}/api/system-design/sessions/${createdSession.id}/export`, {
    headers: {
      Origin: origin,
      Cookie: userA.cookie
    }
  });
  assert.equal(exportRes.status, 200);
  const exportData = await exportRes.json() as { markdown: string };
  assert.ok(exportData.markdown.includes('# Báo Cáo Thiết Kế Hệ Thống'));
  assert.ok(exportData.markdown.includes('```mermaid'));

  const crossDeleteRes = await fetch(`${base}/api/system-design/sessions/${createdSession.id}`, {
    method: 'DELETE',
    headers: {
      Origin: origin,
      Cookie: userB.cookie
    }
  });
  assert.equal(crossDeleteRes.status, 404);

  const deleteRes = await fetch(`${base}/api/system-design/sessions/${createdSession.id}`, {
    method: 'DELETE',
    headers: {
      Origin: origin,
      Cookie: userA.cookie
    }
  });
  assert.equal(deleteRes.status, 204);

  const verifyDelete = await fetch(`${base}/api/system-design/sessions/${createdSession.id}`, {
    headers: {
      Origin: origin,
      Cookie: userA.cookie
    }
  });
  assert.equal(verifyDelete.status, 404);
});
