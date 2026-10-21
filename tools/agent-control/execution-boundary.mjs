import { createHash, randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { CANDIDATE_TARGET, FIXTURE_TARGET, PROJECTION_TARGET, SCRATCH_TARGET } from './docker-adapter.mjs';
import { buildCheckEnvironment } from './check-profile.mjs';

export const BOUNDARY_PURPOSES = Object.freeze(['worker-read', 'check-runner']);
export const BINDING_EQUALITY_FIELDS = Object.freeze(['taskId', 'feature', 'base', 'purpose', 'adapterId']);
export const BINDING_HASH_FIELDS = Object.freeze(['sourceDigest', 'projectionManifestHash', 'policyHash', 'environmentHash', 'profileHash', 'imageDigest', 'cliHash', 'nodeHash']);

export function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export function stageProjection({ files, sourceRoot, destination, allowedRoot }) {
  if (!Array.isArray(files) || !files.length) throw Error('Projection needs at least one file.');
  if (!allowedRoot) throw Error('The projection needs the operator run root.');
  const root = resolve(destination);
  const boundary = resolve(allowedRoot);
  const inside = relative(boundary, root);
  if (!inside || isAbsolute(inside) || inside.startsWith('..') || inside.includes(`..${sep}`)) {
    throw Error('The projection destination must live inside the operator run root.');
  }
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  const manifest = [];
  for (const file of files) {
    const source = join(resolve(sourceRoot), file);
    if (!existsSync(source)) throw Error(`Projection source file is missing: ${file}`);
    const target = join(root, file);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
    const copied = sha256File(target);
    if (copied !== sha256File(source)) throw Error(`Projection bytes do not match the source: ${file}`);
    manifest.push({ path: file, sha256: copied });
  }
  const manifestHash = createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
  return { root, manifest, manifestHash };
}

export function assertBoundaryBinding(binding) {
  if (!binding || typeof binding !== 'object') throw Error('Trusted binding is missing.');
  for (const field of [...BINDING_EQUALITY_FIELDS, ...BINDING_HASH_FIELDS]) {
    if (!(field in binding)) throw Error(`Trusted binding is missing ${field}.`);
  }
  for (const field of BINDING_HASH_FIELDS) {
    if (!/^[a-f0-9]{64}$/.test(binding[field])) throw Error(`Trusted binding field is not a hash: ${field}.`);
  }
  if (!BOUNDARY_PURPOSES.includes(binding.purpose)) throw Error('Trusted binding purpose is invalid.');
  return binding;
}

export function assertReceiptMatchesBinding(receipt, binding, options = {}) {
  const now = options.now ?? Date.now();
  if (!receipt) throw Error('Readiness receipt is missing.');
  if (receipt.schemaVersion !== 2) throw Error('Readiness receipt schema is not supported.');
  if (!Number.isFinite(Date.parse(receipt.expiresAt))) throw Error('Readiness receipt expiry is invalid.');
  if (now > Date.parse(receipt.expiresAt)) throw Error('Readiness receipt has expired.');
  for (const field of [...BINDING_EQUALITY_FIELDS, ...BINDING_HASH_FIELDS]) {
    if (receipt.binding?.[field] !== binding[field]) throw Error(`Readiness receipt does not match the trusted binding: ${field}.`);
  }
  if (receipt.derived?.gateA !== true) throw Error('Readiness receipt does not record a passing gate.');
  return receipt;
}

export function buildTrustedBinding(context) {
  for (const field of ['taskId', 'feature', 'base', 'sourceDigest', 'projectionManifestHash', 'policyHash', 'environmentHash', 'purpose', 'profileHash', 'adapterId', 'imageDigest', 'cliHash', 'nodeHash']) {
    if (typeof context?.[field] !== 'string' || !context[field]) throw Error(`Trusted binding is missing ${field}.`);
  }
  const binding = {
    taskId: context.taskId,
    feature: context.feature,
    base: context.base,
    sourceDigest: context.sourceDigest,
    projectionManifestHash: context.projectionManifestHash,
    policyHash: context.policyHash,
    environmentHash: context.environmentHash,
    purpose: context.purpose,
    profileHash: context.profileHash,
    adapterId: context.adapterId,
    imageDigest: context.imageDigest,
    cliHash: context.cliHash,
    nodeHash: context.nodeHash
  };
  return assertBoundaryBinding(binding);
}

export function createExecutionBoundary(options) {
  const { context, projection, adapter, issuer } = options;
  if (!context || !projection || !adapter || !issuer) throw Error('Execution boundary needs a context, a projection, an adapter and an issuer.');
  if (typeof issuer.issue !== 'function' || typeof issuer.verify !== 'function') throw Error('Execution boundary needs an issuer that can issue and verify.');
  if (typeof adapter.launch !== 'function') throw Error('Execution boundary needs an adapter that can launch.');
  const cache = new Map();

  async function prepare(state, request) {
    const purpose = request.purpose;
    if (!BOUNDARY_PURPOSES.includes(purpose)) throw Error('Execution purpose is invalid.');
    const scratchRoot = request.scratchRoot ?? projection.scratchFor(state);
    mkdirSync(scratchRoot, { recursive: true });
    if (!Array.isArray(request.files) || !request.files.length) throw Error('The execution request must list the files to stage.');
    const staged = stageProjection({
      files: request.files,
      sourceRoot: state.worktree,
      destination: projection.destinationFor(state),
      allowedRoot: projection.allowedRoot
    });
    const binding = buildTrustedBinding(context(state, {
      purpose,
      projectionManifestHash: staged.manifestHash,
      sourceDigest: request.sourceDigest
    }));
    const cacheKey = `${state.id}:${purpose}:${binding.sourceDigest}:${binding.projectionManifestHash}`;
    let receipt = cache.get(cacheKey) ?? null;
    if (!receipt) {
      const issued = await issuer.issue({
        runId: request.runId ?? randomUUID(),
        taskId: binding.taskId,
        feature: binding.feature,
        base: binding.base,
        sourceDigest: binding.sourceDigest,
        projectionManifestHash: binding.projectionManifestHash,
        purpose: binding.purpose,
        projection: staged.root,
        scratch: scratchRoot,
        manifest: staged.manifest.map(entry => ({ path: entry.path, sha256: entry.sha256 }))
      });
      receipt = issued?.receipt ?? null;
      if (!receipt) throw Error(`The issuer produced no readiness receipt: ${issued?.diagnostics ?? 'unknown reason'}`);
      cache.set(cacheKey, receipt);
    }
    const verified = await issuer.verify(receipt);
    assertReceiptMatchesBinding(verified.receipt ?? receipt, binding);
    return { purpose, binding, receipt: verified.receipt ?? receipt, staged, scratchRoot };
  }

  return {
    async receiptFor(state, request = {}) {
      const prepared = await prepare(state, {
        purpose: request.purpose ?? 'worker-read',
        files: request.files ?? [],
        sourceDigest: request.sourceDigest
      });
      return prepared.receipt;
    },
    async run(state, request) {
      const prepared = await prepare(state, request);
      const launched = await adapter.launch({
        runId: request.runId ?? randomUUID(),
        projection: prepared.staged.root,
        scratch: prepared.scratchRoot,
        command: request.command ?? [],
        profile: prepared.purpose === 'check-runner' ? 'check' : 'worker',
        fixtures: request.fixtures ?? null,
        env: prepared.purpose === 'check-runner' ? buildCheckEnvironment({
          checkId: request.check ?? 'fixed-check',
          candidateDigest: prepared.binding.projectionManifestHash,
          fixtureRoot: FIXTURE_TARGET,
          scratchRoot: SCRATCH_TARGET
        }) : {},
        stdin: request.instruction ?? '',
        binding: prepared.binding,
        receipt: prepared.receipt
      });
      return { ...prepared, launched };
    }
  };
}
