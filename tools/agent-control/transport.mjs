import { createHmac, createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

export const TRANSPORT_ALLOWLIST_KIND = Object.freeze({
  'https-endpoint': 'https-endpoint',
  'local-transport': 'local-transport'
});

const RUN_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertRunId(runId) {
  if (typeof runId !== 'string' || !RUN_ID_PATTERN.test(runId)) throw Error('Transport run id must be a uuid.');
  return runId;
}

export function normalizeEndpointPath(value) {
  const segments = [];
  for (const segment of String(value).split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') { segments.pop(); continue; }
    segments.push(segment);
  }
  return `/${segments.join('/')}`;
}

export function assertAllowlistedEndpoint(endpoint, allowlist) {
  if (typeof endpoint !== 'string' || !endpoint) throw Error('Transport endpoint is missing.');
  if (/\s/.test(endpoint)) throw Error('Transport endpoint must not contain whitespace.');
  if (/[?#]/.test(endpoint)) throw Error('Transport endpoint must not contain a query or fragment.');
  if (/@/.test(endpoint)) throw Error('Transport endpoint must not embed credentials.');
  const match = /^(https?):\/\/([^/:]+)(?::(\d+))?(\/.*)?$/.exec(endpoint);
  if (!match) throw Error('Transport endpoint is not a valid url.');
  const [, scheme, host, port, rawPath = '/'] = match;
  const path = normalizeEndpointPath(rawPath);
  const entry = (allowlist ?? []).find(candidate => candidate.host === host && candidate.port !== undefined && candidate.port === Number(port ?? (scheme === 'https' ? 443 : 80)));
  if (!entry) throw Error('Transport endpoint is not in the operator allowlist.');
  if (entry.kind === 'https-endpoint' && scheme !== 'https') throw Error('Transport endpoint must use https.');
  if (entry.kind === 'local-transport' && scheme !== 'http') throw Error('Local transport must use http.');
  if (entry.path) {
    const allowed = normalizeEndpointPath(entry.path);
    if (path !== allowed && !path.startsWith(`${allowed}/`)) throw Error('Transport endpoint path is outside the allowlist path.');
  }
  return { endpoint, scheme, host, port: Number(port ?? (scheme === 'https' ? 443 : 80)), path, kind: entry.kind };
}

export function assertTransportRootInsideScratch(transportRoot, scratchRoot) {
  const scratch = resolve(scratchRoot);
  const root = resolve(transportRoot);
  const rel = relative(scratch, root);
  if (resolve(root) === scratch) throw Error('Transport root must be a dedicated subdirectory of the scratch directory.');
  if (!rel || rel.startsWith('..')) throw Error('Transport root must live inside the container scratch directory.');
  const realScratch = realpathSync(scratch);
  const realRoot = existsSync(root) ? realpathSync(root) : root;
  const realRel = relative(realScratch, realRoot);
  if (!realRel || realRel.startsWith('..')) throw Error('Transport root must resolve inside the container scratch directory.');
  return realRoot;
}

export function createTransportBroker(options = {}) {
  const allowlist = options.allowlist ?? [];
  const timeoutMs = options.timeoutMs ?? 120_000;
  const pollMs = options.pollMs ?? 100;
  const secret = options.secret;
  if (typeof secret !== 'string' || secret.length < 32) throw Error('Transport broker needs a response authentication secret of at least 32 characters.');
  const requestDir = root => join(root, 'transport');

  const writeAtomic = (path, content) => {
    const temporary = `${path}.${randomUUID()}.tmp`;
    writeFileSync(temporary, content, { flag: 'wx' });
    renameSync(temporary, path);
  };

  const signRequest = payload => createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');

  return {
    id: options.id ?? 'jobtrack-transport-broker-v1',
    allowlist,
    endpoint: options.endpoint ?? null,
    async probe() {
      if (!this.endpoint) return { endpoint: null, connected: false, code: 'NO_ENDPOINT' };
      const resolved = assertAllowlistedEndpoint(this.endpoint, allowlist);
      const result = await options.connect
        ? await options.connect(resolved)
        : { connected: false, code: 'NO_TRANSPORT' };
      return { ...resolved, ...result };
    },
    async request(input) {
      if (!this.endpoint) throw Error('Transport broker has no endpoint.');
      const resolved = assertAllowlistedEndpoint(this.endpoint, allowlist);
      const scratchRoot = input.scratchRoot;
      if (!scratchRoot) throw Error('Transport request needs the scratch root.');
      const runId = assertRunId(input.runId ?? randomUUID());
      const requestedRoot = input.transportRoot ?? join(scratchRoot, 'transport');
      mkdirSync(requestedRoot, { recursive: true });
      const transportRoot = assertTransportRootInsideScratch(requestedRoot, scratchRoot);
      mkdirSync(requestDir(transportRoot), { recursive: true });
      const runDirectory = join(requestDir(transportRoot), runId);
      mkdirSync(runDirectory, { recursive: true });
      const requestPath = join(runDirectory, 'request.json');
      const responsePath = join(runDirectory, 'response.json');
      rmSync(responsePath, { force: true });
      const request = {
        runId,
        role: input.role ?? 'worker',
        endpoint: resolved.endpoint,
        prompt: input.prompt ?? '',
        payload: input.payload ?? null,
        issuedAt: new Date().toISOString()
      };
      const requestHash = createHash('sha256').update(JSON.stringify(request)).digest('hex');
      const token = signRequest({ requestHash, runId });
      writeAtomic(requestPath, JSON.stringify({ request, requestHash, token }) + '\n');
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        if (existsSync(responsePath)) {
          const raw = readFileSync(responsePath, 'utf8');
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch {
            throw Error('Transport response is not valid JSON.');
          }
          if (!parsed || parsed.requestHash !== requestHash) throw Error('Transport response does not belong to this request.');
          const expected = signRequest({ requestHash, runId });
          if (typeof parsed.token !== 'string' || parsed.token.length !== expected.length || !timingSafeEqual(Buffer.from(parsed.token, 'utf8'), Buffer.from(expected, 'utf8'))) {
            throw Error('Transport response is not authenticated.');
          }
          rmSync(responsePath, { force: true });
          return { request: { ...request, requestHash }, response: parsed.body ?? null };
        }
        await new Promise(done => setTimeout(done, pollMs));
      }
      throw Error('Transport request timed out with no response.');
    }
  };
}
