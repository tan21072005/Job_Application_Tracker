import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveFollowUpAttention,
  summarizeFollowUpAttention,
  validateFollowUpEventInput,
  FOLLOW_UP_CADENCE,
  type FollowUpAttentionItemDTO
} from './follow-up.ts';

const TZ = 'Asia/Ho_Chi_Minh';

function at(iso: string): Date {
  return new Date(iso);
}

function item(overrides: Partial<Parameters<typeof deriveFollowUpAttention>[0]>) {
  return deriveFollowUpAttention({
    applicationId: 'app-1',
    company: 'ACME',
    position: 'Engineer',
    stage: 'Applied',
    statusUpdatedAt: '2026-01-01T00:00:00+07:00',
    anchorAt: '2026-01-01T00:00:00+07:00',
    events: [],
    timeZone: TZ,
    now: at('2026-01-08T00:00:00+07:00'),
    ...overrides
  });
}

test('attention: an application inside its wait window stays scheduled', () => {
  const wait = FOLLOW_UP_CADENCE.Applied;
  assert.equal(typeof wait, 'number');
  const result = item({ now: at('2026-01-04T00:00:00+07:00') });
  assert.equal(result.state, 'scheduled');
  assert.equal(result.daysSinceAnchor, 3);
  assert.equal(result.waitDays, wait);
  assert.equal(result.dueDate, '2026-01-06');
});

test('attention: the wait day itself is due, not yet overdue', () => {
  const result = item({ now: at('2026-01-06T00:00:00+07:00') });
  assert.equal(result.state, 'due');
  assert.equal(result.daysSinceAnchor, 5);
});

test('attention: overdue starts only after the grace period', () => {
  assert.equal(item({ now: at('2026-01-07T00:00:00+07:00') }).state, 'due');
  assert.equal(item({ now: at('2026-01-08T00:00:00+07:00') }).state, 'overdue');
});

test('attention: rejected and withdrawn are closed and have no wait', () => {
  for (const stage of ['Rejected', 'Withdrawn'] as const) {
    const result = item({ stage, now: at('2026-02-01T00:00:00+07:00') });
    assert.equal(result.state, 'closed');
    assert.equal(result.waitDays, null);
  }
});

test('attention: a dismissal snoozes the nudge', () => {
  const result = item({
    events: [{ kind: 'dismissed', occurredAt: '2026-01-05T10:00:00+07:00' }],
    now: at('2026-01-20T00:00:00+07:00')
  });
  assert.equal(result.state, 'snoozed');
  assert.equal(result.lastEventKind, 'dismissed');
});

test('attention: ghosted is reported separately from snoozed', () => {
  const result = item({
    events: [{ kind: 'ghosted', occurredAt: '2026-01-05T10:00:00+07:00' }],
    now: at('2026-01-20T00:00:00+07:00')
  });
  assert.equal(result.state, 'ghosted');
});

test('attention: a stage change after a dismissal resumes the nudge', () => {
  const result = item({
    statusUpdatedAt: '2026-01-15T00:00:00+07:00',
    anchorAt: '2026-01-15T00:00:00+07:00',
    events: [{ kind: 'dismissed', occurredAt: '2026-01-05T10:00:00+07:00' }],
    now: at('2026-01-30T00:00:00+07:00')
  });
  assert.equal(result.state, 'overdue');
  assert.equal(result.lastEventKind, null);
});

test('attention: a followed_up event becomes the new anchor', () => {
  const result = item({
    anchorAt: '2026-01-10T09:00:00+07:00',
    events: [{ kind: 'followed_up', occurredAt: '2026-01-10T09:00:00+07:00' }],
    now: at('2026-01-12T00:00:00+07:00')
  });
  assert.equal(result.state, 'scheduled');
  assert.equal(result.daysSinceAnchor, 2);
});

test('attention: calendar days are counted in the configured zone', () => {
  const result = item({
    anchorAt: '2026-01-01T23:30:00+07:00',
    statusUpdatedAt: '2026-01-01T23:30:00+07:00',
    now: at('2026-01-02T00:30:00+07:00')
  });
  assert.equal(result.daysSinceAnchor, 1);
});

test('attention: a future anchor never produces a negative day count', () => {
  const result = item({
    anchorAt: '2026-03-01T00:00:00+07:00',
    statusUpdatedAt: '2026-03-01T00:00:00+07:00',
    now: at('2026-01-01T00:00:00+07:00')
  });
  assert.equal(result.daysSinceAnchor, 0);
  assert.equal(result.state, 'scheduled');
});

test('attention: every cadence entry is a positive wait or null', () => {
  for (const value of Object.values(FOLLOW_UP_CADENCE)) {
    if (value !== null) assert.ok(value > 0, `wait should be positive, got ${value}`);
  }
});

function stub(state: FollowUpAttentionItemDTO['state']): FollowUpAttentionItemDTO {
  return {
    applicationId: `app-${state}`,
    company: 'ACME',
    position: 'Engineer',
    stage: 'Applied',
    state,
    daysSinceAnchor: 10,
    waitDays: 5,
    dueDate: '2026-01-06',
    anchorAt: '2026-01-01T00:00:00.000Z',
    lastEventKind: null
  };
}

test('attention summary: attention counts due plus overdue', () => {
  const summary = summarizeFollowUpAttention(
    [stub('due'), stub('overdue'), stub('scheduled'), stub('snoozed')],
    TZ,
    at('2026-01-10T00:00:00+07:00')
  );
  assert.equal(summary.counts.attention, 2);
  assert.equal(summary.counts.overdue, 1);
  assert.equal(summary.counts.snoozed, 1);
  assert.equal(summary.counts.ghosted, 0);
});

test('attention summary: echoes the timezone it was given', () => {
  const summary = summarizeFollowUpAttention([], TZ, at('2026-01-10T00:00:00+07:00'));
  assert.equal(summary.timeZone, TZ);
  assert.deepEqual(summary.items, []);
});

test('event validation: accepts each supported kind', () => {
  for (const kind of ['followed_up', 'dismissed', 'ghosted', 'reopened'] as const) {
    const result = validateFollowUpEventInput({ kind });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.data.kind, kind);
  }
});

test('event validation: rejects an unknown kind', () => {
  assert.equal(validateFollowUpEventInput({ kind: 'called' }).ok, false);
});

test('event validation: rejects a non-object body', () => {
  for (const body of [null, 'x', 4, []]) {
    assert.equal(validateFollowUpEventInput(body).ok, false);
  }
});

test('event validation: normalises a blank note to null', () => {
  const result = validateFollowUpEventInput({ kind: 'dismissed', note: '   ' });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.data.note, null);
});

test('event validation: rejects a note longer than 500 characters', () => {
  assert.equal(validateFollowUpEventInput({ kind: 'dismissed', note: 'a'.repeat(501) }).ok, false);
});
