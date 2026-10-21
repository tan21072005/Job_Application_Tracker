import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
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
export const ALLOWED_DOCKER_FLAGS = Object.freeze([
  'run',
  'create',
  'rm',
  'start',
  'inspect',
  '--rm',
  '--name',
  '--label',
  '--read-only',
  '--network',
  '--cap-drop',
  '--security-opt',
  '--user',
  '--memory',
  '--pids-limit',
  '--cpus',
  '--tmpfs',
  '--env',
  '--workdir',
  '--mount'
]);

const IMAGE_PATTERN = /^[a-z0-9][a-z0-9._/-]*@sha256:[a-f0-9]{64}$/;

export function assertPinnedImage(image) {
  if (typeof image !== 'string' || !IMAGE_PATTERN.test(image)) throw Error('Container image must be pinned to an immutable sha256 digest.');
  return image;
}

export function canonicalSource(path) {
  const resolved = resolve(path);
  try {
    return realpathSync(resolved).replaceAll('\\', '/');
  } catch {
    return resolved.replaceAll('\\', '/');
  }
}

export function assertDirectory(path) {
  if (!existsSync(path)) throw Error('Adapter directory does not exist.');
  const stat = lstatSync(path);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('Adapter directory must be a real directory.');
  return canonicalSource(path);
}

export function pathIsInside(root, candidate) {
  const rel = relative(resolve(root), resolve(candidate));
  if (isAbsolute(rel)) return false;
  return rel !== '' && !rel.startsWith('..') && !rel.includes(`..${sep}`);
}

export function assertInsideRoot(root, candidate, label) {
  if (!root) throw Error('The operator run root is required.');
  if (!pathIsInside(root, candidate)) throw Error(`${label} must live inside the operator run root.`);
  return resolve(candidate);
}

export function assertNotDeniedPath(deniedPaths, candidate) {
  for (const denied of deniedPaths ?? []) {
    if (!denied) continue;
    if (canonicalSource(denied) === canonicalSource(candidate)) throw Error('Container bind source is a denied host path.');
    if (pathIsInside(denied, candidate)) throw Error('Container bind source is inside a denied host path.');
  }
  return true;
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

export function assertBinds(args, { allowedMounts, deniedPaths }) {
  const binds = parseBinds(args);
  for (const bind of binds) {
    if (bind.form === 'volume') throw Error('Container binds must use the audited mount form.');
  }
  if (binds.length !== allowedMounts.length) throw Error('Container must declare exactly the expected bind set.');
  for (const bind of binds) {
    const parts = bindParts(bind.value);
    if (!parts || !parts.source) throw Error('Container bind has no source.');
    const match = allowedMounts.find(mount => canonicalSource(mount.source) === canonicalSource(parts.source));
    if (!match) throw Error('Container bind source is not the declared source.');
    if (parts.target !== match.target) throw Error('Container bind target is not the declared target.');
    if (match.readOnly && !parts.readOnly) throw Error('Container bind that must be read only is writable.');
    if (!match.readOnly && parts.readOnly) throw Error('Container bind that must be writable is read only.');
    assertNotDeniedPath(deniedPaths, parts.source);
  }
  return true;
}

export function looksLikeImageToken(value) {
  if (typeof value !== 'string' || value.length === 0) return false;
  if (value.startsWith('-')) return false;
  if (value.includes('=') || value.includes('/') && value.startsWith('/')) return false;
  if (value.includes('@sha256:')) return true;
  const match = /^([a-z0-9][a-z0-9._-]*):([a-z0-9._-]+)$/i.exec(value);
  if (!match) return false;
  return !/^\d+$/.test(match[1]);
}

export function assertSingleImage(args, image) {
  const tokens = args.filter(value => looksLikeImageToken(value));
  if (tokens.length !== 1 || tokens[0] !== image) throw Error('Container arguments must name exactly the pinned image.');
  return true;
}

export function assertAllowedFlags(args) {
  const imageIndex = args.findIndex(value => looksLikeImageToken(value));
  const dockerArgs = imageIndex < 0 ? args : args.slice(0, imageIndex);
  for (const value of dockerArgs) {
    if (typeof value !== 'string' || !value.startsWith('-')) continue;
    const flag = value.split('=')[0];
    if (!ALLOWED_DOCKER_FLAGS.includes(flag)) throw Error(`Container arguments use a flag outside the allow list: ${flag}`);
  }
  return true;
}

export function assertNetwork(args) {
  const networkFlags = args.filter(value => value === '--network' || value === '--net' || (typeof value === 'string' && (value.startsWith('--network=') || value.startsWith('--net='))));
  if (networkFlags.length !== 1 || networkFlags[0] !== '--network') throw Error('Container must declare exactly one network mode.');
  const index = args.indexOf('--network');
  if (args[index + 1] !== NETWORK_MODE) throw Error('Container must run without network access.');
  return true;
}

export function assertNoForbiddenReference(args, forbidden) {
  const remainder = [];
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--mount' || args[index] === '--eval' || args[index] === '--volume' || args[index] === '-v') { index += 1; continue; }
    remainder.push(args[index]);
  }
  const haystack = remainder.join(' ').replaceAll('\\', '/').toLowerCase();
  for (const needle of forbidden) {
    if (!needle) continue;
    if (haystack.includes(String(needle).replaceAll('\\', '/').toLowerCase())) throw Error(`Adapter arguments reference a forbidden host path: ${needle}`);
  }
  if (haystack.includes('docker.sock')) throw Error('Adapter arguments must never reference the Docker socket.');
  if (/(^|[\\/=\s])\.env(\.|$|[\s])/i.test(haystack)) throw Error('Adapter arguments must never reference a dotenv file.');
  if (/(^|[\\/=\s])accounts/i.test(haystack)) throw Error('Adapter arguments must never reference an account file.');
  return true;
}

export function assertNoHostAccess(args, forbidden, expectedMounts = [], options = {}) {
  assertAllowedFlags(args);
  assertBinds(args, { allowedMounts: expectedMounts, deniedPaths: forbidden });
  assertSingleImage(args, options.image);
  assertNetwork(args);
  if (args.includes('--env-file')) throw Error('Container must never receive an env file.');
  assertNoForbiddenReference(args, forbidden);
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

export function inspectContainer(docker, containerId, dockerPrefix = []) {
  const result = spawnSync(docker, [...dockerPrefix, 'inspect', containerId], { encoding: 'utf8', timeout: 30_000, windowsHide: true });
  if (result.error) throw Error(`Container inspection failed: ${result.error.message}`);
  if (result.status !== 0) throw Error(`Container inspection failed: ${String(result.stderr).slice(-300)}`);
  return parseContainerObservation(result.stdout);
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
  const runRoot = options.runRoot ? resolve(options.runRoot) : null;
  if (!runRoot) throw Error('The adapter requires the operator run root.');
  const denied = [
    ...forbiddenHostPaths(repo, home),
    ...(options.deniedPaths ?? []).map(path => path.replaceAll('\\', '/'))
  ];
  const forbidden = denied.map(path => path.replaceAll('\\', '/'));

  const runDocker = (args, input, timeoutMs) => {
    const result = spawnSync(docker, [...(options.dockerPrefix ?? []), ...args], { input, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
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

  const resolveRunPaths = (projection, scratch) => {
    assertInsideRoot(runRoot, projection, 'Projection');
    assertInsideRoot(runRoot, scratch, 'Scratch');
    assertNotDeniedPath(denied, projection);
    assertNotDeniedPath(denied, scratch);
    return { projection, scratch };
  };

  return {
    id: ADAPTER_ID,
    image,
    runRoot,
    async probe(probeOptions) {
      const runId = probeOptions.runId ?? randomUUID();
      const projection = assertDirectory(probeOptions.projection);
      const scratch = assertDirectory(probeOptions.scratch);
      resolveRunPaths(projection, scratch);
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
        observation = inspectContainer(docker, containerId, options.dockerPrefix ?? []);
        const started = runDocker(['start', '-a', containerId], '', probeOptions.timeoutMs ?? 120_000);
        if (started.status !== 0) throw Error(`Isolation probe container exited with ${started.status}: ${String(started.stderr).slice(-500)}`);
        probe = parseProbeOutput(started.stdout);
      } catch (error) {
        failure = String(error && error.message ? error.message : error);
      } finally {
        if (probeOptions.keepContainer !== true) runDocker(['rm', '-f', containerId], '', 60_000);
      }
      const completedAt = new Date().toISOString();
      if (failure) throw Error(failure);
      return {
        runId,
        image,
        containerId,
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
      resolveRunPaths(projection, scratch);
      const args = buildLaunchArgs({ image, runId, projection, scratch, command: launchOptions.command });
      assertNoHostAccess(args, forbidden, declaredMounts(projection, scratch), { image });
      return { runId, image, args, argvHash: createHash('sha256').update(args.join(' ')).digest('hex'), projection, scratch };
    }
  };
}
