import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  classifyNineBox,
  calculateNineBoxScore,
  calculateCalibrationDistribution,
  calculateKeyPersonRiskIndex,
  calculateFlightRisk,
  evaluateRetentionInterventionTriggers,
  calculateBenchDepthMetrics,
  calculateCompetencyGap,
  calculateSuccessionHealthScore,
  generateBoardSuccessionMemorandumMarkdown
} from './domain';
import { successionPipelineStudioRepository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Succession Pipeline Studio Domain & Repository', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('correctly maps 9-box classifications and calibration scores', () => {
    expect(classifyNineBox(3, 3)).toBe('star');
    expect(classifyNineBox(3, 2)).toBe('high_performer');
    expect(classifyNineBox(2, 3)).toBe('high_potential');
    expect(classifyNineBox(2, 2)).toBe('core_player');
    expect(classifyNineBox(1, 1)).toBe('underperformer_risk');

    expect(calculateNineBoxScore(3, 3)).toBe(100);
    expect(calculateNineBoxScore(1, 1)).toBe(0);
    expect(calculateNineBoxScore(2, 2)).toBe(50);
  });

  it('computes calibration distribution and health score', () => {
    const profiles = [
      { nineBoxClassification: 'star' as const },
      { nineBoxClassification: 'core_player' as const },
      { nineBoxClassification: 'high_potential' as const },
      { nineBoxClassification: 'high_performer' as const },
      { nineBoxClassification: 'solid_professional' as const },
      { nineBoxClassification: 'effective' as const },
      { nineBoxClassification: 'underperformer_risk' as const },
      { nineBoxClassification: 'dilemma' as const },
      { nineBoxClassification: 'core_player' as const },
      { nineBoxClassification: 'core_player' as const }
    ];

    const dist = calculateCalibrationDistribution(profiles);
    expect(dist.totalTalentCount).toBe(10);
    expect(dist.starsCount).toBe(1);
    expect(dist.starsPercentage).toBe(10);
    expect(dist.coreGrowthCount).toBe(7);
    expect(dist.coreGrowthPercentage).toBe(70);
    expect(dist.actionRiskCount).toBe(2);
    expect(dist.actionRiskPercentage).toBe(20);
    expect(dist.calibrationHealthScore).toBe(100);
  });

  it('calculates key person risk index and predictive flight risk', () => {
    const kpri = calculateKeyPersonRiskIndex(5, 5, 5);
    expect(kpri.index).toBe(100);
    expect(kpri.tier).toBe('critical_spof');

    const flight = calculateFlightRisk(1.2, 1.0, 36, 0.1);
    expect(flight.score).toBeLessThan(30);
    expect(flight.level).toBe('low');

    const triggers = evaluateRetentionInterventionTriggers({
      compaRatio: 0.75,
      yearsInRole: 3.5,
      monthsToCliff: 4,
      orgChangeImpact: 0.8,
      spofSeverity: 5,
      operationalCriticality: 5,
      replacementDifficulty: 4,
      performanceLevel: 3,
      potentialLevel: 3
    });
    expect(triggers.length).toBeGreaterThanOrEqual(2);
    expect(triggers.some(t => t.playbookType === 'retention_equity_refresh')).toBe(true);
  });

  it('evaluates bench depth ratio, vulnerability, and diversity', () => {
    const roles = [
      {
        operationalCriticality: 5,
        successors: [
          { readinessHorizon: 'ready_now' as const, underrepresentedLeader: true },
          { readinessHorizon: 'ready_1_2_years' as const, underrepresentedLeader: false }
        ]
      },
      {
        operationalCriticality: 4,
        successors: [
          { readinessHorizon: 'emergency_interim' as const, underrepresentedLeader: true }
        ]
      }
    ];

    const bench = calculateBenchDepthMetrics(roles);
    expect(bench.totalCriticalRoles).toBe(2);
    expect(bench.totalSuccessorsIdentified).toBe(3);
    expect(bench.benchDepthRatio).toBe(1.5);
    expect(bench.emergencyVulnerableRoleCount).toBe(1);
    expect(bench.emergencyVulnerabilityIndex).toBe(50);
    expect(bench.successionDiversityIndex).toBe(66.7);
    expect(bench.isBenchHealthy).toBe(false);
  });

  it('computes competency coverage index and succession health score', () => {
    const current = [
      { domain: 'strategic_vision' as const, score: 3.5 },
      { domain: 'operational_execution' as const, score: 4.5 },
      { domain: 'people_leadership_culture' as const, score: 4.0 },
      { domain: 'financial_business_acumen' as const, score: 3.0 },
      { domain: 'ai_technology_innovation' as const, score: 4.5 }
    ];
    const target = [
      { domain: 'strategic_vision' as const, score: 4.5 },
      { domain: 'operational_execution' as const, score: 4.5 },
      { domain: 'people_leadership_culture' as const, score: 4.5 },
      { domain: 'financial_business_acumen' as const, score: 4.5 },
      { domain: 'ai_technology_innovation' as const, score: 4.5 }
    ];

    const gapResult = calculateCompetencyGap(current, target);
    expect(gapResult.scores.length).toBe(5);
    expect(gapResult.coverageIndex).toBeGreaterThan(80);

    const health = calculateSuccessionHealthScore({
      benchDepthRatio: 2.2,
      emergencyVulnerabilityIndex: 10,
      averageKpri: 35,
      averageCci: 88,
      calibrationHealthScore: 92
    });
    expect(health.score).toBeGreaterThan(70);
    expect(health.tier).toBe('stable_continuity');
  });

  it('executes full repository lifecycle in demo offline mode', async () => {
    const overview = await successionPipelineStudioRepository.getOverview();
    expect(overview.plan).toBeDefined();
    expect(overview.talentProfiles.length).toBeGreaterThanOrEqual(8);
    expect(overview.benchDepth.totalCriticalRoles).toBeGreaterThanOrEqual(4);

    const newProfile = await successionPipelineStudioRepository.createTalentProfile({
      employeeId: 'TEST-01',
      fullName: 'Test Leader',
      currentRole: 'VP of Product',
      department: 'Product',
      tenureYears: 2.5,
      yearsInCurrentRole: 1.5,
      performanceLevel: 3,
      potentialLevel: 3,
      totalDirectCompensationUsd: 350000,
      marketBenchmarkP75Usd: 340000,
      unvestedEquityValueUsd: 500000,
      monthsToEquityCliff: 16,
      organizationalChangeImpact: 0.2,
      spofSeverity: 3,
      operationalCriticality: 4,
      replacementDifficulty: 3,
      underrepresentedLeader: true
    });
    expect(newProfile.nineBoxClassification).toBe('star');

    const intervention = await successionPipelineStudioRepository.createIntervention({
      talentProfileId: newProfile.id,
      playbookType: 'retention_equity_refresh',
      title: 'Target Refresh',
      description: 'Retention grant',
      proposedCostUsd: 80000,
      status: 'proposed',
      triggerRationale: 'Key person retention',
      targetCompletionDate: '2026-12-31'
    });
    expect(intervention.title).toBe('Target Refresh');

    const updatedIntervention = await successionPipelineStudioRepository.updateInterventionStatus(
      intervention.id,
      'approved',
      'CPO'
    );
    expect(updatedIntervention.status).toBe('approved');

    const updatedPlan = await successionPipelineStudioRepository.signOffPlan(
      overview.plan.id,
      'ceo',
      'Final Board Approval'
    );
    expect(updatedPlan.signOffs.find(s => s.role === 'ceo')?.isApproved).toBe(true);
    expect(updatedPlan.boardMemorandumMarkdown).toContain('Executive Board Memorandum');
  });
});
