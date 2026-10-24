import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { executiveSeveranceRepository } from './data';
import type { ExecutiveSeveranceCaseMutationDTO, GoodReasonEventMutationDTO } from './domain';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('executiveSeveranceRepository (Web Demo Mode)', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists default demo executive severance cases', async () => {
    const list = await executiveSeveranceRepository.listCases();
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].companyName).toBe('Apex Cloud Systems');
    expect(list[0].roleTitle).toBe('VP of Engineering');
    expect(list[0].auditResult.generosityScore).toBeGreaterThan(0);
    expect(list[0].cicResult.commonSharePriceUsd).toBeGreaterThan(0);
  });

  it('retrieves single severance case by id', async () => {
    const list = await executiveSeveranceRepository.listCases();
    const first = list[0];
    const retrieved = await executiveSeveranceRepository.getCase(first.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(first.id);
    expect(retrieved?.companyName).toBe('Apex Cloud Systems');
  });

  it('creates and updates a new executive severance case in demo mode', async () => {
    const mutation: ExecutiveSeveranceCaseMutationDTO = {
      companyName: 'Quantum AI Systems',
      roleTitle: 'Chief Technology Officer',
      effectiveSeparationDate: '2026-12-31',
      severanceParams: {
        annualBaseSalaryUsd: 420000,
        cashContinuationMonths: 12,
        targetBonusPercentage: 40,
        bonusProrationMode: 'target',
        companyPerformanceMultiplier: 1.0,
        daysWorkedInFiscalYear: 365,
        monthlyCobraCostUsd: 2500,
        cobraSubsidizedMonths: 12,
        cobraTaxGrossedUp: true,
        outplacementBudgetUsd: 25000,
        accruedPtoDays: 15,
        statutoryPtoVestingMandated: true,
        unlimitedPtoForfeitureRisk: false,
        ptewMonths: 60,
        optionsHeldCount: 200000,
        estimatedExerciseCostUsd: 200000
      },
      cicWaterfallParams: {
        enterpriseValuationUsd: 300000000,
        fundedDebtUsd: 10000000,
        balanceSheetCashUsd: 15000000,
        transactionFeePercent: 2.0,
        escrowHoldbackPercent: 5.0,
        preferredSharesStack: [
          { seriesName: 'Series A', investedAmountUsd: 15000000, liquidationMultiple: 1.0, isParticipating: false },
          { seriesName: 'Series B', investedAmountUsd: 35000000, liquidationMultiple: 1.0, isParticipating: false }
        ],
        totalFullyDilutedCommonShares: 25000000,
        unvestedOptionsCount: 100000,
        unvestedOptionsStrikePriceUsd: 1.00,
        unvestedRsuCount: 50000,
        vestedOptionsCount: 150000,
        vestedOptionsStrikePriceUsd: 1.00,
        vestedRsuCount: 25000,
        triggerMode: 'double_trigger',
        accelerationExtent: 'full_100_percent',
        cicProtectionWindowMonths: 18
      },
      tax280GParams: {
        w2History5YearsUsd: [320000, 350000, 400000, 430000, 450000],
        contingentCashSeveranceUsd: 420000,
        contingentBonusUsd: 168000,
        contingentEquityAccelerationUsd: 1200000,
        contingentOtherBenefitsUsd: 55000,
        federalMarginalTaxRate: 37,
        stateMarginalTaxRate: 13.3,
        medicareMarginalTaxRate: 2.35,
        corporateTaxRate: 21,
        agreedSettlementType: 'best_net_valley_rule'
      },
      counterProposalParams: {
        requestedCashMonths: 18,
        requestedBonusPercent: 100,
        requestedCobraMonths: 18,
        requestedPtewYears: 10,
        requestedAccelerationExtent: 'full_100_percent',
        requestedLegalFeeAllowanceUsd: 35000,
        requireMutualRelease: true,
        requireMutualNonDisparagement: true,
        statutoryWhistleblowerCarveoutsConfirmed: true,
        leverageFactors: {
          busFactorScore: 25,
          keyPersonClosingCondition: true,
          teamFlightRiskScore: 20,
          patentInventorshipCount: 4,
          constructiveDischargeMeritScore: 14
        }
      }
    };

    const created = await executiveSeveranceRepository.createCase(mutation);
    expect(created.id).toBeDefined();
    expect(created.companyName).toBe('Quantum AI Systems');
    expect(created.auditResult.generosityScore).toBeGreaterThanOrEqual(75);

    const updated = await executiveSeveranceRepository.updateCase(created.id, {
      companyName: 'Quantum AI Systems (Acquired)'
    });
    expect(updated).not.toBeNull();
    expect(updated?.companyName).toBe('Quantum AI Systems (Acquired)');
  });

  it('records and removes Good Reason events with 30-day cure period calculation', async () => {
    const list = await executiveSeveranceRepository.listCases();
    const caseItem = list[0];

    const eventInput: GoodReasonEventMutationDTO = {
      category: 'diminution_of_duties',
      title: 'Loss of Principal Architect Direct Reports',
      factualDescription: 'Management reassigned core systems team to new VP without executive consultation.',
      dateConditionOccurred: '2026-10-15',
      dateNoticeServed: '2026-10-20'
    };

    const event = await executiveSeveranceRepository.addGoodReasonEvent(caseItem.id, eventInput);
    expect(event.id).toBeDefined();
    expect(event.title).toBe('Loss of Principal Architect Direct Reports');
    expect(event.curePeriodDeadline).toBe('2026-11-19');

    const refreshed = await executiveSeveranceRepository.getCase(caseItem.id);
    expect(refreshed?.goodReasonEvents.some(e => e.id === event.id)).toBe(true);

    const deleted = await executiveSeveranceRepository.deleteGoodReasonEvent(event.id);
    expect(deleted).toBe(true);
  });

  it('generates executive counter-proposal and formal separation memorandum', async () => {
    const list = await executiveSeveranceRepository.listCases();
    const caseItem = list[0];

    const proposal = await executiveSeveranceRepository.createCounterProposal(caseItem.id);
    expect(proposal).not.toBeNull();
    expect(proposal?.leverageIndex).toBeGreaterThanOrEqual(70);
    expect(proposal?.memoMarkdown).toContain('CONFIDENTIAL EXECUTIVE SEPARATION MEMORANDUM');
    expect(proposal?.memoMarkdown).toContain('18 U.S.C. §1833(b)');
  });
});
