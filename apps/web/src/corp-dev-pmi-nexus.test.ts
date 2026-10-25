import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateStrategicFitScore,
  calculateDcfValuation,
  calculateLboReturns,
  calculateSynergyNpv,
  calculateAsc805PurchasePriceAllocation,
  calculateFloatingCollarExchangeRatio,
  calculateAntitrustSecondRequestRisk,
  calculateDspiScore,
  generateForm8KDisclosures
} from './domain';
import { corpDevPmiNexusRepository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Corporate Development & PMI Nexus Domain & Repository', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calculates Strategic Fit Score (SFS) deterministically with risk penalties', () => {
    const sfsClean = calculateStrategicFitScore({
      commercialFitScore: 92.0,
      technicalFitScore: 88.0,
      financialFitScore: 85.0,
      culturalFitScore: 80.0,
      moatFitScore: 90.0,
      findings: []
    });
    expect(sfsClean.riskPenalty).toBe(0);
    expect(sfsClean.sfs).toBeGreaterThanOrEqual(85.0);

    const sfsCritical = calculateStrategicFitScore({
      commercialFitScore: 92.0,
      technicalFitScore: 88.0,
      financialFitScore: 85.0,
      culturalFitScore: 80.0,
      moatFitScore: 90.0,
      findings: [
        { severity: 'critical_deal_killer', isResolved: false },
        { severity: 'critical_deal_killer', isResolved: false }
      ]
    });
    expect(sfsCritical.sfs).toBeLessThanOrEqual(40.0);
  });

  it('calculates DCF Enterprise Value, Implied Equity Value, and Share Price', () => {
    const dcf = calculateDcfValuation({
      projectedUfcf: [18000000, 22500000, 28000000, 34000000, 41000000],
      waccPercent: 9.5,
      terminalGrowthRatePercent: 2.5,
      terminalEbitdaMultiple: 12.0,
      terminalYearEbitdaUsd: 41000000,
      netDebtUsd: 20000000,
      sharesOutstanding: 10000000
    });
    expect(dcf.enterpriseValueGordonUsd).toBeGreaterThan(400000000);
    expect(dcf.impliedEquityValueUsd).toBeGreaterThan(380000000);
    expect(dcf.impliedSharePriceUsd).toBeGreaterThan(35.0);
  });

  it('computes LBO Sponsor MoIC and Internal Rate of Return (IRR)', () => {
    const lbo = calculateLboReturns({
      entryEbitdaUsd: 18500000,
      entryEbitdaMultiple: 11.5,
      seniorDebtMultiple: 4.0,
      subordinatedDebtMultiple: 1.5,
      exitYear: 5,
      exitEbitdaMultiple: 12.0,
      projectedExitEbitdaUsd: 45000000,
      debtPaydownDuringHoldUsd: 55000000
    });
    expect(lbo.sponsorMoic).toBeGreaterThan(2.0);
    expect(lbo.sponsorIrrPercent).toBeGreaterThan(15.0);
  });

  it('evaluates Synergy Net Present Value (NPV) across phased realization curves', () => {
    const syn = calculateSynergyNpv({
      annualRunRateCostSynergyUsd: 14000000,
      annualRunRateRevenueSynergyUsd: 25000000,
      contributionMarginPercent: 75.0,
      oneTimeCostToAchieveUsd: 9500000,
      waccPercent: 9.5,
      terminalGrowthRatePercent: 2.5
    });
    expect(syn.synergyNpvUsd).toBeGreaterThan(50000000);
    expect(syn.annualNetSynergies.length).toBe(4);
  });

  it('calculates ASC 805 Purchase Price Allocation and Goodwill residual', () => {
    const ppa = calculateAsc805PurchasePriceAllocation({
      purchasePriceUsd: 485000000,
      netTangibleAssetsFairValueUsd: 72000000,
      developedTechnologyFairValueUsd: 135000000,
      customerRelationshipsFairValueUsd: 68000000,
      trademarksFairValueUsd: 24000000,
      effectiveTaxRatePercent: 21.0
    });
    expect(ppa.identifiableIntangiblesUsd).toBe(227000000);
    expect(ppa.deferredTaxLiabilityUsd).toBe(47670000);
    expect(ppa.calculatedGoodwillUsd).toBe(233670000);
  });

  it('calculates Symmetrical Floating Exchange Ratio Collar status', () => {
    const floating = calculateFloatingCollarExchangeRatio({
      fixedTargetValueUsd: 50.0,
      collarLowerLimitUsd: 90.0,
      collarUpperLimitUsd: 110.0,
      currentBuyerStockPriceUsd: 100.0
    });
    expect(floating.collarStatus).toBe('floating');
    expect(floating.exchangeRatio).toBe(0.5);

    const floor = calculateFloatingCollarExchangeRatio({
      fixedTargetValueUsd: 50.0,
      collarLowerLimitUsd: 90.0,
      collarUpperLimitUsd: 110.0,
      currentBuyerStockPriceUsd: 125.0
    });
    expect(floor.collarStatus).toBe('floor');

    const ceiling = calculateFloatingCollarExchangeRatio({
      fixedTargetValueUsd: 50.0,
      collarLowerLimitUsd: 90.0,
      collarUpperLimitUsd: 110.0,
      currentBuyerStockPriceUsd: 80.0
    });
    expect(ceiling.collarStatus).toBe('ceiling');
  });

  it('evaluates HSR Antitrust Second Request Risk Score and HHI delta', () => {
    const antitrust = calculateAntitrustSecondRequestRisk({
      buyerMarketSharePercent: 24.0,
      targetMarketSharePercent: 11.0,
      industryTotalHhiPreMerger: 1750,
      competitorProtestsPresent: false
    });
    expect(antitrust.deltaHhi).toBe(528);
    expect(antitrust.postMergerHhi).toBe(2278);
    expect(antitrust.secondRequestRiskScore).toBeGreaterThan(40.0);
  });

  it('evaluates Deal Success Probability Index (DSPI) and fatal penalties', () => {
    const highProb = calculateDspiScore({
      diligenceHealthScore: 90.0,
      financingCertaintyScore: 95.0,
      antitrustClearanceScore: 88.0,
      boardAlignmentScore: 92.0,
      pmiReadinessScore: 85.0,
      hasHostilePoisonPill: false,
      hasCriticalFraudOrAccountingMisstatement: false,
      hasFinancingWithdrawal: false
    });
    expect(highProb.band).toBe('HIGH_TRANSACTION_CERTAINTY');
    expect(highProb.dspi).toBeGreaterThanOrEqual(80.0);

    const fatalProb = calculateDspiScore({
      diligenceHealthScore: 90.0,
      financingCertaintyScore: 95.0,
      antitrustClearanceScore: 88.0,
      boardAlignmentScore: 92.0,
      pmiReadinessScore: 85.0,
      hasHostilePoisonPill: false,
      hasCriticalFraudOrAccountingMisstatement: true,
      hasFinancingWithdrawal: false
    });
    expect(fatalProb.dspi).toBeLessThan(50.0);
    expect(fatalProb.band).toBe('PROHIBITIVE_DEAL_KILLER');
  });

  it('generates SEC Form 8-K Item 1.01 and Item 2.01 current reports', () => {
    const disclosures = generateForm8KDisclosures({
      targetName: 'Apex Cloud Solutions Inc.',
      codeName: 'Project Apex',
      totalConsiderationUsd: 485000000,
      cashPercent: 65,
      stockPercent: 35,
      buyerTerminationFeeUsd: 19400000,
      targetBreakFeeUsd: 14550000,
      regulatoryCovenant: 'reasonable_best_efforts',
      filingDate: '2026-10-25'
    });
    expect(disclosures.item101).toContain('FORM 8-K');
    expect(disclosures.item101).toContain('Item 1.01 Entry into a Material Definitive Agreement');
    expect(disclosures.item101).toContain('$485.00 million');
    expect(disclosures.item201).toContain('Item 2.01 Completion of Acquisition or Disposition of Assets');
  });

  it('loads demo overview, logs diligence finding, and completes tripartite sign-offs', async () => {
    const overview = await corpDevPmiNexusRepository.getOverview();
    expect(overview.activeTargetsCount).toBeGreaterThanOrEqual(1);
    const target = overview.targets[0];
    expect(target.codeName).toBe('Project Apex');

    const details = await corpDevPmiNexusRepository.getTargetDetails(target.id);
    expect(details).not.toBeNull();
    expect(details!.vdrStreams.length).toBe(6);

    const newFinding = await corpDevPmiNexusRepository.createFinding({
      targetId: target.id,
      streamType: 'commercial_market',
      title: 'Customer churn in mid-market segment increased 2.4%',
      description: 'Mid-market cohort shows slight ARR contraction due to feature gap',
      severity: 'medium',
      financialImpactUsd: 300000,
      proposedRemediation: 'Accelerate unified roadmap delivery in PMI Day 30'
    });
    expect(newFinding.title).toBe('Customer churn in mid-market segment increased 2.4%');

    const cfoSignoff = await corpDevPmiNexusRepository.executeSignoff(target.id, {
      role: 'chief_financial_officer',
      signerName: 'Victoria Sterling (Chief Financial Officer)'
    });
    expect(cfoSignoff.cfoSignoff.signed).toBe(true);

    const ceoSignoff = await corpDevPmiNexusRepository.executeSignoff(target.id, {
      role: 'chief_executive_officer',
      signerName: 'Marcus Vance (Chief Executive Officer & Board Chair)'
    });
    expect(ceoSignoff.ceoSignoff.signed).toBe(true);
  });
});
