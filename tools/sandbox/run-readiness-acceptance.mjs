import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createServer, get as httpRequest } from 'node:http';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createDockerAdapter, DEFAULT_IMAGE, canonicalSource, forbiddenHostPaths, toContainerPath } from '../agent-control/docker-adapter.mjs';
import { assertCheckProfile, buildCheckArgs, buildCheckEnvironment, checkEvidence, runIsolatedCheck } from '../agent-control/check-profile.mjs';
import { controlPlaneFingerprint } from '../agent-control/fingerprint.mjs';
import { createTransportBroker, createTransportResponder } from '../agent-control/transport.mjs';
import { createReadinessIssuer } from '../agent-control/issuer.mjs';

const repo = process.argv[2] ?? process.cwd();
const runRoot = process.argv[3] ?? 'D:/Long-term';
const adapterRoot = process.argv[4] ?? repo;
const modelPort = Number(process.env.JT_MODEL_PORT ?? 8109);
const egressPort = Number(process.env.JT_EGRESS_PORT ?? 8108);
const egressHost = process.env.JT_EGRESS_HOST ?? '';
const signingKey = process.env.READINESS_KEY ?? '';

const findings = [];
const record = (name, passed, detail) => {
  findings.push({ name, passed, detail });
  return passed;
};

const httpReach = (url, timeoutMs = 3000) => new Promise(resolve => {
  const request = httpRequest(url, { timeout: timeoutMs }, response => {
    response.resume();
    resolve(response.statusCode >= 200 && response.statusCode < 500);
  });
  request.on('timeout', () => { request.destroy(); resolve(false); });
  request.on('error', () => resolve(false));
});

const startServer = (port, label) => new Promise((resolve, reject) => {
  const server = createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ label, path: request.url }));
  });
  server.on('error', reject);
  server.listen(port, '0.0.0.0', () => resolve(server));
});

const runId = randomUUID();
const base = join(runRoot, `JobTrack-acceptance-${runId.slice(0, 8)}`);
const projection = join(base, 'projection');
const scratch = join(base, 'scratch');
const candidate = join(base, 'candidate');
const fixtures = join(base, 'fixtures');
for (const directory of [join(projection, 'apps/web/src'), scratch, join(candidate, 'apps/web/src'), fixtures]) mkdirSync(directory, { recursive: true });

const content = 'export const value = 1;\n';
writeFileSync(join(projection, 'apps/web/src/module.js'), content);
writeFileSync(join(candidate, 'apps/web/src/module.js'), content);
writeFileSync(join(fixtures, 'fixture.json'), '{}\n');
copyFileSync(join(adapterRoot, 'tools/sandbox/isolated-check.mjs'), join(fixtures, 'isolated-check.mjs'));

const sourceDigest = createHash('sha256').update(content).digest('hex');
const manifest = [{ path: 'apps/web/src/module.js', sha256: sourceDigest }];

const modelServer = await startServer(modelPort, 'model-transport');
const egressServer = await startServer(egressPort, 'general-egress-control');
const modelEndpoint = `http://127.0.0.1:${modelPort}/v1/chat`;
const generalEgressEndpoint = `http://${egressHost}:${egressPort}/general`;

const catalog = {
  taskId: 'readiness-canary',
  feature: 'web',
  base: process.env.JT_BASE ?? 'main',
  sourceDigest,
  projectionManifestHash: createHash('sha256').update(JSON.stringify(manifest)).digest('hex'),
  policyHash: controlPlaneFingerprint(adapterRoot),
  environmentHash: createHash('sha256').update(`${process.platform}-${process.version}-${DEFAULT_IMAGE}`).digest('hex'),
  purpose: 'worker-read',
  profileHash: createHash('sha256').update('profile-read-only').digest('hex'),
  adapterId: 'jobtrack-docker-adapter-v1',
  imageDigest: DEFAULT_IMAGE.split('@sha256:')[1],
  cliHash: createHash('sha256').update('codex-cli-0.163.0-alpha.10.2').digest('hex'),
  nodeHash: createHash('sha256').update(process.version).digest('hex'),
  verifierImplementationHash: createHash('sha256').update(readFileSync(join(adapterRoot, 'tools/agent-control/readiness-v2.mjs'), 'utf8')).digest('hex'),
  modelEndpoint,
  generalEgressEndpoint,
  deniedHostPaths: {
    'host-repo-read': canonicalSource(repo),
    'common-git-read': canonicalSource(join(repo, '.git')),
    'control-state-read': canonicalSource(join(repo, '.agent-state')),
    'host-credential-read': canonicalSource(join(repo, 'accounts.txt')),
    'projection-write': canonicalSource(projection),
    'host-write': canonicalSource(repo)
  },
  mountSources: { projection: canonicalSource(projection), scratch: canonicalSource(scratch) }
};

const adapter = createDockerAdapter({ repo: adapterRoot, image: DEFAULT_IMAGE, runRoot, deniedPaths: [canonicalSource(repo)] });
const transportSecret = randomBytes(32).toString('hex');
const transportAllowlist = [{ kind: 'local-transport', host: '127.0.0.1', port: modelPort, path: '/v1' }];
const broker = createTransportBroker({
  allowlist: transportAllowlist,
  endpoint: modelEndpoint,
  secret: transportSecret,
  connect: async resolved => ({ connected: await httpReach(resolved.endpoint), code: null })
});
const responder = createTransportResponder({
  secret: transportSecret,
  allowlist: transportAllowlist,
  call: async ({ request, endpoint }) => {
    const reachable = await httpReach(endpoint.endpoint);
    return { acknowledged: reachable, role: request.role, promptLength: String(request.prompt ?? '').length };
  }
});
const brokerWithResponder = {
  id: broker.id,
  allowlist: broker.allowlist,
  endpoint: broker.endpoint,
  probe: () => broker.probe(),
  request: input => broker.request(input),
  async roundTrip(input) {
    const pending = broker.request(input);
    await new Promise(done => setTimeout(done, 50));
    await responder.respond({ scratchRoot: input.scratchRoot, runId: input.runId });
    return pending.then(result => ({ connected: true, endpoint: broker.endpoint, requestHash: result.request.requestHash, response: result.response }));
  }
};
const audit = [];
const evidenceRoot = join(adapterRoot, 'planning/jobtrack-agent-autonomy/hardening-evidence/readiness-evidence');

const issuer = createReadinessIssuer({
  catalog,
  key: signingKey || randomBytes(48).toString('hex'),
  evidenceRoot,
  adapterRoot,
  adapter,
  broker: brokerWithResponder,
  connect: async endpoint => httpReach(endpoint),
  audit: record => audit.push(record)
});

let issued = null;
let check = null;
let blockedProbe = null;
let guardError = null;
try {
  issued = await issuer.issue({ runId, projection, scratch, manifest });
  const checkEnv = buildCheckEnvironment({ checkId: 'build:api', candidateDigest: sourceDigest, fixtureRoot: '/fixtures', scratchRoot: '/scratch', hostProbePath: toContainerPath(join(repo, '.check-host-probe')) });
  const { args, mounts } = buildCheckArgs({
    image: DEFAULT_IMAGE,
    runId,
    candidate,
    scratch,
    fixtures,
    command: ['node', '/fixtures/isolated-check.mjs'],
    check: { checkId: 'build:api', candidateDigest: sourceDigest, fixtureRoot: '/fixtures', scratchRoot: '/scratch', hostProbePath: toContainerPath(join(repo, '.check-host-probe')) },
    mode: 'create'
  });
  try {
    assertCheckProfile(args, {
      forbidden: forbiddenHostPaths(repo, process.env.USERPROFILE ?? ''),
      image: DEFAULT_IMAGE,
      expectedMounts: mounts
    });
  } catch (error) {
    guardError = String(error && error.message ? error.message : error);
  }
  const executed = guardError ? { stdout: '', stderr: '', status: null, observation: null } : runIsolatedCheck({ docker: 'docker', args });
  let observed = null;
  const start = String(executed.stdout ?? '').indexOf('{');
  const end = String(executed.stdout ?? '').lastIndexOf('}');
  if (start >= 0 && end >= 0) observed = JSON.parse(String(executed.stdout).slice(start, end + 1));
  check = checkEvidence({ checkId: checkEnv.CHECK_ID, candidateDigest: sourceDigest, image: DEFAULT_IMAGE, observed, exitCode: executed.status, stdout: executed.stdout, stderr: executed.stderr });
  check.observedMounts = (executed.observation?.mounts ?? []).map(mount => ({ kind: mount.kind, source: mount.source, target: mount.target, readOnly: mount.readOnly }));
  check.mounts = mounts.map(mount => ({ target: mount.target, readOnly: mount.readOnly, source: canonicalSource(mount.source) }));
  const blockedIssuer = createReadinessIssuer({
    catalog,
    key: signingKey || randomBytes(48).toString('hex'),
    evidenceRoot: join(base, 'blocked-evidence'),
    adapterRoot,
    adapter,
    broker: { probe: async () => ({ connected: false }) },
    connect: async () => false
  });
  blockedProbe = await blockedIssuer.issue({ runId: randomUUID(), projection, scratch, manifest });
} finally {
  modelServer.close();
  egressServer.close();
}

const reportLimitations = [
  'The model transport is a local broker endpoint on the loopback interface; no provider credential was used and no paid service was called.',
  'The general egress control is a host reachable endpoint on the local network address; it proves the isolated run had no path to a reachable non loopback endpoint, not that the public internet was measured.',
  'The projection is synthetic; the real checkout was never mounted into the container.',
  'No live worker ran: the container image does not carry the Codex CLI, so the worker audit in this report is the issuer audit, not a worker run.',
  'The receipt in this report cannot be re-verified without the issuer run context, including the per run witness bindings, which are deliberately not stored in this artifact.'
];
const binding = issued?.receipt?.binding ?? null;
record('the issuer produced a signed receipt', Boolean(issued?.receipt), issued?.diagnostics ?? null);
record('the receipt binds the same source digest as the projection and the check', Boolean(binding) && binding.sourceDigest === sourceDigest && check?.candidateDigest === sourceDigest, { binding: binding?.sourceDigest, check: check?.candidateDigest, sourceDigest });
record('the receipt records a passing gate', issued?.receipt?.derived?.gateA === true, issued?.receipt?.derived ?? null);
record('the audit trail records the issuance', audit.some(entry => entry.event === 'readiness-issued' && entry.signed === true), audit.map(entry => entry.event));
record('the check profile guard accepted the check arguments', guardError === null, guardError);
record('the check ran in the isolated profile and was refused the candidate write', check?.observed?.candidateRead?.ok === true && check?.observed?.candidateWrite?.ok === false, check?.observed ?? null);
record('the check saw no database, provider or secret variable', check?.observed?.environment && Object.keys(check.observed.environment).length === 0, check?.observed?.environment ?? null);
record('the gate stays blocked when a proof is missing', blockedProbe?.receipt === null && typeof blockedProbe?.diagnostics === 'string', blockedProbe?.diagnostics ?? null);
record('the artifacts state that no live worker ran', reportLimitations.some(line => /No live worker ran/i.test(line)), reportLimitations);

const passed = findings.every(finding => finding.passed);
const report = {
  kind: 'readiness-acceptance-report',
  at: new Date().toISOString(),
  runId,
  passed,
  findings,
  receipt: issued?.receipt ?? null,
  signingKeyFingerprint: createHash('sha256').update(signingKey || 'ephemeral').digest('hex'),
  check,
  limitations: reportLimitations
};
if (process.env.JT_ACCEPTANCE_REPORT) writeFileSync(process.env.JT_ACCEPTANCE_REPORT, JSON.stringify(report, null, 2) + '\n');
process.stdout.write(JSON.stringify({ passed, findings: findings.map(finding => ({ name: finding.name, passed: finding.passed })) }, null, 2) + '\n');
rmSync(base, { recursive: true, force: true });
if (!passed) process.exitCode = 1;
