import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const configurationHash = path => createHash('sha256').update(readFileSync(path, 'utf8').replaceAll('\r\n', '\n')).digest('hex');

export const CONTROL_PLANE_FILES = Object.freeze([
  'package.json',
  'package-lock.json',
  'apps/api/package.json',
  'apps/web/package.json',
  'packages/jobtrack-contract/package.json',
  'packages/jobtrack-mcp/package.json',
  'tools/sandbox/isolation-probe.mjs',
  'tools/sandbox/isolated-check.mjs',
  'tools/sandbox/run-isolation-probe.mjs',
  'tools/sandbox/run-isolated-check.mjs',
  'tools/sandbox/run-readiness-issuance.mjs',
  'tools/sandbox/run-readiness-acceptance.mjs'
]);

export function controlPlaneFiles(root) {
  const files = [...CONTROL_PLANE_FILES];
  const controlPlane = join(root, 'tools/agent-control');
  if (existsSync(controlPlane)) {
    for (const name of readdirSync(controlPlane).sort()) {
      if (/\.(mjs|json)$/.test(name)) files.push(`tools/agent-control/${name}`);
    }
    const fixtures = join(controlPlane, 'fixtures');
    if (existsSync(fixtures)) {
      for (const name of readdirSync(fixtures).sort()) {
        if (/\.(mjs|json)$/.test(name)) files.push(`tools/agent-control/fixtures/${name}`);
      }
    }
  }
  return files;
}

export function controlPlaneFingerprint(root) {
  const files = controlPlaneFiles(root);
  return createHash('sha256')
    .update(files.map(file => `${file}:${existsSync(join(root, file)) ? configurationHash(join(root, file)) : 'missing'}`).join('\n'))
    .digest('hex');
}

export function probeProgramHash(root) {
  const program = join(root, 'tools/sandbox/isolation-probe.mjs');
  return existsSync(program) ? configurationHash(program) : null;
}
