import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { aiGovernanceStudioRepository } from './data';
import type {
  EvaluationRunRequestDTO,
  ModelCascadeSimulationRequestDTO,
  PiiMaskingTestRequestDTO,
  ChunkingTuningRequestDTO,
  AiBoardMemoGenerateRequestDTO
} from './domain';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('aiGovernanceStudioRepository (Web Demo Mode)', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('retrieves default demo overview with composite AGS and 5-pillar telemetry', async () => {
    const overview = await aiGovernanceStudioRepository.getOverview();
    expect(overview).toBeDefined();
    expect(overview.compositeScore).toBe(92.4);
    expect(overview.statusBand).toBe('elite_compliant');
    expect(overview.euAiActRiskCategory).toBe('high_risk_employment');
    expect(overview.totalMonthlySpendUsd).toBe(14250);
    expect(overview.cascadeSavingsPercent).toBe(61.4);
    expect(overview.promptCacheHitRatePercent).toBe(84.5);
    expect(overview.jailbreakVulnerabilityRatePercent).toBe(0.38);
    expect(overview.mrrScore).toBe(0.912);
    expect(overview.evaluationOverview.models.length).toBeGreaterThanOrEqual(5);
    expect(overview.tokenEconomicsOverview.rates.length).toBeGreaterThanOrEqual(5);
    expect(overview.responsibleAiOverview.rules.length).toBeGreaterThanOrEqual(5);
    expect(overview.ragOverview.primaryIndex).toBeDefined();
    expect(overview.latestBoardMemo).toBeDefined();
  });

  it('manages LLM benchmark leaderboard and executes evaluation runs', async () => {
    const models = await aiGovernanceStudioRepository.listModelEvaluations();
    expect(models.length).toBeGreaterThanOrEqual(5);

    const runReq: EvaluationRunRequestDTO = {
      domain: 'job_matching',
      models: ['gpt-4o', 'claude-3-5-sonnet'],
      sampleSize: 100,
      concurrencyLevel: 4
    };

    const runRes = await aiGovernanceStudioRepository.runModelEvaluation(runReq);
    expect(runRes.runId).toBeDefined();
    expect(runRes.domain).toBe('job_matching');
    expect(runRes.evaluatedModelsCount).toBe(2);
    expect(runRes.meanAccuracyPercent).toBeGreaterThan(90);

    const updatedOverview = await aiGovernanceStudioRepository.getOverview();
    expect(updatedOverview.evaluationOverview.recentRuns[0].runId).toBe(runRes.runId);
  });

  it('evaluates token economics, caching telemetry and simulates cascade arbitrage', async () => {
    const econ = await aiGovernanceStudioRepository.getTokenEconomics();
    expect(econ.monthlyTokenSpendUsd).toBe(14250);
    expect(econ.routingTiers.length).toBe(3);
    expect(econ.cachingTelemetry.blendedCacheHitRatePercent).toBe(84.5);

    const simReq: ModelCascadeSimulationRequestDTO = {
      monthlyTotalRequests: 200000,
      averageInputTokensPerRequest: 1500,
      averageOutputTokensPerRequest: 350,
      tier1RoutingPercent: 55,
      tier2RoutingPercent: 35,
      tier3RoutingPercent: 10,
      targetPromptCacheHitRatePercent: 85
    };

    const simResult = await aiGovernanceStudioRepository.simulateCascadeArbitrage(simReq);
    expect(simResult.baselineFrontierOnlySpendUsd).toBeGreaterThan(simResult.optimizedCascadeSpendUsd);
    expect(simResult.savingsPercentage).toBeGreaterThanOrEqual(40);
    expect(simResult.promptCachingSavingsUsd).toBeGreaterThan(0);
    expect(simResult.totalMonthlySavingsUsd).toBeGreaterThan(0);
  });

  it('tests PII masking redactions and mitigates security incidents', async () => {
    const respAi = await aiGovernanceStudioRepository.getResponsibleAiOverview();
    expect(respAi.safetyIndexScore).toBe(99.2);
    expect(respAi.attackMitigationRatePercent).toBe(100);

    const maskReq: PiiMaskingTestRequestDTO = {
      rawPrompt: 'Candidate john@techcorp.com with salary $210,000 and phone +1-555-019-4567.',
      strategy: 'full_mask'
    };

    const maskRes = await aiGovernanceStudioRepository.testPiiMasking(maskReq);
    expect(maskRes.detectedEntitiesCount).toBe(3);
    expect(maskRes.sanitizedText).toContain('[REDACTED_EMAIL]');
    expect(maskRes.sanitizedText).toContain('[REDACTED_COMPENSATION]');
    expect(maskRes.sanitizedText).toContain('[REDACTED_PHONE]');
    expect(maskRes.sanitizedText).not.toContain('john@techcorp.com');

    const incidents = await aiGovernanceStudioRepository.scanSecurityIncidents();
    expect(incidents.length).toBeGreaterThanOrEqual(3);

    const targetInc = incidents[0];
    const resolved = await aiGovernanceStudioRepository.resolveSecurityIncident(targetInc.id, 'Mitigated in test.');
    expect(resolved).not.toBeNull();
    expect(resolved?.status).toBe('mitigated');
    expect(resolved?.mitigationNotes).toBe('Mitigated in test.');
  });

  it('governs RAG vector index telemetry and updates chunk tuning parameters', async () => {
    const rag = await aiGovernanceStudioRepository.getRagOverview();
    expect(rag.primaryIndex.totalVectorsCount).toBe(145000);
    expect(rag.retrievalMetrics.meanReciprocalRank).toBe(0.912);
    expect(rag.driftReport.isDriftAlertTriggered).toBe(false);

    const tuneReq: ChunkingTuningRequestDTO = {
      chunkSizeTokens: 768,
      chunkOverlapTokens: 96,
      indexingStrategy: 'hierarchical'
    };

    const tuned = await aiGovernanceStudioRepository.tuneChunking(tuneReq);
    expect(tuned.contextWindowChunkDensityTokens).toBe(768);
    expect(tuned.chunkOverlapTokens).toBe(96);
  });

  it('generates board memoranda and executes tripartite executive sign-offs', async () => {
    const genReq: AiBoardMemoGenerateRequestDTO = {
      title: 'Q4-2026 Executive AI Governance Audit',
      fiscalQuarter: 'Q4-2026'
    };

    const memo = await aiGovernanceStudioRepository.generateBoardMemo(genReq);
    expect(memo.id).toBeDefined();
    expect(memo.title).toBe('Q4-2026 Executive AI Governance Audit');
    expect(memo.status).toBe('draft');

    const sign1 = await aiGovernanceStudioRepository.approveBoardMemo(memo.id, 'vp_ai');
    expect(sign1).not.toBeNull();
    expect(sign1?.approvedByVpAiAt).toBeDefined();
    expect(sign1?.status).toBe('under_review');

    const sign2 = await aiGovernanceStudioRepository.approveBoardMemo(memo.id, 'chief_legal_officer');
    expect(sign2?.approvedByChiefLegalOfficerAt).toBeDefined();

    const sign3 = await aiGovernanceStudioRepository.approveBoardMemo(memo.id, 'cto');
    expect(sign3?.approvedByCtoAt).toBeDefined();
    expect(sign3?.status).toBe('board_approved');
  });
});
