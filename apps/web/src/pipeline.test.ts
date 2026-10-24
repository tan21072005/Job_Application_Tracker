import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  filtered,
  calculateStageSla,
  emptyDraft,
  type Application
} from './domain';
import { pipelineRepository, repository } from './data';

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
  status: 'Applied',
  createdAt: '2026-10-01T00:00:00.000Z',
  interviews: [],
  priority: 'target',
  tags: ['react'],
  ...overrides
});

describe('Pipeline & Kanban Matrix', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('filtered helper with priority and tag', () => {
    const list: Application[] = [
      makeApp('1', { company: 'Google', position: 'Frontend', priority: 'urgent', tags: ['react', 'infra'] }),
      makeApp('2', { company: 'Apple', position: 'Backend', priority: 'target', tags: ['node', 'cloud'] }),
      makeApp('3', { company: 'Netflix', position: 'Mobile', priority: 'safety', tags: ['react', 'mobile'] }),
      makeApp('4', { company: 'Meta', position: 'Fullstack', priority: 'backlog', tags: ['python'] })
    ];

    it('filters by priority correctly', () => {
      const urgent = filtered(list, '', 'all', 'created-desc', 'urgent');
      expect(urgent.map(a => a.id)).toEqual(['1']);

      const safety = filtered(list, '', 'all', 'created-desc', 'safety');
      expect(safety.map(a => a.id)).toEqual(['3']);
    });

    it('filters by tag correctly', () => {
      const reactApps = filtered(list, '', 'all', 'created-desc', 'all', 'react');
      expect(reactApps.map(a => a.id)).toEqual(['1', '3']);

      const pythonApps = filtered(list, '', 'all', 'created-desc', 'all', '#python');
      expect(pythonApps.map(a => a.id)).toEqual(['4']);
    });

    it('combines text query, status, priority, and tag', () => {
      const result = filtered(list, 'Google', 'Applied', 'created-desc', 'urgent', 'react');
      expect(result.map(a => a.id)).toEqual(['1']);

      const noMatch = filtered(list, 'Google', 'Applied', 'created-desc', 'target', 'react');
      expect(noMatch).toEqual([]);
    });
  });

  describe('calculateStageSla in UI domain', () => {
    it('detects healthy SLA status', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const sla = calculateStageSla('Applied', threeDaysAgo);
      expect(sla.isStagnant).toBe(false);
      expect(sla.slaSeverity).toBe('normal');
      expect(sla.daysInStage).toBe(3);
    });

    it('flags overdue SLA when exceeding stage limits', () => {
      const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
      const sla = calculateStageSla('Applied', twentyDaysAgo);
      expect(sla.isStagnant).toBe(true);
      expect(['warning', 'critical']).toContain(sla.slaSeverity);
      expect(sla.recommendation.length).toBeGreaterThan(10);
    });

    it('ignores terminal states from SLA stagnation', () => {
      const monthAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
      const sla = calculateStageSla('Rejected', monthAgo);
      expect(sla.isStagnant).toBe(false);
      expect(sla.slaSeverity).toBe('normal');
    });
  });

  describe('pipelineRepository (demo mode parity)', () => {
    beforeEach(() => {
      const initialApps: Application[] = [
        makeApp('demo-1', {
          company: 'Acme',
          status: 'Applied',
          priority: 'target',
          tags: ['golang'],
          statusUpdatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
        }),
        makeApp('demo-2', {
          company: 'Beta',
          status: 'Interview',
          priority: 'urgent',
          tags: ['react', 'fintech'],
          statusUpdatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        }),
        makeApp('demo-3', {
          company: 'Gamma',
          status: 'Rejected',
          priority: 'backlog',
          tags: ['ai'],
          statusUpdatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
        })
      ];
      localStorageMock.setItem('jobtrack.design.v1', JSON.stringify(initialApps));
    });

    it('updates priority, tags, and statusUpdatedAt', async () => {
      const updated = await pipelineRepository.update('demo-1', {
        priority: 'urgent',
        tags: ['#golang', 'distributed-systems']
      });

      expect(updated.priority).toBe('urgent');
      expect(updated.tags).toEqual(['golang', 'distributed-systems']);

      const all = await repository.list();
      const found = all.find(a => a.id === 'demo-1');
      expect(found?.priority).toBe('urgent');
      expect(found?.tags).toEqual(['golang', 'distributed-systems']);
    });

    it('rejects invalid priority with 422 error', async () => {
      await expect(
        pipelineRepository.update('demo-1', {
          priority: 'not_a_valid_priority' as any
        })
      ).rejects.toThrow();
    });

    it('getStagnant identifies non-terminal applications exceeding SLA', async () => {
      const stagnant = await pipelineRepository.getStagnant();
      expect(stagnant.length).toBe(1);
      expect(stagnant[0].applicationId).toBe('demo-1');
      expect(stagnant[0].sla.isStagnant).toBe(true);
      expect(stagnant[0].company).toBe('Acme');
    });

    it('getSummary aggregates pipeline counts', async () => {
      const summary = await pipelineRepository.getSummary();
      expect(summary.totalApplications).toBe(3);
      expect(summary.statusCounts.Applied).toBe(1);
      expect(summary.statusCounts.Interview).toBe(1);
      expect(summary.statusCounts.Rejected).toBe(1);
      expect(summary.priorityCounts.urgent).toBe(1);
      expect(summary.priorityCounts.target).toBe(1);
      expect(summary.priorityCounts.backlog).toBe(1);
      expect(summary.stagnantCount).toBe(1);
    });
  });
});
