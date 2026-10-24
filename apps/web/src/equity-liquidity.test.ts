import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateDilutionPipeline,
  resolveLiquidationWaterfall,
  evaluateWaterfallMatrix,
  computeExerciseCostAndTax,
  compareExecutiveEquityPackages,
  exportEquityModelToMarkdown,
  validateEquityGrantInput,
  validateEquityModelMutationInput,
  type CapTableSnapshotDTO,
  type DilutionRoundDTO,
  type ExecutiveEquityGrantDTO
} from './domain';
import { equityRepository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Executive Equity & Liquidity Scenario Modeler (Web UI & Client Repo)', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Contract Algorithms Parity in Web', () => {
    it('computes dilution pipeline correctly', () => {
      const capTable: CapTableSnapshotDTO = {
        totalFullyDilutedShares: 10000000,
        commonShares: 6000000,
        unallocatedOptionPoolShares: 1000000,
        preferredTiers: [
          {
            tierName: 'Series A',
            originalInvestmentAmount: 5000000,
            sharesIssued: 3000000,
            preferenceMultiple: 1.0,
            participationType: 'non_participating',
            seniorityRank: 1
          }
        ]
      };

      const rounds: DilutionRoundDTO[] = [
        {
          roundName: 'Series B',
          preMoneyValuation: 50000000,
          capitalRaised: 15000000,
          newOptionPoolExpansionPercent: 5,
          issuedShareCount: 3000000,
          postMoneyValuation: 65000000,
          investorSharePercentage: 23.08,
          cumulativeDilutionFactor: 76.92
        }
      ];

      const res = calculateDilutionPipeline(capTable, 200000, rounds);
      expect(res.executiveDilutedShares).toBe(200000);
      expect(res.executiveOwnershipPercent).toBeLessThan(2.0);
      expect(res.roundByRoundSummary.length).toBe(1);
    });

    it('resolves liquidation waterfall for downside and upside scenarios', () => {
      const capTable: CapTableSnapshotDTO = {
        totalFullyDilutedShares: 10000000,
        commonShares: 7000000,
        unallocatedOptionPoolShares: 1000000,
        preferredTiers: [
          {
            tierName: 'Series A',
            originalInvestmentAmount: 10000000,
            sharesIssued: 2000000,
            preferenceMultiple: 1.0,
            participationType: 'non_participating',
            seniorityRank: 1
          }
        ]
      };

      const downside = resolveLiquidationWaterfall(5000000, capTable, 200000, 1.00, 'us_federal_california');
      expect(downside.preferredPayoutTotal).toBe(5000000);
      expect(downside.commonPayoutTotal).toBe(0);
      expect(downside.executiveNetPreTax).toBe(0);

      const upside = resolveLiquidationWaterfall(100000000, capTable, 200000, 1.00, 'us_federal_california');
      expect(upside.commonPayoutTotal).toBeGreaterThan(0);
      expect(upside.executiveNetPreTax).toBeGreaterThan(1000000);
      expect(upside.returnMultipleOnStrike).toBeGreaterThan(5);
    });

    it('computes exercise cost and multi-jurisdiction tax', () => {
      const grant: ExecutiveEquityGrantDTO = {
        id: 'test-grant',
        company: 'FinFlow',
        role: 'CTO',
        grantType: 'iso',
        shareCount: 100000,
        strikePrice: 1.00,
        currentFmv: 4.00,
        preferredPrice: 8.00,
        grantDate: '2024-01-01',
        vestingStartDate: '2024-01-01',
        vestingScheduleType: 'standard_4yr_1yr_cliff',
        cliffMonths: 12,
        vestingDurationMonths: 48,
        postTerminationExerciseMonths: 90,
        accelerationClause: 'double_trigger_acceleration',
        hasEarlyExercise: false,
        section83bElected: false
      };

      const taxUs = computeExerciseCostAndTax(grant, 4.00, 10.00, 'us_federal_california');
      expect(taxUs.totalExerciseCost).toBe(100000);
      expect(taxUs.spreadAtExercise).toBe(300000);
      expect(taxUs.alternativeMinimumTaxAtExercise).toBeGreaterThan(0);

      const taxVn = computeExerciseCostAndTax({ ...grant, grantType: 'esop' }, 4.00, 10.00, 'vietnam_pit');
      expect(taxVn.ordinaryIncomeTaxAtExercise).toBe(300000 * 0.35);
      expect(taxVn.capitalGainsTaxAtSale).toBe(100000 * 10.00 * 0.001);
    });
  });

  describe('equityRepository in Demo Mode', () => {
    it('loads pre-seeded demo executive models', async () => {
      const models = await equityRepository.listModels();
      expect(models.length).toBeGreaterThanOrEqual(2);
      expect(models.some(m => m.grant.company.includes('FinFlow'))).toBe(true);
      expect(models.some(m => m.grant.company.includes('CognitiveScale'))).toBe(true);
    });

    it('retrieves a single model by ID', async () => {
      const model = await equityRepository.getModel('demo-model-fintech-cto');
      expect(model).not.toBeNull();
      expect(model?.grant.role).toBe('Chief Technology Officer');
      expect(model?.exitScenarios.length).toBeGreaterThan(0);
    });

    it('creates, saves, updates, and deletes models with dual parity', async () => {
      const created = await equityRepository.saveModel({
        modelName: 'Series A Head of Eng Offer',
        grant: {
          company: 'Nexus Robotics',
          role: 'Head of Engineering',
          grantType: 'iso',
          shareCount: 100000,
          strikePrice: 0.80,
          currentFmv: 3.00,
          preferredPrice: 6.00,
          grantDate: '2024-04-01',
          vestingStartDate: '2024-04-01',
          vestingScheduleType: 'standard_4yr_1yr_cliff',
          cliffMonths: 12,
          vestingDurationMonths: 48,
          postTerminationExerciseMonths: 90,
          accelerationClause: 'double_trigger_acceleration',
          hasEarlyExercise: true,
          section83bElected: true
        },
        capTable: {
          totalFullyDilutedShares: 8000000,
          commonShares: 5000000,
          unallocatedOptionPoolShares: 1000000,
          preferredTiers: []
        },
        dilutionRounds: [],
        exitValuations: [20000000, 50000000, 100000000],
        taxJurisdiction: 'us_federal_california',
        notes: 'Initial negotiation draft'
      });

      expect(created.id).toBeDefined();
      expect(created.modelName).toBe('Series A Head of Eng Offer');
      expect(created.exitScenarios.length).toBe(3);

      const fetched = await equityRepository.getModel(created.id);
      expect(fetched).not.toBeNull();
      expect(fetched?.grant.company).toBe('Nexus Robotics');

      const markdown = await equityRepository.exportMarkdown(created.id);
      expect(markdown).toContain('Executive Equity & Liquidity Analysis: Series A Head of Eng Offer');
      expect(markdown).toContain('Nexus Robotics');

      await equityRepository.deleteModel(created.id);
      const afterDelete = await equityRepository.getModel(created.id);
      expect(afterDelete).toBeNull();
    });

    it('compares two executive models and returns delta metrics', async () => {
      const comparison = await equityRepository.compareModels('demo-model-fintech-cto', 'demo-model-us-vp');
      expect(comparison).not.toBeNull();
      expect(comparison?.recommendationVerdict).toBeDefined();
    });
  });
});
