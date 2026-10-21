import { createHash } from 'node:crypto';
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, isAbsolute, dirname } from 'node:path';
import { assertOwnedPath, assertReadableSourcePath, assertSafeRootPath } from './policy.mjs';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => JSON.stringify(value);

function assertProjectionPath(rel) {
  const normalized = assertReadableSourcePath(rel);
  if (normalized.split('/').some(part => /^(?:\.agent-state|\.worktrees|\.tooling|output|backups|deliverables)$/i.test(part))) throw Error('Protected projection path.');
  if (/^tools\/sandbox(?:\/|$)/i.test(normalized)) throw Error('Protected projection path.');
  return normalized;
}

function assertPhysicalPath(candidate, allowMissing = false) {
  const target = resolve(candidate);
  let current = target;
  while (true) {
    let stat;
    try { stat = lstatSync(current); }
    catch (error) { if (error.code !== 'ENOENT' || !allowMissing) throw error; }
    if (stat) {
      if (stat.isSymbolicLink()) throw Error('Projection path contains a symlink or junction.');
      if (current !== target && !stat.isDirectory()) throw Error('Projection ancestor is not a directory.');
      if (stat.isFile() && stat.nlink !== 1) throw Error('Projection path is hard linked.');
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return target;
}

function assertManifest(manifest) {
  if (!manifest || Object.keys(manifest).sort().join(',') !== 'base,entries,manifestHash,schemaVersion') throw Error('Projection manifest shape is invalid.');
  if (manifest.schemaVersion !== 1 || !(manifest.base === null || typeof manifest.base === 'string')) throw Error('Projection manifest version or base is invalid.');
  if (!Array.isArray(manifest.entries) || !manifest.entries.length) throw Error('Projection manifest is empty.');
  const seen = new Set();
  for (const entry of manifest.entries) {
    if (!entry || Object.keys(entry).sort().join(',') !== 'origin,path,sha256') throw Error('Projection entry shape is invalid.');
    const rel = assertProjectionPath(entry.path);
    if (!['lane', 'dependency'].includes(entry.origin) || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw Error('Projection entry metadata is invalid.');
    if (seen.has(rel.toLowerCase())) throw Error('Projection manifest contains duplicate paths.');
    seen.add(rel.toLowerCase());
  }
  const sorted = [...manifest.entries].sort((left, right) => left.path.localeCompare(right.path));
  if (canonical(sorted) !== canonical(manifest.entries)) throw Error('Projection entries are not canonical.');
  if (manifest.manifestHash !== sha256(canonical({ base: manifest.base, entries: manifest.entries }))) throw Error('Projection manifest hash is invalid.');
  return manifest;
}

function assertRegularSourceFile(worktree, rel) {
  assertProjectionPath(rel);
  assertPhysicalPath(worktree);
  let current = worktree;
  for (const part of rel.split('/')) {
    if (!readdirSync(current).includes(part)) throw Error('Projection source is missing or has a casing mismatch.');
    current = assertPhysicalPath(join(current, part));
  }
  const target = current;
  if (!existsSync(target)) throw Error(`Projection source is missing: ${rel}`);
  const stat = lstatSync(target);
  if (stat.isSymbolicLink() || !stat.isFile()) throw Error(`Projection source is not a regular file: ${rel}`);
  if (stat.nlink > 1) throw Error(`Projection source is hard linked: ${rel}`);
  return target;
}

function assertInside(root, candidate, message) {
  if (typeof root !== 'string' || !root || typeof candidate !== 'string' || !candidate) throw Error(message);
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
  for (const root of dependencyRoots) assertProjectionPath(root.replace(/\/$/, ''));
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
    const rel = assertProjectionPath(file);
    if (!dependencyRoots.some(root => rel.startsWith(root))) throw Error(`Projection dependency is outside the declared roots: ${rel}`);
    add(rel, 'dependency');
  }
  entries.sort((left, right) => left.path.localeCompare(right.path));
  return assertManifest({ schemaVersion: 1, base, entries, manifestHash: sha256(canonical({ base, entries })) });
}

export function materializeProjection(manifest, options) {
  const { worktree, targetRoot, scratchRoot } = options || {};
  assertManifest(manifest);
  if (typeof worktree !== 'string' || !worktree) throw Error('Projection needs a source checkout.');
  if (typeof scratchRoot !== 'string' || !scratchRoot) throw Error('Projection needs a scratch root.');
  const root = assertInside(scratchRoot, targetRoot, 'Projection target escapes the scratch root.');
  assertPhysicalPath(scratchRoot);
  if (!lstatSync(scratchRoot).isDirectory()) throw Error('Projection scratch root is not a directory.');
  assertPhysicalPath(root, true);
  if (root === resolve(scratchRoot)) throw Error('Projection needs a private target below the scratch root.');
  if (existsSync(root)) {
    const stat = lstatSync(root);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('Projection target must be a real directory.');
    if (readdirSync(root).length) throw Error('Projection target must be empty.');
  }
  const prepared = manifest.entries.map(entry => {
    const source = assertRegularSourceFile(worktree, entry.path);
    const bytes = readFileSync(source);
    if (sha256(bytes) !== entry.sha256) throw Error(`Projection source changed after the manifest was built: ${entry.path}`);
    return { entry, bytes };
  });
  mkdirSync(root, { recursive: true });
  assertPhysicalPath(root);
  assertInside(realpathSync(scratchRoot), realpathSync(root), 'Projection physical target escapes the scratch root.');
  const written = [];
  for (const { entry, bytes } of prepared) {
    const destination = assertInside(root, join(root, ...entry.path.split('/')), 'Projection entry escapes the target root.');
    assertPhysicalPath(destination, true);
    mkdirSync(dirname(destination), { recursive: true });
    assertPhysicalPath(dirname(destination));
    writeFileSync(destination, bytes, { flag: 'wx' });
    chmodSync(destination, 0o444);
    written.push(entry.path);
  }
  const descriptor = join(root, 'projection.json');
  writeFileSync(descriptor, canonical({ manifestHash: manifest.manifestHash, base: manifest.base, entries: manifest.entries }) + '\n', { flag: 'wx' });
  chmodSync(descriptor, 0o444);
  return { root, manifestHash: manifest.manifestHash, files: written.sort() };
}

export function verifyProjection(manifest, targetRoot) {
  assertManifest(manifest);
  assertPhysicalPath(targetRoot);
  if (!existsSync(targetRoot)) throw Error('Projection root is missing.');
  if (!lstatSync(targetRoot).isDirectory()) throw Error('Projection root is not a directory.');
  const descriptor = assertPhysicalPath(join(targetRoot, 'projection.json'));
  if (!lstatSync(descriptor).isFile()) throw Error('Projection descriptor is not a regular file.');
  if (readFileSync(descriptor, 'utf8') !== canonical({ manifestHash: manifest.manifestHash, base: manifest.base, entries: manifest.entries }) + '\n') throw Error('Projection descriptor changed.');
  const expected = new Set(manifest.entries.map(entry => entry.path));
  const actual = [];
  const walk = directory => {
    for (const name of readdirSync(directory, { withFileTypes: true })) {
      const full = join(directory, name.name);
      assertPhysicalPath(full);
      const stat = lstatSync(full);
      if (stat.isDirectory()) walk(full);
      else if (stat.isFile()) actual.push(full);
      else throw Error('Projection contains a non regular entry.');
    }
  };
  walk(targetRoot);
  const relativeActual = actual.map(file => relative(targetRoot, file).split('\\').join('/')).filter(file => file !== 'projection.json').sort();
  const expectedSorted = [...expected].sort();
  if (canonical(relativeActual) !== canonical(expectedSorted)) throw Error('Projection tree does not match the manifest.');
  for (const entry of manifest.entries) {
    const target = assertPhysicalPath(join(targetRoot, ...entry.path.split('/')));
    if (sha256(readFileSync(target)) !== entry.sha256) throw Error(`Projection content changed: ${entry.path}`);
  }
  return { files: relativeActual, manifestHash: manifest.manifestHash };
}
