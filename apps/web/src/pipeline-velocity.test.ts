import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  computeStageConversionMetrics,
  detectPipelineBottlenecks,
  calculateVelocityTargets,
  simulatePipelineOutcomes
} from './domain';
import { pipelineVelocityRepository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Executive Job Search Velocity & Pipeline Bottleneck Forecaster', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Pure Algorithmic Engines', () => {
    it('computes stage conversion metrics and cycle durations accurately', () => {
      const mockApps = [
        {
          status: 'Offer' as const,
          appliedAt: '2026-09-01T00:00:00Z',
          createdAt: '2026-09-01T00:00:00Z',
          statusUpdatedAt: '2026-10-01T00:00:00Z',
          interviews: [{ id: 'i1', status: 'Completed', at: '2026-09-15T00:00:00Z' }]
        },
        {
          status: 'Interview' as const,
          appliedAt: '2026-09-10T00:00:00Z',
          createdAt: '2026-09-10T00:00:00Z',
          statusUpdatedAt: '2026-09-25T00:00:00Z',
          interviews: [{ id: 'i2', status: 'Scheduled', at: '2026-09-20T00:00:00Z' }]
        },
        {
          status: 'Rejected' as const,
          appliedAt: '2026-09-05T00:00:00Z',
          createdAt: '2026-09-05T00:00:00Z',
          statusUpdatedAt: '2026-09-12T00:00:00Z',
          interviews: []
        }
      ];

      const metrics = computeStageConversionMetrics(mockApps);
      expect(metrics.length).toBe(4);

      const applied = metrics.find(m => m.stage === 'Applied');
      expect(applied).toBeDefined();
      expect(applied?.totalEntered).toBe(3);
      expect(applied?.passed).toBe(2);
      expect(applied?.dropped).toBe(1);
      expect(applied?.conversionRate).toBe(66.7);
    });

    it('identifies critical, moderate, and healthy bottleneck stages with prescriptive actions', () => {
      const stageMetrics = [
        {
          stage: 'Applied' as const,
          totalEntered: 10,
          passed: 1,
          dropped: 9,
          conversionRate: 10.0,
          avgDaysInStage: 7
        },
        {
          stage: 'Screening' as const,
          totalEntered: 10,
          passed: 5,
          dropped: 5,
          conversionRate: 50.0,
          avgDaysInStage: 5
        },
        {
          stage: 'Interview' as const,
          totalEntered: 10,
          passed: 9,
          dropped: 1,
          conversionRate: 90.0,
          avgDaysInStage: 12
        },
        {
          stage: 'Offer' as const,
          totalEntered: 5,
          passed: 5,
          dropped: 0,
          conversionRate: 100.0,
          avgDaysInStage: 4
        }
      ];

      const bottlenecks = detectPipelineBottlenecks(stageMetrics);
      expect(bottlenecks.length).toBe(4);

      const appliedB = bottlenecks.find(b => b.stage === 'Applied');
      expect(appliedB?.severity).toBe('critical');
      expect(appliedB?.prescriptiveAction).toContain('Resume Optimizer');

      const interviewB = bottlenecks.find(b => b.stage === 'Interview');
      expect(interviewB?.severity).toBe('healthy');
    });

    it('calculates velocity targets and multi-horizon offer projections', () => {
      const stageMetrics = [
        {
          stage: 'Applied' as const,
          totalEntered: 15,
          passed: 8,
          dropped: 7,
          conversionRate: 53.3,
          avgDaysInStage: 7
        },
        {
          stage: 'Screening' as const,
          totalEntered: 8,
          passed: 5,
          dropped: 3,
          conversionRate: 62.5,
          avgDaysInStage: 5
        },
        {
          stage: 'Interview' as const,
          totalEntered: 5,
          passed: 3,
          dropped: 2,
          conversionRate: 60.0,
          avgDaysInStage: 14
        },
        {
          stage: 'Offer' as const,
          totalEntered: 3,
          passed: 2,
          dropped: 1,
          conversionRate: 66.7,
          avgDaysInStage: 5
        }
      ];

      const futureDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const target = calculateVelocityTargets(stageMetrics, futureDate, 2, 4);

      expect(target.currentWeeklyApplications).toBe(4);
      expect(target.recommendedWeeklyApplications).toBeGreaterThanOrEqual(1);
      expect(target.confidenceScore).toBeGreaterThanOrEqual(80);
      expect(target.projectedOffersIn60Days).toBeGreaterThanOrEqual(target.projectedOffersIn30Days);
    });

    it('simulates Monte Carlo offer distributions with estimated days to offer', () => {
      const stageMetrics = [
        {
          stage: 'Applied' as const,
          totalEntered: 10,
          passed: 5,
          dropped: 5,
          conversionRate: 50.0,
          avgDaysInStage: 7
        },
        {
          stage: 'Screening' as const,
          totalEntered: 5,
          passed: 3,
          dropped: 2,
          conversionRate: 60.0,
          avgDaysInStage: 5
        },
        {
          stage: 'Interview' as const,
          totalEntered: 3,
          passed: 2,
          dropped: 1,
          conversionRate: 66.7,
          avgDaysInStage: 14
        },
        {
          stage: 'Offer' as const,
          totalEntered: 2,
          passed: 2,
          dropped: 0,
          conversionRate: 100.0,
          avgDaysInStage: 4
        }
      ];

      const sim = simulatePipelineOutcomes(6, stageMetrics, 12);
      expect(sim.simulatedApplicationsPerWeek).toBe(6);
      expect(sim.simulationDays).toBe(84);
      expect(sim.p90Offers).toBeGreaterThanOrEqual(sim.p50Offers);
      expect(sim.p50Offers).toBeGreaterThanOrEqual(sim.p10Offers);
    });
  });

  describe('Repository & Dual-Runtime Parity', () => {
    it('generates and loads latest velocity report in demo mode', async () => {
      const futureDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const report = await pipelineVelocityRepository.generateReport({
        targetOfferDate: futureDate,
        targetOfferCount: 1,
        simulatedWeeklyVelocity: 5,
        simulationHorizonWeeks: 12
      });

      expect(report).toBeDefined();
      expect(report.targetOfferDate).toBe(futureDate);
      expect(report.stageMetrics.length).toBe(4);
      expect(report.bottlenecks.length).toBe(4);

      const loaded = await pipelineVelocityRepository.getLatestReport();
      expect(loaded).toBeDefined();
      expect(loaded?.id).toBe(report.id);
    });

    it('simulates dynamic on-the-fly velocity scenarios', async () => {
      const sim = await pipelineVelocityRepository.simulate({
        weeklyVelocity: 8,
        weeksHorizon: 16
      });

      expect(sim.simulatedApplicationsPerWeek).toBe(8);
      expect(sim.simulationDays).toBe(112);
      expect(sim.p90Offers).toBeGreaterThanOrEqual(sim.p50Offers);
    });
  });
});
