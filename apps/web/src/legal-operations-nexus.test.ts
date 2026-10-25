import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculatePQDI,
  calculateCRDI,
  assessASC450Contingency,
  calculateLRCI,
  generateSecItem103Disclosure,
  type LegalOperationsOverviewDTO,
  type LegalEntityDTO,
  type IPAssetDTO,
  type MaterialContractDTO,
  type LitigationMatterDTO
} from './domain';
import { legalOperationsNexusRepository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Legal Operations Nexus Domain & Repository', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calculates Patent Quality & Defensibility Index (PQDI) deterministically', () => {
    const highDefensibility = calculatePQDI({
      totalClaimsCount: 25,
      independentClaimsCount: 4,
      forwardCitationsCount: 20,
      benchmarkForwardCitations: 12,
      officeActionsCount: 1,
      rceFilingsCount: 0,
      statutoryExtensionsCount: 0,
      foreignFamilyCount: 5
    });
    expect(highDefensibility).toBeGreaterThan(80);
    expect(highDefensibility).toBeLessThanOrEqual(100);

    const challengedDefensibility = calculatePQDI({
      totalClaimsCount: 4,
      independentClaimsCount: 1,
      forwardCitationsCount: 0,
      benchmarkForwardCitations: 12,
      officeActionsCount: 4,
      rceFilingsCount: 2,
      statutoryExtensionsCount: 3,
      foreignFamilyCount: 0
    });
    expect(challengedDefensibility).toBeLessThan(50);
  });

  it('calculates Contract Risk Deviation Index (CRDI) and ASC 450 contingency reserves', () => {
    const standardPlaybookCrdi = calculateCRDI({
      liabilityCapType: 'STANDARD_1X_ACV',
      hasUncappedIndemnity: false,
      governingLaw: 'DELAWARE_US',
      disputeForum: 'DELAWARE_CHANCERY_COURT',
      hasMfnClause: false,
      hasExclusivityOrNonCompete: false,
      autoRenewalNoticeDays: 60,
      terminationForConvenienceNoticeDays: 30
    });
    expect(standardPlaybookCrdi).toBe(5);

    const highRiskContractCrdi = calculateCRDI({
      liabilityCapType: 'UNCAPPED_EXPOSURE',
      hasUncappedIndemnity: true,
      governingLaw: 'NON_STANDARD_FOREIGN',
      disputeForum: 'ICC_INTERNATIONAL_COURT',
      hasMfnClause: true,
      hasExclusivityOrNonCompete: true,
      autoRenewalNoticeDays: 15,
      terminationForConvenienceNoticeDays: 0
    });
    expect(highRiskContractCrdi).toBeGreaterThan(75);

    const ascProbable = assessASC450Contingency({
      probabilityPercent: 85,
      estimatedLossMinUsd: 1000000,
      estimatedLossMaxUsd: 3500000,
      singlePointEstimateUsd: 1500000
    });
    expect(ascProbable.classification).toBe('PROBABLE');
    expect(ascProbable.accruedAmountUsd).toBe(1500000);
    expect(ascProbable.isBalanceSheetAccrualRequired).toBe(true);

    const ascReasonable = assessASC450Contingency({
      probabilityPercent: 40,
      estimatedLossMinUsd: 500000,
      estimatedLossMaxUsd: 2000000
    });
    expect(ascReasonable.classification).toBe('REASONABLY_POSSIBLE');
    expect(ascReasonable.accruedAmountUsd).toBe(0);
    expect(ascReasonable.isFootnoteDisclosureRequired).toBe(true);
  });

  it('computes composite Legal Risk Composite Index (LRCI) and triggers litigation cliff', () => {
    const pristineGovernance = calculateLRCI({
      subsidiaryComplianceScore: 100,
      averagePqdiScore: 92,
      averageCrdiScore: 5,
      activeMattersCount: 1,
      probableAccruedLossUsd: 0,
      reasonablyPossibleLossMaxUsd: 1000000,
      outsideCounselBudgetVariancePercent: 4,
      materialityThresholdUsd: 10000000
    });
    expect(pristineGovernance.compositeScore).toBeLessThan(25);
    expect(pristineGovernance.riskBand).toBe('SOVEREIGN_FORTRESS');
    expect(pristineGovernance.litigationCliffPenalty).toBe(0);

    const cliffGovernance = calculateLRCI({
      subsidiaryComplianceScore: 75,
      averagePqdiScore: 65,
      averageCrdiScore: 40,
      activeMattersCount: 5,
      probableAccruedLossUsd: 18000000,
      reasonablyPossibleLossMaxUsd: 30000000,
      outsideCounselBudgetVariancePercent: 40,
      materialityThresholdUsd: 10000000
    });
    expect(cliffGovernance.compositeScore).toBeGreaterThan(60);
    expect(cliffGovernance.litigationCliffPenalty).toBeGreaterThanOrEqual(25);
  });

  it('manages repository lifecycle in demo mode with full data persistence', async () => {
    const overview = await legalOperationsNexusRepository.getOverview();
    expect(overview.entities.length).toBeGreaterThanOrEqual(2);
    expect(overview.ipAssets.length).toBeGreaterThanOrEqual(1);
    expect(overview.materialContracts.length).toBeGreaterThanOrEqual(1);
    expect(overview.litigationMatters.length).toBeGreaterThanOrEqual(1);
    expect(overview.activeBoardMemorandum.memoStatus).toBe('BOARD_CERTIFIED_LOCKED');

    const createdEntity = await legalOperationsNexusRepository.createEntity({
      legalName: 'JobTrack Singapore Hub Pte Ltd',
      jurisdiction: 'SINGAPORE',
      entityType: 'PRIVATE_LIMITED_COMPANY',
      registrationNumber: 'SG-9021884'
    });
    expect(createdEntity.legalName).toBe('JobTrack Singapore Hub Pte Ltd');
    expect(createdEntity.jurisdiction).toBe('SINGAPORE');

    const updatedOverview = await legalOperationsNexusRepository.getOverview();
    expect(updatedOverview.entities.some((e) => e.id === createdEntity.id)).toBe(true);

    const asset = overview.ipAssets[0];
    const updatedAsset = await legalOperationsNexusRepository.calculatePqdi(asset.id, {
      totalClaimsCount: 30,
      independentClaimsCount: 4,
      forwardCitationsCount: 25,
      benchmarkForwardCitations: 12,
      officeActionsCount: 1,
      rceFilingsCount: 0,
      statutoryExtensionsCount: 0,
      foreignFamilyCount: 5
    });
    expect(updatedAsset.pqdiScore).toBeGreaterThan(85);

    const matter = overview.litigationMatters[0];
    const assessedMatter = await legalOperationsNexusRepository.assessAsc450(matter.id, {
      probabilityPercent: 85,
      estimatedLossMinUsd: 2000000,
      estimatedLossMaxUsd: 5000000,
      singlePointEstimateUsd: 2500000
    });
    expect(assessedMatter.asc450Classification).toBe('PROBABLE');
    expect(assessedMatter.accruedReserveAmountUsd).toBe(2500000);

    const signedMemo = await legalOperationsNexusRepository.signOffBoardMemo(overview.activeBoardMemorandum.id, {
      role: 'deputy_general_counsel',
      signerName: 'Sarah Jenkins, Esq.',
      signerTitle: 'Deputy General Counsel'
    });
    expect(signedMemo.signatures.some((s) => s.role === 'deputy_general_counsel')).toBe(true);
  });
});
