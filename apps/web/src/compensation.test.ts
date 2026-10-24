import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  computeVestingSchedule,
  calculateNetTakeHomeVnd,
  forecastCompensationScenarios,
  evaluateMarketBenchmark,
  deriveNegotiationLeveragePoints,
  type CompensationPackageDTO
} from './domain';
import { compensationRepository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Intelligent Compensation & Equity Benchmark Forecaster', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Pure Algorithms & Financial Engine', () => {
    it('computes 4-year vesting schedule with 1-year cliff', () => {
      const grant = {
        type: 'esop' as const,
        totalShares: 40000,
        strikePrice: 25000,
        currentFairMarketValue: 75000,
        vestingYears: 4,
        cliffMonths: 12
      };

      const milestones = computeVestingSchedule(grant);
      expect(milestones).toHaveLength(4);
      expect(milestones[0].year).toBe(1);
      expect(milestones[0].vestedSharesInYear).toBe(10000);
      expect(milestones[0].vestedSharesCumulative).toBe(10000);
      expect(milestones[0].estimatedGrossValue).toBe(750000000);
      expect(milestones[0].netGainValue).toBe(500000000);

      expect(milestones[3].year).toBe(4);
      expect(milestones[3].vestedSharesCumulative).toBe(40000);
    });

    it('calculates Vietnam progressive PIT and social insurance deductions accurately', () => {
      const gross50m = 50000000;
      const net50m = calculateNetTakeHomeVnd(gross50m);
      expect(net50m).toBeGreaterThan(38000000);
      expect(net50m).toBeLessThan(45000000);

      const gross80m = 80000000;
      const net80m = calculateNetTakeHomeVnd(gross80m);
      expect(net80m).toBeGreaterThan(58000000);
      expect(net80m).toBeLessThan(68000000);
    });

    it('forecasts 4-year multi-scenario trajectories', () => {
      const pkg: CompensationPackageDTO = {
        baseSalaryMonthly: 60000000,
        currency: 'VND',
        hasMonth13: true,
        performanceBonusAnnual: 60000000,
        equityGrant: {
          type: 'esop',
          totalShares: 16000,
          strikePrice: 15000,
          currentFairMarketValue: 45000,
          vestingYears: 4,
          cliffMonths: 12
        }
      };

      const scenarios = forecastCompensationScenarios(pkg);
      expect(scenarios.conservative.fourYearTotalGross).toBeGreaterThan(0);
      expect(scenarios.baseline.fourYearTotalGross).toBeGreaterThan(scenarios.conservative.fourYearTotalGross);
      expect(scenarios.optimistic.fourYearTotalGross).toBeGreaterThan(scenarios.baseline.fourYearTotalGross);

      expect(scenarios.baseline.annualBreakdowns).toHaveLength(4);
      expect(scenarios.baseline.annualBreakdowns[0].baseSalaryAnnual).toBe(720000000);
    });

    it('evaluates market benchmark percentiles across engineering tracks', () => {
      const bm = evaluateMarketBenchmark('Senior Backend Engineer', 'senior', 800000000, 'VND');
      expect(bm.role).toBe('Senior Backend Engineer');
      expect(bm.level).toBe('senior');
      expect(bm.p50AnnualCash).toBeGreaterThan(0);
      expect(bm.candidatePercentile).toBeGreaterThan(45);

      const bmLead = evaluateMarketBenchmark('Lead DevOps Architect', 'lead', 1200000000, 'VND');
      expect(bmLead.candidatePercentile).toBeGreaterThanOrEqual(50);
    });

    it('derives negotiation leverage points and counter-offer scripts', () => {
      const pkg: CompensationPackageDTO = {
        baseSalaryMonthly: 35000000,
        currency: 'VND',
        hasMonth13: false,
        performanceBonusAnnual: 0
      };

      const bm = evaluateMarketBenchmark('Senior Frontend Engineer', 'senior', 420000000, 'VND');
      const points = deriveNegotiationLeveragePoints(pkg, bm, 'Acme Corp');

      expect(points.length).toBeGreaterThanOrEqual(2);
      const basePoint = points.find(p => p.dimension === 'base_salary');
      expect(basePoint).toBeDefined();
      expect(basePoint?.suggestedScript).toContain('thị trường');

      const equityPoint = points.find(p => p.dimension === 'equity');
      expect(equityPoint).toBeDefined();
    });
  });

  describe('compensationRepository (Demo Mode)', () => {
    it('returns default demo forecast for Shopee', async () => {
      const list = await compensationRepository.list();
      expect(list.length).toBeGreaterThanOrEqual(1);
      const first = list[0];
      expect(first.company).toBe('Shopee Vietnam');
      expect(first.role).toBe('Senior Frontend Engineer');
      expect(first.scenarios.baseline.fourYearTotalGross).toBeGreaterThan(0);
    });

    it('creates and persists a new forecast', async () => {
      const created = await compensationRepository.create({
        company: 'VNG Corporation',
        role: 'Lead Distributed Systems Engineer',
        level: 'lead',
        package: {
          baseSalaryMonthly: 90000000,
          currency: 'VND',
          hasMonth13: true,
          performanceBonusAnnual: 90000000,
          equityGrant: {
            type: 'esop',
            totalShares: 30000,
            strikePrice: 30000,
            currentFairMarketValue: 90000,
            vestingYears: 4,
            cliffMonths: 12
          }
        }
      });

      expect(created.company).toBe('VNG Corporation');
      expect(created.vestingSchedule).toHaveLength(4);
      expect(created.scenarios.optimistic.fourYearTotalGross).toBeGreaterThan(created.scenarios.baseline.fourYearTotalGross);

      const list = await compensationRepository.list();
      expect(list.some(f => f.id === created.id)).toBe(true);

      const fetched = await compensationRepository.getById(created.id);
      expect(fetched?.company).toBe('VNG Corporation');

      const deleted = await compensationRepository.delete(created.id);
      expect(deleted).toBe(true);

      const listAfter = await compensationRepository.list();
      expect(listAfter.some(f => f.id === created.id)).toBe(false);
    });

    it('gets benchmark via repository', async () => {
      const bm = await compensationRepository.getBenchmark('Senior Fullstack Engineer', 'senior', 750000000, 'VND');
      expect(bm.p50AnnualCash).toBeGreaterThan(0);
      expect(bm.candidatePercentile).toBeGreaterThan(0);
    });
  });
});
