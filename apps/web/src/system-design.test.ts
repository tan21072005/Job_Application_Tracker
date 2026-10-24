import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SYSTEM_DESIGN_SCENARIOS,
  calculateCapacityEstimates,
  evaluateSystemArchitecture,
  exportBlueprintToMarkdown,
  validateCapacityInput,
  validateSystemDesignSessionInput,
  validateSystemDesignBlueprintInput
} from './domain';
import { systemDesignRepository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('AI Technical System Design Studio (Web UI)', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Contract Algorithms & Scenarios', () => {
    it('provides 5 standard architectural scenarios', () => {
      expect(SYSTEM_DESIGN_SCENARIOS.length).toBe(5);
      const urlShortener = SYSTEM_DESIGN_SCENARIOS.find(s => s.id === 'url_shortener');
      expect(urlShortener).toBeDefined();
      expect(urlShortener?.category).toBe('web_scale');
      expect(urlShortener?.exemplarBlueprint.scope.functionalRequirements.length).toBeGreaterThanOrEqual(3);
    });

    it('calculates deterministic capacity numbers and hardware sizing', () => {
      const estimates = calculateCapacityEstimates({
        dailyActiveUsers: 100000000,
        readsPerUserPerDay: 10,
        writesPerUserPerDay: 0.1,
        avgReadPayloadBytes: 256,
        avgWritePayloadBytes: 512,
        peakLoadMultiplier: 3,
        dataRetentionYears: 5,
        cacheWorkingSetPercentage: 20
      });

      expect(estimates.averageReadQps).toBe(11574);
      expect(estimates.averageWriteQps).toBe(116);
      expect(estimates.peakTotalQps).toBe(35070);
      expect(estimates.recommendedAppServers).toBeGreaterThanOrEqual(2);
      expect(estimates.recommendedCacheNodes).toBeGreaterThanOrEqual(2);
      expect(estimates.recommendedDbShards).toBeGreaterThanOrEqual(1);
    });

    it('evaluates FAANG 4-stage architecture with Staff readiness verdict', () => {
      const scenario = SYSTEM_DESIGN_SCENARIOS[0];
      const evaluation = evaluateSystemArchitecture(scenario.exemplarBlueprint, scenario.id, 'Staff Software Engineer');

      expect(evaluation.overallScore).toBeGreaterThanOrEqual(85);
      expect(evaluation.seniorityVerdict).toBe('Principal/Staff Ready');
      expect(evaluation.pillars.length).toBe(5);
      expect(evaluation.topStrengths.length).toBeGreaterThan(0);
    });

    it('validates capacity, session, and blueprint inputs strictly', () => {
      expect(validateCapacityInput({ dailyActiveUsers: 5000000, readsPerUserPerDay: 10, writesPerUserPerDay: 1 }).ok).toBe(true);
      expect(validateCapacityInput({ dailyActiveUsers: 0 }).ok).toBe(false);

      expect(validateSystemDesignSessionInput({ title: 'Design TinyURL', scenarioId: 'url_shortener' }).ok).toBe(true);
      expect(validateSystemDesignSessionInput({ title: '' }).ok).toBe(false);

      expect(validateSystemDesignBlueprintInput(SYSTEM_DESIGN_SCENARIOS[0].exemplarBlueprint).ok).toBe(true);
      expect(validateSystemDesignBlueprintInput({}).ok).toBe(false);
    });
  });

  describe('systemDesignRepository Dual Runtime Parity (Local Demo Storage)', () => {
    it('lists pre-seeded sessions with Staff-level exemplar blueprints', async () => {
      const sessions = await systemDesignRepository.listSessions();
      expect(sessions.length).toBeGreaterThanOrEqual(2);
      expect(sessions.some(s => s.scenarioId === 'url_shortener')).toBe(true);
      expect(sessions.some(s => s.scenarioId === 'flash_sale')).toBe(true);
      expect(sessions.every(s => (s.score || 0) >= 80)).toBe(true);
    });

    it('creates, updates, evaluates, exports, and deletes a custom design session', async () => {
      const created = await systemDesignRepository.createSession({
        title: 'Shopee 11.11 Flash Sale Architecture',
        scenarioId: 'flash_sale',
        targetRole: 'Principal Architect',
        difficulty: 'principal'
      });

      expect(created.id).toBeDefined();
      expect(created.title).toBe('Shopee 11.11 Flash Sale Architecture');
      expect(created.blueprint.scope.functionalRequirements.length).toBeGreaterThanOrEqual(3);

      const found = await systemDesignRepository.getSession(created.id);
      expect(found).toBeDefined();
      expect(found?.scenarioId).toBe('flash_sale');

      const updated = await systemDesignRepository.updateSession(created.id, {
        title: 'Shopee 11.11 Flash Sale Architecture v2'
      });
      expect(updated?.title).toBe('Shopee 11.11 Flash Sale Architecture v2');

      const evaluation = await systemDesignRepository.evaluateSession(created.id, 'Principal Architect');
      expect(evaluation).toBeDefined();
      expect(evaluation?.overallScore).toBeGreaterThanOrEqual(85);
      expect(evaluation?.seniorityVerdict).toBe('Principal/Staff Ready');

      const markdown = await systemDesignRepository.exportMarkdown(created.id);
      expect(markdown).toContain('Báo Cáo Thiết Kế Hệ Thống');
      expect(markdown).toContain('```mermaid');

      const deleted = await systemDesignRepository.deleteSession(created.id);
      expect(deleted).toBe(true);

      const notFound = await systemDesignRepository.getSession(created.id);
      expect(notFound).toBeNull();
    });
  });
});
