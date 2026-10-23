import { afterEach, describe, expect, it, vi } from 'vitest';
import { repository, aiRepository, profileRepository } from './data';
import { emptyDraft, type Application } from './domain';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('AI repository methods and endpoints', () => {
  it('importUrl parses and returns structured JobPosting in demo mode', async () => {
    const res = await repository.importUrl('https://example.com/job/senior-developer');
    expect(res).toBeDefined();
    expect(res.company).toBeTruthy();
    expect(res.position).toBeTruthy();
    expect(res.confidence.company).toBeGreaterThan(0.5);
  });

  it('chat returns grounded assistance reply', async () => {
    const reply = await repository.chat('Hôm nay tôi cần làm gì?');
    expect(reply).toBeDefined();
    expect(reply.output || reply.text).toContain('chế độ dữ liệu mẫu');
  });

  it('grants management list, create and revoke operations work', async () => {
    const initial = await repository.listGrants();
    expect(Array.isArray(initial)).toBe(true);

    const created = await repository.createGrant('antigravity');
    expect(created.client).toBe('antigravity');
    expect(created.token).toMatch(/^jt_sec_/);

    await expect(repository.revokeGrant(created.id)).resolves.not.toThrow();
  });
});

describe('AI URL import domain logic', () => {
  it('maps import data to draft with status Saved', () => {
    const extracted = {
      company: 'Tech Corp',
      position: 'Staff Engineer',
      url: 'https://example.com/jobs/staff',
      location: 'Hà Nội',
      workMode: 'Hybrid' as const,
      salary: '60M',
      notes: 'Kubernetes & Node.js architecture'
    };

    const draft = {
      ...emptyDraft,
      company: extracted.company,
      position: extracted.position,
      url: extracted.url,
      location: extracted.location,
      workMode: extracted.workMode,
      salary: extracted.salary,
      notes: extracted.notes,
      status: 'Saved' as const
    };

    expect(draft.status).toBe('Saved');
    expect(draft.company).toBe('Tech Corp');
    expect(draft.url).toBe('https://example.com/jobs/staff');
  });
});

describe('aiRepository ATS match and Cover letter generation', () => {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, val: string) => store.set(key, val),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear()
  };

  it('analyzeAtsMatch computes match score, breakdown and recommendations in demo mode', async () => {
    vi.stubGlobal('localStorage', mockStorage);
    await profileRepository.save({
      fullName: 'Le Minh Khoa',
      email: 'khoa.le@example.com',
      skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
      bio: 'Fullstack developer 5 years'
    });

    const res = await aiRepository.analyzeAtsMatch({
      company: 'VNG Corporation',
      position: 'Senior React Developer',
      notes: 'Yêu cầu TypeScript, React, Docker, Kubernetes'
    });

    expect(res).toBeDefined();
    expect(res.score).toBeGreaterThanOrEqual(40);
    expect(res.overallFit).toBeTruthy();
    expect(res.matchedSkills).toContain('React');
    expect(res.recommendations.length).toBeGreaterThan(0);
    expect(res.keywordBreakdown.length).toBeGreaterThan(0);
  });

  it('generateCoverLetter creates bilingual tailored cover letters and pitches', async () => {
    vi.stubGlobal('localStorage', mockStorage);
    await profileRepository.save({
      fullName: 'Pham Thu Thao',
      email: 'thao.pham@example.com',
      phone: '0912345678',
      skills: ['Product Management', 'Agile', 'Data Analysis'],
      bio: 'Experienced PM in fintech products'
    });

    const viLetter = await aiRepository.generateCoverLetter({
      company: 'MoMo',
      position: 'Senior Product Manager',
      language: 'vi'
    });
    expect(viLetter.coverLetter).toContain('Pham Thu Thao');
    expect(viLetter.coverLetter).toContain('MoMo');
    expect(viLetter.coverLetter).toContain('Senior Product Manager');
    expect(viLetter.shortPitch).toContain('Pham Thu Thao');
    expect(viLetter.highlights.length).toBeGreaterThan(0);

    const enLetter = await aiRepository.generateCoverLetter({
      company: 'Shopee',
      position: 'Lead Technical PM',
      language: 'en'
    });
    expect(enLetter.coverLetter).toContain('Dear Hiring Team at Shopee');
    expect(enLetter.coverLetter).toContain('Pham Thu Thao');
    expect(enLetter.shortPitch).toContain('Lead Technical PM');
    expect(enLetter.highlights.length).toBeGreaterThan(0);
  });
});

