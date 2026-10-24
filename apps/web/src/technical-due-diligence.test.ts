import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { technicalDueDiligenceRepository } from './data';
import type { TechnicalDueDiligenceMutationDTO, DiligenceFindingMutationDTO } from './domain';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('technicalDueDiligenceRepository (Web Demo Mode)', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists default demo technical due diligence audit', async () => {
    const list = await technicalDueDiligenceRepository.listAudits();
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].targetCompanyName).toBe('CloudScale AI Corp');
    expect(list[0].dealSizeUsd).toBe(85000000);
    expect(list[0].scorecard.compositeRiskIndex).toBeGreaterThanOrEqual(0);
    expect(list[0].architecture.scalabilitySaturationHorizon).toBe(5.0);
    expect(list[0].cloudEconomics.cloudCogsPercentOfArr).toBe(7.5);
  });

  it('retrieves single diligence audit by id', async () => {
    const list = await technicalDueDiligenceRepository.listAudits();
    const first = list[0];
    const retrieved = await technicalDueDiligenceRepository.getAudit(first.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(first.id);
    expect(retrieved?.targetCompanyName).toBe('CloudScale AI Corp');
  });

  it('creates, recomputes, and updates a technical diligence audit', async () => {
    const mutation: TechnicalDueDiligenceMutationDTO = {
      targetCompanyName: 'DataMesh Networks',
      dealSizeUsd: 150000000,
      transactionType: 'buy_side_acquisition',
      auditLeadName: 'Elena Rostova',
      auditDate: '2026-10-25',
      architecture: {
        typology: 'microservices',
        estimatedTotalLoc: 1200000,
        costPerLocBurdened: 12.5,
        replacementCostEstimate: 15000000,
        technicalDebtRemediationCost: 2250000,
        technicalDebtRatio: 15.0,
        rtoMinutesCurrent: 90,
        rtoMinutesTarget: 30,
        rpoMinutesCurrent: 30,
        rpoMinutesTarget: 10,
        disasterRecoveryTestedRecently: false,
        spofCount: 4,
        spofCriticalityIndex: 55,
        currentPeakQps: 6000,
        maxDatabaseQps: 12000,
        scalabilitySaturationHorizon: 2.0,
        identifiedSpofs: [
          { id: 'spof-a', component: 'Master Router', type: 'ingress_routing', severity: 'critical', redundancyInPlace: false, remediationEstimateDays: 30 }
        ]
      },
      licenses: {
        openSourceContagionScore: 40,
        proprietaryCodeLinkedWithGpl: true,
        cleanRoomDocumented: false,
        contractorAssignmentsComplete: true,
        patentFtoAnalyzed: false,
        dependenciesCount: 450,
        copyleftFindingsCount: 5,
        licenseBreakdown: {
          permissiveCount: 410,
          weakCopyleftCount: 25,
          strongCopyleftCount: 15,
          networkCopyleftCount: 0,
          commercialDualCount: 0
        },
        flaggedLibraries: [
          { id: 'lib-a', packageName: 'core-crypto-asm', version: '3.0.1', license: 'AGPL-3.0', category: 'network_copyleft', usageMode: 'backend_saas', riskLevel: 'critical', remediationStrategy: 'isolate_service', remediationCost: 80000 }
        ]
      },
      cloudEconomics: {
        annualRecurringRevenue: 40000000,
        annualCloudSpendTotal: 7200000,
        cloudCogsAmount: 6400000,
        cloudCogsPercentOfArr: 16.0,
        currentGrossMarginPercent: 71.0,
        projectedOptimizedGrossMarginPercent: 78.0,
        idleResourceWastageAnnual: 1200000,
        multiYearCommitmentLiability: 600000,
        finopsOptimizationCaptureEstimate: 900000,
        spendByProvider: {
          awsAnnual: 5500000,
          gcpAnnual: 1700000,
          azureAnnual: 0,
          otherInfrastructureAnnual: 0
        },
        wastageCategories: {
          idleComputeAnnual: 600000,
          unattachedStorageAnnual: 250000,
          unindexedEgressAnnual: 150000,
          overprovisionedDbAnnual: 200000
        }
      },
      securityCompliance: {
        securityComplianceMaturityIndex: 68,
        soc2Type2Status: 'certified_with_exceptions',
        iso27001Status: 'none',
        secItem106ReadinessScore: 70,
        thirdPartyPenTestRecencyMonths: 10,
        criticalCveCount: 2,
        highCveCount: 5,
        mediumCveCount: 12,
        gdprAutomatedDeletionCapable: false,
        piiEncryptionAtRest: true,
        piiEncryptionInTransit: true,
        recommendedSpecialEscrowHoldback: 4500000,
        remediationCostEstimate: 250000
      },
      teamVelocity: {
        doraDeploymentFrequency: 'medium',
        doraLeadTimeForChanges: 'medium',
        doraChangeFailureRate: 'high',
        doraTimeToRestoreService: 'medium',
        engineeringVelocityQuotient: 56,
        teamBusFactor: 2,
        topContributorCommitSharePercent: 68,
        documentationCoverageRatio: 0.4,
        busFactorVulnerabilityIndex: 41,
        criticalSiloDomainsCount: 4,
        highFlightRiskKeyPersonsCount: 5,
        recommendedRetentionPoolSize: 3200000,
        retentionProgramDurationMonths: 24,
        keyPersonnel: [
          { id: 'kp-a', roleTitle: 'Chief System Architect', domainOwnership: 'Storage Fabric', tenureYears: 6, flightRisk: 'critical', busFactorCriticality: 'critical', recommendedRetentionBonus: 1000000 }
        ]
      },
      executiveSummaryText: 'Target exhibits high copyleft contagion due to AGPL linkage and scalability limit at 2x.'
    };

    const created = await technicalDueDiligenceRepository.createAudit(mutation);
    expect(created.id).toBeDefined();
    expect(created.targetCompanyName).toBe('DataMesh Networks');
    expect(created.licenses.openSourceContagionScore).toBe(100);
    expect(created.scorecard.totalValuationHaircutEstimate).toBeGreaterThan(0);
    expect(created.recommendation).toBe('walk_away_deal_breaker');

    const updated = await technicalDueDiligenceRepository.updateAudit(created.id, {
      ...mutation,
      targetCompanyName: 'DataMesh Solutions Global'
    });
    expect(updated?.targetCompanyName).toBe('DataMesh Solutions Global');
  });

  it('manages diligence findings and generates formatted memo', async () => {
    const list = await technicalDueDiligenceRepository.listAudits();
    const audit = list[0];

    const initialFindings = await technicalDueDiligenceRepository.listFindings(audit.id);
    expect(initialFindings.length).toBeGreaterThanOrEqual(1);

    const findingInput: DiligenceFindingMutationDTO = {
      pillar: 'security',
      title: 'Unauthenticated Metrics Endpoint Exposed to Internet',
      severity: 'high',
      financialImpactUsd: 75000,
      remediationDays: 3,
      description: 'Prometheus metrics endpoint without TLS authentication exposed on public route.',
      remediationPlan: 'Place endpoint behind internal VPN or basic auth reverse proxy.'
    };

    const createdFinding = await technicalDueDiligenceRepository.addFinding(audit.id, findingInput);
    expect(createdFinding).not.toBeNull();
    expect(createdFinding?.title).toBe(findingInput.title);

    const findingsAfterAdd = await technicalDueDiligenceRepository.listFindings(audit.id);
    expect(findingsAfterAdd.length).toBe(initialFindings.length + 1);

    const memo = await technicalDueDiligenceRepository.generateMemo(audit.id);
    expect(memo).toContain('Technical Due Diligence & M&A Vendor Diligence Memorandum');
    expect(memo).toContain(audit.targetCompanyName);
    expect(memo).toContain('Pillar A: Architectural Scalability & Tech Debt');

    if (createdFinding) {
      const deleted = await technicalDueDiligenceRepository.deleteFinding(createdFinding.id);
      expect(deleted).toBe(true);
      const findingsAfterDelete = await technicalDueDiligenceRepository.listFindings(audit.id);
      expect(findingsAfterDelete.length).toBe(initialFindings.length);
    }
  });

  it('deletes a diligence audit in demo mode', async () => {
    const listBefore = await technicalDueDiligenceRepository.listAudits();
    const target = listBefore[0];
    const deleted = await technicalDueDiligenceRepository.deleteAudit(target.id);
    expect(deleted).toBe(true);

    const listAfter = await technicalDueDiligenceRepository.listAudits();
    expect(listAfter.some(a => a.id === target.id)).toBe(false);
  });
});
