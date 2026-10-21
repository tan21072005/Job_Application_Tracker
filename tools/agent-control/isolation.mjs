export const ISOLATION_CAPABILITY_SPEC = Object.freeze({
  schemaVersion: 1,
  targets: Object.freeze([
    { id: 'host-repo', kind: 'read', expectation: 'denied', description: 'Source of the real checkout must not be readable.' },
    { id: 'host-credentials', kind: 'read', expectation: 'denied', description: 'Dotenv and account files of the real checkout must not be readable.' },
    { id: 'common-git', kind: 'read', expectation: 'denied', description: 'The Git common directory must not be readable.' },
    { id: 'sibling-worktree', kind: 'read', expectation: 'denied', description: 'Sibling worktrees must not be listed or read.' },
    { id: 'control-state', kind: 'read', expectation: 'denied', description: 'Controller registry and audit state must not be readable.' },
    { id: 'home-credential-store', kind: 'read', expectation: 'denied', description: 'Home directory credential stores must not be readable.' },
    { id: 'path-traversal', kind: 'read', expectation: 'denied', description: 'Traversal out of the projection must fail.' },
    { id: 'projection-read', kind: 'read', expectation: 'allowed', description: 'Files inside the projection must be readable.' },
    { id: 'projection-write', kind: 'write', expectation: 'denied', description: 'The projection must stay read only.' },
    { id: 'scratch-write', kind: 'write', expectation: 'allowed', description: 'The private scratch directory must be writable.' },
    { id: 'host-write', kind: 'write', expectation: 'denied', description: 'Nothing outside the scratch directory may be written.' },
    { id: 'egress-allowlist', kind: 'network', expectation: 'allowed', description: 'The model transport endpoint must be reachable.' },
    { id: 'egress-general', kind: 'network', expectation: 'denied', description: 'General outbound traffic must be blocked.' }
  ])
});

export const ISOLATION_OPERATIONS = Object.freeze({
  'read-file': Object.freeze({ args: ['path'], types: ['string'] }),
  'list-directory': Object.freeze({ args: ['path'], types: ['string'] }),
  'search-text': Object.freeze({ args: ['pattern'], types: ['string'] }),
  'diff': Object.freeze({ args: ['range'], types: ['string'] })
});

export function assertIsolationOperation(operation, args) {
  const shape = ISOLATION_OPERATIONS[operation];
  if (!shape) throw Error('Isolation operation is not in the catalog.');
  if (!Array.isArray(args) || args.length !== shape.args.length) throw Error('Isolation operation arguments do not match the catalog.');
  shape.args.forEach((name, index) => {
    if (shape.types[index] === 'string' && (typeof args[index] !== 'string' || !args[index] || args[index].length > 4096)) throw Error(`Isolation operation argument ${name} is invalid.`);
  });
  return { operation, args: [...args] };
}

export function evaluateIsolationProbe(probe, spec = ISOLATION_CAPABILITY_SPEC) {
  const failures = [];
  if (!probe || typeof probe !== 'object') throw Error('Isolation probe result is missing.');
  if (typeof probe.environmentFingerprint !== 'string' || !probe.environmentFingerprint) throw Error('Isolation probe has no environment fingerprint.');
  const observed = new Map();
  if (!Array.isArray(probe.results)) throw Error('Isolation probe has no results.');
  for (const result of probe.results) {
    if (!result || typeof result.id !== 'string' || !result.id) throw Error('Isolation probe result is invalid.');
    if (observed.has(result.id)) throw Error(`Isolation probe reports a target twice: ${result.id}`);
    observed.set(result.id, result);
  }
  for (const target of spec.targets) {
    const result = observed.get(target.id);
    if (!result) {
      failures.push(`${target.id}: no evidence`);
      continue;
    }
    if (result.actual !== target.expectation) failures.push(`${target.id}: expected ${target.expectation}, observed ${result.actual}`);
  }
  const allowlist = observed.get('egress-allowlist');
  if (!allowlist || allowlist.actual !== 'allowed') failures.push('egress positive control is missing');
  return { ready: failures.length === 0, failures, environmentFingerprint: probe.environmentFingerprint };
}

export function assertIsolationReady(probe, spec = ISOLATION_CAPABILITY_SPEC) {
  const verdict = evaluateIsolationProbe(probe, spec);
  if (!verdict.ready) throw Error(`Isolation is not ready: ${verdict.failures.join('; ')}`);
  return verdict;
}

export function createFakeIsolationAdapter(overrides = {}) {
  const results = ISOLATION_CAPABILITY_SPEC.targets.map(target => ({
    id: target.id,
    actual: overrides[target.id] ?? target.expectation,
    detail: 'fixture'
  }));
  return {
    id: 'fake-isolation-adapter',
    async probe() {
      return { environmentFingerprint: 'fixture-environment-fingerprint', results };
    },
    async launch(role, options = {}) {
      if (typeof role !== 'string' || !role) throw Error('Isolation launch needs a role.');
      if (typeof options.projectionRoot !== 'string' || !options.projectionRoot) throw Error('Isolation launch needs a projection root.');
      return {
        async execute(operation, args) {
          const checked = assertIsolationOperation(operation, args);
          return { code: 0, timedOut: false, output: `fixture:${checked.operation}`, error: '' };
        }
      };
    }
  };
}
