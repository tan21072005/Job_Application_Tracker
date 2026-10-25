import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateAVIS,
  calculateWACC,
  calculateEPSAccretionDilution,
  calculateRule10b18DailyLimit,
  calculateISI,
  generateSecForm8KDisclosure,
  type InvestorRelationsOverviewDTO
} from './domain';
import { investorRelationsNexusRepository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Investor Relations Nexus Domain & Repository', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calculates Activist Vulnerability Index (AVIS) deterministically', () => {
    const fortified = calculateAVIS({
      tsrUnderperformancePercent: 4.0,
      valuationDiscountPercent: 5.0,
      governanceDefenseScore: 90.0,
      freeCashFlowMarginGap: 2.0,
      activistOwnershipPercent: 1.0
    });
    expect(fortified.riskLevel).toBe('fortified_low');
    expect(fortified.score).toBeLessThan(30.0);

    const critical = calculateAVIS({
      tsrUnderperformancePercent: 50.0,
      valuationDiscountPercent: 50.0,
      governanceDefenseScore: 10.0,
      freeCashFlowMarginGap: 20.0,
      activistOwnershipPercent: 20.0
    });
    expect(critical.riskLevel).toBe('critical_activist_target');
    expect(critical.score).toBeGreaterThanOrEqual(75.0);
  });

  it('calculates Weighted Average Cost of Capital (WACC) and EPS accretion/dilution', () => {
    const wacc = calculateWACC(10.85, 5.0, 21.0, 4837500000, 200000000);
    expect(wacc).toBeGreaterThan(10.0);
    expect(wacc).toBeLessThan(11.0);

    const epsAccretion = calculateEPSAccretionDilution({
      standaloneNetIncomeUsd: 120000000,
      standaloneSharesCount: 75000000,
      standaloneEps: 1.60,
      financingType: 'rule_10b18_share_repurchase',
      incrementalSharesCount: -2000000,
      incrementalAnnualInterestUsd: 0,
      marginalTaxRatePercent: 21.0
    });
    expect(epsAccretion.isAccretive).toBe(true);
    expect(epsAccretion.proFormaEpsUsd).toBeGreaterThan(1.60);

    const epsDilution = calculateEPSAccretionDilution({
      standaloneNetIncomeUsd: 120000000,
      standaloneSharesCount: 75000000,
      standaloneEps: 1.60,
      financingType: 'secondary_equity_offering',
      incrementalSharesCount: 5000000,
      incrementalAnnualInterestUsd: 0,
      marginalTaxRatePercent: 21.0
    });
    expect(epsDilution.isAccretive).toBe(false);
    expect(epsDilution.proFormaEpsUsd).toBeLessThan(1.60);
  });

  it('computes SEC Rule 10b-18 safe-harbor repurchase volume ceilings', () => {
    const dailyLimit = calculateRule10b18DailyLimit(750000, false);
    expect(dailyLimit.standardDailyLimitShares).toBe(187500);
    expect(dailyLimit.effectiveLimitShares).toBe(187500);

    const blockExempt = calculateRule10b18DailyLimit(750000, true);
    expect(blockExempt.effectiveLimitShares).toBe(937500);
  });

  it('calculates Institutional Sentiment Index (ISI) across governance bands', () => {
    const strongConviction = calculateISI({
      analystRevisionsScore: 90.0,
      avisScore: 20.0,
      ndrFeedbackScore: 85.0,
      institutionalInflowOutflowScore: 80.0,
      consensusDispersionScore: 90.0
    });
    expect(strongConviction.band).toBe('strong_institutional_conviction');
    expect(strongConviction.score).toBeGreaterThanOrEqual(80.0);

    const defectionRisk = calculateISI({
      analystRevisionsScore: 30.0,
      avisScore: 80.0,
      ndrFeedbackScore: 40.0,
      institutionalInflowOutflowScore: 25.0,
      consensusDispersionScore: 35.0
    });
    expect(defectionRisk.band).toBe('institutional_defection_risk');
    expect(defectionRisk.score).toBeLessThan(50.0);
  });

  it('loads seeded demo overview from repository', async () => {
    const overview = await investorRelationsNexusRepository.getOverview();
    expect(overview.tickerSymbol).toBe('JBTR');
    expect(overview.marketCapUsd).toBe(4837500000.00);
    expect(overview.capTable.shareClasses.length).toBeGreaterThanOrEqual(2);
    expect(overview.capTable.topShareholders.length).toBeGreaterThanOrEqual(8);
    expect(overview.earnings.consensusMetrics.length).toBeGreaterThanOrEqual(4);
    expect(overview.capitalMarkets.repurchaseProgram.rule10b18DailyShareLimit).toBe(187500);
  });

  it('simulates activist vulnerability and updates telemetry', async () => {
    const sim = await investorRelationsNexusRepository.simulateActivistVulnerability({
      tsrUnderperformancePercent: 5.0,
      valuationDiscountPercent: 7.0,
      governanceDefenseScore: 85.0,
      freeCashFlowMarginGap: 3.0,
      activistOwnershipPercent: 2.0
    });
    expect(sim.compositeAvisScore).toBeLessThan(30.0);
    expect(sim.riskLevel).toBe('fortified_low');

    const updated = await investorRelationsNexusRepository.getOverview();
    expect(updated.capTable.activistVulnerability.compositeAvisScore).toBe(sim.compositeAvisScore);
  });

  it('reconciles Non-GAAP earnings and generates cautionary statement', async () => {
    const recon = await investorRelationsNexusRepository.reconcileNonGaapEarnings({
      fiscalQuarter: 'Q3-2026',
      gaapNetIncomeUsd: 18400000,
      stockBasedCompensationUsd: 8200000,
      amortizationIntangiblesUsd: 1500000,
      acquisitionRestructuringCostsUsd: 500000,
      taxEffectOfAdjustmentsUsd: 2100000,
      interestExpenseUsd: 1000000,
      provisionForTaxesUsd: 1400000,
      depreciationUsd: 3800000
    });
    expect(recon.adjustedEbitdaUsd).toBe(34800000);
    expect(recon.cautionaryStatementMarkdown).toContain('Regulation G');
  });

  it('logs roadshow meetings and recalibrates buy-side conviction', async () => {
    const meeting = await investorRelationsNexusRepository.logInvestorMeeting({
      institutionName: 'T. Rowe Price Associates, Inc.',
      leadInvestorName: 'David Giroux',
      investorType: 'fundamental_long_only',
      meetingDate: '2026-10-25',
      meetingFormat: 'one_on_one_in_person',
      executiveAttendees: ['David Chen (CEO)', 'Alexander Vance (VP IR)'],
      sentimentScore: 0.90,
      keyTopics: ['Long-term operating margins', 'Rule 10b-18 share repurchases'],
      followUps: ['Share updated cohort analysis']
    });
    expect(meeting.institutionName).toBe('T. Rowe Price Associates, Inc.');
    expect(meeting.sentimentScore).toBe(0.90);

    const updated = await investorRelationsNexusRepository.getOverview();
    expect(updated.roadshows.recentMeetings.some((m) => m.institutionName === 'T. Rowe Price Associates, Inc.')).toBe(true);
  });

  it('simulates capital financing scenario and updates WACC', async () => {
    const result = await investorRelationsNexusRepository.simulateCapitalScenario({
      scenarioName: 'Series Convertible 2031',
      financingType: 'convertible_senior_notes',
      grossAmountUsd: 200000000,
      stockPriceUsd: 64.50,
      costOfEquityPercent: 10.85,
      preTaxCostOfDebtPercent: 5.00,
      marginalTaxRatePercent: 21.00,
      currentAnnualNetIncomeUsd: 120000000,
      currentSharesCount: 75000000
    });
    expect(result.netProceedsUsd).toBeGreaterThan(190000000);
    expect(result.calculatedWaccPercent).toBeGreaterThan(0);
  });

  it('executes SEC Form 8-K generation and tripartite sign-off pipeline', async () => {
    const draft = await investorRelationsNexusRepository.generateSecForm8K({
      fiscalQuarter: 'Q3-2026',
      filingTitle: 'Current Report under Item 2.02 and Item 7.01',
      includeItem202: true,
      includeItem701: true
    });
    expect(draft.status).toBe('draft');
    expect(draft.itemsIncluded).toContain('Item 2.02');
    expect(draft.itemsIncluded).toContain('Item 7.01');

    const vpSigned = await investorRelationsNexusRepository.signoffSecForm8K(draft.id, {
      role: 'vp_investor_relations',
      signerName: 'Alexander Vance',
      verificationNotes: 'Audited consensus models and Reg G reconciliations.'
    });
    expect(vpSigned.status).toBe('vp_ir_certified');

    const cfoSigned = await investorRelationsNexusRepository.signoffSecForm8K(draft.id, {
      role: 'chief_financial_officer',
      signerName: 'Elena Rostova',
      verificationNotes: 'Approved financial statements and forward guidance.'
    });
    expect(cfoSigned.status).toBe('cfo_approved');

    const ceoSigned = await investorRelationsNexusRepository.signoffSecForm8K(draft.id, {
      role: 'chief_executive_officer',
      signerName: 'David Chen',
      verificationNotes: 'Ratified strategic disclosure and authorized EDGAR transmission.'
    });
    expect(ceoSigned.status).toBe('ceo_ratified');
    expect(ceoSigned.signoffs.length).toBe(3);
  });
});
