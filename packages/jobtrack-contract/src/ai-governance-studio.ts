export type LlmModelId =
  | 'gpt-4o'
  | 'claude-3-5-sonnet'
  | 'gemini-1-5-pro'
  | 'llama-3-1-70b'
  | 'deepseek-v2-5'
  | 'gpt-4o-mini'
  | 'llama-3-1-8b';

export type ModelProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'meta'
  | 'deepseek'
  | 'self_hosted';

export type EvaluationDomain =
  | 'job_matching'
  | 'interview_rubric'
  | 'code_generation'
  | 'resume_parsing';

export type CascadeTier =
  | 'tier_1_distilled'
  | 'tier_2_balanced'
  | 'tier_3_frontier';

export type PiiEntityType =
  | 'email'
  | 'phone'
  | 'ssn'
  | 'salary'
  | 'credit_card'
  | 'address';

export type PiiRedactionStrategy =
  | 'full_mask'
  | 'synthetic_token'
  | 'pseudonymized_hash';

export type ThreatClassification =
  | 'direct_prompt_injection'
  | 'indirect_context_poisoning'
  | 'jailbreak_persona'
  | 'system_prompt_extraction';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export type IncidentStatus = 'detected' | 'blocked' | 'investigating' | 'mitigated';

export type VectorDatabaseType = 'pgvector' | 'pinecone' | 'milvus' | 'qdrant';

export type VectorDistanceMetric = 'cosine' | 'inner_product' | 'euclidean';

export type EuAiActRiskCategory =
  | 'minimal_risk'
  | 'specific_transparency_risk'
  | 'high_risk_employment'
  | 'unacceptable_risk';

export type NistRmfFunction = 'govern' | 'map' | 'measure' | 'manage';

export type GovernanceMaturityStage = 'crawl' | 'walk' | 'run';

export type AiGovernanceStatusBand =
  | 'elite_compliant'
  | 'managed_defensible'
  | 'cautionary_gap'
  | 'critical_non_compliant';

export type BoardMemoSignoffRole = 'vp_ai' | 'chief_legal_officer' | 'cto';

export type AiBoardMemoStatus = 'draft' | 'under_review' | 'board_approved' | 'archived';

export interface LlmModelBenchmarkDTO {
  id: string;
  modelId: LlmModelId;
  modelName: string;
  provider: ModelProvider;
  parameterCountBillions: number;
  isOpenWeight: boolean;
  domain: EvaluationDomain;
  taskAccuracyPercent: number;
  hallucinationRatePercent: number;
  semanticCoherenceScore: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  throughputTokensPerSec: number;
  leaderboardRank: number;
  compositeRating: number;
  lastEvaluatedAt: string;
}

export interface EvaluationTestCaseDTO {
  id: string;
  domain: EvaluationDomain;
  promptSnippet: string;
  groundTruthKeywords: string[];
  expectedOutputSchema: string;
  testedAt: string;
}

export interface EvaluationRunRequestDTO {
  domain: EvaluationDomain;
  models: LlmModelId[];
  sampleSize: number;
  concurrencyLevel: number;
}

export interface EvaluationRunResultDTO {
  runId: string;
  domain: EvaluationDomain;
  evaluatedModelsCount: number;
  topRankedModelId: LlmModelId;
  meanAccuracyPercent: number;
  meanHallucinationRatePercent: number;
  durationMs: number;
  completedAt: string;
}

export interface LlmEvaluationOverviewDTO {
  totalEvaluatedModels: number;
  activeDomain: EvaluationDomain;
  averageAccuracyPercent: number;
  averageHallucinationRatePercent: number;
  fastestModelLatencyMs: number;
  models: LlmModelBenchmarkDTO[];
  recentRuns: EvaluationRunResultDTO[];
}

export interface ModelTokenRateDTO {
  modelId: LlmModelId;
  provider: ModelProvider;
  inputCostPerMillionTokensUsd: number;
  cachedInputCostPerMillionTokensUsd: number;
  outputCostPerMillionTokensUsd: number;
  effectiveCacheDiscountPercent: number;
}

export interface PromptCachingTelemetryDTO {
  totalPromptTokensProcessed: number;
  cachedTokensRead: number;
  uncachedTokensRead: number;
  blendedCacheHitRatePercent: number;
  kvCacheComputeTimeSavedMs: number;
  monthlyCachingCostAvoidedUsd: number;
}

export interface CascadeRoutingTierDTO {
  tier: CascadeTier;
  tierLabel: string;
  assignedModelId: LlmModelId;
  parameterSizeRange: string;
  routingSharePercent: number;
  primaryWorkloads: string[];
  confidenceThreshold: number;
  fallbackTargetTier?: CascadeTier;
}

export interface ModelCascadeSimulationRequestDTO {
  monthlyTotalRequests: number;
  averageInputTokensPerRequest: number;
  averageOutputTokensPerRequest: number;
  tier1RoutingPercent: number;
  tier2RoutingPercent: number;
  tier3RoutingPercent: number;
  targetPromptCacheHitRatePercent: number;
}

export interface CascadeSimulationResultDTO {
  baselineFrontierOnlySpendUsd: number;
  optimizedCascadeSpendUsd: number;
  promptCachingSavingsUsd: number;
  netMonthlySpendUsd: number;
  totalMonthlySavingsUsd: number;
  savingsPercentage: number;
  tier1CostUsd: number;
  tier2CostUsd: number;
  tier3CostUsd: number;
}

export interface TokenEconomicsOverviewDTO {
  monthlyTokenSpendUsd: number;
  projectedMonthlySpendUsd: number;
  monthlyQuotaAllocationTokens: number;
  quotaConsumedPercent: number;
  cascadeSavingsPercent: number;
  rates: ModelTokenRateDTO[];
  cachingTelemetry: PromptCachingTelemetryDTO;
  routingTiers: CascadeRoutingTierDTO[];
  latestSimulation: CascadeSimulationResultDTO;
}

export interface PiiMaskingRuleDTO {
  id: string;
  entityType: PiiEntityType;
  regexPattern: string;
  nerModelTarget: string;
  redactionStrategy: PiiRedactionStrategy;
  replacementMask: string;
  detectionConfidenceThreshold: number;
  isEnabled: boolean;
}

export interface PiiMaskingTestRequestDTO {
  rawPrompt: string;
  strategy: PiiRedactionStrategy;
}

export interface PiiMaskingTestResultDTO {
  originalText: string;
  sanitizedText: string;
  detectedEntitiesCount: number;
  redactedEntities: Array<{
    type: PiiEntityType;
    matchedSnippet: string;
    startIndex: number;
    endIndex: number;
    confidence: number;
  }>;
}

export interface GuardrailThresholdsDTO {
  toxicityMaxAllowedScore: number;
  demographicBiasParityMinScore: number;
  jailbreakMaxVulnerabilityRatePercent: number;
  promptInjectionDefenseStrictness: 'permissive' | 'balanced' | 'strict';
}

export interface AiSecurityIncidentDTO {
  id: string;
  threatType: ThreatClassification;
  severity: IncidentSeverity;
  status: IncidentStatus;
  detectedPayloadSnippet: string;
  blockedTriggerPattern: string;
  originTenantOrIp: string;
  detectedAt: string;
  mitigationNotes?: string;
}

export interface ResponsibleAiOverviewDTO {
  jailbreakVulnerabilityRatePercent: number;
  totalSecurityIncidentsCount: number;
  blockedAttacksCount: number;
  attackMitigationRatePercent: number;
  safetyIndexScore: number;
  rules: PiiMaskingRuleDTO[];
  guardrails: GuardrailThresholdsDTO;
  recentIncidents: AiSecurityIncidentDTO[];
}

export interface VectorIndexTelemetryDTO {
  id: string;
  indexName: string;
  databaseType: VectorDatabaseType;
  dimensionality: 1536 | 3072 | 1024;
  distanceMetric: VectorDistanceMetric;
  totalVectorsCount: number;
  indexSizeMb: number;
  fragmentationRatioPercent: number;
  lastOptimizedAt: string;
}

export interface RagRetrievalMetricsDTO {
  hitRateAt5Percent: number;
  hitRateAt10Percent: number;
  meanReciprocalRank: number;
  ndcgAt10: number;
  contextWindowChunkDensityTokens: number;
  chunkOverlapTokens: number;
  averageRetrievalLatencyMs: number;
}

export interface ChunkingTuningRequestDTO {
  chunkSizeTokens: number;
  chunkOverlapTokens: number;
  indexingStrategy: 'flat' | 'hierarchical' | 'semantic_parent';
}

export interface EmbeddingDriftReportDTO {
  baselineCosineSimilarity: number;
  currentCosineSimilarity: number;
  semanticDriftPercent: number;
  isDriftAlertTriggered: boolean;
  monitoredCorpusQueriesCount: number;
}

export interface RagGovernanceOverviewDTO {
  primaryIndex: VectorIndexTelemetryDTO;
  retrievalMetrics: RagRetrievalMetricsDTO;
  driftReport: EmbeddingDriftReportDTO;
  secondaryIndices: VectorIndexTelemetryDTO[];
}

export interface EuAiActComplianceAssessmentDTO {
  classifiedRiskCategory: EuAiActRiskCategory;
  isHighRiskEmploymentSystem: boolean;
  annexArticleCitation: string;
  riskManagementSystemCompliant: boolean;
  trainingDataGovernanceCompliant: boolean;
  technicalDocumentationLogged: boolean;
  humanOversightMechanismsActive: boolean;
  cybersecurityAuditPassed: boolean;
  transparencyNoticePublished: boolean;
}

export interface NistRmfMaturityScorecardDTO {
  governScore: number;
  mapScore: number;
  measureScore: number;
  manageScore: number;
  overallMaturityStage: GovernanceMaturityStage;
  compositeRmfScore: number;
}

export interface AiBoardMemorandumSectionDTO {
  sectionKey: string;
  heading: string;
  executiveSummaryText: string;
  keyMetricsBulletPoints: string[];
  strategicGovernanceGuidance: string;
}

export interface ExecutiveAiBoardMemorandumDTO {
  id: string;
  title: string;
  fiscalQuarter: string;
  status: AiBoardMemoStatus;
  compositeAiGovernanceScore: number;
  governanceStatusBand: AiGovernanceStatusBand;
  euAiActRiskTier: EuAiActRiskCategory;
  monthlyAiSpendUsd: number;
  annualizedArbitrageSavingsUsd: number;
  jailbreakVulnerabilityRatePercent: number;
  executiveSummary: AiBoardMemorandumSectionDTO;
  evaluationScorecard: AiBoardMemorandumSectionDTO;
  tokenEconomicsCascade: AiBoardMemorandumSectionDTO;
  responsibleAiGuardrails: AiBoardMemorandumSectionDTO;
  ragVectorGovernance: AiBoardMemorandumSectionDTO;
  regulatoryComplianceDirectives: AiBoardMemorandumSectionDTO;
  approvedByVpAiAt?: string;
  approvedByChiefLegalOfficerAt?: string;
  approvedByCtoAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiBoardMemoGenerateRequestDTO {
  title: string;
  fiscalQuarter: string;
  regulatoryScopeNotes?: string;
}

export interface AiGovernanceStudioOverviewDTO {
  compositeScore: number;
  statusBand: AiGovernanceStatusBand;
  euAiActRiskCategory: EuAiActRiskCategory;
  totalMonthlySpendUsd: number;
  cascadeSavingsPercent: number;
  promptCacheHitRatePercent: number;
  jailbreakVulnerabilityRatePercent: number;
  mrrScore: number;
  evaluationOverview: LlmEvaluationOverviewDTO;
  tokenEconomicsOverview: TokenEconomicsOverviewDTO;
  responsibleAiOverview: ResponsibleAiOverviewDTO;
  ragOverview: RagGovernanceOverviewDTO;
  euCompliance: EuAiActComplianceAssessmentDTO;
  nistMaturity: NistRmfMaturityScorecardDTO;
  latestBoardMemo?: ExecutiveAiBoardMemorandumDTO;
}

export function classifyAiGovernanceBand(score: number): AiGovernanceStatusBand {
  if (score >= 90.0) return 'elite_compliant';
  if (score >= 75.0) return 'managed_defensible';
  if (score >= 55.0) return 'cautionary_gap';
  return 'critical_non_compliant';
}

export function classifyEuAiActRiskTier(
  isRecruitmentOrEvaluation: boolean,
  isDirectChatInterface: boolean
): EuAiActRiskCategory {
  if (isRecruitmentOrEvaluation) return 'high_risk_employment';
  if (isDirectChatInterface) return 'specific_transparency_risk';
  return 'minimal_risk';
}

export function calculateLeaderboardScore(
  accuracyPercent: number,
  hallucinationRatePercent: number,
  semanticCoherenceScore: number,
  p95LatencyMs: number,
  throughputTokensPerSec: number
): number {
  const normAcc = Math.min(100, Math.max(0, accuracyPercent));
  const normHallucination = Math.min(100, Math.max(0, 100 - hallucinationRatePercent));
  const normCoherence = Math.min(100, Math.max(0, semanticCoherenceScore));
  const latencyScore = Math.min(100, Math.max(0, 100 - p95LatencyMs / 50));
  const throughputScore = Math.min(100, Math.max(0, (throughputTokensPerSec / 150) * 100));

  const composite =
    0.35 * normAcc +
    0.25 * normHallucination +
    0.20 * normCoherence +
    0.10 * latencyScore +
    0.10 * throughputScore;

  return Number(composite.toFixed(2));
}

export function calculatePromptCachingEfficiency(
  uncachedTokens: number,
  cachedTokens: number,
  baseInputRatePerMillion: number,
  cachedDiscountPercent: number
): {
  blendedHitRatePercent: number;
  monthlyCostAvoidedUsd: number;
  effectiveCostUsd: number;
} {
  const totalTokens = uncachedTokens + cachedTokens;
  if (totalTokens === 0) {
    return { blendedHitRatePercent: 0, monthlyCostAvoidedUsd: 0, effectiveCostUsd: 0 };
  }

  const hitRate = (cachedTokens / totalTokens) * 100;
  const standardCost = (totalTokens / 1_000_000) * baseInputRatePerMillion;
  const cachedUnitRate = baseInputRatePerMillion * (1 - cachedDiscountPercent / 100);
  const effectiveCost =
    (uncachedTokens / 1_000_000) * baseInputRatePerMillion +
    (cachedTokens / 1_000_000) * cachedUnitRate;
  const avoidedCost = Math.max(0, standardCost - effectiveCost);

  return {
    blendedHitRatePercent: Number(hitRate.toFixed(2)),
    monthlyCostAvoidedUsd: Number(avoidedCost.toFixed(2)),
    effectiveCostUsd: Number(effectiveCost.toFixed(2))
  };
}

export function calculateCascadeArbitrage(
  totalRequests: number,
  avgInputTokens: number,
  avgOutputTokens: number,
  tier1SharePercent: number,
  tier2SharePercent: number,
  tier3SharePercent: number,
  rates: {
    tier1: { input: number; output: number };
    tier2: { input: number; output: number };
    tier3: { input: number; output: number };
  },
  promptCacheHitRatePercent = 85
): CascadeSimulationResultDTO {
  const baselineCost =
    totalRequests *
    ((avgInputTokens / 1_000_000) * rates.tier3.input +
      (avgOutputTokens / 1_000_000) * rates.tier3.output);

  const t1Reqs = totalRequests * (tier1SharePercent / 100);
  const t2Reqs = totalRequests * (tier2SharePercent / 100);
  const t3Reqs = totalRequests * (tier3SharePercent / 100);

  const cacheDiscount = 0.5;
  const effectiveInputFactor = 1 - (promptCacheHitRatePercent / 100) * cacheDiscount;

  const t1Cost =
    t1Reqs *
    ((avgInputTokens / 1_000_000) * rates.tier1.input * effectiveInputFactor +
      (avgOutputTokens / 1_000_000) * rates.tier1.output);

  const t2Cost =
    t2Reqs *
    ((avgInputTokens / 1_000_000) * rates.tier2.input * effectiveInputFactor +
      (avgOutputTokens / 1_000_000) * rates.tier2.output);

  const t3Cost =
    t3Reqs *
    ((avgInputTokens / 1_000_000) * rates.tier3.input * effectiveInputFactor +
      (avgOutputTokens / 1_000_000) * rates.tier3.output);

  const optimizedCost = t1Cost + t2Cost + t3Cost;
  const uncachedOptimizedCost =
    t1Reqs * ((avgInputTokens / 1_000_000) * rates.tier1.input + (avgOutputTokens / 1_000_000) * rates.tier1.output) +
    t2Reqs * ((avgInputTokens / 1_000_000) * rates.tier2.input + (avgOutputTokens / 1_000_000) * rates.tier2.output) +
    t3Reqs * ((avgInputTokens / 1_000_000) * rates.tier3.input + (avgOutputTokens / 1_000_000) * rates.tier3.output);

  const cachingSavings = Math.max(0, uncachedOptimizedCost - optimizedCost);
  const totalSavings = Math.max(0, baselineCost - optimizedCost);
  const savingsPct = baselineCost > 0 ? (totalSavings / baselineCost) * 100 : 0;

  return {
    baselineFrontierOnlySpendUsd: Number(baselineCost.toFixed(2)),
    optimizedCascadeSpendUsd: Number(optimizedCost.toFixed(2)),
    promptCachingSavingsUsd: Number(cachingSavings.toFixed(2)),
    netMonthlySpendUsd: Number(optimizedCost.toFixed(2)),
    totalMonthlySavingsUsd: Number(totalSavings.toFixed(2)),
    savingsPercentage: Number(savingsPct.toFixed(2)),
    tier1CostUsd: Number(t1Cost.toFixed(2)),
    tier2CostUsd: Number(t2Cost.toFixed(2)),
    tier3CostUsd: Number(t3Cost.toFixed(2))
  };
}

export function maskSensitivePiiTokens(
  rawText: string,
  rules: PiiMaskingRuleDTO[],
  strategy: PiiRedactionStrategy
): PiiMaskingTestResultDTO {
  let sanitized = rawText;
  const detectedEntities: PiiMaskingTestResultDTO['redactedEntities'] = [];

  for (const rule of rules) {
    if (!rule.isEnabled) continue;
    try {
      const regex = new RegExp(rule.regexPattern, 'gi');
      let match: RegExpExecArray | null;
      while ((match = regex.exec(rawText)) !== null) {
        const snippet = match[0];
        let replacement = rule.replacementMask;
        if (strategy === 'synthetic_token') {
          replacement = `[SYNTHETIC_${rule.entityType.toUpperCase()}_${detectedEntities.length + 1}]`;
        } else if (strategy === 'pseudonymized_hash') {
          let hash = 0;
          for (let i = 0; i < snippet.length; i++) {
            hash = (hash << 5) - hash + snippet.charCodeAt(i);
            hash |= 0;
          }
          replacement = `[HASH_${Math.abs(hash).toString(16).slice(0, 8)}]`;
        }

        detectedEntities.push({
          type: rule.entityType,
          matchedSnippet: snippet,
          startIndex: match.index,
          endIndex: match.index + snippet.length,
          confidence: rule.detectionConfidenceThreshold
        });

        sanitized = sanitized.replace(snippet, replacement);
      }
    } catch {
      continue;
    }
  }

  return {
    originalText: rawText,
    sanitizedText: sanitized,
    detectedEntitiesCount: detectedEntities.length,
    redactedEntities: detectedEntities
  };
}

export function calculateRagRetrievalMetrics(
  retrievalResults: Array<{ queryId: string; retrievedDocIds: string[]; groundTruthDocId: string }>,
  topK = 10
): RagRetrievalMetricsDTO {
  if (retrievalResults.length === 0) {
    return {
      hitRateAt5Percent: 0,
      hitRateAt10Percent: 0,
      meanReciprocalRank: 0,
      ndcgAt10: 0,
      contextWindowChunkDensityTokens: 512,
      chunkOverlapTokens: 64,
      averageRetrievalLatencyMs: 42
    };
  }

  let hitsAt5 = 0;
  let hitsAt10 = 0;
  let reciprocalRankSum = 0;
  let ndcgSum = 0;

  for (const item of retrievalResults) {
    const rankIndex = item.retrievedDocIds.indexOf(item.groundTruthDocId);
    if (rankIndex >= 0 && rankIndex < 5) hitsAt5++;
    if (rankIndex >= 0 && rankIndex < 10) hitsAt10++;

    if (rankIndex >= 0) {
      reciprocalRankSum += 1 / (rankIndex + 1);
      ndcgSum += 1 / Math.log2(rankIndex + 2);
    }
  }

  const n = retrievalResults.length;
  return {
    hitRateAt5Percent: Number(((hitsAt5 / n) * 100).toFixed(2)),
    hitRateAt10Percent: Number(((hitsAt10 / n) * 100).toFixed(2)),
    meanReciprocalRank: Number((reciprocalRankSum / n).toFixed(4)),
    ndcgAt10: Number((ndcgSum / n).toFixed(4)),
    contextWindowChunkDensityTokens: 512,
    chunkOverlapTokens: 64,
    averageRetrievalLatencyMs: 38.5
  };
}

export function calculateCompositeAiGovernanceScore(params: {
  evalAccuracyPercent: number;
  evalHallucinationPercent: number;
  tokenBudgetCompliancePercent: number;
  cacheEfficiencyPercent: number;
  jailbreakDefenseScore: number;
  piiRedactionAccuracyPercent: number;
  ragNdcgScore: number;
  euAiActCompliancePercent: number;
  nistMaturityPercent: number;
}): { compositeScore: number; statusBand: AiGovernanceStatusBand } {
  const evalPillar =
    0.6 * params.evalAccuracyPercent + 0.4 * (100 - params.evalHallucinationPercent);
  const economicsPillar =
    0.5 * params.tokenBudgetCompliancePercent + 0.5 * params.cacheEfficiencyPercent;
  const responsiblePillar =
    0.5 * params.jailbreakDefenseScore + 0.5 * params.piiRedactionAccuracyPercent;
  const ragPillar = params.ragNdcgScore * 100;
  const compliancePillar =
    0.5 * params.euAiActCompliancePercent + 0.5 * params.nistMaturityPercent;

  const composite =
    0.25 * evalPillar +
    0.20 * economicsPillar +
    0.25 * responsiblePillar +
    0.15 * ragPillar +
    0.15 * compliancePillar;

  const bounded = Number(Math.min(100, Math.max(0, composite)).toFixed(2));
  return {
    compositeScore: bounded,
    statusBand: classifyAiGovernanceBand(bounded)
  };
}

export function generateExecutiveAiBoardMemorandumMarkdown(memo: ExecutiveAiBoardMemorandumDTO): string {
  const fmt = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

  return `# Executive AI Governance, LLM Systems & Responsible AI Board Memorandum
**Document Title:** ${memo.title}
**Fiscal Period:** ${memo.fiscalQuarter} | **Status:** ${memo.status.toUpperCase()}
**Composite AI Governance Score (AGS):** ${memo.compositeAiGovernanceScore} / 100 (${memo.governanceStatusBand.replace(/_/g, ' ').toUpperCase()})
**EU AI Act Regulatory Classification:** ${memo.euAiActRiskTier.replace(/_/g, ' ').toUpperCase()} (Annex III High-Risk Employment AI)
**Current Monthly AI Inference Run-Rate:** ${fmt(memo.monthlyAiSpendUsd)}
**Annualized Cascade Arbitrage Savings:** ${fmt(memo.annualizedArbitrageSavingsUsd)}
**Jailbreak Vulnerability Rate (JVR):** ${memo.jailbreakVulnerabilityRatePercent.toFixed(2)}% (Target: <= 1.0%)

---

## ${memo.executiveSummary.heading}
${memo.executiveSummary.executiveSummaryText}

### Key Strategic Highlights:
${memo.executiveSummary.keyMetricsBulletPoints.map((pt) => `- ${pt}`).join('\n')}

> **Executive Recommendation:** ${memo.executiveSummary.strategicGovernanceGuidance}

---

## ${memo.evaluationScorecard.heading}
${memo.evaluationScorecard.executiveSummaryText}

### Benchmark Leaderboard & Accuracy Metrics:
${memo.evaluationScorecard.keyMetricsBulletPoints.map((pt) => `- ${pt}`).join('\n')}

> **Model Selection Directive:** ${memo.evaluationScorecard.strategicGovernanceGuidance}

---

## ${memo.tokenEconomicsCascade.heading}
${memo.tokenEconomicsCascade.executiveSummaryText}

### Inference Cost Optimization & Prompt Caching:
${memo.tokenEconomicsCascade.keyMetricsBulletPoints.map((pt) => `- ${pt}`).join('\n')}

> **Financial Engineering Directive:** ${memo.tokenEconomicsCascade.strategicGovernanceGuidance}

---

## ${memo.responsibleAiGuardrails.heading}
${memo.responsibleAiGuardrails.executiveSummaryText}

### Security Hardening & PII Protection:
${memo.responsibleAiGuardrails.keyMetricsBulletPoints.map((pt) => `- ${pt}`).join('\n')}

> **Defensive Mandate:** ${memo.responsibleAiGuardrails.strategicGovernanceGuidance}

---

## ${memo.ragVectorGovernance.heading}
${memo.ragVectorGovernance.executiveSummaryText}

### Retrieval Quality & Embedding Telemetry:
${memo.ragVectorGovernance.keyMetricsBulletPoints.map((pt) => `- ${pt}`).join('\n')}

> **Knowledge Governance Directive:** ${memo.ragVectorGovernance.strategicGovernanceGuidance}

---

## ${memo.regulatoryComplianceDirectives.heading}
${memo.regulatoryComplianceDirectives.executiveSummaryText}

### EU AI Act & NIST AI RMF Sign-Off Actions:
${memo.regulatoryComplianceDirectives.keyMetricsBulletPoints.map((pt) => `- ${pt}`).join('\n')}

> **Legal Audit Finding:** ${memo.regulatoryComplianceDirectives.strategicGovernanceGuidance}

---

### Governance Sign-Off Matrix:
- **VP of AI / Head of Machine Learning:** ${memo.approvedByVpAiAt ? `Approved (${memo.approvedByVpAiAt})` : 'Pending Sign-Off'}
- **Chief Legal Officer / General Counsel:** ${memo.approvedByChiefLegalOfficerAt ? `Approved (${memo.approvedByChiefLegalOfficerAt})` : 'Pending Sign-Off'}
- **Chief Technology Officer:** ${memo.approvedByCtoAt ? `Approved (${memo.approvedByCtoAt})` : 'Pending Sign-Off'}

*Authored autonomously by JobTrack Executive AI Governance, LLM Evaluation & Responsible AI Command Studio.*`;
}

export function validateLlmEvaluationInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu đánh giá LLM không hợp lệ.' } };
  }
  const data = input as Partial<EvaluationRunRequestDTO>;
  if (!data.domain || !['job_matching', 'interview_rubric', 'code_generation', 'resume_parsing'].includes(data.domain)) {
    errors.domain = 'Vui lòng chọn lĩnh vực đánh giá hợp lệ.';
  }
  if (!Array.isArray(data.models) || data.models.length === 0) {
    errors.models = 'Vui lòng chọn ít nhất một mô hình LLM để đánh giá.';
  }
  if (typeof data.sampleSize !== 'number' || data.sampleSize < 10 || data.sampleSize > 5000) {
    errors.sampleSize = 'Kích thước mẫu thử nghiệm phải từ 10 đến 5000 mẫu.';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateCascadeSimulationInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu mô phỏng cascade không hợp lệ.' } };
  }
  const data = input as Partial<ModelCascadeSimulationRequestDTO>;
  if (typeof data.monthlyTotalRequests !== 'number' || data.monthlyTotalRequests <= 0) {
    errors.monthlyTotalRequests = 'Tổng số yêu cầu hàng tháng phải lớn hơn 0.';
  }
  const sumShare = (data.tier1RoutingPercent ?? 0) + (data.tier2RoutingPercent ?? 0) + (data.tier3RoutingPercent ?? 0);
  if (Math.abs(sumShare - 100) > 0.1) {
    errors.routingShare = 'Tổng tỷ lệ định tuyến 3 tầng phải bằng chính xác 100%.';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateGuardrailThresholds(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu cấu hình guardrails không hợp lệ.' } };
  }
  const data = input as Partial<GuardrailThresholdsDTO>;
  if (typeof data.toxicityMaxAllowedScore !== 'number' || data.toxicityMaxAllowedScore < 0 || data.toxicityMaxAllowedScore > 100) {
    errors.toxicityMaxAllowedScore = 'Ngưỡng độc hại tối đa phải nằm trong khoảng 0 đến 100.';
  }
  if (typeof data.demographicBiasParityMinScore !== 'number' || data.demographicBiasParityMinScore < 50 || data.demographicBiasParityMinScore > 100) {
    errors.demographicBiasParityMinScore = 'Chỉ số bình đẳng thiên vị nhân khẩu học tối thiểu phải từ 50 đến 100.';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateVectorIndexConfig(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu chỉ mục vector không hợp lệ.' } };
  }
  const data = input as Partial<VectorIndexTelemetryDTO>;
  if (!data.indexName || typeof data.indexName !== 'string' || !data.indexName.trim()) {
    errors.indexName = 'Vui lòng nhập tên chỉ mục vector.';
  }
  if (!data.dimensionality || ![1024, 1536, 3072].includes(data.dimensionality)) {
    errors.dimensionality = 'Số chiều vector phải là 1024, 1536 hoặc 3072.';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateAiBoardMemoGenerateInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu tạo bản ghi nhớ HĐQT không hợp lệ.' } };
  }
  const data = input as Partial<AiBoardMemoGenerateRequestDTO>;
  if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
    errors.title = 'Vui lòng nhập tiêu đề bản ghi nhớ HĐQT.';
  }
  if (!data.fiscalQuarter || typeof data.fiscalQuarter !== 'string' || !data.fiscalQuarter.trim()) {
    errors.fiscalQuarter = 'Vui lòng nhập quý tài chính.';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}
