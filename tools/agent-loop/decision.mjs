export const MAX_CODING_ATTEMPTS = 3;

export function afterChecks({ attempt, passed, signature, previousSignature }) {
  if (passed) return 'review';
  if (attempt >= MAX_CODING_ATTEMPTS) return 'blocked-limit';
  if (attempt > 1 && signature && signature === previousSignature) return 'blocked-stalled';
  return 'reflect';
}

export function afterReview({ attempt, verdict }) {
  if (verdict === 'pass') return 'complete';
  if (verdict !== 'missing') return 'blocked-review';
  return attempt >= MAX_CODING_ATTEMPTS ? 'blocked-limit' : 'replan';
}
