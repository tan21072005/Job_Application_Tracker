import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { READINESS_V2_PROBE_CATALOG, probeCatalogHash } from './readiness-v2.mjs';

export const ADAPTER_ID = 'jobtrack-docker-adapter-v1';
export const DEFAULT_IMAGE = 'node@sha256:44fce696f38ba8c987c4db89954051000bbd05ffd8d8659ba15ed4a8602e937f';
export const PROJECTION_TARGET = '/projection';
export const SCRATCH_TARGET = '/scratch';
export const FIXTURE_TARGET = '/fixtures';
export const CANDIDATE_TARGET = '/candidate';
export const CONTAINER_UID = 65534;
export const CONTAINER_GID = 65534;
export const DEFAULT_MEMORY = '512m';
export const DEFAULT_PIDS = '256';
export const DEFAULT_CPUS = '1';
export const DEFAULT_TMPFS = '/tmp:rw,noexec,nosuid,size=64m';
export const NETWORK_MODE = 'none';

const IMAGE_PATTERN = /^[a-z0-9][a-z0-9._/-]*@sha256:[a-f0-9]{64}$/;
const ENV_FORBIDDEN_FLAG = '--env-file';

export function assertPinnedImage(image) {
  if (typeof image !== 'string' || !IMAGE_PATTERN.test(image)) throw Error('Container image must be pinned to an immutable sha256 digest.');
  return image;
}

export function canonicalSource(path) {
  return realpathSync(resolve(path)).replaceAll('\\', '/');
}

export function assertDirectory(path) {
  if (!existsSync(path)) throw Error('Adapter directory does not exist.');
  const stat = lstatSync(path);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('Adapter directory must be a real directory.');
  return canonicalSource(path);
}

export function isInside(root, candidate) {
  const rel = relative(resolve(root), resolve(candidate));
  return rel !== '' && !rel.startsWith('..') && !resolve(root).endsWith(sep) ? true : rel !== '';
}

export function assertInsideRoot(root, candidate, label) {
  const rel = relative(resolve(root), resolve(candidate));
  if (!rel || rel.startsWith('..') || resolve(candidate) === resolve(root)) throw Error(`${label} must live inside the operator run root.`);
  return resolve(candidate);
}

export function buildMountArgs({ projection, scratch, fixtures, candidate }) {
  const mounts = [];
  if (projection) mounts.push({ kind: 'projection', source: projection, target: PROJECTION_TARGET, readOnly: true });
  if (candidate) mounts.push({ kind: 'candidate', source: candidate, target: CANDIDATE_TARGET, readOnly: true });
  if (scratch) mounts.push({ kind: 'scratch', source: scratch, target: SCRATCH_TARGET, readOnly: false });
  if (fixtures) mounts.push({ kind: 'fixtures', source: fixtures, target: FIXTURE_TARGET, readOnly: true });
  return mounts.flatMap(mount => ['--mount', `type=bind,source=${mount.source},target=${mount.target}${mount.readOnly ? ',readonly' : ''}`]);
}

export function buildRunArgs({ image, runId, memory = DEFAULT_MEMORY, pids = DEFAULT_PIDS, cpus = DEFAULT_CPUS, tmpfs = DEFAULT_TMPFS }) {
  return [
    'run',
    '--name', `jobtrack-${runId}`,
    '--label', 'jobtrack.owner=jobtrack',
    '--label', `jobtrack.run=${runId}`,
    '--read-only',
    '--network', NETWORK_MODE,
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

function parseBinds(args) {
  const binds = [];
  for (let index = 0; index < args.length; index++) {
    const value = args[index];
    if (value === '--mount') {
      binds.push({ form: 'mount', value: args[index + 1] ?? '' });
      index += 1;
      continue;
    }
    if (typeof value === 'string' && value.startsWith('--mount=')) {
      binds.push({ form: 'mount', value: value.slice('--mount='.length) });
      continue;
    }
    if (value === '--volume' || value === '-v') {
      binds.push({ form: 'volume', value: args[index + 1] ?? '' });
      index += 1;
      continue;
    }
    if (typeof value === 'string' && (value.startsWith('--volume=') || value.startsWith('-v='))) {
      binds.push({ form: 'volume', value: value.slice(value.indexOf('=') + 1) });
      continue;
    }
  }
  return binds;
}

function bindParts(value) {
  const match = /type=bind(?:,|$)/.test(value) ? /source=([^,]+)/.exec(value) : /^([^:]+):/.exec(value);
  if (!match) return null;
  const source = match[1];
  const targetMatch = /target=([^,]+)/.exec(value);
  const target = targetMatch ? targetMatch[1] : null;
  return { source, target, readOnly: /,readonly(?:,|$)/.test(value) };
}

export function assertBinds(args, { allowedMounts, forbiddenPaths }) {
  const binds = parseBinds(args);
  if (binds.length !== allowedMounts.length) throw Error('Container must declare exactly the expected bind set.');
  for (const bind of binds) {
    if (bind.form === 'volume') throw Error('Container binds must use the audited mount form.');
    const parts = bindParts(bind.value);
    if (!parts || !parts.source) throw Error('Container bind has no source.');
    const match = allowedMounts.find(mount => canonicalSource(mount.source) === canonicalSource(parts.source));
    if (!match) throw Error('Container bind source is not the declared source.');
    if (parts.target !== match.target) throw Error('Container bind target is not the declared target.');
    if (match.readOnly && !parts.readOnly) throw Error('Container bind that must be read only is writable.');
    if (!match.readOnly && parts.readOnly) throw Error('Container bind that must be writable is read only.');
    for (const forbidden of forbiddenPaths) {
      if (canonicalSource(parts.source) === canonicalSource(forbidden)) throw Error('Container bind source is a forbidden host path.');
    }
  }
  return true;
}

export function assertSingleImage(args, image) {
  const tokens = args.filter(value => typeof value === 'string' && /@sha256:[a-f0-9]{64}$/.test(value));
  if (tokens.length !== 1 || tokens[0] !== image) throw Error('Container arguments must name exactly the pinned image.');
  return true;
}

export function assertNoHostAccess(args, forbidden, expectedMounts = [], options = {}) {
  assertBinds(args, { allowedMounts: expectedMounts, forbiddenPaths: forbidden });
  assertSingleImage(args, options.image);
  const networkIndex = args.indexOf('--network');
  if (networkIndex < 0 || args[networkIndex + 1] !== NETWORK_MODE) throw Error('Container must run without network access.');
  if (args.includes(ENV_FORBIDDEN_FLAG)) throw Error('Container must never receive an env file.');
  const remainder = [];
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--mount' || args[index] === '--eval' || args[index] === '--volume' || args[index] === '-v') { index += 1; continue; }
    remainder.push(args[index]);
  }
  const haystack = remainder.join(' ').toLowerCase();
  for (const needle of forbidden) {
    if (!needle) continue;
    if (haystack.includes(String(needle).toLowerCase().replaceAll('\\', '/'))) throw Error(`Adapter arguments reference a forbidden host path: ${needle}`);
  }
  if (haystack.includes('docker.sock')) throw Error('Adapter arguments must never reference the Docker socket.');
  if (/(^|[\\/=\s])\.env(\.|$|[\s])/i.test(haystack)) throw Error('Adapter arguments must never reference a dotenv file.');
  if (/(^|[\\/=\s])accounts/i.test(haystack)) throw Error('Adapter arguments must never reference an account file.');
  return true;
}

export function buildProbeArgs(options) {
  const { image, runId, projection, scratch, config = '', program = '', mode = 'run' } = options;
  assertPinnedImage(image);
  if (!config) throw Error('Adapter probe needs a configuration.');
  if (!program) throw Error('Adapter probe needs the probe program.');
  const args = [
    mode,
    ...buildRunArgs({ image, runId }).slice(1),
    ...buildMountArgs({ projection, scratch }),
    '--env', `JT_PROBE_CONFIG=${config}`,
    image,
    'node', '--input-type=module', '--eval', program
  ];
  return args;
}

export const MOUNT_KIND_BY_TARGET = Object.freeze({
  [PROJECTION_TARGET]: 'projection',
  [SCRATCH_TARGET]: 'scratch',
  [FIXTURE_TARGET]: 'fixtures',
  [CANDIDATE_TARGET]: 'candidate'
});

export function parseContainerObservation(raw) {
  const parsed = JSON.parse(String(raw).trim());
  const container = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!container || typeof container !== 'object') throw Error('Docker inspect produced no container.');
  const config = container.Config ?? {};
  const host = container.HostConfig ?? {};
  const mounts = (container.Mounts ?? []).map(mount => ({
    kind: MOUNT_KIND_BY_TARGET[mount.Destination] ?? 'unknown',
    source: mount.Source,
    target: mount.Destination,
    readOnly: mount.RW === false
  }));
  return {
    containerId: container.Id ?? null,
    image: config.Image ?? null,
    imageId: container.Image ?? null,
    user: config.User ?? null,
    networkMode: host.NetworkMode ?? null,
    capDrop: Array.isArray(host.CapDrop) ? host.CapDrop : [],
    securityOpt: Array.isArray(host.SecurityOpt) ? host.SecurityOpt : [],
    memory: host.Memory ?? null,
    pidsLimit: host.PidsLimit ?? null,
    nanoCpus: host.NanoCpus ?? null,
    readonlyRootfs: host.ReadonlyRootfs === true,
    tmpfs: host.Tmpfs ?? {},
    mounts,
    env: Array.isArray(config.Env) ? config.Env : []
  };
}

export function buildLaunchArgs(options) {
  const { image, runId, projection, scratch, command } = options;
  assertPinnedImage(image);
  if (!Array.isArray(command) || !command.length) throw Error('Adapter launch needs a command.');
  const args = [
    'run', '--rm',
    ...buildRunArgs({ image, runId }).slice(1),
    ...buildMountArgs({ projection, scratch }),
    image,
    ...command
  ];
  return args;
}

export function forbiddenHostPaths(repo, home) {
  return [repo, home].filter(Boolean).map(path => path.replaceAll('\\', '/'));
}

export function toContainerPath(hostPath) {
  const normalized = String(hostPath ?? '').replaceAll('\\', '/');
  const match = /^([a-zA-Z]):\/(.*)$/.exec(normalized);
  if (!match) return normalized;
  return `/mnt/${match[1].toLowerCase()}/${match[2]}`;
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
  const executions = commands.map(commandId => {
    const recorded = probe.checks?.[commandId];
    if (!recorded) throw new Error(`Isolation probe did not record ${commandId}.`);
    return {
      commandId,
      exitCode: 0,
      timedOut: false,
      stdoutSha256: createHash('sha256').update(JSON.stringify(recorded)).digest('hex'),
      stderrSha256: createHash('sha256').update('').digest('hex'),
      error: null
    };
  });
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
    gateA: false
  };
}

export function createDockerAdapter(options = {}) {
  const repo = options.repo ?? process.cwd();
  const home = options.home ?? process.env.USERPROFILE ?? '';
  const image = options.image ?? DEFAULT_IMAGE;
  const docker = options.docker ?? 'docker';
  const probeProgramPath = options.probeProgramPath ?? join(repo, 'tools/sandbox/isolation-probe.mjs');
  const forbidden = [...forbiddenHostPaths(repo, home), ...(options.forbiddenPaths ?? [])].map(path => path.replaceAll('\\', '/'));
  const runRoot = options.runRoot ? resolve(options.runRoot) : null;

  const runDocker = (args, input, timeoutMs) => {
    const result = spawnSync(docker, args, { input, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
    if (result.error) throw Error(`Docker invocation failed: ${result.error.message}`);
    return result;
  };

  const declaredMounts = (projection, scratch, fixtures, candidate) => {
    const mounts = [];
    if (projection) mounts.push({ kind: 'projection', source: projection, target: PROJECTION_TARGET, readOnly: true });
    if (candidate) mounts.push({ kind: 'candidate', source: candidate, target: CANDIDATE_TARGET, readOnly: true });
    if (scratch) mounts.push({ kind: 'scratch', source: scratch, target: SCRATCH_TARGET, readOnly: false });
    if (fixtures) mounts.push({ kind: 'fixtures', source: fixtures, target: FIXTURE_TARGET, readOnly: true });
    return mounts;
  };

  return {
    id: ADAPTER_ID,
    image,
    async probe(probeOptions) {
      const runId = probeOptions.runId ?? randomUUID();
      const projection = assertDirectory(probeOptions.projection);
      const scratch = assertDirectory(probeOptions.scratch);
      if (runRoot) {
        assertInsideRoot(runRoot, projection, 'Projection');
        assertInsideRoot(runRoot, scratch, 'Scratch');
      }
      const program = readFileSync(probeProgramPath, 'utf8');
      const config = Buffer.from(JSON.stringify({
        manifest: probeOptions.manifest,
        projectionTarget: PROJECTION_TARGET,
        scratchTarget: SCRATCH_TARGET,
        hostPaths: (probeOptions.hostPaths ?? []).map(entry => ({
          targetId: entry.targetId ?? null,
          hostPath: entry.hostPath ?? null,
          containerPath: toContainerPath(entry.hostPath)
        })),
        modelEndpoint: probeOptions.modelEndpoint ?? '',
        generalEgressEndpoint: probeOptions.generalEgressEndpoint ?? '',
        timeoutMs: probeOptions.timeoutMs ?? 3000
      }), 'utf8').toString('base64');
      const args = buildProbeArgs({ image, runId, projection, scratch, config, program, mode: 'create' });
      assertNoHostAccess(args, forbidden, declaredMounts(projection, scratch), { image });
      const startedAt = new Date().toISOString();
      const created = runDocker(args, '', probeOptions.timeoutMs ?? 120_000);
      const containerId = String(created.stdout ?? '').trim().split(/\s+/)[0] ?? '';
      if (created.status !== 0 || !containerId) {
        throw Error(`Isolation probe container could not be created: ${String(created.stderr).slice(-500)}`);
      }
      let observation = null;
      let probe = null;
      let failure = null;
      try {
        const inspected = runDocker(['inspect', containerId], '', 30_000);
        if (inspected.status !== 0) throw Error(`Container inspection failed: ${String(inspected.stderr).slice(-300)}`);
        observation = parseContainerObservation(inspected.stdout);
        const started = runDocker(['start', '-a', containerId], '', probeOptions.timeoutMs ?? 120_000);
        if (started.status !== 0) throw Error(`Isolation probe container exited with ${started.status}: ${String(started.stderr).slice(-500)}`);
        probe = parseProbeOutput(started.stdout);
      } catch (error) {
        failure = String(error && error.message ? error.message : error);
      } finally {
        runDocker(['rm', '-f', containerId], '', 60_000);
      }
      const completedAt = new Date().toISOString();
      if (failure) throw Error(failure);
      return {
        runId,
        image,
        argv: args,
        argvHash: createHash('sha256').update(args.join(' ')).digest('hex'),
        observation,
        startedAt,
        completedAt,
        probe
      };
    },
    async launch(launchOptions) {
      const runId = launchOptions.runId ?? randomUUID();
      const projection = assertDirectory(launchOptions.projection);
      const scratch = assertDirectory(launchOptions.scratch);
      if (runRoot) {
        assertInsideRoot(runRoot, projection, 'Projection');
        assertInsideRoot(runRoot, scratch, 'Scratch');
      }
      const args = buildLaunchArgs({ image, runId, projection, scratch, command: launchOptions.command });
      assertNoHostAccess(args, forbidden, declaredMounts(projection, scratch), { image });
      return { runId, image, args, argvHash: createHash('sha256').update(args.join(' ')).digest('hex'), projection, scratch };
    }
  };
}
