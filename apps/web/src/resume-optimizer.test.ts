import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  diagnoseAtsKeywordGaps,
  rewriteBulletPointsXyz,
  synthesizeOptimizedResume,
  extractKeywordsFromText,
  extractBulletsFromResume
} from './domain';
import { resumeOptimizerRepository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Multi-Variant Resume ATS Optimizer & X-Y-Z Impact Bullet Rewriter', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Pure Algorithmic Engines', () => {
    it('extracts technical keywords and frequency from job descriptions', () => {
      const jd = 'Looking for a Senior Frontend Engineer with TypeScript, React, Next.js, and Redis experience.';
      const keywords = extractKeywordsFromText(jd);
      expect(keywords.length).toBeGreaterThanOrEqual(4);
      expect(keywords.some(k => k.keyword === 'TypeScript')).toBe(true);
      expect(keywords.some(k => k.keyword === 'React')).toBe(true);
      expect(keywords.some(k => k.keyword === 'Next.js')).toBe(true);
      expect(keywords.some(k => k.keyword === 'Redis')).toBe(true);
    });

    it('extracts bullet points cleanly from diverse resume markdown structures', () => {
      const resume = `
# Developer Name
## Work Experience
- Architected event-driven microservices using Node.js and RabbitMQ.
* Built responsive user dashboards in React and Tailwind CSS.
1. Optimized PostgreSQL database queries, reducing latency by 40%.
      `;
      const bullets = extractBulletsFromResume(resume);
      expect(bullets).toHaveLength(3);
      expect(bullets[0]).toContain('Architected event-driven microservices');
      expect(bullets[1]).toContain('Built responsive user dashboards');
      expect(bullets[2]).toContain('Optimized PostgreSQL database queries');
    });

    it('diagnoses ATS keyword gaps and computes multi-dimensional scores', () => {
      const resume = `
- Built web services using Node.js and Docker.
- Handled SQL queries and server maintenance.
      `;
      const jd = 'We need a Senior Engineer with TypeScript, Node.js, Docker, Kubernetes, CI/CD, and Redis.';
      const diagnostic = diagnoseAtsKeywordGaps(resume, jd);

      expect(diagnostic.atsScore).toBeGreaterThan(0);
      expect(diagnostic.atsScore).toBeLessThanOrEqual(100);
      expect(diagnostic.scoreBreakdown.keywordRelevance).toBeGreaterThan(0);
      expect(diagnostic.matchedKeywordsCount).toBeGreaterThanOrEqual(2);
      expect(diagnostic.missingKeywordsCount).toBeGreaterThanOrEqual(3);
      expect(diagnostic.recommendations.length).toBeGreaterThan(0);

      const k8sGap = diagnostic.keywordGaps.find(k => k.keyword === 'Kubernetes');
      expect(k8sGap?.matched).toBe(false);
    });

    it('rewrites experience bullets according to Google X-Y-Z formula', () => {
      const bullets = ['Worked on payment APIs and fixed checkout bugs.'];
      const proposals = rewriteBulletPointsXyz(bullets, ['TypeScript', 'PostgreSQL']);

      expect(proposals).toHaveLength(1);
      const prop = proposals[0];
      expect(prop.variants).toHaveLength(3);

      const metric = prop.variants.find(v => v.variantType === 'metric_driven');
      expect(metric).toBeDefined();
      expect(metric?.xyzBreakdown.accomplishmentX.length).toBeGreaterThan(0);
      expect(metric?.xyzBreakdown.metricY.length).toBeGreaterThan(0);
      expect(metric?.xyzBreakdown.actionZ.length).toBeGreaterThan(0);

      const leadership = prop.variants.find(v => v.variantType === 'leadership');
      expect(leadership).toBeDefined();

      const techDepth = prop.variants.find(v => v.variantType === 'tech_depth');
      expect(techDepth).toBeDefined();
    });

    it('synthesizes optimized resume replacing accepted bullets and injecting supplemental skills', () => {
      const original = `
## Experience
- Worked on payment APIs.
## Skills
- JavaScript, React
      `;
      const accepted = {
        'Worked on payment APIs.': 'Architected PCI-compliant checkout APIs handling 5,000 req/s with TypeScript.'
      };
      const injected = ['Docker', 'PostgreSQL'];

      const result = synthesizeOptimizedResume(original, accepted, injected);
      expect(result).not.toContain('Worked on payment APIs.');
      expect(result).toContain('Architected PCI-compliant checkout APIs');
      expect(result).toContain('Docker, PostgreSQL');
    });
  });

  describe('Repository Layer (demoMode & persistence)', () => {
    it('diagnoses, saves, lists, updates, and deletes optimization records', async () => {
      const resume = `
# Jane Developer
- Built internal tooling with React and Node.js.
- Deployed services to AWS.
      `;
      const jd = 'Senior Fullstack Engineer with TypeScript, React, Node.js, AWS, and Docker.';

      const created = await resumeOptimizerRepository.diagnose({
        jobTitle: 'Senior Fullstack Engineer',
        company: 'VNG Corporation',
        resumeText: resume,
        jobDescription: jd
      });

      expect(created.id).toBeDefined();
      expect(created.company).toBe('VNG Corporation');
      expect(created.proposals.length).toBeGreaterThan(0);

      const list = await resumeOptimizerRepository.list();
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(created.id);

      const fetched = await resumeOptimizerRepository.getById(created.id);
      expect(fetched?.id).toBe(created.id);

      const origBullet = created.proposals[0].originalBullet;
      const newBullet = created.proposals[0].variants[0].rewrittenText;

      const updated = await resumeOptimizerRepository.applyRewrites(created.id, {
        acceptedBullets: { [origBullet]: newBullet },
        injectedKeywords: ['Docker', 'TypeScript']
      });

      expect(updated.synthesizedResume).toContain(newBullet);
      expect(updated.synthesizedResume).toContain('Docker, TypeScript');

      const deleted = await resumeOptimizerRepository.delete(created.id);
      expect(deleted).toBe(true);

      const listAfter = await resumeOptimizerRepository.list();
      expect(listAfter).toHaveLength(0);
    });
  });
});
