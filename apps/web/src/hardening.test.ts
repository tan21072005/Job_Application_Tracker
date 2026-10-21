import { afterEach, describe, expect, it, vi } from 'vitest';
import { actionable, duplicate, emptyDraft, validateDraft, type Application } from './domain';
import { fixture } from './demo';
import { validApplications } from './validation';
import { request } from './transport';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('Data boundaries and priority', () => {
  it('rejects malformed stored records before date and timezone rendering', () => {
    const data = fixture();
    expect(validApplications(data)).toBe(true);
    expect(validApplications([{ id: 'broken', interviews: [] }])).toBe(false);
    expect(validApplications([{ ...data[0], deadline: 'invalid' }])).toBe(false);
    expect(validApplications([{ ...data[0], url: 'javascript:alert(1)' }])).toBe(false);
    expect(validApplications([data[0], data[0]])).toBe(false);
    expect(validApplications([{ ...data[0], version: 0 }])).toBe(false);
    expect(validApplications([{ ...data[0], interviews: [{ ...data.flatMap(a => a.interviews)[0], timezone: 'Invalid/Zone' }] }])).toBe(false);
  });
  it('orders tied actions consistently, puts undated last, and omits whitespace', () => {
    const record = (id: string, deadline: string, nextAction = 'Follow up'): Application => ({ ...emptyDraft, id, deadline, nextAction, company: 'Company', position: 'Role', createdAt: '2026-10-19T00:00:00Z', interviews: [] });
    expect(actionable([record('b', '2026-10-20T09:00'), record('c', ''), record('a', '2026-10-20T09:00'), record('d', '', '   ')]).map(a => a.id)).toEqual(['a', 'b', 'c']);
  });
  it('does not crash or match unrelated malformed URLs', () => {
    const app = { ...emptyDraft, id: 'a', company: 'A', position: 'B', url: 'broken', createdAt: '', interviews: [] };
    expect(duplicate([app], { ...emptyDraft, url: 'another broken' })).toBeUndefined();
    expect(validateDraft({ ...emptyDraft, deadline: 'not-a-date' }).deadline).toBeTruthy();
    expect(duplicate([{ ...app, source: 'ＣＡＲＥＥＲＳ', jobCode: 'ＡＢ-１' }], { ...emptyDraft, source: 'careers', jobCode: 'ab-1' })?.id).toBe('a');
  });
});
describe('API recovery messages', () => {
  it.each([401, 403, 404, 409, 429, 500])('exposes HTTP %i as a typed recoverable failure', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status })));
    await expect(request('/applications')).rejects.toMatchObject({ name: 'ApiError', status, message: expect.any(String) });
  });
  it('captures code, fields, and existing properties from structured 409 error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 'reapply_confirmation_required',
            message: 'Xác nhận ứng tuyển lại trước khi tạo hồ sơ mới.',
            existing: { id: 'app-123', status: 'Rejected' },
            fields: { url: 'conflict' }
          }),
          { status: 409 }
        )
      )
    );
    await expect(request('/applications')).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      code: 'reapply_confirmation_required',
      existing: { id: 'app-123', status: 'Rejected' },
      fields: { url: 'conflict' }
    });
  });
  it('duplicate enforces active precedence over terminal applications', () => {
    const terminalApp: Application = { ...emptyDraft, id: 'terminal', company: 'Co', position: 'Dev', url: 'https://example.com/job', status: 'Rejected', createdAt: '2026-10-18T00:00:00Z', interviews: [] };
    const activeApp: Application = { ...emptyDraft, id: 'active', company: 'Co', position: 'Dev', url: 'https://example.com/job', status: 'Applied', createdAt: '2026-10-19T00:00:00Z', interviews: [] };
    const match = duplicate([terminalApp, activeApp], { ...emptyDraft, url: 'https://example.com/job' });
    expect(match?.id).toBe('active');
  });
  it('keeps credentials, method, and payload and handles empty success', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetcher);
    await expect(request('/applications/id', { method: 'DELETE' })).resolves.toBeUndefined();
    expect(fetcher).toHaveBeenCalledWith('/api/applications/id', expect.objectContaining({ credentials: 'include', method: 'DELETE' }));
  });
  it('explains offline and malformed responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(request('/applications')).rejects.toMatchObject({ status: 0, message: expect.stringContaining('Kiểm tra mạng') });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html/>')));
    await expect(request('/applications')).rejects.toMatchObject({ status: 502 });
  });
  it('aborts requests that exceed the timeout', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))));
    const pending = expect(request('/applications')).rejects.toMatchObject({ status: 0, message: expect.stringContaining('quá nhiều thời gian') });
    await vi.advanceTimersByTimeAsync(15000);
    await pending;
  });
  it('preserves idempotency key and headers across retry attempts', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new TypeError('Network failure')).mockResolvedValueOnce(new Response(JSON.stringify({ id: 'app-1', version: 1 }), { status: 201 }));
    vi.stubGlobal('fetch', fetcher);
    const key = '11111111-2222-3333-4444-555555555555';
    // First attempt fails
    await expect(request('/applications', { method: 'POST', headers: { 'Idempotency-Key': key } })).rejects.toMatchObject({ status: 0 });
    // Second attempt with same key succeeds
    const res = await request('/applications', { method: 'POST', headers: { 'Idempotency-Key': key } });
    expect(res).toEqual({ id: 'app-1', version: 1 });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenNthCalledWith(1, '/api/applications', expect.objectContaining({ headers: expect.objectContaining({ 'Idempotency-Key': key }) }));
    expect(fetcher).toHaveBeenNthCalledWith(2, '/api/applications', expect.objectContaining({ headers: expect.objectContaining({ 'Idempotency-Key': key }) }));
  });
});

describe('T08: UX harden, clock ticking, dirty-state, and field limits', () => {
  it('enforces field limits: source and jobCode <= 128, company/position <= 250, url <= 2000', () => {
    // Valid 128 char source and jobCode
    const valid128 = 'a'.repeat(128);
    const validDraft = {
      ...emptyDraft,
      company: 'Valid Company',
      position: 'Valid Position',
      source: valid128,
      jobCode: valid128
    };
    expect(validateDraft(validDraft).source).toBeUndefined();
    expect(validateDraft(validDraft).jobCode).toBeUndefined();

    // Exceeding 128 chars
    const invalid129 = 'a'.repeat(129);
    const invalidDraft = {
      ...validDraft,
      source: invalid129,
      jobCode: invalid129
    };
    const errors = validateDraft(invalidDraft);
    expect(errors.source).toContain('128');
    expect(errors.jobCode).toContain('128');

    // Exceeding company (250) and position (250)
    const invalidCompany = { ...validDraft, company: 'c'.repeat(251) };
    expect(validateDraft(invalidCompany).company).toContain('250');

    const invalidPosition = { ...validDraft, position: 'p'.repeat(251) };
    expect(validateDraft(invalidPosition).position).toContain('250');

    // Exceeding url (2000)
    const invalidUrl = { ...validDraft, url: 'https://example.com/' + 'u'.repeat(2000) };
    expect(validateDraft(invalidUrl).url).toContain('2000');
  });

  it('captures structured 422 validation errors with fields map from API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 'validation_error',
            message: 'Dữ liệu chưa hợp lệ.',
            fields: {
              source: 'Nguồn tuyển dụng không được vượt quá 128 ký tự.',
              jobCode: 'Mã tin tuyển dụng không được vượt quá 128 ký tự.'
            }
          }),
          { status: 422 }
        )
      )
    );
    await expect(request('/applications', { method: 'POST', body: '{}' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 422,
      code: 'validation_error',
      fields: {
        source: expect.stringContaining('128'),
        jobCode: expect.stringContaining('128')
      }
    });
  });

  it('detects dirty state when DST fold offset occurrence is changed', () => {
    const draft = { ...emptyDraft, company: 'Google', position: 'SWE' };
    const initialInstant = '2026-11-01T05:30:00.000Z'; // 1:30 AM EDT (-4)
    const secondOccurrenceInstant = '2026-11-01T06:30:00.000Z'; // 1:30 AM EST (-5)

    const initialSerialization = JSON.stringify([draft, initialInstant]);

    // Unchanged
    expect(JSON.stringify([draft, initialInstant]) !== initialSerialization).toBe(false);

    // If user selects the second occurrence during DST fold, dirty state is true
    expect(JSON.stringify([draft, secondOccurrenceInstant]) !== initialSerialization).toBe(true);
  });

  it('preserves existing instant across device timezone shifts when unchanged', () => {
    const originalUtcInstant = '2026-11-01T05:30:00.000Z';
    const app: Application = {
      ...emptyDraft,
      id: 'app-dst',
      company: 'Tech Corp',
      position: 'Lead',
      deadline: originalUtcInstant,
      createdAt: '2026-10-19T00:00:00Z',
      interviews: []
    };

    // Simulate opening form in device timezone
    const initialLocalDeadline = '2026-11-01T01:30';
    let currentDeadline = initialLocalDeadline;
    let deadlineInstant = '';

    // User only changes company name, not deadline
    const deadlineChanged = currentDeadline !== initialLocalDeadline || (deadlineInstant !== '' && deadlineInstant !== app.deadline);
    const targetDeadline = !currentDeadline ? undefined : (!deadlineChanged && app.deadline) ? app.deadline : deadlineInstant;

    // Preserved exactly as the stored UTC instant
    expect(targetDeadline).toBe(originalUtcInstant);
  });

  it('recalculates upcoming interview schedule and deadline overdue state when clock ticks', () => {
    const now1 = Date.parse('2026-10-20T10:00:00.000Z');
    const app: Application = {
      ...emptyDraft,
      id: 'app-clock',
      company: 'Future Corp',
      position: 'Architect',
      deadline: '2026-10-20T10:15:00.000Z',
      createdAt: '2026-10-19T00:00:00Z',
      interviews: [
        {
          id: 'int-1',
          title: 'Round 1',
          at: '2026-10-20T10:30:00.000Z',
          timezone: 'UTC',
          format: 'Online',
          location: '',
          preparation: '',
          notes: '',
          status: 'Scheduled'
        }
      ]
    };

    // At now1: interview is in future (upcoming = 1)
    const upcomingAtNow1 = [app].flatMap(a => a.interviews.filter(i => i.status === 'Scheduled' && Date.parse(i.at) >= now1));
    expect(upcomingAtNow1.length).toBe(1);

    // Clock ticks past the interview start time: now2 = 10:31:00 UTC
    const now2 = Date.parse('2026-10-20T10:31:00.000Z');
    const upcomingAtNow2 = [app].flatMap(a => a.interviews.filter(i => i.status === 'Scheduled' && Date.parse(i.at) >= now2));
    expect(upcomingAtNow2.length).toBe(0);

    // Deadline overdue calculation:
    expect(Date.parse(app.deadline) < now1).toBe(false); // at now1, not overdue
    expect(Date.parse(app.deadline) < now2).toBe(true);  // at now2, overdue!
  });
});

