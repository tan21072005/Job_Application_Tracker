import { createHash } from 'node:crypto';
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, isAbsolute, dirname } from 'node:path';
import { assertOwnedPath, assertReadableSourcePath, assertSafeRootPath } from './policy.mjs';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => JSON.stringify(value);

function assertRegularSourceFile(worktree, rel) {
  const target = join(worktree, ...rel.split('/'));
  if (!existsSync(target)) throw Error(`Projection source is missing: ${rel}`);
  const stat = lstatSync(target);
  if (stat.isSymbolicLink() || !stat.isFile()) throw Error(`Projection source is not a regular file: ${rel}`);
  if (stat.nlink > 1) throw Error(`Projection source is hard linked: ${rel}`);
  return target;
}

function assertInside(root, candidate, message) {
  const base = resolve(root);
  const target = resolve(candidate);
  const rel = relative(base, target);
  if (rel.startsWith('..') || isAbsolute(rel)) throw Error(message);
  return target;
}

export function buildProjectionManifest(input) {
  const { worktree, lane, files, dependencies = [], dependencyRoots = [], base = null } = input || {};
  if (!Array.isArray(files) || !files.length) throw Error('Projection needs at least one source file.');
  if (!Array.isArray(dependencies)) throw Error('Projection dependencies must be a list.');
  if (!Array.isArray(dependencyRoots) || dependencyRoots.some(root => typeof root !== 'string' || !root || !root.endsWith('/'))) {
    throw Error('Projection dependency roots must be canonical prefixes.');
  }
  for (const root of dependencyRoots) assertSafeRootPath(root.replace(/\/$/, ''));
  const entries = [];
  const seen = new Set();
  const add = (rel, origin) => {
    if (seen.has(rel.toLowerCase())) throw Error(`Projection lists a file twice: ${rel}`);
    seen.add(rel.toLowerCase());
    const target = assertRegularSourceFile(worktree, rel);
    entries.push({ path: rel, sha256: sha256(readFileSync(target)), origin });
  };
  for (const file of files) {
    if (typeof file !== 'string') throw Error('Projection file must be a path.');
    add(assertOwnedPath(worktree, lane, file), 'lane');
  }
  for (const file of dependencies) {
    if (typeof file !== 'string') throw Error('Projection dependency must be a path.');
    const rel = assertReadableSourcePath(file);
    if (!dependencyRoots.some(root => rel.startsWith(root))) throw Error(`Projection dependency is outside the declared roots: ${rel}`);
    add(rel, 'dependency');
  }
  entries.sort((left, right) => left.path.localeCompare(right.path));
  return { schemaVersion: 1, base, entries, manifestHash: sha256(canonical({ base, entries })) };
}

export function materializeProjection(manifest, options) {
  const { worktree, targetRoot, scratchRoot } = options || {};
  if (!manifest || !Array.isArray(manifest.entries) || !manifest.entries.length) throw Error('Projection manifest is empty.');
  if (typeof worktree !== 'string' || !worktree) throw Error('Projection needs a source checkout.');
  if (typeof scratchRoot !== 'string' || !scratchRoot) throw Error('Projection needs a scratch root.');
  const root = assertInside(scratchRoot, targetRoot, 'Projection target escapes the scratch root.');
  if (existsSync(root)) {
    const stat = lstatSync(root);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('Projection target must be a real directory.');
    if (readdirSync(root).length) throw Error('Projection target must be empty.');
  }
  const written = [];
  for (const entry of manifest.entries) {
    const source = assertRegularSourceFile(worktree, entry.path);
    const bytes = readFileSync(source);
    if (sha256(bytes) !== entry.sha256) throw Error(`Projection source changed after the manifest was built: ${entry.path}`);
    const destination = assertInside(root, join(root, ...entry.path.split('/')), 'Projection entry escapes the target root.');
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, bytes);
    chmodSync(destination, 0o444);
    written.push(entry.path);
  }
  const descriptor = join(root, 'projection.json');
  writeFileSync(descriptor, canonical({ manifestHash: manifest.manifestHash, base: manifest.base, entries: manifest.entries }) + '\n');
  chmodSync(descriptor, 0o444);
  return { root, manifestHash: manifest.manifestHash, files: written.sort() };
}

export function verifyProjection(manifest, targetRoot) {
  if (!manifest || !Array.isArray(manifest.entries)) throw Error('Projection manifest is invalid.');
  if (!existsSync(targetRoot)) throw Error('Projection root is missing.');
  const expected = new Set(manifest.entries.map(entry => entry.path));
  const actual = [];
  const walk = directory => {
    for (const name of readdirSync(directory, { withFileTypes: true })) {
      const full = join(directory, name.name);
      if (name.isDirectory()) walk(full);
      else actual.push(full);
    }
  };
  walk(targetRoot);
  const relativeActual = actual.map(file => relative(targetRoot, file).split('\\').join('/')).filter(file => file !== 'projection.json').sort();
  const expectedSorted = [...expected].sort();
  if (canonical(relativeActual) !== canonical(expectedSorted)) throw Error('Projection tree does not match the manifest.');
  for (const entry of manifest.entries) {
    const target = join(targetRoot, ...entry.path.split('/'));
    if (sha256(readFileSync(target)) !== entry.sha256) throw Error(`Projection content changed: ${entry.path}`);
  }
  return { files: relativeActual, manifestHash: manifest.manifestHash };
}
