import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DECISION_DIMENSIONS,
  type DecisionDimensionKey,
  DIMENSION_METADATA,
  DEFAULT_WEIGHT_PROFILE,
  normalizeWeights,
  calculateCompositeScore,
  evaluateDecisionMatrix,
  emptyDraft,
  type Application
} from './domain';
import { decisionRepository, repository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

const makeApp = (id: string, overrides: Partial<Application> = {}): Application => ({
  ...emptyDraft,
  id,
  company: 'Company ' + id,
  position: 'Position ' + id,
  status: 'Interview',
  createdAt: '2026-10-01T00:00:00.000Z',
  interviews: [],
  priority: 'target',
  tags: [],
  scorecard: {
    compensation: 8,
    work_life_balance: 7,
    career_growth: 8,
    company_culture: 8,
    commute_flexibility: 8,
    leadership_team: 7,
    tech_stack: 8
  },
  ...overrides
});

describe('Decision Matrix & Scorecard', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Contract and Domain Math', () => {
    it('defines 7 standard dimensions with correct metadata and labels', () => {
      expect(DECISION_DIMENSIONS.length).toBe(7);
      expect(DECISION_DIMENSIONS).toContain('compensation');
      expect(DECISION_DIMENSIONS).toContain('work_life_balance');
      expect(DECISION_DIMENSIONS).toContain('career_growth');
      expect(DECISION_DIMENSIONS).toContain('company_culture');
      expect(DECISION_DIMENSIONS).toContain('commute_flexibility');
      expect(DECISION_DIMENSIONS).toContain('leadership_team');
      expect(DECISION_DIMENSIONS).toContain('tech_stack');

      for (const dim of DECISION_DIMENSIONS) {
        const meta = DIMENSION_METADATA[dim];
        expect(meta.label).toBeDefined();
        expect(meta.description).toBeDefined();
        expect(meta.minScore).toBe(1);
        expect(meta.maxScore).toBe(10);
      }
    });

    it('normalizes weight profiles to exactly 100%', () => {
      const normalized = normalizeWeights({
        compensation: 40,
        work_life_balance: 30,
        career_growth: 30
      });
      const sum = Object.values(normalized).reduce((a, b) => a + b, 0);
      expect(sum).toBe(100);
      expect(normalized.compensation).toBeGreaterThan(normalized.tech_stack);
    });

    it('computes composite score bounded between 10 and 100', () => {
      const maxScores: Record<DecisionDimensionKey, number> = {
        compensation: 10,
        work_life_balance: 10,
        career_growth: 10,
        company_culture: 10,
        commute_flexibility: 10,
        leadership_team: 10,
        tech_stack: 10
      };
      const maxScore = calculateCompositeScore(maxScores, DEFAULT_WEIGHT_PROFILE);
      expect(maxScore).toBe(100);

      const minScores: Record<DecisionDimensionKey, number> = {
        compensation: 1,
        work_life_balance: 1,
        career_growth: 1,
        company_culture: 1,
        commute_flexibility: 1,
        leadership_team: 1,
        tech_stack: 1
      };
      const minScore = calculateCompositeScore(minScores, DEFAULT_WEIGHT_PROFILE);
      expect(minScore).toBe(10);
    });

    it('evaluates decision matrix, ranks opportunities, and identifies category winners', () => {
      const items = [
        {
          id: 'app-a',
          company: 'Acme Corp',
          position: 'Backend Lead',
          status: 'Offer',
          scores: {
            compensation: 10,
            work_life_balance: 5,
            career_growth: 8,
            company_culture: 7,
            commute_flexibility: 6,
            leadership_team: 7,
            tech_stack: 8
          }
        },
        {
          id: 'app-b',
          company: 'Beta Inc',
          position: 'Senior SRE',
          status: 'Interview',
          scores: {
            compensation: 7,
            work_life_balance: 10,
            career_growth: 9,
            company_culture: 9,
            commute_flexibility: 9,
            leadership_team: 8,
            tech_stack: 9
          }
        }
      ];

      const matrix = evaluateDecisionMatrix(items, DEFAULT_WEIGHT_PROFILE);
      expect(matrix.totalCompared).toBe(2);
      expect(matrix.opportunities.length).toBe(2);
      expect(matrix.topPickId).toBe('app-b');
      expect(matrix.opportunities[0].id).toBe('app-b');
      expect(matrix.opportunities[0].rank).toBe(1);
      expect(matrix.opportunities[1].id).toBe('app-a');
      expect(matrix.opportunities[1].rank).toBe(2);

      const compWinner = matrix.categoryWinners.find(w => w.dimension === 'compensation');
      expect(compWinner?.company).toBe('Acme Corp');
      expect(compWinner?.score).toBe(10);

      const wlbWinner = matrix.categoryWinners.find(w => w.dimension === 'work_life_balance');
      expect(wlbWinner?.company).toBe('Beta Inc');
      expect(wlbWinner?.score).toBe(10);
    });
  });

  describe('decisionRepository in Demo Mode', () => {
    it('returns default weights if nothing saved', async () => {
      const weights = await decisionRepository.getWeights();
      expect(weights.compensation).toBe(25);
      expect(weights.work_life_balance).toBe(20);
      expect(weights.career_growth).toBe(20);
    });

    it('saves and reloads custom weights', async () => {
      const custom = {
        compensation: 40,
        work_life_balance: 20,
        career_growth: 20,
        company_culture: 10,
        commute_flexibility: 5,
        leadership_team: 3,
        tech_stack: 2
      };
      const saved = await decisionRepository.saveWeights(custom);
      expect(saved.compensation).toBe(40);

      const loaded = await decisionRepository.getWeights();
      expect(loaded.compensation).toBe(40);
    });

    it('updates application scorecard and reloads via getScorecard', async () => {
      const initialApps = [
        makeApp('demo-target-1', { company: 'Vercel', position: 'DevRel' })
      ];
      storageMap.set('jobtrack.design.v1', JSON.stringify(initialApps));

      const updated = await decisionRepository.updateScorecard('demo-target-1', {
        scores: {
          compensation: 9,
          work_life_balance: 8,
          career_growth: 10,
          company_culture: 9,
          commute_flexibility: 10,
          leadership_team: 9,
          tech_stack: 10
        },
        notes: 'Môi trường làm việc năng động và sản phẩm xuất sắc'
      });

      expect(updated.scorecard.compensation).toBe(9);
      expect(updated.scorecard.tech_stack).toBe(10);
      expect(updated.notes).toBe('Môi trường làm việc năng động và sản phẩm xuất sắc');

      const retrieved = await decisionRepository.getScorecard('demo-target-1');
      expect(retrieved.scorecard.compensation).toBe(9);
      expect(retrieved.scorecard.career_growth).toBe(10);
    });

    it('evaluates comparison matrix for active applications and respects id filtering', async () => {
      const initialApps = [
        makeApp('app-1', { company: 'Google', position: 'Staff SRE', scorecard: { compensation: 10, work_life_balance: 6, career_growth: 8, company_culture: 7, commute_flexibility: 7, leadership_team: 8, tech_stack: 9 } }),
        makeApp('app-2', { company: 'Stripe', position: 'Backend Lead', scorecard: { compensation: 9, work_life_balance: 8, career_growth: 9, company_culture: 9, commute_flexibility: 8, leadership_team: 9, tech_stack: 9 } }),
        makeApp('app-3', { company: 'Datadog', position: 'Solutions Architect', scorecard: { compensation: 8, work_life_balance: 9, career_growth: 8, company_culture: 8, commute_flexibility: 9, leadership_team: 8, tech_stack: 8 } })
      ];
      storageMap.set('jobtrack.design.v1', JSON.stringify(initialApps));

      const fullMatrix = await decisionRepository.getMatrix();
      expect(fullMatrix.totalCompared).toBe(3);
      expect(fullMatrix.opportunities.length).toBe(3);
      expect(fullMatrix.topPickId).toBeDefined();

      const filteredMatrix = await decisionRepository.getMatrix(['app-1', 'app-3']);
      expect(filteredMatrix.totalCompared).toBe(2);
      expect(filteredMatrix.opportunities.map(o => o.id).sort()).toEqual(['app-1', 'app-3']);
    });
  });
});
