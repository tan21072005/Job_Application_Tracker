import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateFairRiskMetrics,
  calculateVulnerabilityPriority,
  calculateAttackSurfaceRating,
  calculateDarkWebExposureIndex,
  calculateNistComplianceMetrics,
  calculateTabletopResilience,
  determineSecMateriality,
  calculateCompositeSecurityScore,
  generateBoardCyberMemorandumMarkdown
} from './domain';
import { cyberRiskGovernanceStudioRepository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Cyber Risk Governance Studio Domain & Repository', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calculates FAIR quantitative risk metrics and log-normal financial VaR-95', () => {
    const fair = calculateFairRiskMetrics({
      contactFrequency: 14.0,
      probabilityOfAction: 0.35,
      threatCapability: 75,
      resistanceStrength: 65,
      primaryLossMinUsd: 250000,
      primaryLossLikelyUsd: 750000,
      primaryLossMaxUsd: 2500000,
      secondaryLossMinUsd: 500000,
      secondaryLossLikelyUsd: 1500000,
      secondaryLossMaxUsd: 5000000,
      inherentAleUsd: 15000000
    });

    expect(fair.threatEventFrequency).toBe(4.9);
    expect(fair.vulnerabilityPercent).toBe(55);
    expect(fair.lossEventFrequency).toBe(2.695);
    expect(fair.singleLossExpectancyExpectedUsd).toBeGreaterThan(2000000);
    expect(fair.annualizedLossExpectancyUsd).toBeGreaterThan(5000000);
    expect(fair.valueAtRisk95PercentUsd).toBeGreaterThan(fair.annualizedLossExpectancyUsd);
    expect(fair.riskReductionRatio).toBeGreaterThan(0);
    expect(fair.riskReductionRatio).toBeLessThanOrEqual(1.0);
  });

  it('prioritizes vulnerabilities based on CVSS, EPSS probability, and CISA KEV', () => {
    const kevCrit = calculateVulnerabilityPriority(10.0, 0.94, true);
    expect(kevCrit.priorityTier).toBe('critical');
    expect(kevCrit.compositeRiskScore).toBeGreaterThanOrEqual(90);

    const highVuln = calculateVulnerabilityPriority(8.6, 0.42, true);
    expect(highVuln.priorityTier).toBe('critical');

    const medVuln = calculateVulnerabilityPriority(5.9, 0.08, false);
    expect(medVuln.priorityTier).toBe('medium');

    const lowVuln = calculateVulnerabilityPriority(2.5, 0.01, false);
    expect(lowVuln.priorityTier).toBe('low');
  });

  it('evaluates perimeter attack surface rating and dark web credential exposure', () => {
    const asr = calculateAttackSurfaceRating({
      exposedPortsCount: 8,
      shadowItDomainsCount: 3,
      cloudMisconfigurationsCount: 2,
      criticalVulnerabilitiesCount: 3
    });
    expect(asr).toBeGreaterThan(40);
    expect(asr).toBeLessThanOrEqual(100);

    const darkWebItems = [
      {
        hasPlaintextPassword: false,
        hasSessionToken: true,
        isVipExecutive: true,
        exposureDate: new Date().toISOString()
      },
      {
        hasPlaintextPassword: true,
        hasSessionToken: false,
        isVipExecutive: false,
        exposureDate: new Date().toISOString()
      }
    ];

    const clei = calculateDarkWebExposureIndex(darkWebItems);
    expect(clei).toBeGreaterThan(15);
    expect(clei).toBeLessThanOrEqual(100);
  });

  it('computes NIST CSF 2.0 multi-framework compliance maturity and audit defensibility', () => {
    const controls = [
      { functionCode: 'govern' as const, maturityNumericTier: 3, hasVerifiedEvidence: true },
      { functionCode: 'identify' as const, maturityNumericTier: 3, hasVerifiedEvidence: true },
      { functionCode: 'protect' as const, maturityNumericTier: 2, hasVerifiedEvidence: false },
      { functionCode: 'detect' as const, maturityNumericTier: 3, hasVerifiedEvidence: true },
      { functionCode: 'respond' as const, maturityNumericTier: 3, hasVerifiedEvidence: true },
      { functionCode: 'recover' as const, maturityNumericTier: 3, hasVerifiedEvidence: true }
    ];

    const nist = calculateNistComplianceMetrics(controls);
    expect(nist.overallMaturityAverage).toBeCloseTo(2.83, 1);
    expect(nist.auditDefensibilityScore).toBeGreaterThan(60);
    expect(nist.functionSummaries.govern.tierClassification).toBe('tier_3_repeatable');
    expect(nist.functionSummaries.protect.evidenceCoveragePercent).toBe(0);
    expect(nist.functionSummaries.detect.evidenceCoveragePercent).toBe(100);
  });

  it('evaluates tabletop ransomware resilience and SEC Item 1.05 materiality determination', () => {
    const resilience = calculateTabletopResilience({
      immutableBackupScore: 85,
      airgapIsolationScore: 80,
      rtoRpoDrillScore: 90,
      pamSegregationScore: 75,
      meanTimeToDetectHours: 1.2,
      meanTimeToContainHours: 3.5,
      simulatedTotalLossUsd: 8500000,
      insurancePrimaryLimitUsd: 15000000
    });

    expect(resilience.ransomwareResilienceIndex).toBe(83);
    expect(resilience.insuranceCoverageGapUsd).toBe(0);
    expect(resilience.insurabilityReadinessScore).toBeGreaterThan(80);

    const nonMaterial = determineSecMateriality({
      estimatedFinancialLossUsd: 350000,
      annualRevenueThresholdUsd: 10000000,
      detectionTimestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      determinationTimestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      piiExfiltratedRecordCount: 0,
      criticalSystemsDowntimeHours: 0,
      intellectualPropertyCompromised: false,
      regulatorySanctionsProbable: false,
      reputationalDamageHigh: false
    });

    expect(nonMaterial.isMaterial).toBe(false);
    expect(nonMaterial.status).toBe('non_material');
    expect(nonMaterial.disclosureClockRemainingHours).toBe(94);
    expect(nonMaterial.isClockBreached).toBe(false);
  });

  it('supports full dual runtime parity and tripartite sign-offs via repository', async () => {
    const overview = await cyberRiskGovernanceStudioRepository.getOverview();
    expect(overview.scenarios.length).toBeGreaterThanOrEqual(3);
    expect(overview.threatLandscape.vulnerabilities.length).toBeGreaterThanOrEqual(4);
    expect(overview.complianceMatrix.controls.length).toBeGreaterThanOrEqual(6);

    const createdScenario = await cyberRiskGovernanceStudioRepository.createScenario({
      title: 'Active Directory Kerberoasting Attack',
      category: 'credential_stuffing_account_takeover',
      assetName: 'Domain Controller Fleet',
      threatActor: 'Volt Typhoon',
      contactFrequency: 10.0,
      probabilityOfAction: 0.3,
      threatCapability: 80,
      resistanceStrength: 70,
      primaryLossMinUsd: 100000,
      primaryLossLikelyUsd: 300000,
      primaryLossMaxUsd: 1000000,
      secondaryLossMinUsd: 200000,
      secondaryLossLikelyUsd: 600000,
      secondaryLossMaxUsd: 2000000,
      inherentAleUsd: 3000000
    });
    expect(createdScenario.title).toBe('Active Directory Kerberoasting Attack');

    const createdVuln = await cyberRiskGovernanceStudioRepository.createVulnerability({
      cveId: 'CVE-2024-5555',
      title: 'Cloud Hypervisor Escape',
      cvssScore: 9.9,
      epssProbability: 0.85,
      epssPercentile: 0.99,
      cisaKevStatus: true,
      affectedAsset: 'MicroVM Isolation Layer',
      component: 'cloud-hypervisor',
      remediationStatus: 'open',
      patchDueDate: '2026-11-20'
    });
    expect(createdVuln.priorityTier).toBe('critical');

    const signedMemo = await cyberRiskGovernanceStudioRepository.signOffMemorandum(
      overview.activeMemorandum.id,
      {
        role: 'chief_legal_officer',
        signatoryName: 'Elena Rostova, JD',
        signatoryTitle: 'Chief Legal Officer',
        attestationRemarks: 'Materiality determination approved.'
      }
    );
    expect(signedMemo.signOffs.some(s => s.role === 'chief_legal_officer' && s.isApproved)).toBe(true);

    await cyberRiskGovernanceStudioRepository.deleteScenario(createdScenario.id);
    await cyberRiskGovernanceStudioRepository.deleteVulnerability(createdVuln.id);
  });
});
