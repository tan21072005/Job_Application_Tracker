import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { analyticsRepository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Analytics & Career Velocity Repository (demoMode)', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getGoals returns default targets when unconfigured', async () => {
    const goals = await analyticsRepository.getGoals();
    expect(goals.weeklyApplicationsTarget).toBe(5);
    expect(goals.monthlyInterviewsTarget).toBe(2);
    expect(goals.targetOffers).toBe(1);
    expect(goals.weeklyApplicationsProgressPercent).toBeGreaterThanOrEqual(0);
  });

  it('updateGoals persists custom targets in storage', async () => {
    const updated = await analyticsRepository.updateGoals({
      weeklyApplicationsTarget: 8,
      monthlyInterviewsTarget: 3,
      targetOffers: 2
    });

    expect(updated.weeklyApplicationsTarget).toBe(8);
    expect(updated.monthlyInterviewsTarget).toBe(3);
    expect(updated.targetOffers).toBe(2);

    const reloaded = await analyticsRepository.getGoals();
    expect(reloaded.weeklyApplicationsTarget).toBe(8);
    expect(reloaded.monthlyInterviewsTarget).toBe(3);
    expect(reloaded.targetOffers).toBe(2);
  });

  it('getSummary produces complete funnel and velocity metrics', async () => {
    const summary = await analyticsRepository.getSummary('all');
    expect(summary.timeframe).toBe('all');
    expect(summary.funnel.length).toBe(5);

    const stages = summary.funnel.map(s => s.stage);
    expect(stages).toEqual(['Saved', 'Applied', 'Screening', 'Interview', 'Offer']);

    expect(summary.velocity).toBeDefined();
    expect(summary.velocity.activeCount).toBeGreaterThanOrEqual(0);
    expect(summary.sources).toBeDefined();
    expect(Array.isArray(summary.sources)).toBe(true);
    expect(summary.goals).toBeDefined();
  });

  it('getSummary supports 30d timeframe filter', async () => {
    const summary30d = await analyticsRepository.getSummary('30d');
    expect(summary30d.timeframe).toBe('30d');
    expect(summary30d.funnel).toBeDefined();
    expect(summary30d.velocity).toBeDefined();
  });
});
