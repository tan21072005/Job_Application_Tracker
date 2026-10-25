import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateWolfpackCoordinationIndex,
  calculateActivistVulnerabilityScore,
  calculatePoisonPillDilution,
  simulateUniversalProxyContest,
  calculateSettleVsFightValue
} from './domain';
import { shareholderActivismNexusRepository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Shareholder Activism Defense & Boardroom Governance Nexus', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('computes Wolfpack Coordination Index within bounds and captures syndicate concentration', () => {
    const empty = calculateWolfpackCoordinationIndex([], 30);
    expect(empty).toBe(0.0);

    const coordinated = calculateWolfpackCoordinationIndex(
      [
        { ownershipPercentage: 4.85, derivativeExposurePercentage: 1.50, coordinationCorrelationScore: 92 },
        { ownershipPercentage: 3.00, derivativeExposurePercentage: 0.65, coordinationCorrelationScore: 84 },
        { ownershipPercentage: 1.80, derivativeExposurePercentage: 0.00, coordinationCorrelationScore: 76 }
      ],
      30
    );
    expect(coordinated).toBeGreaterThan(20.0);
    expect(coordinated).toBeLessThanOrEqual(100.0);
  });

  it('evaluates Activist Vulnerability Scorecard across multi-vector dimensions', () => {
    const low = calculateActivistVulnerabilityScore(15, 20, 10, 25, 20);
    expect(low.vulnerabilityRiskBand).toBe('low_vulnerability');
    expect(low.compositeVulnerabilityScore).toBeLessThan(40);

    const elevated = calculateActivistVulnerabilityScore(72.5, 68.0, 81.0, 55.0, 62.0);
    expect(elevated.vulnerabilityRiskBand).toBe('elevated_activist_target');
    expect(elevated.compositeVulnerabilityScore).toBeGreaterThanOrEqual(60);
    expect(elevated.compositeVulnerabilityScore).toBeLessThan(75);

    const acute = calculateActivistVulnerabilityScore(90, 88, 95, 80, 85);
    expect(acute.vulnerabilityRiskBand).toBe('acute_vulnerability_crisis');
    expect(acute.compositeVulnerabilityScore).toBeGreaterThanOrEqual(75);
  });

  it('calculates Poison Pill Flip-In Dilution and economic deterrence impact', () => {
    const pill = calculatePoisonPillDilution(100000000, 15.0, 120, 50, 50);
    expect(pill.postDilutionAcquirerPct).toBeLessThan(15.0);
    expect(pill.dilutionFactor).toBeGreaterThan(1.5);
    expect(pill.nonAcquirerGainPct).toBeGreaterThan(85.0);
    expect(pill.economicDeterrenceEffect).toBeDefined();
  });

  it('simulates Universal Proxy Contest vote tallies based on ISS and Glass Lewis recommendations', () => {
    const cohorts = [
      { votingPowerPercentage: 20.0, historicalManagementSupportRate: 90.0, issAlignmentProbability: 95.0, glassLewisAlignmentProbability: 90.0 },
      { votingPowerPercentage: 30.0, historicalManagementSupportRate: 60.0, issAlignmentProbability: 70.0, glassLewisAlignmentProbability: 70.0 },
      { votingPowerPercentage: 10.0, historicalManagementSupportRate: 0.0, issAlignmentProbability: 10.0, glassLewisAlignmentProbability: 10.0 },
      { votingPowerPercentage: 40.0, historicalManagementSupportRate: 75.0, issAlignmentProbability: 25.0, glassLewisAlignmentProbability: 20.0 }
    ];

    const mgmtWin = simulateUniversalProxyContest(cohorts, 'support_management_slate', 'support_management_slate', 3);
    expect(mgmtWin.managementWinProbability).toBeGreaterThan(50.0);
    expect(mgmtWin.projectedDissidentSeatsWon).toBeLessThanOrEqual(1);

    const hostilePressure = simulateUniversalProxyContest(cohorts, 'support_dissident_slate', 'support_dissident_slate', 3);
    expect(hostilePressure.dissidentWinProbability).toBeGreaterThan(mgmtWin.dissidentWinProbability);
  });

  it('calculates Settle vs Fight Enterprise Value optimization', () => {
    const analysis = calculateSettleVsFightValue(3.8, -1.5, 32400000000, 18000000);
    expect(analysis.netAdvantageUsd).toBeGreaterThan(0);
    expect(analysis.recommendedCourse).toBe('execute_standstill_settlement');
  });

  it('executes full repository lifecycle: overview, campaign, wolfpack, rights plan, nominee, and tripartite signoff', async () => {
    const overview = await shareholderActivismNexusRepository.getOverview();
    expect(overview.targetCorporation.ticker).toBe('TGT');
    expect(overview.primaryCampaign.percentageOwnership).toBe(7.85);
    expect(overview.wolfpackAccumulations.length).toBeGreaterThanOrEqual(3);
    expect(overview.vulnerabilityAudit.compositeVulnerabilityScore).toBeGreaterThan(0);
    expect(overview.sotpSegments.length).toBe(4);
    expect(overview.institutionalCohorts.length).toBe(9);
    expect(overview.proxyAdvisorEvaluations.length).toBe(2);

    const newCamp = await shareholderActivismNexusRepository.createCampaign({
      activistFundName: 'Pershing Square Capital',
      leadPartnerName: 'Bill Ackman',
      campaignPhase: 'formal_proxy_contest',
      threatTier: 'tier_1_hostile_wolfpack',
      primaryDemand: 'operational_cost_reduction',
      sharesHeldCount: 9000000,
      percentageOwnership: 9.0,
      syntheticSwapPercentage: 1.5,
      schedule13dFilingDate: '2026-10-22',
      demandSummary: 'Demanding board seat and corporate overhead restructuring'
    });
    expect(newCamp.id).toBeDefined();
    expect(newCamp.activistFundName).toBe('Pershing Square Capital');

    const newWolf = await shareholderActivismNexusRepository.registerWolfpackAccumulation({
      campaignId: newCamp.id,
      fundName: 'Gotham Arbitrage Alpha',
      ownershipPercentage: 3.5,
      derivativeExposurePercentage: 1.0,
      accumulationVelocitySharesPerDay: 40000,
      coordinationCorrelationScore: 88,
      schedule13dCrossDate: '2026-10-20'
    });
    expect(newWolf.id).toBeDefined();

    const deployedPill = await shareholderActivismNexusRepository.deployRightsPlan({
      planName: 'Titan Emergency 2026 Rights Plan',
      flipInThresholdPercentage: 15.0,
      exercisePriceUsd: 120.0,
      discountPercentage: 50.0,
      expirationDate: '2027-10-24'
    });
    expect(deployedPill.status).toBe('active_in_place');

    const nominee = await shareholderActivismNexusRepository.recordNomineeComparison({
      seatNumber: 4,
      incumbentName: 'Sarah Jenkins',
      incumbentYearsServed: 6,
      incumbentCommitteeRoles: 'Risk & Audit',
      incumbentSkills: 'Securities Law',
      dissidentName: 'Arthur Vance',
      dissidentAffiliation: 'Pershing Square',
      dissidentExpertise: 'Hostile Spin-offs',
      proxyAdvisorRecommendedSlate: 'incumbent'
    });
    expect(nominee.seatNumber).toBe(4);

    const s1 = await shareholderActivismNexusRepository.submitTripartiteSignoff(
      newCamp.id,
      'lead_independent_director',
      'Margaret Holloway',
      'Lead director review complete'
    );
    expect(s1.leadDirectorSignoff.isSigned).toBe(true);
    expect(s1.isFullyRatified).toBe(false);

    const s2 = await shareholderActivismNexusRepository.submitTripartiteSignoff(
      newCamp.id,
      'nominating_governance_chair',
      'David Montgomery',
      'Governance chair review complete'
    );
    expect(s2.governanceChairSignoff.isSigned).toBe(true);
    expect(s2.isFullyRatified).toBe(false);

    const s3 = await shareholderActivismNexusRepository.submitTripartiteSignoff(
      newCamp.id,
      'board_chair_ceo',
      'Elena Rostova',
      'Board chair ratification authorized'
    );
    expect(s3.boardChairCeoSignoff.isSigned).toBe(true);
    expect(s3.isFullyRatified).toBe(true);
    expect(s3.cryptographicIntegrityHash).toBeDefined();

    const resetOverview = await shareholderActivismNexusRepository.resetDemo();
    expect(resetOverview.targetCorporation.ticker).toBe('TGT');
  });
});
