import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { READINESS_V2_PROBE_CATALOG, probeCatalogHash } from './readiness-v2.mjs';

export const ADAPTER_ID = 'jobtrack-docker-adapter-v1';
export const DEFAULT_IMAGE = 'node@sha256:44fce696f38ba8c987c4db89954051000bbd05ffd8d8659ba15ed4a8602e937f';
export const PROJECTION_TARGET = '/projection';
export const SCRATCH_TARGET = '/scratch';
export const CONTAINER_UID = 65534;
export const CONTAINER_GID = 65534;
export const DEFAULT_MEMORY = '512m';
export const DEFAULT_PIDS = '256';
export const DEFAULT_CPUS = '1';
export const DEFAULT_TMPFS = '/tmp:rw,noexec,nosuid,size=64m';

const IMAGE_PATTERN = /^[a-z0-9][a-z0-9._/-]*@sha256:[a-f0-9]{64}$/;

export function assertPinnedImage(image) {
  if (typeof image !== 'string' || !IMAGE_PATTERN.test(image)) throw Error('Container image must be pinned to an immutable sha256 digest.');
  return image;
}

export function canonicalSource(path) {
  const absolute = realpathSync(resolve(path)).replaceAll('\\', '/');
  return absolute;
}

export function assertDirectory(path) {
  if (!existsSync(path)) throw Error('Adapter directory does not exist.');
  const stat = lstatSync(path);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('Adapter directory must be a real directory.');
  return canonicalSource(path);
}

export function buildMountArgs({ projection, scratch }) {
  return [
    '--mount', `type=bind,source=${projection},target=${PROJECTION_TARGET},readonly`,
    '--mount', `type=bind,source=${scratch},target=${SCRATCH_TARGET}`
  ];
}

export function buildRunArgs({ image, runId, network = 'none', memory = DEFAULT_MEMORY, pids = DEFAULT_PIDS, cpus = DEFAULT_CPUS, tmpfs = DEFAULT_TMPFS }) {
  return [
    'run', '--rm',
    '--name', `jobtrack-${runId}`,
    '--label', 'jobtrack.owner=jobtrack',
    '--label', `jobtrack.run=${runId}`,
    '--read-only',
    '--network', network,
    '--cap-drop', 'ALL',
    '--security-opt', 'no-new-privileges',
    '--user', `${CONTAINER_UID}:${CONTAINER_GID}`,
    '--memory', memory,
    '--pids-limit', pids,
    '--cpus', cpus,
    '--tmpfs', tmpfs,
    '--env', 'HOME=/nonexistent',
    '--workdir', SCRATCH_TARGET
  ];
}

export function assertNoHostAccess(args, forbidden, allowedMountSources = []) {
  const mountValues = args.filter((value, index) => args[index - 1] === '--mount');
  if (mountValues.length !== allowedMountSources.length) throw Error('Adapter must mount exactly the projection and the scratch directory.');
  const declared = new Set(allowedMountSources.map(source => canonicalSource(source)));
  for (const mount of mountValues) {
    const match = /source=([^,]+)/.exec(mount);
    if (!match) throw Error('Adapter mount argument has no source.');
    if (!declared.has(canonicalSource(match[1]))) throw Error(`Adapter mounts a directory that was not declared: ${match[1]}`);
  }
  const remainder = [];
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--mount' || args[index] === '--eval') { index += 1; continue; }
    remainder.push(args[index]);
  }
  const haystack = remainder.join(' ').toLowerCase();
  for (const needle of forbidden) {
    if (needle && haystack.includes(String(needle).toLowerCase())) throw Error(`Adapter arguments reference a forbidden host path: ${needle}`);
  }
  if (haystack.includes('docker.sock')) throw Error('Adapter arguments must never reference the Docker socket.');
  if (/(^|[\\/=\s])\.env($|[\\/=\s])/i.test(haystack)) throw Error('Adapter arguments must never reference a dotenv file.');
  if (/(^|[\\/=\s])accounts/i.test(haystack)) throw Error('Adapter arguments must never reference an account file.');
  return true;
}

export function buildProbeArgs(options) {
  const { image, runId, projection, scratch, network = 'none', config = '', program = '' } = options;
  assertPinnedImage(image);
  if (!config) throw Error('Adapter probe needs a configuration.');
  if (!program) throw Error('Adapter probe needs the probe program.');
  const args = [
    ...buildRunArgs({ image, runId, network }),
    ...buildMountArgs({ projection, scratch }),
    '--env', `JT_PROBE_CONFIG=${config}`,
    image,
    'node', '--input-type=module', '--eval', program
  ];
  return args;
}

export function buildLaunchArgs(options) {
  const { image, runId, projection, scratch, command, network = 'none' } = options;
  assertPinnedImage(image);
  if (!Array.isArray(command) || !command.length) throw Error('Adapter launch needs a command.');
  const args = [
    ...buildRunArgs({ image, runId, network }),
    ...buildMountArgs({ projection, scratch }),
    image,
    ...command
  ];
  return args;
}

export function forbiddenHostPaths(repo, home) {
  return [repo, home, '.git', 'Docker.sock', 'sandbox', 'AppData'].filter(Boolean);
}

export function parseProbeOutput(raw) {
  const text = String(raw).trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < 0) throw Error('Isolation probe produced no JSON.');
  const parsed = JSON.parse(text.slice(start, end + 1));
  if (parsed && parsed.error) throw Error(`Isolation probe failed: ${parsed.error}`);
  return parsed;
}

export function buildEvidence(options) {
  const { runId, binding, probe, startedAt, completedAt, transport } = options;
  const commands = Object.keys(READINESS_V2_PROBE_CATALOG);
  const executions = commands.map(commandId => ({
    commandId,
    exitCode: 0,
    timedOut: false,
    stdoutSha256: createHash('sha256').update(JSON.stringify(probe.checks?.[commandId] ?? null)).digest('hex'),
    stderrSha256: createHash('sha256').update('').digest('hex'),
    error: null
  }));
  const observations = {
    hostPositive: options.hostPositive ?? [],
    namespace: options.namespace,
    readTargets: options.readTargets,
    writeTargets: options.writeTargets,
    liveness: options.liveness,
    transport: options.transport
  };
  return {
    schemaVersion: 2,
    runId,
    startedAt,
    completedAt,
    binding,
    catalog: { probeCatalogHash: probeCatalogHash(), commandIds: commands },
    executions,
    observations,
    gateA: true
  };
}

export function createDockerAdapter(options = {}) {
  const repo = options.repo ?? process.cwd();
  const home = options.home ?? process.env.USERPROFILE ?? '';
  const image = options.image ?? DEFAULT_IMAGE;
  const docker = options.docker ?? 'docker';
  const probeProgramPath = options.probeProgramPath ?? join(repo, 'tools/sandbox/isolation-probe.mjs');
  const forbidden = [...forbiddenHostPaths(repo, home), ...(options.forbiddenPaths ?? [])];

  const runDocker = (args, input, timeoutMs) => {
    const result = spawnSync(docker, args, { input, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
    if (result.error) throw Error(`Docker invocation failed: ${result.error.message}`);
    return result;
  };

  return {
    id: ADAPTER_ID,
    image,
    async probe(probeOptions) {
      const runId = probeOptions.runId ?? randomUUID();
      const projection = assertDirectory(probeOptions.projection);
      const scratch = assertDirectory(probeOptions.scratch);
      const program = readFileSync(probeProgramPath, 'utf8');
      const config = Buffer.from(JSON.stringify({
        manifest: probeOptions.manifest,
        projectionTarget: PROJECTION_TARGET,
        scratchTarget: SCRATCH_TARGET,
        hostPaths: probeOptions.hostPaths ?? [],
        modelEndpoint: probeOptions.modelEndpoint ?? '',
        generalEgressEndpoint: probeOptions.generalEgressEndpoint ?? '',
        timeoutMs: probeOptions.timeoutMs ?? 3000
      }), 'utf8').toString('base64');
      const args = buildProbeArgs({ image, runId, projection, scratch, network: probeOptions.network ?? 'none', config, program });
      assertNoHostAccess(args, forbidden, [projection, scratch]);
      const startedAt = new Date().toISOString();
      const result = runDocker(args, '', probeOptions.timeoutMs ?? 120_000);
      const completedAt = new Date().toISOString();
      if (result.status !== 0) throw Error(`Isolation probe container exited with ${result.status}: ${String(result.stderr).slice(-500)}`);
      const probe = parseProbeOutput(result.stdout);
      return { runId, image, args, startedAt, completedAt, probe };
    },
    async launch(launchOptions) {
      const runId = launchOptions.runId ?? randomUUID();
      const projection = assertDirectory(launchOptions.projection);
      const scratch = assertDirectory(launchOptions.scratch);
      const args = buildLaunchArgs({ image, runId, projection, scratch, command: launchOptions.command, network: launchOptions.network ?? 'none' });
      assertNoHostAccess(args, forbidden, [projection, scratch]);
      return { runId, image, args, projection, scratch };
    }
  };
}
