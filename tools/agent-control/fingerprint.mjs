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
  'packages/jobtrack-mcp/package.json'
]);

export function controlPlaneFingerprint(root) {
  const files = [...CONTROL_PLANE_FILES];
  const controlPlane = join(root, 'tools/agent-control');
  if (existsSync(controlPlane)) {
    for (const name of readdirSync(controlPlane).sort()) {
      if (/\.(mjs|json)$/.test(name)) files.push(`tools/agent-control/${name}`);
    }
  }
  return createHash('sha256')
    .update(files.map(file => `${file}:${existsSync(join(root, file)) ? configurationHash(join(root, file)) : 'missing'}`).join('\n'))
    .digest('hex');
}
