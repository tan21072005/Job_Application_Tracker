import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  evaluatePromotionReadiness,
  recommendPromotionInitiatives,
  simulateCareerTrajectory,
  PROMOTION_DIMENSION_METADATA
} from './domain';
import { careerTrajectoryRepository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('AI Career Trajectory Simulator & Promotion Readiness Engine', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Pure Algorithms & Simulation Engine', () => {
    it('evaluates IC track promotion readiness from Senior to Staff', () => {
      const readiness = evaluatePromotionReadiness('Senior', 'Staff', 'ic', {
        technical_breadth: 85,
        system_scale: 85,
        org_influence: 55,
        mentorship_culture: 70,
        business_impact: 65
      });

      expect(readiness.currentLevel).toBe('Senior');
      expect(readiness.targetLevel).toBe('Staff');
      expect(readiness.track).toBe('ic');
      expect(readiness.competencies).toHaveLength(5);
      expect(readiness.overallReadinessScore).toBeGreaterThan(60);
      expect(readiness.overallReadinessScore).toBeLessThanOrEqual(100);
      expect(readiness.estimatedMonthsToReadiness).toBeGreaterThanOrEqual(3);

      const orgComp = readiness.competencies.find(c => c.dimension === 'org_influence');
      expect(orgComp).toBeDefined();
      expect(orgComp?.gapLevel).toBe('critical');
      expect(orgComp?.evidenceCriteria.length).toBeGreaterThan(0);
    });

    it('evaluates Management track promotion readiness from Senior to Engineering Manager', () => {
      const readiness = evaluatePromotionReadiness('Senior', 'Engineering Manager', 'management', {
        technical_breadth: 80,
        system_scale: 75,
        org_influence: 70,
        mentorship_culture: 55,
        business_impact: 60
      });

      expect(readiness.track).toBe('management');
      expect(readiness.targetLevel).toBe('Engineering Manager');

      const mentorComp = readiness.competencies.find(c => c.dimension === 'mentorship_culture');
      expect(mentorComp?.gapLevel).toBe('critical');
    });

    it('recommends targeted high-impact initiatives based on competency gaps', () => {
      const readiness = evaluatePromotionReadiness('Senior', 'Staff', 'ic', {
        system_scale: 50,
        org_influence: 50
      });

      const initiatives = recommendPromotionInitiatives('ic', readiness.competencies);
      expect(initiatives.length).toBeGreaterThan(0);
      expect(initiatives.some(i => i.focusDimension === 'system_scale' || i.focusDimension === 'org_influence')).toBe(true);
      expect(initiatives[0].expectedImpact.length).toBeGreaterThan(0);
      expect(initiatives[0].keyMetrics.length).toBeGreaterThan(0);
    });

    it('simulates 4-year career progression with compensation ladder', () => {
      const sim = simulateCareerTrajectory({
        currentRole: 'Senior Frontend Engineer',
        currentLevel: 'Senior',
        targetTrack: 'ic',
        targetRole: 'Staff',
        horizonYears: 4,
        userScores: {
          technical_breadth: 85,
          system_scale: 85,
          org_influence: 80,
          mentorship_culture: 80,
          business_impact: 80
        }
      });

      expect(sim.id).toBeDefined();
      expect(sim.roadmapSteps).toHaveLength(4);
      expect(sim.roadmapSteps[0].year).toBe(1);
      expect(sim.roadmapSteps[0].level).toBe('Senior');
      expect(sim.roadmapSteps[0].estimatedAnnualCompVnd).toBeGreaterThan(700000000);

      expect(sim.roadmapSteps[3].year).toBe(4);
      expect(sim.roadmapSteps[3].estimatedAnnualCompVnd).toBeGreaterThan(sim.roadmapSteps[0].estimatedAnnualCompVnd);
      expect(sim.roadmapSteps[0].milestones.length).toBeGreaterThan(0);
    });

    it('contains descriptive metadata for all 5 competency dimensions', () => {
      const dimensions = ['technical_breadth', 'system_scale', 'org_influence', 'mentorship_culture', 'business_impact'] as const;
      for (const dim of dimensions) {
        expect(PROMOTION_DIMENSION_METADATA[dim]).toBeDefined();
        expect(PROMOTION_DIMENSION_METADATA[dim].label.length).toBeGreaterThan(0);
        expect(PROMOTION_DIMENSION_METADATA[dim].description.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Repository Layer (demoMode & persistence)', () => {
    it('initializes default demo simulation if empty', async () => {
      const result = await careerTrajectoryRepository.getTrajectory();
      expect(result).not.toBeNull();
      expect(result?.currentRole).toBe('Senior Frontend Engineer');
      expect(result?.targetTrack).toBe('ic');
      expect(result?.targetRole).toBe('Staff');
      expect(result?.roadmapSteps).toHaveLength(4);
    });

    it('simulates and persists custom trajectory', async () => {
      const sim = await careerTrajectoryRepository.simulate({
        currentRole: 'Backend Tech Lead',
        currentLevel: 'Senior',
        targetTrack: 'management',
        targetRole: 'Engineering Manager',
        horizonYears: 5,
        userScores: {
          org_influence: 80,
          mentorship_culture: 85
        }
      });

      expect(sim.currentRole).toBe('Backend Tech Lead');
      expect(sim.targetTrack).toBe('management');
      expect(sim.targetRole).toBe('Engineering Manager');
      expect(sim.horizonYears).toBe(5);
      expect(sim.roadmapSteps).toHaveLength(5);

      const fetched = await careerTrajectoryRepository.getTrajectory();
      expect(fetched?.currentRole).toBe('Backend Tech Lead');
      expect(fetched?.targetRole).toBe('Engineering Manager');
    });

    it('updates scores and dynamically recalculates readiness', async () => {
      await careerTrajectoryRepository.simulate({
        currentRole: 'Staff Platform Engineer',
        currentLevel: 'Senior',
        targetTrack: 'ic',
        targetRole: 'Principal',
        horizonYears: 4,
        userScores: {
          technical_breadth: 50,
          system_scale: 50,
          org_influence: 50,
          mentorship_culture: 50,
          business_impact: 50
        }
      });

      const initial = await careerTrajectoryRepository.getTrajectory();
      const initialScore = initial?.readiness.overallReadinessScore || 0;

      const updated = await careerTrajectoryRepository.updateCompetencies({
        scores: {
          technical_breadth: 95,
          system_scale: 95,
          org_influence: 95,
          mentorship_culture: 90,
          business_impact: 90
        }
      });

      expect(updated.readiness.overallReadinessScore).toBeGreaterThan(initialScore);
      expect(updated.readiness.estimatedMonthsToReadiness).toBeLessThanOrEqual(6);
    });
  });
});
