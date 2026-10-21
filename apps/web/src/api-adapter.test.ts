import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyDraft, resolveLocalTime, deviceTimezone } from './domain';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });
describe('live API adapter', () => {
  it('sends UTC deadlines, stable create keys and conditional mutation headers', async () => {
    vi.stubEnv('VITE_DATA_MODE', 'api'); vi.resetModules();
    const { repository } = await import('./data');
    const responses = [{ id: 'a', version: 1 }, { id: 'a', version: 2 }, { id: 'round' }, { id: 'b', version: 1 }];
    const fetcher = vi.fn().mockImplementation(async () => new Response(JSON.stringify(responses.shift()), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetcher);
    const local = '2026-10-20T09:00';
    const instant = resolveLocalTime(local, deviceTimezone)[0];
    await repository.save({ ...emptyDraft, company: 'Company', position: 'Role', nextAction: 'Send CV', deadline: local }, undefined, { key: '00000000-0000-4000-8000-000000000001', deadlineInstant: instant });
    const createOptions = fetcher.mock.calls[0][1] as RequestInit;
    expect((createOptions.headers as Record<string, string>)['Idempotency-Key']).toBe('00000000-0000-4000-8000-000000000001');
    expect(JSON.parse(createOptions.body as string).deadline).toBe(instant);
    await repository.save({ ...emptyDraft, company: 'Company', position: 'Role', status: 'Interview' }, 'a', { version: 1 });
    expect((fetcher.mock.calls[1][1].headers as Record<string, string>)['If-Match']).toBe('"app:a:v1"');
    await repository.interview('a', { id: 'new-1', title: 'Technical', at: instant, timezone: deviceTimezone, format: 'Online', location: '', preparation: '', notes: '', status: 'Scheduled' }, 2, '00000000-0000-4000-8000-000000000002');
    expect((fetcher.mock.calls[2][1].headers as Record<string, string>)['Idempotency-Key']).toBe('00000000-0000-4000-8000-000000000002');
    expect((fetcher.mock.calls[2][1].headers as Record<string, string>)['If-Match']).toBe('"app:a:v2"');
    expect(JSON.parse(fetcher.mock.calls[2][1].body as string).id).toBeUndefined();
    await repository.save({ ...emptyDraft, company: 'B', position: 'Role' }, undefined, { key: crypto.randomUUID() });
    expect(JSON.parse(fetcher.mock.calls[3][1].body as string).deadline).toBeNull();
  });
});
