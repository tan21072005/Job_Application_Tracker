import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createServer, get as httpRequest } from 'node:http';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createDockerAdapter, DEFAULT_IMAGE, canonicalSource } from '../agent-control/docker-adapter.mjs';
import { controlPlaneFingerprint } from '../agent-control/fingerprint.mjs';
import { createTransportBroker } from '../agent-control/transport.mjs';
import { createReadinessIssuer } from '../agent-control/issuer.mjs';

const PUBLISHED_KEY = 'local-issuance-key-0123456789abcdef0123456789';
const repo = process.argv[2] ?? process.cwd();
const runRoot = process.argv[3] ?? 'D:/Long-term';
const adapterRoot = process.argv[4] ?? repo;
const modelPort = Number(process.env.JT_MODEL_PORT ?? 8099);
const egressPort = Number(process.env.JT_EGRESS_PORT ?? 8098);
const egressHost = process.env.JT_EGRESS_HOST ?? '';
const signingKey = process.env.READINESS_KEY ?? '';

if (!signingKey) {
  process.stderr.write('READINESS_KEY is required; the issuer never falls back to a published key.\n');
  process.exitCode = 1;
  process.exit(1);
}
if (signingKey === PUBLISHED_KEY) {
  process.stderr.write('READINESS_KEY must not be the published development key.\n');
  process.exitCode = 1;
  process.exit(1);
}
if (!egressHost) {
  process.stderr.write('JT_EGRESS_HOST is required and must be a non loopback address the host can reach.\n');
  process.exitCode = 1;
  process.exit(1);
}

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
const base = join(runRoot, `JobTrack-issuance-${runId.slice(0, 8)}`);
const projection = join(base, 'projection');
const scratch = join(base, 'scratch');
mkdirSync(join(projection, 'apps/web/src'), { recursive: true });
mkdirSync(scratch, { recursive: true });
const content = 'export const value = 1;\n';
writeFileSync(join(projection, 'apps/web/src/module.js'), content);
const manifest = [{ path: 'apps/web/src/module.js', sha256: createHash('sha256').update(content).digest('hex') }];

const modelServer = await startServer(modelPort, 'model-transport');
const egressServer = await startServer(egressPort, 'general-egress-control');

const modelEndpoint = `http://127.0.0.1:${modelPort}/v1/chat`;
const generalEgressEndpoint = `http://${egressHost}:${egressPort}/general`;

const catalog = {
  taskId: 'readiness-canary',
  feature: 'web',
  base: process.env.JT_BASE ?? 'main',
  sourceDigest: createHash('sha256').update(content).digest('hex'),
  projectionManifestHash: createHash('sha256').update(JSON.stringify(manifest)).digest('hex'),
  policyHash: controlPlaneFingerprint(repo),
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

const adapter = createDockerAdapter({ repo: adapterRoot, image: DEFAULT_IMAGE, forbiddenPaths: [canonicalSource(repo)] });
const broker = createTransportBroker({
  allowlist: [{ kind: 'local-transport', host: '127.0.0.1', port: modelPort, path: '/v1' }],
  endpoint: modelEndpoint,
  secret: randomBytes(32).toString('hex'),
  connect: async resolved => {
    const reachable = await httpReach(resolved.endpoint);
    return { connected: reachable, code: reachable ? null : 'UNREACHABLE' };
  }
});
const audit = [];
const evidenceRoot = join(adapterRoot, 'planning/jobtrack-agent-autonomy/hardening-evidence/readiness-evidence');
const issuer = createReadinessIssuer({
  catalog,
  key: signingKey,
  forbidKey: PUBLISHED_KEY,
  evidenceRoot,
  adapter,
  broker,
  connect: async endpoint => httpReach(endpoint),
  audit: record => audit.push(record)
});

let result = null;
try {
  result = await issuer.issue({ runId, projection, scratch, manifest });
} finally {
  modelServer.close();
  egressServer.close();
}

const report = {
  kind: result?.receipt ? 'readiness-receipt' : 'readiness-diagnostics',
  runId,
  base,
  catalog: {
    taskId: catalog.taskId,
    feature: catalog.feature,
    base: catalog.base,
    purpose: catalog.purpose,
    adapterId: catalog.adapterId,
    imageDigest: catalog.imageDigest,
    policyHash: catalog.policyHash,
    modelEndpoint: catalog.modelEndpoint,
    generalEgressEndpoint: catalog.generalEgressEndpoint,
    mountSources: catalog.mountSources
  },
  evidencePath: result?.evidencePath ?? null,
  evidenceHash: result?.evidenceHash ?? null,
  receipt: result?.receipt ?? null,
  signingKeyFingerprint: createHash('sha256').update(signingKey).digest('hex'),
  diagnostics: result?.diagnostics ?? null,
  audit,
  limitations: [
    'The model transport is a local broker endpoint on the loopback interface; no provider credential was used and no paid service was called.',
    'The general egress control is a host reachable endpoint on the local network address; it proves the isolated run had no path to a reachable non loopback endpoint, not that the public internet was measured.',
    'The projection is synthetic; the real checkout was never mounted into the container.',
    'The receipt was verified by the schema 2 verifier inside the issuer before it was signed. A later re-verification needs the issuer run context, including the per run witness bindings, which are deliberately not stored in this artifact.'
  ]
};
if (process.env.JT_RECEIPT_EVIDENCE) writeFileSync(process.env.JT_RECEIPT_EVIDENCE, JSON.stringify(report, null, 2) + '\n');
process.stdout.write(JSON.stringify({
  ok: Boolean(result?.receipt),
  diagnostics: result?.diagnostics ?? null,
  evidencePath: result?.evidencePath ?? null,
  receiptRunId: result?.receipt?.runId ?? null,
  receiptEvidenceHash: result?.receipt?.evidence?.rawSha256 ?? null
}, null, 2) + '\n');
rmSync(base, { recursive: true, force: true });
if (!result?.receipt) process.exitCode = 1;
