import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_CODING_ATTEMPTS, afterChecks, afterReview } from './decision.mjs';

test('coding is limited to initial attempt plus two evidence-based repairs', () => {
  assert.equal(MAX_CODING_ATTEMPTS, 3);
  assert.equal(afterChecks({ attempt: 1, passed: false, signature: 'TS2345' }), 'reflect');
  assert.equal(afterChecks({ attempt: 2, passed: false, signature: 'TS2345', previousSignature: 'TS2345' }), 'blocked-stalled');
  assert.equal(afterChecks({ attempt: 3, passed: false, signature: 'different' }), 'blocked-limit');
});

test('passing checks require reviewer, and reviewer can trigger bounded replan', () => {
  assert.equal(afterChecks({ attempt: 1, passed: true }), 'review');
  assert.equal(afterReview({ attempt: 1, verdict: 'missing' }), 'replan');
  assert.equal(afterReview({ attempt: 3, verdict: 'missing' }), 'blocked-limit');
  assert.equal(afterReview({ attempt: 1, verdict: 'pass' }), 'complete');
  assert.equal(afterReview({ attempt: 1, verdict: 'unknown' }), 'blocked-review');
});
