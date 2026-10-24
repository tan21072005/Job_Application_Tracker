import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  extractSkillsFromText,
  extractSkillsFromApplications,
  generateCareerRoadmap,
  calculateRoadmapProgress,
  type LearningMilestoneDTO
} from './domain';
import { careerRoadmapRepository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Skill Gap & Career Roadmap', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Contract and Pure Algorithms', () => {
    it('detects multiple skills and aliases from job text accurately', () => {
      const text = 'Yêu cầu 3 năm kinh nghiệm React, TypeScript, Docker, Kubernetes và Postgres. Ưu tiên biết Golang.';
      const detected = extractSkillsFromText(text);
      const names = detected.map(d => d.name);

      expect(names).toContain('React');
      expect(names).toContain('TypeScript');
      expect(names).toContain('Docker');
      expect(names).toContain('Kubernetes');
      expect(names).toContain('PostgreSQL');
      expect(names).toContain('Go');
    });

    it('extracts skill demand and computes coverage score accurately', () => {
      const apps = [
        {
          company: 'FPT Software',
          position: 'Senior React Engineer',
          notes: 'Stack: React, TypeScript, Docker'
        },
        {
          company: 'VNG Corporation',
          position: 'Backend Developer',
          notes: 'Stack: Node.js, PostgreSQL, Docker'
        }
      ];

      const candidateSkills = ['React', 'TypeScript'];
      const gap = extractSkillsFromApplications(apps, candidateSkills);

      expect(gap.totalApplicationsAnalyzed).toBe(2);
      expect(gap.matchedSkills).toContain('React');
      expect(gap.matchedSkills).toContain('TypeScript');

      const missingSkillNames = gap.missingSkills.map(m => m.skill);
      expect(missingSkillNames).toContain('Docker');
      expect(missingSkillNames).toContain('Node.js');
      expect(missingSkillNames).toContain('PostgreSQL');

      expect(gap.coverageScore).toBeGreaterThanOrEqual(0);
      expect(gap.coverageScore).toBeLessThanOrEqual(100);
      expect(gap.recommendedFocusSkills.length).toBeGreaterThan(0);
    });

    it('generates a 4-week structured roadmap with milestones and learning resources', () => {
      const apps = [
        {
          company: 'Shopee',
          position: 'DevOps / Cloud Specialist',
          notes: 'Must know Kubernetes, Docker, CI/CD, AWS'
        }
      ];
      const gap = extractSkillsFromApplications(apps, ['Docker']);
      const roadmap = generateCareerRoadmap(gap, 'Lead Cloud Architect');

      expect(roadmap.targetRole).toBe('Lead Cloud Architect');
      expect(roadmap.durationWeeks).toBe(4);
      expect(roadmap.milestones.length).toBe(4);
      expect(roadmap.overallProgressPercent).toBe(0);

      const week1 = roadmap.milestones[0];
      expect(week1.week).toBe(1);
      expect(week1.status).toBe('pending');
      expect(week1.resources.length).toBeGreaterThan(0);
      expect(week1.resources[0].url.startsWith('http')).toBe(true);
    });

    it('calculates weighted roadmap progress accurately', () => {
      const milestones: LearningMilestoneDTO[] = [
        {
          id: 'm1',
          week: 1,
          title: 'Week 1',
          description: '',
          skill: 'Docker',
          category: 'devops',
          estimatedHours: 8,
          status: 'completed',
          resources: []
        },
        {
          id: 'm2',
          week: 2,
          title: 'Week 2',
          description: '',
          skill: 'Kubernetes',
          category: 'devops',
          estimatedHours: 10,
          status: 'in_progress',
          resources: []
        },
        {
          id: 'm3',
          week: 3,
          title: 'Week 3',
          description: '',
          skill: 'AWS',
          category: 'devops',
          estimatedHours: 8,
          status: 'pending',
          resources: []
        },
        {
          id: 'm4',
          week: 4,
          title: 'Week 4',
          description: '',
          skill: 'System Design',
          category: 'architecture',
          estimatedHours: 10,
          status: 'pending',
          resources: []
        }
      ];

      const progress = calculateRoadmapProgress(milestones);
      expect(progress).toBe(35);
    });
  });

  describe('Web Repository Integration (Demo Mode)', () => {
    it('getGapAnalysis extracts skills from local fixture applications in demo mode', async () => {
      const gap = await careerRoadmapRepository.getGapAnalysis();
      expect(gap).toBeDefined();
      expect(gap.totalApplicationsAnalyzed).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(gap.matchedSkills)).toBe(true);
      expect(Array.isArray(gap.missingSkills)).toBe(true);
      expect(gap.recommendedFocusSkills.length).toBeGreaterThan(0);
    });

    it('getRoadmap generates and caches a roadmap in localStorage', async () => {
      const roadmap = await careerRoadmapRepository.getRoadmap();
      expect(roadmap).toBeDefined();
      expect(roadmap.milestones.length).toBe(4);
      expect(roadmap.durationWeeks).toBe(4);

      const stored = localStorage.getItem('jobtrack.career_roadmap.v1');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.id).toBe(roadmap.id);
    });

    it('generateRoadmap customizes target role and focus skills', async () => {
      const roadmap = await careerRoadmapRepository.generateRoadmap({
        targetRole: 'Staff Frontend Architect',
        focusSkills: ['Next.js', 'React', 'TypeScript', 'GraphQL']
      });

      expect(roadmap.targetRole).toBe('Staff Frontend Architect');
      expect(roadmap.milestones.length).toBe(4);
      expect(roadmap.milestones[0].skill).toBe('Next.js');

      const stored = localStorage.getItem('jobtrack.career_roadmap.v1');
      const parsed = JSON.parse(stored!);
      expect(parsed.targetRole).toBe('Staff Frontend Architect');
    });

    it('updateMilestone toggles status, updates completedAt, and recalculates progress', async () => {
      const initial = await careerRoadmapRepository.getRoadmap();
      const firstMilestoneId = initial.milestones[0].id;

      const updated = await careerRoadmapRepository.updateMilestone(firstMilestoneId, 'completed');
      const milestone = updated.milestones.find(m => m.id === firstMilestoneId);

      expect(milestone?.status).toBe('completed');
      expect(typeof milestone?.completedAt).toBe('string');
      expect(updated.overallProgressPercent).toBe(25);

      const stored = localStorage.getItem('jobtrack.career_roadmap.v1');
      const parsed = JSON.parse(stored!);
      expect(parsed.overallProgressPercent).toBe(25);
    });
  });
});
