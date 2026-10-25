import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateHhiConcentration,
  calculateDeltaHhi,
  evaluateHhiPresumption,
  calculateGuppi,
  calculateRegulatoryClearanceRiskScore,
  calculateRemedyDefensibilityIndex,
  calculateHsrStatutoryFee,
  evaluateHsrStatutoryThresholds,
  computeRatificationHash
} from './domain';
import { antitrustNexusRepository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Antitrust, Competition Law & Merger Clearance Defense Nexus', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('computes HHI concentration and delta HHI for merging firms', () => {
    const conc = calculateHhiConcentration([28, 22, 18, 12, 10, 10]);
    expect(conc.hhi).toBe(1936);
    expect(conc.concentrationTier).toBe('highly_concentrated_presumption');

    const delta = calculateDeltaHhi(28, 22);
    expect(delta.deltaHhi).toBe(1232);
    expect(delta.postMergerSharePct).toBe(50.0);
  });

  it('evaluates 2023 FTC/DOJ Merger Guidelines structural presumptions', () => {
    const dominant = evaluateHhiPresumption(3168, 1232, 50.0);
    expect(dominant.presumptionRebuttableUnlawful).toBe(true);
    expect(dominant.concentrationTier).toBe('dominant_firm_threshold');

    const highlyConc = evaluateHhiPresumption(1900, 150, 25.0);
    expect(highlyConc.presumptionRebuttableUnlawful).toBe(true);
    expect(highlyConc.concentrationTier).toBe('highly_concentrated_presumption');

    const moderate = evaluateHhiPresumption(1400, 120, 18.0);
    expect(moderate.presumptionRebuttableUnlawful).toBe(false);
    expect(moderate.concentrationTier).toBe('moderately_concentrated');

    const safe = evaluateHhiPresumption(850, 40, 12.0);
    expect(safe.presumptionRebuttableUnlawful).toBe(false);
    expect(safe.concentrationTier).toBe('unconcentrated');
  });

  it('calculates Gross Upward Pricing Pressure Index (GUPPI) tiers accurately', () => {
    const severe = calculateGuppi(0.35, 0.28, 120, 110, 65, 70, 0, 0);
    expect(severe.maxGuppiPct).toBeGreaterThanOrEqual(10.0);
    expect(severe.unilateralEffectsRiskTier).toBe('severe_unilateral_effects');

    const moderate = calculateGuppi(0.12, 0.10, 100, 100, 50, 50, 0, 0);
    expect(moderate.maxGuppiPct).toBeGreaterThanOrEqual(5.0);
    expect(moderate.maxGuppiPct).toBeLessThan(10.0);
    expect(moderate.unilateralEffectsRiskTier).toBe('moderate_unilateral_risk');

    const low = calculateGuppi(0.04, 0.03, 100, 100, 40, 40, 0, 0);
    expect(low.maxGuppiPct).toBeLessThan(5.0);
    expect(low.unilateralEffectsRiskTier).toBe('negligible_pricing_pressure');
  });

  it('synthesizes Regulatory Clearance Risk Score (RCRS) and Remedy Defensibility Index (RDI)', () => {
    const rcrs = calculateRegulatoryClearanceRiskScore({
      postMergerHhi: 3168,
      deltaHhi: 1232,
      maxGuppiPct: 18.2,
      phase2FilingsCount: 3,
      phase1FilingsCount: 1,
      hasConflictingForeignRemedy: true,
      customerObjectionsCount: 4,
      competitorWhitepapersCount: 2,
      stateAgInquiriesCount: 3,
      custodianCount: 45,
      dataVolumeTerabytes: 24.5,
      hasCidDeposition: true
    });
    expect(rcrs.score).toBeGreaterThanOrEqual(75.0);
    expect(rcrs.riskBand).toBe('acute_antitrust_block_risk');

    const rdiHigh = calculateRemedyDefensibilityIndex({
      overlapMitigatedPct: 92.5,
      upfrontBuyerViabilityScore: 88.0,
      standaloneViabilityScore: 85.0,
      cleanTeamComplianceScore: 95.0,
      behavioralCommitmentsScore: 80.0
    });
    expect(rdiHigh.rdi).toBeGreaterThanOrEqual(75.0);
    expect(rdiHigh.isRemedyDefensible).toBe(true);

    const rdiLow = calculateRemedyDefensibilityIndex({
      overlapMitigatedPct: 40.0,
      upfrontBuyerViabilityScore: 50.0,
      standaloneViabilityScore: 45.0,
      cleanTeamComplianceScore: 60.0,
      behavioralCommitmentsScore: 50.0
    });
    expect(rdiLow.rdi).toBeLessThan(55.0);
    expect(rdiLow.isRemedyDefensible).toBe(false);
  });

  it('evaluates HSR statutory filing fee and jurisdictional thresholds', () => {
    const fee = calculateHsrStatutoryFee(14200000000);
    expect(fee.statutoryFeeUsd).toBe(2335000);

    const hsr = evaluateHsrStatutoryThresholds(14200000000, 850000000, 320000000);
    expect(hsr.sizeOfTransactionTestPassed).toBe(true);
    expect(hsr.sizeOfPersonTestPassed).toBe(true);
    expect(hsr.isHsrFilingRequired).toBe(true);
    expect(hsr.statutoryFilingFeeUsd).toBe(2335000);
  });

  it('computes deterministic tripartite cryptographic ratification hashes', () => {
    const payload = {
      transactionId: 'tx-123',
      regulatoryClearanceRiskScore: 78.4,
      leadCounselSigner: 'Jonathan Vance, Esq.',
      generalCounselSigner: 'Helena Sterling, Esq.',
      chiefExecutiveOfficerSigner: 'David Vance'
    };
    const hash1 = computeRatificationHash(payload);
    const hash2 = computeRatificationHash(payload);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^sha256-ratif-/);
  });

  it('executes full repository lifecycle: overview, transaction, market, remedy, signoff, and reset', async () => {
    const overview = await antitrustNexusRepository.getOverview();
    expect(overview.transaction.dealCodename).toBe('PROJECT AEGIS TITAN');
    expect(overview.hsrAssessment.isHsrFilingRequired).toBe(true);
    expect(overview.secondRequest).not.toBeNull();
    expect(overview.relevantMarkets.length).toBeGreaterThanOrEqual(2);
    expect(overview.marketParticipants.length).toBeGreaterThanOrEqual(6);
    expect(overview.guppiAnalyses.length).toBeGreaterThanOrEqual(2);
    expect(overview.globalFilings.length).toBe(5);
    expect(overview.remedyPackages.length).toBe(2);
    expect(overview.cleanTeamProtocol).not.toBeNull();
    expect(overview.litigationDocket).not.toBeNull();
    expect(overview.ratification).not.toBeNull();
    expect(overview.auditLogs.length).toBeGreaterThanOrEqual(5);

    const newTx = await antitrustNexusRepository.createTransaction({
      dealCodename: 'PROJECT HELIOS CONSOLIDATION',
      acquirerName: 'Apex Cloud Solutions',
      targetName: 'OmniData Tech',
      enterpriseValueUsd: 6500000000,
      cashConsiderationUsd: 4000000000,
      stockConsiderationUsd: 2500000000,
      announcedDate: '2026-10-15',
      targetedClosingDate: '2027-07-31',
      dealStructureType: 'horizontal_merger',
      reverseTerminationFeePct: 5.0
    });
    expect(newTx.dealCodename).toBe('PROJECT HELIOS CONSOLIDATION');
    expect(newTx.reverseTerminationFeeUsd).toBe(325000000);

    const newMarket = await antitrustNexusRepository.defineMarket({
      transactionId: newTx.id,
      marketName: 'Secure Enterprise Gateway Suites',
      productMarketDefinition: 'High-throughput border gateway inspection and proxy platforms',
      geographicMarketScope: 'North America & APAC',
      totalMarketSizeUsd: 9000000000,
      participantShares: [
        { participantName: 'Apex Cloud', isMergingParty: true, isAcquirer: true, isTarget: false, annualRevenueUsd: 2700000000, marketSharePct: 30 },
        { participantName: 'OmniData Tech', isMergingParty: true, isAcquirer: false, isTarget: true, annualRevenueUsd: 1800000000, marketSharePct: 20 },
        { participantName: 'Competitor Alpha', isMergingParty: false, isAcquirer: false, isTarget: false, annualRevenueUsd: 1800000000, marketSharePct: 20 },
        { participantName: 'Competitor Beta', isMergingParty: false, isAcquirer: false, isTarget: false, annualRevenueUsd: 1350000000, marketSharePct: 15 },
        { participantName: 'Others', isMergingParty: false, isAcquirer: false, isTarget: false, annualRevenueUsd: 1350000000, marketSharePct: 15 }
      ]
    });
    expect(newMarket.deltaHhi).toBe(1200);
    expect(newMarket.presumptionRebuttableUnlawful).toBe(true);

    const newRemedy = await antitrustNexusRepository.proposeDivestiturePackage({
      transactionId: newTx.id,
      packageName: 'OmniData Border Gateway Division Carve-Out',
      remedyType: 'fix_it_first_buyer_sale',
      carveoutBusinessUnit: 'OmniData Secure Border Unit',
      carveoutRevenueUsd: 950000000,
      carveoutEbitdaUsd: 220000000,
      upfrontBuyerName: 'Fortress Defense Software',
      assetOverlapMitigatedPct: 90.0
    });
    expect(newRemedy.packageName).toBe('OmniData Border Gateway Division Carve-Out');
    expect(newRemedy.remedyDefensibilityIndex).toBeGreaterThanOrEqual(75.0);

    const s1 = await antitrustNexusRepository.submitTripartiteSignoff({
      transactionId: overview.transaction.id,
      role: 'antitrust_lead_counsel',
      signerName: 'Jonathan Vance, Esq.',
      statementAcknowledged: 'Lead antitrust opinion validated.'
    });
    expect(s1.leadCounselSigned).toBe(true);

    const s2 = await antitrustNexusRepository.submitTripartiteSignoff({
      transactionId: overview.transaction.id,
      role: 'chief_legal_officer',
      signerName: 'Helena Sterling, Esq.',
      statementAcknowledged: 'Clayton Act § 7 defense covenants ratified.'
    });
    expect(s2.generalCounselSigned).toBe(true);

    const s3 = await antitrustNexusRepository.submitTripartiteSignoff({
      transactionId: overview.transaction.id,
      role: 'chief_executive_officer',
      signerName: 'David Vance',
      statementAcknowledged: 'Executive sign-off on regulatory remedy commitments.'
    });
    expect(s3.chiefExecutiveOfficerSigned).toBe(true);
    expect(s3.isFullyRatified).toBe(true);
    expect(s3.cryptographicIntegrityHash).toMatch(/^sha256-ratif-/);

    const reset = await antitrustNexusRepository.resetDemo();
    expect(reset.transaction.dealCodename).toBe('PROJECT AEGIS TITAN');
  });
});
