import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resumeRepository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Resume Repository (demoMode)', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists default resume variant on initial load', async () => {
    const list = await resumeRepository.list();
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].isMaster).toBe(true);
    expect(list[0].experiences.length).toBeGreaterThan(0);
    expect(list[0].skillGroups.length).toBeGreaterThan(0);
  });

  it('creates and manages new resume variants with master switching', async () => {
    const created = await resumeRepository.create({
      name: 'CV Golang Cloud',
      targetRole: 'Senior Golang Cloud Engineer',
      summary: 'Kỹ sư chuyên phát triển cloud services',
      experiences: [
        {
          id: 'exp-1',
          company: 'Cloud Corp',
          role: 'Golang Engineer',
          period: '2023 - 2026',
          bulletPoints: ['Thiết kế gRPC services với throughput cao'],
          technologies: ['Go', 'gRPC', 'Kubernetes']
        }
      ],
      skillGroups: [
        {
          category: 'Ngôn ngữ',
          skills: ['Go', 'TypeScript', 'SQL']
        }
      ],
      isMaster: true
    });

    expect(created.id).toBeTruthy();
    expect(created.isMaster).toBe(true);

    const list = await resumeRepository.list();
    expect(list.length).toBe(2);
    const old = list.find(r => r.id !== created.id);
    expect(old?.isMaster).toBe(false);
  });

  it('updates existing variant details', async () => {
    const list = await resumeRepository.list();
    const target = list[0];

    const updated = await resumeRepository.update(target.id, {
      name: 'Updated Master CV',
      targetRole: 'Lead Architect',
      summary: 'Kiến trúc sư hệ thống giàu kinh nghiệm',
      experiences: target.experiences,
      skillGroups: target.skillGroups,
      isMaster: true
    });

    expect(updated.name).toBe('Updated Master CV');
    expect(updated.targetRole).toBe('Lead Architect');

    const fetched = await resumeRepository.get(target.id);
    expect(fetched.name).toBe('Updated Master CV');
  });

  it('tailors resume for job description and increases ATS score', async () => {
    const result = await resumeRepository.tailor({
      jobDetails: {
        company: 'VNG Corporation',
        position: 'Senior React Developer',
        description: 'Tuyển Senior React Developer thành thạo TypeScript, React, Next.js, Redux, TailwindCSS, REST API và CI/CD testing.'
      }
    });

    expect(result.tailoredResume).toBeTruthy();
    expect(result.tailoredScore).toBeGreaterThanOrEqual(result.originalScore);
    expect(result.scoreDelta).toBeGreaterThanOrEqual(0);
    expect(result.diffs.length).toBeGreaterThan(0);
    expect(result.keywordCoverage.length).toBeGreaterThan(0);
    expect(result.tailoringNotes.length).toBeGreaterThan(0);
  });

  it('deletes variant from storage', async () => {
    const created = await resumeRepository.create({
      name: 'Temporary Resume',
      targetRole: 'Tester',
      summary: 'Temp',
      experiences: [],
      skillGroups: [],
      isMaster: false
    });

    let list = await resumeRepository.list();
    const countBefore = list.length;

    await resumeRepository.delete(created.id);
    list = await resumeRepository.list();
    expect(list.length).toBe(countBefore - 1);
    expect(list.find(r => r.id === created.id)).toBeUndefined();
  });
});
