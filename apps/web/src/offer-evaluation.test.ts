import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { aiRepository } from './data';
import { fixture } from './demo';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Offer Evaluation & AI Negotiation Repository (demoMode)', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
    storageMap.set('jobtrack.design.v1', JSON.stringify(fixture()));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('evaluates single offer and calculates accurate TC breakdown and scores', async () => {
    const res = await aiRepository.evaluateOffer({
      applicationId: 'app-offer-1',
      company: 'Shopee Vietnam',
      position: 'Senior Backend Engineer',
      compensation: {
        baseSalaryMonthly: 50000000,
        currency: 'VND',
        bonusMonthsPerYear: 2,
        annualBonusCash: 30000000,
        stockOptionsOrEquityAnnual: 100000000,
        allowanceMonthly: 3000000
      },
      workplaceFactors: {
        workLifeBalance: 7,
        careerGrowth: 9,
        teamAndCulture: 8,
        remoteFlexibility: 8,
        companyReputationAndStability: 8,
        healthAndBenefits: 9
      }
    });

    expect(res.company).toBe('Shopee Vietnam');
    expect(res.position).toBe('Senior Backend Engineer');
    expect(res.compensation.baseSalaryMonthly).toBe(50000000);
    expect(res.compensation.annualTotalCompensation).toBe(866000000);
    expect(res.breakdownSummary.annualGuaranteed).toBe(636000000);
    expect(res.breakdownSummary.annualTotal).toBe(866000000);
    expect(res.weightedScore).toBeGreaterThanOrEqual(75);
    expect(res.pros.length).toBeGreaterThan(0);
    expect(res.cons.length).toBeGreaterThan(0);
  });

  it('compares multiple offers and produces ranked decision matrix', async () => {
    const res = await aiRepository.compareOffers({
      offers: [
        {
          company: 'Fintech Unicorn A',
          position: 'Lead Engineer',
          compensation: {
            baseSalaryMonthly: 80000000,
            currency: 'VND',
            bonusMonthsPerYear: 3,
            allowanceMonthly: 5000000
          },
          workplaceFactors: {
            workLifeBalance: 5,
            careerGrowth: 8,
            teamAndCulture: 7,
            remoteFlexibility: 6,
            companyReputationAndStability: 7,
            healthAndBenefits: 7
          }
        },
        {
          company: 'Global Tech Center B',
          position: 'Senior Staff Engineer',
          compensation: {
            baseSalaryMonthly: 90000000,
            currency: 'VND',
            bonusMonthsPerYear: 2,
            allowanceMonthly: 4000000
          },
          workplaceFactors: {
            workLifeBalance: 8,
            careerGrowth: 9,
            teamAndCulture: 9,
            remoteFlexibility: 9,
            companyReputationAndStability: 9,
            healthAndBenefits: 9
          }
        }
      ]
    });

    expect(res.offers.length).toBe(2);
    expect(res.rankedOffers.length).toBe(2);
    expect(res.rankedOffers[0]?.rank).toBe(1);
    expect(res.bestOverallOfferId).toBeDefined();
    expect(res.bestCompensationOfferId).toBeDefined();
    expect(res.recommendationSummary).toBeTruthy();
  });

  it('generates counter offer negotiation script tailored to target salary and tone', async () => {
    const offerEval = await aiRepository.evaluateOffer({
      company: 'Tech Corp Vietnam',
      position: 'Engineering Manager',
      compensation: {
        baseSalaryMonthly: 60000000,
        currency: 'VND',
        bonusMonthsPerYear: 2,
        allowanceMonthly: 2000000
      }
    });

    const script = await aiRepository.generateCounterOffer({
      offer: offerEval,
      targetSalary: 72000000,
      tone: 'collaborative',
      keyStrengths: ['Bảo hiểm sức khỏe cho gia đình', 'Làm việc linh hoạt 2 ngày WFH']
    });

    expect(script.emailSubject).toContain('Tech Corp Vietnam');
    expect(script.emailBody).toContain('72.000.000');
    expect(script.shortScriptForCall).toBeTruthy();
    expect(script.targetIncreasePercent).toBe(20);
    expect(script.leverageItems.length).toBeGreaterThan(0);
    expect(script.walkAwayAdvice).toBeTruthy();
  });
});
