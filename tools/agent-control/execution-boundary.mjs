import { createHash, randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export const BOUNDARY_PURPOSES = Object.freeze(['worker-read', 'check-runner']);
export const BINDING_EQUALITY_FIELDS = Object.freeze(['taskId', 'feature', 'base', 'purpose', 'adapterId']);
export const BINDING_HASH_FIELDS = Object.freeze(['sourceDigest', 'projectionManifestHash', 'policyHash', 'environmentHash', 'profileHash', 'imageDigest', 'cliHash', 'nodeHash']);

export function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export function stageProjection({ files, sourceRoot, destination }) {
  if (!Array.isArray(files) || !files.length) throw Error('Projection needs at least one file.');
  const root = resolve(destination);
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
  return {
    async run(state, request) {
      const purpose = request.purpose;
      if (!BOUNDARY_PURPOSES.includes(purpose)) throw Error('Execution purpose is invalid.');
      const scratchRoot = request.scratchRoot ?? projection.scratchFor(state);
      const staged = stageProjection({
        files: request.files,
        sourceRoot: state.worktree,
        destination: projection.destinationFor(state)
      });
      const binding = buildTrustedBinding(context(state, {
        purpose,
        projectionManifestHash: staged.manifestHash,
        sourceDigest: request.sourceDigest
      }));
      const runId = request.runId ?? randomUUID();
      const outcome = await executeBoundary({
        purpose,
        binding,
        receipt: request.receipt ?? null,
        verify: (receipt, trusted) => issuer.verify(receipt, trusted),
        issue: ({ binding: trusted }) => issuer.issue({
          runId,
          projection: staged.root,
          scratch: scratchRoot,
          manifest: staged.manifest.map(entry => ({ path: entry.path, sha256: entry.sha256 })),
          binding: trusted
        }),
        launch: ({ binding: trusted, receipt }) => adapter.launch({
          runId,
          projection: staged.root,
          scratch: scratchRoot,
          command: request.command ?? [],
          binding: trusted,
          receipt
        })
      });
      return { ...outcome, staged };
    }
  };
}

export async function executeBoundary(options) {
  const { purpose, binding, receipt, verify, issue, launch } = options;
  assertBoundaryBinding(binding);
  if (binding.purpose !== purpose) throw Error('Trusted binding purpose does not match the execution purpose.');
  let current = receipt ?? null;
  if (current) {
    try {
      assertReceiptMatchesBinding(current, binding);
    } catch {
      current = null;
    }
  }
  if (!current) {
    current = await issue({ purpose, binding });
    assertReceiptMatchesBinding(current, binding);
  }
  const verified = (await verify(current, binding)) ?? current;
  assertReceiptMatchesBinding(verified, binding);
  const launched = await launch({ purpose, binding, receipt: verified });
  return { binding, receipt: verified, launched };
}
