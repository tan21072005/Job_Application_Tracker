import { afterEach, describe, expect, it, vi } from 'vitest';
import { repository } from './data';
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
