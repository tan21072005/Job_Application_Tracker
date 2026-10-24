import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { repository, downloadApplicationsCsv } from './data';
import type { Application } from './domain';

const map = new Map<string, string>();
const mockStorage = {
  getItem: (key: string) => map.get(key) || null,
  setItem: (key: string, val: string) => map.set(key, val),
  removeItem: (key: string) => map.delete(key),
  clear: () => map.clear()
};

beforeEach(() => {
  map.clear();
  vi.stubGlobal('localStorage', mockStorage);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('Bulk Operations & Timeline repository', () => {
  it('bulkUpdateStatus updates status for multiple applications in demo mode', async () => {
    const list = await repository.list();
    expect(list.length).toBeGreaterThanOrEqual(2);

    const ids = [list[0].id, list[1].id];
    const res = await repository.bulkUpdateStatus(ids, 'Applied');

    expect(res.affectedCount).toBe(2);
    expect(res.ids).toEqual(ids);

    const updated = await repository.list();
    const app0 = updated.find(a => a.id === ids[0]);
    const app1 = updated.find(a => a.id === ids[1]);
    expect(app0?.status).toBe('Applied');
    expect(app1?.status).toBe('Applied');
  });

  it('bulkMoveToTrash moves applications to trash store in demo mode', async () => {
    const initialList = await repository.list();
    expect(initialList.length).toBeGreaterThanOrEqual(1);

    const targetId = initialList[0].id;
    const res = await repository.bulkMoveToTrash([targetId]);

    expect(res.affectedCount).toBe(1);

    const remaining = await repository.list();
    expect(remaining.some(a => a.id === targetId)).toBe(false);

    const trash = await repository.listTrash();
    expect(trash.some(a => a.id === targetId)).toBe(true);
  });

  it('getTimeline derives activity items for application', async () => {
    const list = await repository.list();
    const app = list[0];

    const timeline = await repository.getTimeline(app.id);
    expect(Array.isArray(timeline)).toBe(true);
    expect(timeline.length).toBeGreaterThanOrEqual(1);

    const createdEvent = timeline.find(e => e.type === 'created');
    expect(createdEvent).toBeDefined();
    expect(createdEvent?.title).toContain('Khởi tạo');
  });

  it('downloadApplicationsCsv invokes blob URL generation without error', () => {
    const mockClick = vi.fn();
    const mockAppendChild = vi.fn();
    const mockRemoveChild = vi.fn();

    vi.stubGlobal('document', {
      createElement: () => ({
        set href(val: string) {},
        set download(val: string) {},
        click: mockClick
      }),
      body: {
        appendChild: mockAppendChild,
        removeChild: mockRemoveChild
      }
    });

    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn()
    });

    const mockApps: Application[] = [
      {
        id: 'test-1',
        company: 'FPT Software',
        position: 'React Lead',
        url: 'https://example.com/job',
        source: 'LinkedIn',
        jobCode: 'FPT-1',
        location: 'Hà Nội',
        workMode: 'Hybrid',
        appliedAt: '2026-10-20',
        salary: '40 triệu',
        notes: 'Test note',
        nextAction: 'Lên lịch phỏng vấn',
        deadline: '2026-10-25T17:00:00Z',
        status: 'Interview',
        interviews: [],
        createdAt: '2026-10-18T00:00:00Z'
      }
    ];

    expect(() => downloadApplicationsCsv(mockApps, 'test.csv')).not.toThrow();
    expect(mockClick).toHaveBeenCalled();
  });
});
