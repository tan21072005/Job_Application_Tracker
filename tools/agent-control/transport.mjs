import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const TRANSPORT_ALLOWLIST_KIND = Object.freeze({
  'https-endpoint': 'https-endpoint',
  'local-transport': 'local-transport'
});

export function assertAllowlistedEndpoint(endpoint, allowlist) {
  if (typeof endpoint !== 'string' || !endpoint) throw Error('Transport endpoint is missing.');
  if (/\s/.test(endpoint)) throw Error('Transport endpoint must not contain whitespace.');
  if (/[?#]/.test(endpoint)) throw Error('Transport endpoint must not contain a query or fragment.');
  if (/@/.test(endpoint)) throw Error('Transport endpoint must not embed credentials.');
  const match = /^(https?):\/\/([^/:]+)(?::(\d+))?(\/.*)?$/.exec(endpoint);
  if (!match) throw Error('Transport endpoint is not a valid url.');
  const [, scheme, host, port, path = '/'] = match;
  const entry = (allowlist ?? []).find(candidate => candidate.host === host && (candidate.port === undefined || candidate.port === Number(port ?? (scheme === 'https' ? 443 : 80))));
  if (!entry) throw Error('Transport endpoint is not in the operator allowlist.');
  if (entry.kind === 'https-endpoint' && scheme !== 'https') throw Error('Transport endpoint must use https.');
  if (entry.kind === 'local-transport' && scheme !== 'http') throw Error('Local transport must use http.');
  if (entry.path && !path.startsWith(entry.path)) throw Error('Transport endpoint path is outside the allowlist path.');
  return { endpoint, scheme, host, port: Number(port ?? (scheme === 'https' ? 443 : 80)), path, kind: entry.kind };
}

export function assertTransportRootInsideScratch(transportRoot, scratchRoot) {
  const scratch = resolve(scratchRoot);
  const root = resolve(transportRoot);
  const relative = root.slice(0, scratch.length);
  if (relative !== scratch) throw Error('Transport root must live inside the container scratch directory.');
  if (root === scratch) throw Error('Transport root must be a dedicated subdirectory of the scratch directory.');
  return root;
}

export function createTransportBroker(options = {}) {
  const allowlist = options.allowlist ?? [];
  const timeoutMs = options.timeoutMs ?? 120_000;
  const pollMs = options.pollMs ?? 100;
  const requestDir = root => join(root, 'transport');

  const writeAtomic = (path, content) => {
    const temporary = `${path}.${randomUUID()}.tmp`;
    writeFileSync(temporary, content, { flag: 'wx' });
    renameSync(temporary, path);
  };

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
      const transportRoot = assertTransportRootInsideScratch(input.transportRoot ?? join(scratchRoot, 'transport'), scratchRoot);
      mkdirSync(requestDir(transportRoot), { recursive: true });
      const runDirectory = join(requestDir(transportRoot), input.runId ?? randomUUID());
      mkdirSync(runDirectory, { recursive: true });
      const requestPath = join(runDirectory, 'request.json');
      const responsePath = join(runDirectory, 'response.json');
      rmSync(responsePath, { force: true });
      const request = {
        runId: input.runId ?? null,
        role: input.role ?? 'worker',
        endpoint: resolved.endpoint,
        prompt: input.prompt ?? '',
        payload: input.payload ?? null,
        issuedAt: new Date().toISOString()
      };
      writeAtomic(requestPath, JSON.stringify(request) + '\n');
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        if (existsSync(responsePath)) {
          const raw = readFileSync(responsePath, 'utf8');
          const response = JSON.parse(raw);
          rmSync(responsePath, { force: true });
          return { request: { ...request, requestHash: createHash('sha256').update(JSON.stringify(request)).digest('hex') }, response };
        }
        await new Promise(done => setTimeout(done, pollMs));
      }
      throw Error('Transport request timed out with no response.');
    }
  };
}
