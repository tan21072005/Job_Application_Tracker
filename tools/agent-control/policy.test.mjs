import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { FEATURES, normalizePath, assertOwnedPath, assertChangeSet, assertSafeCommand } from './policy.mjs';

const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const change = (name, content, beforeSha256 = null) => ({ path: name, content, beforeSha256 });
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jobtrack-policy-'));
  for (const directories of Object.values(FEATURES)) for (const directory of directories) fs.mkdirSync(path.join(root, directory), { recursive: true });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test('canonical paths reject traversal, ADS, control characters and Windows aliases', () => {
  assert.equal(normalizePath('apps/web/src/page.tsx'), 'apps/web/src/page.tsx');
  for (const candidate of ['', '/etc/passwd', '../x', 'apps//x', 'apps/./x', 'apps/../x', 'apps\\web\\src\\x', 'C:/x', 'x:ads', 'x\n', 'x.', 'x ', 'CON.ts', 'a/NUL', 'a/']) assert.throws(() => normalizePath(candidate), candidate);
});

test('feature lanes and protected files enforce exact ownership', t => {
  const root = fixture(t);
  assert.equal(assertOwnedPath(root, 'web', 'apps/web/src/page.tsx'), 'apps/web/src/page.tsx');
  assert.equal(assertOwnedPath(root, 'web', 'apps/web/src/useDashboardClock.ts'), 'apps/web/src/useDashboardClock.ts');
  assert.equal(assertOwnedPath(root, 'api', 'apps/api/src/lockSession.ts'), 'apps/api/src/lockSession.ts');
  for (const candidate of ['apps/api/src/a.ts', 'apps/Web/src/a.ts', 'apps/web/src/AGENTS.md', 'apps/web/src/.env.local', 'apps/web/src/.git/config', 'apps/web/src/package.json', 'apps/web/src/package-lock.json', 'apps/web/src/README.md', 'apps/web/src/secret.key', 'apps/web/src/agent-control/a.ts']) assert.throws(() => assertOwnedPath(root, 'web', candidate), candidate);
  assert.throws(() => assertOwnedPath(root, '__proto__', 'apps/web/src/a.ts'));
  for (const candidate of ['packages/jobtrack-extension/accounts.txt', 'packages/jobtrack-extension/accounts-backup.txt', 'packages/jobtrack-extension/.claude/config.json', 'packages/jobtrack-extension/package-lock.json', 'packages/jobtrack-extension/pnpm-lock.yaml', 'packages/jobtrack-extension/bun.lockb']) assert.throws(() => assertOwnedPath(root, 'extension', candidate), candidate);
  fs.mkdirSync(path.join(root, 'apps/web/src/Panel'));
  assert.throws(() => assertOwnedPath(root, 'web', 'apps/web/src/panel/a.ts'));
});

test('symlinks and junctions cannot redirect owned paths', t => {
  const root = fixture(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'jobtrack-policy-external-'));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  const link = path.join(root, 'apps/web/src/linked');
  try { fs.symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) return t.skip('Platform does not permit links'); throw error; }
  assert.throws(() => assertOwnedPath(root, 'web', 'apps/web/src/linked/new.ts'));
});

test('hash checks cover original bytes and absent files', t => {
  const root = fixture(t);
  const rel = 'apps/api/src/item.ts';
  const original = Buffer.from('const value = 1;\r\n');
  fs.writeFileSync(path.join(root, rel), original);
  assert.deepEqual(assertChangeSet(root, 'api', [change(rel, 'const value = 2;', digest(original))]), [change(rel, 'const value = 2;', digest(original))]);
  assert.throws(() => assertChangeSet(root, 'api', [change(rel, 'changed')]));
  assert.throws(() => assertChangeSet(root, 'api', [change(rel, 'changed', '0'.repeat(64))]));
  assert.throws(() => assertChangeSet(root, 'api', [change('apps/api/src/new.ts', null)]));
  assert.equal(assertChangeSet(root, 'api', [change(rel, null, digest(original))])[0].content, null);
});

test('hard links cannot alias files outside ownership', t => {
  const root = fixture(t);
  const original = path.join(root, 'apps/api/src/original.ts');
  fs.writeFileSync(original, 'export {};');
  fs.linkSync(original, path.join(root, 'apps/web/src/alias.ts'));
  assert.throws(() => assertOwnedPath(root, 'web', 'apps/web/src/alias.ts'));
});

test('batch validation does not write any files when later input fails', t => {
  const root = fixture(t);
  const file = 'apps/web/src/new.ts';
  assert.throws(() => assertChangeSet(root, 'web', [change(file, 'export const ok = true;'), change('apps/api/src/wrong.ts', 'export {};')]));
  assert.equal(fs.existsSync(path.join(root, file)), false);
  assert.throws(() => assertChangeSet(root, 'web', [change(file, ''), change(file, '')]));
  assert.throws(() => assertChangeSet(root, 'web', [{ ...change(file, ''), surprise: true }]));
});

test('bounded changes reject oversized batches and possible credentials', t => {
  const root = fixture(t);
  const file = 'apps/web/src/new.ts';
  assert.throws(() => assertChangeSet(root, 'web', []));
  assert.throws(() => assertChangeSet(root, 'web', Array.from({ length: 21 }, (_, i) => change(`apps/web/src/${i}.ts`, ''))));
  assert.throws(() => assertChangeSet(root, 'web', [change(file, 'a'.repeat(256 * 1024 + 1))]));
  assert.throws(() => assertChangeSet(root, 'web', Array.from({ length: 9 }, (_, i) => change(`apps/web/src/${i}.txt`, 'a'.repeat(256 * 1024)))));
  for (const content of ['const key = "sk-' + 'a'.repeat(30) + '";', 'jt_sec_' + 'a'.repeat(24), '-----BEGIN PRIVATE KEY-----', 'const apiKey = "abcdefghijklmno";', 'const password = "abcdefghijklmnop";']) assert.throws(() => assertChangeSet(root, 'web', [change(file, content)]));
});

test('new code rejects comments while strings URLs regex and template text are preserved', t => {
  const root = fixture(t);
  const rel = 'apps/web/src/new.ts';
  for (const content of ['export const value = 1; // added', '/* block */ export {};', 'const x = `${1 /* hidden */}`;', 'const x = <div>{/* jsx */}</div>;']) assert.throws(() => assertChangeSet(root, 'web', [change(rel, content)]), content);
  const content = 'const url = "https://example.test/x"; const re = /https?:\\/\\//; const text = `// literal`;';
  assert.equal(assertChangeSet(root, 'web', [change(rel, content)])[0].content, content);
  const before = '// existing\nexport const value = 1;';
  fs.writeFileSync(path.join(root, rel), before);
  assert.doesNotThrow(() => assertChangeSet(root, 'web', [change(rel, before.replace('1', '2'), digest(before))]));
  assert.throws(() => assertChangeSet(root, 'web', [change(rel, before + '\n// existing', digest(before))]));
});

test('command API accepts only exact benign argv forms and rejects wrappers', () => {
  for (const argv of [['node', '--version'], ['git', 'status', '--short'], ['git', 'diff', '--check'], ['git', 'rev-parse', 'HEAD']]) assert.deepEqual(assertSafeCommand(argv), argv);
  for (const argv of [[], ['git', 'push'], ['git', 'reset', '--hard'], ['git', 'clean', '-fd'], ['git', 'checkout', '.'], ['git', 'restore', '.'], ['git', 'branch', '-D', 'main'], ['git', 'rebase'], ['git', '-c', 'alias.status=!whoami', 'status'], ['git', 'show', '--output=x'], ['node', '-e', 'process.exit()'], ['powershell', 'Remove-Item', '-Recurse'], ['cmd', '/c', 'git status'], ['git', 'status;whoami'], ['git', 'status', '--short\nwhoami'], ['rtk', 'git', 'status']]) assert.throws(() => assertSafeCommand(argv), JSON.stringify(argv));
});
