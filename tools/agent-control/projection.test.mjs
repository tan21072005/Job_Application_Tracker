import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, linkSync, existsSync, readdirSync, readFileSync, lstatSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { buildProjectionManifest, materializeProjection, verifyProjection } from './projection.mjs';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'jobtrack-projection-'));
  const write = (path, text) => { mkdirSync(dirname(join(root, ...path.split('/'))), { recursive: true }); writeFileSync(join(root, ...path.split('/')), text); };
  write('apps/web/src/module.js', 'export const value = 1;\n');
  write('apps/web/src/nested/deep.js', 'export const deep = true;\n');
  write('packages/jobtrack-contract/src/index.ts', 'export const contract = 1;\n');
  write('packages/jobtrack-contract/src/types.ts', 'export type Row = { id: string };\n');
  write('apps/web/src/.env', 'SECRET=1\n');
  write('apps/web/src/accounts.txt', 'email|password\n');
  write('apps/web/src/migrations/001.sql', 'CREATE TABLE t(id int);\n');
  write('.git/config', '[core]\n');
  write('.agent-state/registry.json', '{}\n');
  write('node_modules/pkg/index.js', 'module.exports = 1;\n');
  return root;
}

const scratch = () => mkdtempSync(join(tmpdir(), 'jobtrack-projection-scratch-'));
const laneFiles = ['apps/web/src/module.js'];

test('a lane file is accepted and hashed', () => {
  const root = fixture();
  const manifest = buildProjectionManifest({ worktree: root, lane: 'web', files: laneFiles });
  assert.equal(manifest.entries.length, 1);
  assert.equal(manifest.entries[0].path, 'apps/web/src/module.js');
  assert.equal(manifest.entries[0].origin, 'lane');
  assert.equal(manifest.manifestHash.length, 64);
});

test('protected and control paths are refused', () => {
  const root = fixture();
  const refused = [
    'apps/web/src/.env',
    'apps/web/src/accounts.txt',
    '.git/config',
    '.agent-state/registry.json',
    'apps/web/src/migrations/001.sql',
    'apps/web/src/node_modules/pkg/index.js'
  ];
  for (const path of refused) {
    assert.throws(() => buildProjectionManifest({ worktree: root, lane: 'web', files: [path] }), /Protected path|ownership/, path);
  }
});

test('paths outside the lane are refused', () => {
  const root = fixture();
  assert.throws(() => buildProjectionManifest({ worktree: root, lane: 'web', files: ['apps/api/src/module.js'] }), /ownership/);
});

test('traversal and absolute paths are refused', () => {
  const root = fixture();
  for (const path of ['../outside.js', 'apps/web/../../outside.js', '/etc/passwd', 'apps/web/src/']) {
    assert.throws(() => buildProjectionManifest({ worktree: root, lane: 'web', files: [path] }), /Invalid|canonical|ownership|Protected|Unsafe/, path);
  }
});

test('a case mismatch is refused', () => {
  const root = fixture();
  assert.throws(() => buildProjectionManifest({ worktree: root, lane: 'web', files: ['Apps/Web/src/module.js'] }), /casing|ownership|canonical/);
});

test('links are refused as projection sources', t => {
  const root = fixture();
  const outside = mkdtempSync(join(tmpdir(), 'jobtrack-projection-external-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  const junction = join(root, 'apps/web/src/linked');
  let linked = true;
  try { symlinkSync(outside, junction, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (!['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) throw error; linked = false; }
  if (linked) assert.throws(() => buildProjectionManifest({ worktree: root, lane: 'web', files: ['apps/web/src/linked/file.js'] }), /regular file|symlink or junction/i);
  linkSync(join(root, 'apps/web/src/module.js'), join(root, 'apps/web/src/hard.js'));
  assert.throws(() => buildProjectionManifest({ worktree: root, lane: 'web', files: ['apps/web/src/hard.js'] }), /hard linked|Hard-linked/);
});

test('an explicitly declared dependency is accepted and a dependency outside the roots is refused', () => {
  const root = fixture();
  const manifest = buildProjectionManifest({
    worktree: root,
    lane: 'web',
    files: laneFiles,
    dependencies: ['packages/jobtrack-contract/src/index.ts'],
    dependencyRoots: ['packages/jobtrack-contract/src/']
  });
  assert.equal(manifest.entries.length, 2);
  assert.equal(manifest.entries.find(entry => entry.origin === 'dependency').path, 'packages/jobtrack-contract/src/index.ts');
  assert.throws(() => buildProjectionManifest({
    worktree: root,
    lane: 'web',
    files: laneFiles,
    dependencies: ['apps/web/src/nested/deep.js'],
    dependencyRoots: ['packages/jobtrack-contract/src/']
  }), /outside the declared roots/);
  assert.throws(() => buildProjectionManifest({
    worktree: root,
    lane: 'web',
    files: laneFiles,
    dependencies: ['packages/jobtrack-contract/src/index.ts'],
    dependencyRoots: ['migrations/']
  }), /Protected path/);
});

test('the manifest hash changes when the bytes change', () => {
  const root = fixture();
  const first = buildProjectionManifest({ worktree: root, lane: 'web', files: laneFiles });
  writeFileSync(join(root, 'apps/web/src/module.js'), 'export const value = 2;\n');
  const second = buildProjectionManifest({ worktree: root, lane: 'web', files: laneFiles });
  assert.notEqual(first.manifestHash, second.manifestHash);
  assert.notEqual(first.entries[0].sha256, second.entries[0].sha256);
});

test('a duplicated file is refused', () => {
  const root = fixture();
  assert.throws(() => buildProjectionManifest({ worktree: root, lane: 'web', files: ['apps/web/src/module.js', 'apps/web/src/module.js'] }), /twice/);
});

test('materialization produces exactly the manifest tree and keeps the files read only', () => {
  const root = fixture();
  const scratchRoot = scratch();
  const target = join(scratchRoot, 'projection');
  const manifest = buildProjectionManifest({
    worktree: root,
    lane: 'web',
    files: ['apps/web/src/module.js', 'apps/web/src/nested/deep.js'],
    dependencies: ['packages/jobtrack-contract/src/index.ts'],
    dependencyRoots: ['packages/jobtrack-contract/src/']
  });
  const result = materializeProjection(manifest, { worktree: root, targetRoot: target, scratchRoot });
  assert.equal(result.manifestHash, manifest.manifestHash);
  assert.deepEqual(result.files, ['apps/web/src/module.js', 'apps/web/src/nested/deep.js', 'packages/jobtrack-contract/src/index.ts']);
  const listed = [];
  const walk = directory => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const full = join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else listed.push(full);
    }
  };
  walk(target);
  assert.equal(listed.length, 4);
  assert.equal(listed.some(file => file.includes('.git')), false);
  assert.equal(listed.some(file => file.includes('node_modules')), false);
  assert.equal(listed.some(file => file.includes('.env')), false);
  const verified = verifyProjection(manifest, target);
  assert.equal(verified.manifestHash, manifest.manifestHash);
  assert.equal(verified.files.length, 3);
});

test('materialization refuses a target outside the scratch root and a non empty target', () => {
  const root = fixture();
  const scratchRoot = scratch();
  const manifest = buildProjectionManifest({ worktree: root, lane: 'web', files: laneFiles });
  assert.throws(() => materializeProjection(manifest, { worktree: root, targetRoot: join(scratchRoot, '..', 'escape'), scratchRoot }), /escapes the scratch root/);
  const occupied = join(scratchRoot, 'occupied');
  mkdirSync(occupied, { recursive: true });
  writeFileSync(join(occupied, 'leftover.txt'), 'x');
  assert.throws(() => materializeProjection(manifest, { worktree: root, targetRoot: occupied, scratchRoot }), /must be empty/);
});

test('materialization refuses a source that changed after the manifest was built', () => {
  const root = fixture();
  const scratchRoot = scratch();
  const target = join(scratchRoot, 'projection');
  const manifest = buildProjectionManifest({ worktree: root, lane: 'web', files: laneFiles });
  writeFileSync(join(root, 'apps/web/src/module.js'), 'export const value = 3;\n');
  assert.throws(() => materializeProjection(manifest, { worktree: root, targetRoot: target, scratchRoot }), /changed after the manifest/);
});

test('verification refuses a tampered projection', () => {
  const root = fixture();
  const scratchRoot = scratch();
  const target = join(scratchRoot, 'projection');
  const manifest = buildProjectionManifest({ worktree: root, lane: 'web', files: laneFiles });
  materializeProjection(manifest, { worktree: root, targetRoot: target, scratchRoot });
  chmodSync(join(target, 'apps/web/src/module.js'), 0o644);
  writeFileSync(join(target, 'apps/web/src/module.js'), 'export const value = 9;\n');
  assert.throws(() => verifyProjection(manifest, target), /changed/);
});

test('dependencies cannot expose control state or sibling worktrees', () => {
  const root = fixture();
  for (const rel of ['.agent-state/registry.json', '.worktrees/sibling/source.js']) {
    assert.throws(() => buildProjectionManifest({ worktree: root, lane: 'web', files: laneFiles, dependencies: [rel], dependencyRoots: [rel.slice(0, rel.lastIndexOf('/') + 1)] }), /Protected/);
  }
});

test('dependency ancestors cannot be junctions', () => {
  const root = fixture();
  const outside = join(root, 'external-dependency');
  mkdirSync(outside);
  writeFileSync(join(outside, 'module.js'), 'export const external = true;\n');
  symlinkSync(outside, join(root, 'packages', 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => buildProjectionManifest({ worktree: root, lane: 'web', files: laneFiles, dependencies: ['packages/linked/module.js'], dependencyRoots: ['packages/linked/'] }), /symlink or junction/i);
});

test('dependency casing must match the physical source', () => {
  const root = fixture();
  assert.throws(() => buildProjectionManifest({ worktree: root, lane: 'web', files: laneFiles, dependencies: ['packages/jobtrack-contract/src/Index.ts'], dependencyRoots: ['packages/jobtrack-contract/src/'] }), /casing mismatch/);
});

test('materialization rejects altered manifest metadata before writing', () => {
  const root = fixture();
  const scratchRoot = scratch();
  const manifest = buildProjectionManifest({ worktree: root, lane: 'web', files: laneFiles });
  const targetRoot = join(scratchRoot, 'projection');
  for (const forged of [{ ...manifest, manifestHash: 'forged' }, { ...manifest, extra: true }]) {
    assert.throws(() => materializeProjection(forged, { worktree: root, scratchRoot, targetRoot }), /manifest hash|manifest shape/);
    assert.equal(existsSync(targetRoot), false);
  }
});

test('a scratch ancestor junction cannot redirect materialization', () => {
  const root = fixture();
  const scratchRoot = scratch();
  const outside = join(root, 'external-output');
  mkdirSync(outside);
  const link = join(scratchRoot, 'redirect');
  symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
  const manifest = buildProjectionManifest({ worktree: root, lane: 'web', files: laneFiles });
  assert.throws(() => materializeProjection(manifest, { worktree: root, scratchRoot, targetRoot: join(link, 'projection') }), /symlink or junction/i);
  assert.equal(existsSync(join(outside, 'projection')), false);
});

test('verification rejects a descriptor change and a forged hash', () => {
  const root = fixture();
  const scratchRoot = scratch();
  const targetRoot = join(scratchRoot, 'projection');
  const manifest = buildProjectionManifest({ worktree: root, lane: 'web', files: laneFiles });
  materializeProjection(manifest, { worktree: root, scratchRoot, targetRoot });
  assert.throws(() => verifyProjection({ ...manifest, manifestHash: 'forged' }, targetRoot), /manifest hash/);
  const descriptor = join(targetRoot, 'projection.json');
  chmodSync(descriptor, 0o644);
  writeFileSync(descriptor, '{}\n');
  assert.throws(() => verifyProjection(manifest, targetRoot), /descriptor changed/);
});

test('verification rejects identical bytes substituted through a hard link', () => {
  const root = fixture();
  const scratchRoot = scratch();
  const targetRoot = join(scratchRoot, 'projection');
  const manifest = buildProjectionManifest({ worktree: root, lane: 'web', files: laneFiles });
  materializeProjection(manifest, { worktree: root, scratchRoot, targetRoot });
  const projected = join(targetRoot, 'apps/web/src/module.js');
  const outside = join(scratchRoot, 'identical-source.js');
  writeFileSync(outside, readFileSync(projected));
  chmodSync(projected, 0o644);
  rmSync(projected);
  linkSync(outside, projected);
  assert.throws(() => verifyProjection(manifest, targetRoot), /hard linked/);
});
