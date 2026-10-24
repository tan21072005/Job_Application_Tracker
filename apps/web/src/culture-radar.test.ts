import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  evaluateCompanyCulture,
  generateReverseInterviewQuestions,
  validateAnalyzeCultureInput,
  CULTURE_DIMENSION_LABELS,
  CULTURE_INDUSTRY_BENCHMARKS
} from './domain';
import { cultureRadarRepository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Company Culture & Engineering Radar Synthesizer (Web UI)', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Pure Algorithmic Engines', () => {
    it('evaluates culture profile for preset company with 6 dimensions and flags', () => {
      const result = evaluateCompanyCulture('Shopee');
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.dimensionScores.length).toBe(6);
      expect(result.criticalRedFlagsCount).toBeGreaterThanOrEqual(1);
      expect(result.standoutGreenFlagsCount).toBeGreaterThanOrEqual(1);
      expect(result.synthesisSummary).toContain('Shopee');

      const dimensions = result.dimensionScores.map(d => d.dimension);
      expect(dimensions).toContain('engineering_rigor');
      expect(dimensions).toContain('oncall_wlb');
      expect(dimensions).toContain('psychological_safety');
      expect(dimensions).toContain('mentorship_growth');
      expect(dimensions).toContain('leadership_transparency');
      expect(dimensions).toContain('tech_debt_tooling');
    });

    it('synthesizes consistent hash-derived profile for unknown custom company', () => {
      const resultA = evaluateCompanyCulture('Acme Fintech Global');
      const resultB = evaluateCompanyCulture('Acme Fintech Global');
      expect(resultA.overallScore).toBe(resultB.overallScore);
      expect(resultA.dimensionScores[0].score).toBe(resultB.dimensionScores[0].score);
      expect(resultA.dimensionScores.length).toBe(6);
    });

    it('generates role-tailored reverse interview questions for EM, Peer, and Skip-level', () => {
      const evaluation = evaluateCompanyCulture('VNG Corporation');
      
      const emQuestions = generateReverseInterviewQuestions(evaluation.dimensionScores, 'engineering_manager');
      expect(emQuestions.length).toBeGreaterThanOrEqual(3);
      expect(emQuestions.every(q => q.targetRole === 'engineering_manager')).toBe(true);
      expect(emQuestions[0].listeningFor.length).toBeGreaterThan(0);
      expect(emQuestions[0].redFlagSignal.length).toBeGreaterThan(0);

      const peerQuestions = generateReverseInterviewQuestions(evaluation.dimensionScores, 'peer_engineer');
      expect(peerQuestions.length).toBeGreaterThanOrEqual(3);
      expect(peerQuestions.every(q => q.targetRole === 'peer_engineer')).toBe(true);

      const skipQuestions = generateReverseInterviewQuestions(evaluation.dimensionScores, 'skip_level');
      expect(skipQuestions.length).toBeGreaterThanOrEqual(3);
      expect(skipQuestions.every(q => q.targetRole === 'skip_level')).toBe(true);
    });

    it('validates analyze culture input properly', () => {
      const valid = validateAnalyzeCultureInput({ company: 'Grab' });
      expect(valid.ok).toBe(true);

      const invalidEmpty = validateAnalyzeCultureInput({ company: '   ' });
      expect(invalidEmpty.ok).toBe(false);
      if (!invalidEmpty.ok) {
        expect(invalidEmpty.errors?.company).toBeDefined();
      }

      const invalidNull = validateAnalyzeCultureInput(null);
      expect(invalidNull.ok).toBe(false);
    });

    it('has complete labels and industry benchmarks for all 6 dimensions', () => {
      const expectedDims = [
        'engineering_rigor',
        'oncall_wlb',
        'psychological_safety',
        'mentorship_growth',
        'leadership_transparency',
        'tech_debt_tooling'
      ] as const;

      for (const dim of expectedDims) {
        expect(CULTURE_DIMENSION_LABELS[dim]).toBeDefined();
        expect(CULTURE_INDUSTRY_BENCHMARKS[dim]).toBeGreaterThan(0);
      }
    });
  });

  describe('cultureRadarRepository in Demo Mode', () => {
    it('retrieves or initializes latest radar report', async () => {
      const report = await cultureRadarRepository.getLatestRadar('FPT Software');
      expect(report).not.toBeNull();
      expect(report?.company).toBe('FPT Software');
      expect(report?.dimensionScores.length).toBe(6);
      expect(report?.reverseInterviewQuestions.length).toBeGreaterThanOrEqual(3);
    });

    it('analyzes culture, stores in localStorage, and retrieves on next query', async () => {
      const analyzed = await cultureRadarRepository.analyzeCulture({
        company: 'VinAI Research',
        targetRole: 'peer_engineer',
        candidatePreferences: {
          engineering_rigor: 5,
          oncall_wlb: 3
        }
      });

      expect(analyzed.company).toBe('VinAI Research');
      expect(analyzed.targetRole).toBe('peer_engineer');
      expect(analyzed.overallCompatibilityScore).toBeGreaterThan(0);

      const cached = await cultureRadarRepository.getLatestRadar('VinAI Research');
      expect(cached).not.toBeNull();
      expect(cached?.company).toBe('VinAI Research');
      expect(cached?.overallCompatibilityScore).toBe(analyzed.overallCompatibilityScore);
    });

    it('generates questions for dynamic role probing', async () => {
      const questions = await cultureRadarRepository.generateQuestions({
        dimensionScores: evaluateCompanyCulture('MoMo').dimensionScores,
        targetRole: 'skip_level'
      });

      expect(questions.length).toBeGreaterThan(0);
      expect(questions[0].targetRole).toBe('skip_level');
    });
  });
});
