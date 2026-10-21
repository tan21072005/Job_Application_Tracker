import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const FEATURES = Object.freeze(Object.fromEntries(Object.entries({
  web: ['apps/web/src/'],
  api: ['apps/api/src/'],
  extension: ['packages/jobtrack-extension/'],
  mcp: ['packages/jobtrack-mcp/src/'],
  contracts: ['packages/jobtrack-contract/src/'],
}).map(([lane, prefixes]) => [lane, Object.freeze(prefixes)])));

const fail = message => { throw new Error(message); };
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const protectedNames = /^(?:agents\.md|readme(?:\.[^.]+)?|package\.json|.*lock.*|\.env(?:\..*)?|.*\.(?:pem|key|p12|pfx)|credentials(?:\..*)?|secrets?(?:\..*)?|accounts.*\.txt|id_rsa|id_ed25519)$/i;
const protectedParts = /^(?:\.git|\.agents|\.codex|\.claude|\.aws|node_modules|agent-control|migrations)$/i;
const secretPattern = /-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:jt_sec_[A-Za-z0-9_-]{24,}|sk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16})\b|\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|password)\s*[:=]\s*["'][^"'\r\n]{12,}["']/i;

export function normalizePath(rel) {
  if (typeof rel !== 'string' || !rel || rel !== rel.normalize('NFC') || rel.length > 240) fail('Invalid relative path');
  if (/[\\\x00-\x1f\x7f:<>"|?*]/.test(rel) || rel.startsWith('/') || rel.endsWith('/')) fail('Path must be canonical and relative');
  const parts = rel.split('/');
  if (parts.some(part => !part || part === '.' || part === '..' || /[. ]$/.test(part) || /^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(part))) fail('Unsafe path component');
  return rel;
}

export function assertOwnedPath(worktree, lane, rel) {
  const normalized = normalizePath(rel);
  if (!Object.hasOwn(FEATURES, lane) || !FEATURES[lane].some(prefix => normalized.startsWith(prefix))) fail('Path is outside feature ownership');
  const parts = normalized.split('/');
  if (parts.some(part => protectedParts.test(part)) || protectedNames.test(parts.at(-1))) fail('Protected path');
  const root = path.resolve(worktree);
  if (!fs.existsSync(root) || !fs.lstatSync(root).isDirectory() || fs.lstatSync(root).isSymbolicLink()) fail('Invalid worktree');
  for (let ancestor = root; ; ancestor = path.dirname(ancestor)) {
    if (fs.lstatSync(ancestor).isSymbolicLink()) fail('Worktree ancestor cannot be a symlink or junction');
    if (ancestor === path.dirname(ancestor)) break;
  }
  let current = root;
  for (const part of parts) {
    if (fs.existsSync(current)) {
      const names = fs.readdirSync(current);
      const collision = names.find(name => name.toLowerCase() === part.toLowerCase());
      if (collision && collision !== part) fail('Path casing mismatch');
    }
    current = path.join(current, part);
    let stat;
    try { stat = fs.lstatSync(current); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    if (stat.isSymbolicLink()) fail('Symlink or junction is forbidden');
    if (stat.isFile() && stat.nlink > 1) fail('Hard-linked files are forbidden');
    if (current !== path.join(root, ...parts) && !stat.isDirectory()) fail('Ancestor is not a directory');
    const real = fs.realpathSync(current);
    const relative = path.relative(fs.realpathSync(root), real);
    if (relative.startsWith('..') || path.isAbsolute(relative)) fail('Path escapes worktree');
  }
  return normalized;
}

function comments(source) {
  const found = [];
  let i = 0;
  function quoted(delimiter) {
    i++;
    while (i < source.length) {
      if (source[i] === '\\') { i += 2; continue; }
      if (source[i] === delimiter) { i++; return; }
      if (delimiter === '`' && source.slice(i, i + 2) === '${') { i += 2; code(true); continue; }
      i++;
    }
  }
  function code(interpolation = false) {
    let depth = 0;
    let expression = true;
    while (i < source.length) {
      const c = source[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === '"' || c === "'" || c === '`') { quoted(c); expression = false; continue; }
      if (source.slice(i, i + 2) === '//' || source.slice(i, i + 2) === '/*') {
        const start = i;
        const block = source[i + 1] === '*';
        i += 2;
        while (i < source.length && (block ? source.slice(i, i + 2) !== '*/' : source[i] !== '\n')) i++;
        if (block && i < source.length) i += 2;
        found.push(source.slice(start, i));
        continue;
      }
      if (c === '/' && expression) {
        i++;
        let characterClass = false;
        while (i < source.length) {
          if (source[i] === '\\') { i += 2; continue; }
          if (source[i] === '[') characterClass = true;
          if (source[i] === ']') characterClass = false;
          if (source[i++] === '/' && !characterClass) break;
        }
        while (/[a-z]/i.test(source[i] ?? '') && i < source.length) i++;
        expression = false;
        continue;
      }
      if (/[A-Za-z_$]/.test(c)) {
        const start = i++;
        while (i < source.length && /[\w$]/.test(source[i])) i++;
        expression = /^(?:return|throw|case|delete|void|typeof|instanceof|in|of|yield|await)$/.test(source.slice(start, i));
        continue;
      }
      if (c === '{') depth++;
      if (c === '}') { if (interpolation && depth === 0) { i++; return; } depth--; }
      expression = /[({[=,:;!?&|+*%~<>-]/.test(c);
      i++;
    }
  }
  code();
  return found;
}

function assertNoNewComments(rel, before, after) {
  if (!/\.(?:[cm]?[jt]sx?|css|html)$/.test(rel)) return;
  const old = comments(before);
  for (const comment of comments(after)) {
    const index = old.indexOf(comment);
    if (index < 0) fail('New code comments are forbidden');
    old.splice(index, 1);
  }
  if (/\.html$/.test(rel)) {
    const oldHtml = before.match(/<!--[\s\S]*?(?:-->|$)/g) ?? [];
    for (const comment of after.match(/<!--[\s\S]*?(?:-->|$)/g) ?? []) {
      const index = oldHtml.indexOf(comment);
      if (index < 0) fail('New code comments are forbidden');
      oldHtml.splice(index, 1);
    }
  }
}

export function assertChangeSet(worktree, lane, changes) {
  if (!Array.isArray(changes) || changes.length === 0 || changes.length > 20) fail('Change count must be between 1 and 20');
  let total = 0;
  const seen = new Set();
  return changes.map(change => {
    if (!change || Object.keys(change).sort().join(',') !== 'beforeSha256,content,path') fail('Invalid change shape');
    const rel = assertOwnedPath(worktree, lane, change.path);
    if (seen.has(rel.toLowerCase())) fail('Duplicate change path');
    seen.add(rel.toLowerCase());
    if (!(change.beforeSha256 === null || typeof change.beforeSha256 === 'string' && /^[a-f0-9]{64}$/.test(change.beforeSha256))) fail('Invalid before hash');
    if (!(change.content === null || typeof change.content === 'string')) fail('Invalid content');
    const target = path.join(worktree, ...rel.split('/'));
    const exists = fs.existsSync(target);
    if (exists && !fs.lstatSync(target).isFile()) fail('Target is not a regular file');
    const before = exists ? fs.readFileSync(target) : null;
    if ((before === null ? null : hash(before)) !== change.beforeSha256) fail('Stale or incorrect before hash');
    if (change.content === null && !exists) fail('Cannot delete absent file');
    if (change.content !== null) {
      const size = Buffer.byteLength(change.content, 'utf8');
      total += size;
      if (size > 256 * 1024 || total > 2 * 1024 * 1024) fail('Change size limit exceeded');
      if (secretPattern.test(change.content)) fail('Possible secret in content');
      assertNoNewComments(rel, before?.toString('utf8') ?? '', change.content);
    }
    return { path: rel, beforeSha256: change.beforeSha256, content: change.content };
  });
}

const commands = new Set([
  'node\0--version', 'git\0status', 'git\0status\0--short', 'git\0status\0--porcelain=v1',
  'git\0diff', 'git\0diff\0--stat', 'git\0diff\0--check', 'git\0diff\0--name-only',
  'git\0log\0-5\0--oneline', 'git\0show\0--stat\0HEAD',
  'git\0rev-parse\0HEAD', 'git\0rev-parse\0--show-toplevel',
]);

export function assertSafeCommand(argv) {
  if (!Array.isArray(argv) || argv.some(arg => typeof arg !== 'string' || /[\x00-\x1f\x7f;&|`$<>]/.test(arg)) || !commands.has(argv.join('\0'))) fail('Command is not allowlisted');
  return [...argv];
}
