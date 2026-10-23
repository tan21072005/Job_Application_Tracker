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

  it('retrieves and updates candidate profile via profileRepository', async () => {
    vi.stubEnv('VITE_DATA_MODE', 'api'); vi.resetModules();
    const { profileRepository } = await import('./data');
    const profileMock = {
      userId: 'user-1',
      fullName: 'Test User',
      email: 'test@example.com',
      phone: '+84 900 000 000',
      cvUrl: 'https://example.com/cv.pdf',
      portfolioUrl: 'https://github.com/test',
      skills: ['TypeScript', 'React'],
      bio: 'Bio text',
      customAnswers: {},
      createdAt: '2026-10-24T00:00:00Z',
      updatedAt: '2026-10-24T00:00:00Z'
    };
    const fetcher = vi.fn().mockImplementation(async (url: string) => {
      if (url === '/api/profile') {
        return new Response(JSON.stringify(profileMock), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal('fetch', fetcher);

    const fetched = await profileRepository.get();
    expect(fetched).toEqual(profileMock);
    expect(fetcher).toHaveBeenCalledWith('/api/profile', expect.objectContaining({ credentials: 'include' }));

    await profileRepository.save({
      fullName: 'Test User',
      email: 'test@example.com',
      expectedUpdatedAt: '2026-10-24T00:00:00Z'
    });
    const putCall = fetcher.mock.calls[1];
    expect(putCall[0]).toBe('/api/profile');
    const putOpts = putCall[1] as RequestInit;
    expect(putOpts.method).toBe('PUT');
    expect((putOpts.headers as Record<string, string>)['If-Match']).toBe('2026-10-24T00:00:00Z');
  });
});
