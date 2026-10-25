import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type {
  AiGovernanceStudioOverviewDTO,
  LlmModelBenchmarkDTO,
  EvaluationRunResultDTO,
  TokenEconomicsOverviewDTO,
  CascadeSimulationResultDTO,
  ResponsibleAiOverviewDTO,
  PiiMaskingTestResultDTO,
  AiSecurityIncidentDTO,
  RagGovernanceOverviewDTO,
  RagRetrievalMetricsDTO,
  ExecutiveAiBoardMemorandumDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 9100;

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
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await pool.end();
  await serverPool.end();
});

async function registerUser(): Promise<{ userId: string; cookie: string }> {
  const email = `aigov_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.41.${forwardedIp++}`
    },
    body: JSON.stringify({ email, password: 'StrongPassword123!' })
  });
  assert.equal(res.status, 201);
  const data = (await res.json()) as { id: string };
  testUsers.push(data.id);
  const cookie = res.headers.get('set-cookie');
  if (!cookie) throw new Error('Cookie missing in registration response.');
  return { userId: data.id, cookie };
}

test('ai-governance-studio: GET /api/ai-governance-studio/overview requires authentication', async () => {
  const res = await fetch(`${base}/api/ai-governance-studio/overview`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('ai-governance-studio: POST /api/ai-governance-studio/evaluations/run validates payload', async () => {
  const res = await fetch(`${base}/api/ai-governance-studio/evaluations/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({ domain: 'invalid_domain', models: [], sampleSize: 5 })
  });
  assert.equal(res.status, 400);
  const data = (await res.json()) as { code: string; errors: Record<string, string> };
  assert.equal(data.code, 'invalid_evaluation_request');
  assert.ok(data.errors.domain);
  assert.ok(data.errors.models);
});

test('ai-governance-studio: POST /api/ai-governance-studio/token-economics/simulate-cascade validates routing percentages', async () => {
  const res = await fetch(`${base}/api/ai-governance-studio/token-economics/simulate-cascade`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      monthlyTotalRequests: 100000,
      tier1RoutingPercent: 50,
      tier2RoutingPercent: 20,
      tier3RoutingPercent: 10
    })
  });
  assert.equal(res.status, 400);
  const data = (await res.json()) as { code: string; errors: Record<string, string> };
  assert.equal(data.code, 'invalid_cascade_simulation_request');
  assert.ok(data.errors.routingShare);
});

test('ai-governance-studio: complete 5-pillar lifecycle, multi-tenant isolation, and executive sign-off', async () => {
  const overviewRes = await fetch(`${base}/api/ai-governance-studio/overview`, {
    headers: { Cookie: userA.cookie, Origin: origin }
  });
  assert.equal(overviewRes.status, 200);
  const overview = (await overviewRes.json()) as AiGovernanceStudioOverviewDTO;
  assert.ok(overview.compositeScore >= 80);
  assert.equal(overview.statusBand, 'elite_compliant');
  assert.equal(overview.euAiActRiskCategory, 'high_risk_employment');
  assert.ok(overview.totalMonthlySpendUsd > 0);
  assert.ok(overview.cascadeSavingsPercent > 40);

  const aliasRes = await fetch(`${base}/api/ai-governance/overview`, {
    headers: { Cookie: userA.cookie, Origin: origin }
  });
  assert.equal(aliasRes.status, 200);

  const evalsRes = await fetch(`${base}/api/ai-governance-studio/evaluations`, {
    headers: { Cookie: userA.cookie, Origin: origin }
  });
  assert.equal(evalsRes.status, 200);
  const evals = (await evalsRes.json()) as LlmModelBenchmarkDTO[];
  assert.ok(evals.length >= 5);
  assert.equal(evals[0].leaderboardRank, 1);

  const runRes = await fetch(`${base}/api/ai-governance-studio/evaluations/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      domain: 'job_matching',
      models: ['gpt-4o', 'claude-3-5-sonnet'],
      sampleSize: 100,
      concurrencyLevel: 4
    })
  });
  assert.equal(runRes.status, 200);
  const runResult = (await runRes.json()) as EvaluationRunResultDTO;
  assert.equal(runResult.domain, 'job_matching');
  assert.equal(runResult.evaluatedModelsCount, 2);

  const econRes = await fetch(`${base}/api/ai-governance-studio/token-economics`, {
    headers: { Cookie: userA.cookie, Origin: origin }
  });
  assert.equal(econRes.status, 200);
  const econ = (await econRes.json()) as TokenEconomicsOverviewDTO;
  assert.ok(econ.rates.length >= 5);
  assert.ok(econ.routingTiers.length >= 3);
  assert.ok(econ.cachingTelemetry.blendedCacheHitRatePercent > 70);

  const simRes = await fetch(`${base}/api/ai-governance-studio/token-economics/simulate-cascade`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      monthlyTotalRequests: 200000,
      averageInputTokensPerRequest: 1500,
      averageOutputTokensPerRequest: 300,
      tier1RoutingPercent: 55,
      tier2RoutingPercent: 35,
      tier3RoutingPercent: 10,
      targetPromptCacheHitRatePercent: 85
    })
  });
  assert.equal(simRes.status, 200);
  const sim = (await simRes.json()) as CascadeSimulationResultDTO;
  assert.ok(sim.baselineFrontierOnlySpendUsd > sim.optimizedCascadeSpendUsd);
  assert.ok(sim.savingsPercentage >= 40);

  const respAiRes = await fetch(`${base}/api/ai-governance-studio/responsible-ai`, {
    headers: { Cookie: userA.cookie, Origin: origin }
  });
  assert.equal(respAiRes.status, 200);
  const respAi = (await respAiRes.json()) as ResponsibleAiOverviewDTO;
  assert.ok(respAi.rules.length >= 4);
  assert.ok(respAi.recentIncidents.length >= 2);

  const maskRes = await fetch(`${base}/api/ai-governance-studio/responsible-ai/test-masking`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      rawPrompt: 'Reach candidate at alice@example.com with salary $210,000.',
      strategy: 'full_mask'
    })
  });
  assert.equal(maskRes.status, 200);
  const maskResult = (await maskRes.json()) as PiiMaskingTestResultDTO;
  assert.ok(maskResult.sanitizedText.includes('[REDACTED_EMAIL]'));
  assert.ok(maskResult.sanitizedText.includes('[REDACTED_COMPENSATION]'));
  assert.ok(!maskResult.sanitizedText.includes('alice@example.com'));

  const incidentToResolve = respAi.recentIncidents[0];
  const resolveRes = await fetch(`${base}/api/ai-governance-studio/security-incidents/${incidentToResolve.id}/resolve`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({ notes: 'Verified and blocked by SecOps.' })
  });
  assert.equal(resolveRes.status, 200);
  const resolvedIncident = (await resolveRes.json()) as AiSecurityIncidentDTO;
  assert.equal(resolvedIncident.status, 'mitigated');

  const ragRes = await fetch(`${base}/api/ai-governance-studio/rag`, {
    headers: { Cookie: userA.cookie, Origin: origin }
  });
  assert.equal(ragRes.status, 200);
  const rag = (await ragRes.json()) as RagGovernanceOverviewDTO;
  assert.ok(rag.primaryIndex.totalVectorsCount > 0);
  assert.ok(rag.retrievalMetrics.meanReciprocalRank > 0.8);

  const tuneRes = await fetch(`${base}/api/ai-governance-studio/rag/tune-chunking`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      chunkSizeTokens: 768,
      chunkOverlapTokens: 96,
      indexingStrategy: 'hierarchical'
    })
  });
  assert.equal(tuneRes.status, 200);
  const tunedMetrics = (await tuneRes.json()) as RagRetrievalMetricsDTO;
  assert.equal(tunedMetrics.contextWindowChunkDensityTokens, 768);

  const memoRes = await fetch(`${base}/api/ai-governance-studio/board-memos/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      title: 'Q4-2026 Executive AI Governance Audit',
      fiscalQuarter: 'Q4-2026'
    })
  });
  assert.equal(memoRes.status, 201);
  const memo = (await memoRes.json()) as ExecutiveAiBoardMemorandumDTO;
  assert.equal(memo.title, 'Q4-2026 Executive AI Governance Audit');
  assert.equal(memo.status, 'draft');

  const approve1 = await fetch(`${base}/api/ai-governance-studio/board-memos/${memo.id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({ role: 'vp_ai' })
  });
  assert.equal(approve1.status, 200);
  const memoApprove1 = (await approve1.json()) as ExecutiveAiBoardMemorandumDTO;
  assert.ok(memoApprove1.approvedByVpAiAt);
  assert.equal(memoApprove1.status, 'under_review');

  const approve2 = await fetch(`${base}/api/ai-governance-studio/board-memos/${memo.id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({ role: 'chief_legal_officer' })
  });
  assert.equal(approve2.status, 200);

  const approve3 = await fetch(`${base}/api/ai-governance-studio/board-memos/${memo.id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({ role: 'cto' })
  });
  assert.equal(approve3.status, 200);
  const memoFinal = (await approve3.json()) as ExecutiveAiBoardMemorandumDTO;
  assert.equal(memoFinal.status, 'board_approved');

  const isolationRes = await fetch(`${base}/api/ai-governance-studio/board-memos/${memo.id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userB.cookie,
      Origin: origin
    },
    body: JSON.stringify({ role: 'cto' })
  });
  assert.equal(isolationRes.status, 404);
});
