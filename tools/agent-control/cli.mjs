import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { AgentController } from './controller.mjs';
import { assertSafeCommand } from './policy.mjs';
import { createDockerAdapter, DEFAULT_IMAGE } from './docker-adapter.mjs';
import { createReadinessIssuer } from './issuer.mjs';
import { createExecutionBoundary } from './execution-boundary.mjs';

const root = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '../..'));
const args = process.argv.slice(2);
const option = name => args.indexOf(name) < 0 ? undefined : args[args.indexOf(name) + 1];
const read = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
let controller = null;

function buildAdapters() {
  const runRoot = process.env.JT_RUN_ROOT;
  const catalogPath = process.env.JT_READINESS_CATALOG;
  const signingKey = process.env.READINESS_KEY;
  if (!runRoot || !catalogPath || !signingKey) return {};
  const catalog = read(catalogPath);
  const adapter = createDockerAdapter({
    repo: root,
    runRoot,
    image: process.env.JT_CONTAINER_IMAGE || DEFAULT_IMAGE,
    deniedPaths: [catalog.deniedHostPaths?.['host-repo-read'] ?? root]
  });
  const issuer = createReadinessIssuer({
    catalog,
    key: signingKey,
    adapterRoot: root,
    evidenceRoot: resolve(root, '.agent-state/readiness/evidence'),
    receiptDirectory: resolve(root, '.agent-state/readiness'),
    adapter
  });
  const boundary = createExecutionBoundary({
    context: (state, request) => ({
      taskId: state.id,
      feature: state.feature,
      base: state.base ?? catalog.base,
      sourceDigest: request.sourceDigest,
      projectionManifestHash: request.projectionManifestHash,
      policyHash: catalog.policyHash,
      environmentHash: catalog.environmentHash,
      purpose: request.purpose,
      profileHash: catalog.profileHash,
      adapterId: catalog.adapterId,
      imageDigest: catalog.imageDigest,
      cliHash: catalog.cliHash,
      nodeHash: catalog.nodeHash
    }),
    projection: {
      destinationFor: state => resolve(runRoot, state.id, 'projection'),
      scratchFor: state => resolve(runRoot, state.id, 'scratch')
    },
    adapter,
    issuer
  });
  return {
    boundary,
    workerCommand: catalog.workerCommand ?? null,
    readiness: async state => controller.readReadinessReceipt(state.id),
    readinessVerify: async receipt => issuer.verify(receipt)
  };
}

controller = new AgentController(root, buildAdapters());
try {
  let result;
  switch (args[0]) {
    case 'doctor': {
      const sandbox = await controller.sandboxProbe();
      result = {
        repository: controller.git(root, ['rev-parse', '--show-toplevel']),
        head: controller.git(root, ['rev-parse', 'HEAD']),
        features: ['web', 'api', 'extension', 'mcp', 'contracts'],
        sandbox,
        sandboxProbePass: sandbox.code === 0 && !sandbox.timedOut,
        isolationReady: controller.isolationReady(),
        liveWorkerRunVerified: controller.liveWorkerRunVerified(),
        safety: 'Read-only workers, scoped patch broker, local commits only. Hostile actors require OS/container isolation.'
      };
      break;
    }
    case 'prepare': result = controller.prepare(read(option('--task'))); break;
    case 'status': result = controller.status(); break;
    case 'apply': result = controller.apply(option('--id'), read(option('--changes'))); break;
    case 'check': result = await controller.check(option('--id')); break;
    case 'commit': result = controller.commit(option('--id')); break;
    case 'abandon': result = controller.abandon(option('--id')); break;
    case 'reconcile': result = controller.reconcile(option('--id')); break;
    case 'run': result = await controller.run(read(option('--task'))); break;
    case 'dispatch': {
      const tasks = option('--tasks').split(',').map(read);
      const limit = Number(option('--concurrency') || 2);
      if (!Number.isInteger(limit) || limit < 1 || limit > 3 || tasks.length > 20) throw Error('Concurrency1–3 and at most20tasks.');
      tasks.forEach(task => controller.validateTask(task));
      if (new Set(tasks.map(task => task.id)).size !== tasks.length || new Set(tasks.map(task => task.feature)).size !== tasks.length) throw Error('Parallel tasks need unique ids and separate feature lanes.');
      if (tasks.some(task => task.dependencies.some(id => tasks.some(candidate => candidate.id === id)))) throw Error('Integrate dependencies before dispatching dependent work.');
      const pending = [...tasks];
      result = [];
      await Promise.all(Array.from({ length: limit }, async () => { while (pending.length) result.push(await controller.run(pending.shift())); }));
      break;
    }
    case 'guard': result = { allowed: assertSafeCommand(read(option('--argv'))) !== false }; break;
    default: throw Error('Use doctor|prepare|status|apply|check|commit|run|dispatch|guard|abandon|reconcile.');
  }
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  if (result?.status?.startsWith('blocked') || Array.isArray(result) && result.some(r => r.status?.startsWith('blocked'))) process.exitCode = 1;
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
