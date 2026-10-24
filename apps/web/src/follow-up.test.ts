import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { followUpRepository } from './data';
import { ApiError } from './transport';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Follow-up Repository (demoMode)', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('retrieves cadence status, default templates, and empty logs for initial application', async () => {
    const res = await followUpRepository.getFollowUps('demo-0');
    expect(res).toBeDefined();
    expect(res.cadence).toBeDefined();
    expect(res.cadence.applicationId).toBe('demo-0');
    expect(['scheduled', 'due', 'overdue']).toContain(res.cadence.urgency);
    expect(res.templates.length).toBeGreaterThanOrEqual(4);
    expect(Array.isArray(res.logs)).toBe(true);
  });

  it('throws 404 ApiError when application does not exist', async () => {
    await expect(followUpRepository.getFollowUps('non-existent-app-999')).rejects.toThrow(ApiError);
  });

  it('generates customized email draft for applied stage with polite check-in tone', async () => {
    const draft = await followUpRepository.generateDraft('demo-1', {
      tone: 'polite_check_in',
      candidateName: 'Nguyễn Văn A',
      recruiterName: 'Chị Mai',
      discussionHighlight: 'Hệ thống Microservices'
    });

    expect(draft.subject).toContain('Nguyễn Văn A');
    expect(draft.body).toContain('Chị Mai');
    expect(draft.recommendedWaitDays).toBeGreaterThan(0);
    expect(draft.keySuggestions.length).toBeGreaterThan(0);
  });

  it('generates customized email draft for post-interview thank you', async () => {
    const draft = await followUpRepository.generateDraft('demo-0', {
      stage: 'Interview',
      tone: 'post_interview_thank_you',
      candidateName: 'Trần Thị B',
      recruiterName: 'Anh Tuấn',
      interviewRound: 'Technical Round 2'
    });

    expect(draft.subject).toContain('Trần Thị B');
    expect(draft.body).toContain('Anh Tuấn');
    expect(draft.recommendedWaitDays).toBe(1);
    expect(draft.keySuggestions[0]).toContain('24 giờ');
  });

  it('validates and rejects invalid log payload with short body or missing fields', async () => {
    await expect(
      followUpRepository.createLog('demo-0', {
        stage: 'Applied',
        tone: 'polite_check_in',
        subject: '',
        body: 'Ngắn'
      })
    ).rejects.toThrow(ApiError);
  });

  it('creates follow-up log, persists to demo storage, and updates history', async () => {
    const created = await followUpRepository.createLog('demo-0', {
      stage: 'Applied',
      tone: 'polite_check_in',
      recipientEmail: 'hr@example.com',
      subject: 'Hỏi thăm hồ sơ ứng tuyển - Nguyễn Văn A',
      body: 'Kính gửi chị Mai, em xin phép gửi email hỏi thăm tiến độ xét duyệt hồ sơ ứng tuyển vị trí Kỹ sư phần mềm.',
      notes: 'Đã gửi qua email cá nhân lúc 9h sáng'
    });

    expect(created.id).toMatch(/^ful-/);
    expect(created.subject).toContain('Nguyễn Văn A');
    expect(created.recipientEmail).toBe('hr@example.com');
    expect(created.notes).toContain('9h sáng');

    const updated = await followUpRepository.getFollowUps('demo-0');
    expect(updated.logs.length).toBe(1);
    expect(updated.logs[0].id).toBe(created.id);
  });

  it('scans and returns applications due or overdue for follow-up', async () => {
    const dueList = await followUpRepository.getDueFollowUps();
    expect(Array.isArray(dueList)).toBe(true);
    for (const item of dueList) {
      expect(['due', 'overdue']).toContain(item.urgency);
      expect(item.daysSinceLastInteraction).toBeGreaterThanOrEqual(item.recommendedWaitDays);
    }
  });
});
