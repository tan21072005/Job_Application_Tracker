#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { extname, basename, join, resolve, relative } from 'node:path';

const argv = process.argv.slice(2);

const opt = {
  mode: null,
  repo: process.cwd(),
  scanPaths: [],
  json: false,
  strict: false,
  includeConfig: false,
  allowDoc: false,
  allowLicense: true,
  quiet: false,
  range: null,
};

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--staged') opt.mode = 'staged';
  else if (a === '--worktree') opt.mode = 'worktree';
  else if (a === '--range') { opt.mode = 'range'; opt.range = argv[++i]; }
  else if (a === '--scan') { opt.mode = 'scan'; while (argv[i + 1] && !argv[i + 1].startsWith('--')) opt.scanPaths.push(argv[++i]); }
  else if (a === '--repo') opt.repo = resolve(argv[++i]);
  else if (a === '--json') opt.json = true;
  else if (a === '--strict') opt.strict = true;
  else if (a === '--include-config') opt.includeConfig = true;
  else if (a === '--allow-doc') opt.allowDoc = true;
  else if (a === '--no-allow-license') opt.allowLicense = false;
  else if (a === '--quiet') opt.quiet = true;
  else if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
  else { console.error(`Unknown option: ${a}`); process.exit(2); }
}

function printHelp() {
  console.log(`check-no-comments

Usage:
  node check-no-comments.mjs --staged  [--repo path]
  node check-no-comments.mjs --worktree [--repo path]
  node check-no-comments.mjs --range main..HEAD [--repo path]
  node check-no-comments.mjs --scan <file-or-dir...>

Options:
  --json  --strict  --include-config  --allow-doc  --no-allow-license  --quiet`);
}


const SLASH = ['//'];
const HASH = ['#'];
const DASH = ['--'];
const CBLOCK = ['//', '/*'];

const LANG = new Map(Object.entries({
  '.js': CBLOCK, '.jsx': CBLOCK, '.mjs': CBLOCK, '.cjs': CBLOCK,
  '.ts': CBLOCK, '.tsx': CBLOCK, '.mts': CBLOCK, '.cts': CBLOCK,
  '.java': CBLOCK, '.kt': CBLOCK, '.kts': CBLOCK, '.scala': SLASH, '.groovy': SLASH,
  '.go': SLASH, '.rs': CBLOCK, '.swift': CBLOCK, '.dart': SLASH, '.sol': SLASH,
  '.c': CBLOCK, '.h': CBLOCK, '.cc': CBLOCK, '.cpp': CBLOCK, '.cxx': CBLOCK,
  '.hpp': CBLOCK, '.hh': CBLOCK, '.cs': CBLOCK, '.php': CBLOCK, '.proto': SLASH,
  '.py': HASH, '.pyi': HASH, '.rb': HASH, '.sh': HASH, '.bash': HASH, '.zsh': HASH,
  '.ps1': HASH, '.psm1': HASH, '.pl': HASH, '.pm': HASH, '.r': HASH, '.jl': HASH,
  '.nim': HASH, '.ex': HASH, '.exs': HASH, '.cr': HASH, '.mk': HASH,
  '.sql': ['--', '/*'], '.lua': DASH,
  '.css': ['/*'], '.scss': CBLOCK, '.less': CBLOCK,
  '.html': ['<!--'], '.htm': ['<!--'], '.xml': ['<!--'], '.svg': ['<!--'],
  '.vue': ['//', '/*', '<!--'], '.svelte': ['//', '/*', '<!--'],
}));

const CONFIG_LANG = new Map(Object.entries({
  '.yaml': HASH, '.yml': HASH, '.toml': HASH, '.ini': [';', '#'], '.conf': ['#', ';'],
  '.cfg': ['#', ';'], '.properties': ['#', '!'], '.dockerfile': HASH,
}));

function tokensFor(file) {
  const ext = extname(file).toLowerCase();
  if (LANG.has(ext)) return LANG.get(ext);
  if (opt.includeConfig && CONFIG_LANG.has(ext)) return CONFIG_LANG.get(ext);
  const base = basename(file).toLowerCase();
  if (opt.includeConfig) {
    if (base === 'dockerfile' || base.startsWith('dockerfile.')) return HASH;
    if (base === 'makefile' || base === 'gnumakefile') return HASH;
  }
  if (base === 'dockerfile' || base.startsWith('dockerfile.')) return HASH;
  if (base === 'makefile' || base === 'gnumakefile') return HASH;
  return null;
}

function isBlockFile(tokens) {
  return tokens && (tokens.includes('/*') || tokens.includes('<!--'));
}

function isBlockContinuation(line, tokens) {
  if (!isBlockFile(tokens)) return false;
  const t = line.trimStart();
  if (t.startsWith('*/') || t.startsWith('-->')) return true;
  return /^\*(?:\s|$)/.test(t);
}

const DIRECTIVE = new RegExp(
  '^(?://|/\\*|#|--|\\*)\\s*(' +
  '@ts-(?:ignore|nocheck|check|expect-error)|' +
  '@jsx|@flow|' +
  'eslint(?:-|\\s)|prettier-ignore|' +
  'istanbul\\s+ignore|' +
  'c8\\s+ignore|v8\\s+ignore|node:coverage|' +
  'sourceMappingURL|' +
  '#\\s*sourceMappingURL|' +
  'go:(?:build|generate|embed)|' +
  'noqa|type:\\s*ignore|pyright:|mypy:|pylint:|flake8:|ruff:|' +
  'pragma|region|endregion|' +
  'NOSONAR|' +
  'shellcheck|bats|' +
  'PSScriptAnalyzer|' +
  'phpcs|phpstan|psalm|' +
  'webpackChunkName|webpackIgnore|@vite-ignore|' +
  'lint' +
  ')',
  'i'
);

const LICENSE = /(SPDX-License-Identifier|Copyright\s+(?:\(c\)|©)?\s*\d{4}|Licensed under the|This file is part of)/i;


function commentKind(line, tokens, lineNo, allowLicenseHere) {
  if (!tokens || !tokens.length) return null;
  const t = line.trimStart();
  if (!t) return null;

  if (lineNo === 1 && t.startsWith('#!')) return null;

  for (const token of tokens) {
    if (t.startsWith(token)) {
      if (token === '<!--' && t.startsWith('<!--')) {
      }
      if (DIRECTIVE.test(t)) return null;
      if (allowLicenseHere && LICENSE.test(t)) return null;
      return { kind: 'full', token };
    }
  }

  if (isBlockContinuation(line, tokens)) {
    if (DIRECTIVE.test(t)) return null;
    if (allowLicenseHere && LICENSE.test(t)) return null;
    return { kind: 'block', token: '*' };
  }

  if (opt.strict) {
    const idx = trailingCommentIndex(line, tokens);
    if (idx >= 0) {
      const rest = line.slice(idx).trim();
      if (DIRECTIVE.test(rest)) return null;
      if (allowLicenseHere && LICENSE.test(rest)) return null;
      return { kind: 'trailing', token: line.slice(idx).trim().slice(0, 2) };
    }
  }
  return null;
}

function trailingCommentIndex(line, tokens) {
  let quote = null;
  let esc = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (i === 0 || /\s/.test(line[i - 1])) {
      for (const token of tokens) {
        if (token === '/*' || token === '<!--') continue;
        if (line.startsWith(token, i)) {
          if (token === '//' && i > 0 && line[i - 1] === ':') continue;
          return i;
        }
      }
    }
  }
  return -1;
}

function docAllowedLines(file) {
  let text;
  try { text = readFileSync(file, 'utf8').replace(/^\uFEFF/, ''); } catch { return null; }
  const lines = text.split(/\r?\n/);
  const allowed = new Set();
  const ext = extname(file).toLowerCase();

  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*\/\*\*/.test(lines[i])) continue;
    let j = i;
    while (j < lines.length && !/\*\//.test(lines[j])) j++;
    if (j >= lines.length) break;
    let k = j + 1;
    while (k < lines.length && !lines[k].trim()) k++;
    const next = k < lines.length ? lines[k] : '';
    if (/^\s*(export|default\s+export)\b/.test(next)) {
      for (let x = i; x <= j; x++) allowed.add(x + 1);
    }
    i = j;
  }

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trimStart();
    if (!t.startsWith('///') && !t.startsWith('//!')) continue;
    let j = i;
    while (j < lines.length && /^\s*\/\/[\/!]/.test(lines[j])) j++;
    let k = j;
    while (k < lines.length && !lines[k].trim()) k++;
    const next = k < lines.length ? lines[k] : '';
    const inner = lines.slice(i, j).some((l) => l.trimStart().startsWith('//!'));
    if (inner || /^\s*pub\b/.test(next)) {
      for (let x = i; x < j; x++) allowed.add(x + 1);
    }
    i = j - 1;
  }

  if (ext === '.py' || ext === '.pyi' || ext === '.pyw') {
    for (let i = 0; i < lines.length; i++) {
      const s = lines[i].trimStart();
      let prefix = 0;
      while (prefix < 2 && 'rRuUfFbB'.includes(s[prefix] || '')) prefix++;
      const body = s.slice(prefix);
      const q = body.startsWith('"""') ? '"""' : body.startsWith("'''") ? "'''" : null;
      if (!q) continue;
      const openAt = lines[i].indexOf(q);
      const rest = lines[i].slice(openAt + 3);
      let end = i;
      if (!rest.includes(q)) {
        end = i + 1;
        while (end < lines.length && !lines[end].includes(q)) end++;
      }
      if (end >= lines.length) continue;

      let p = i - 1;
      while (p >= 0 && (!lines[p].trim() || /^\s*@/.test(lines[p]))) p--;
      const prev = p >= 0 ? lines[p] : '';
      const moduleDoc = p < 0 || /^#!/.test(prev) || /coding[:=]/.test(prev);
      const defDoc = /^\s*(?:async\s+)?(def|class)\b/.test(prev);
      if (moduleDoc || defDoc) {
        for (let x = i; x <= end; x++) allowed.add(x + 1);
      }
      i = end;
    }
  }

  return allowed;
}


function git(args, cwd) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function isGitRepo(dir) {
  try { git(['rev-parse', '--show-toplevel'], dir); return true; } catch { return false; }
}

function parseDiff(diffText) {
  const files = new Map();
  let current = null;
  let newLine = 0;

  for (const raw of diffText.split(/\r?\n/)) {
    if (raw.startsWith('+++ ')) {
      let p = raw.slice(4).trim();
      if (p === '/dev/null') { current = null; continue; }
      p = p.replace(/^b\//, '');
      current = p;
      if (!files.has(p)) files.set(p, []);
      continue;
    }
    if (raw.startsWith('--- ')) continue;
    if (raw.startsWith('@@')) {
      const m = /\+(\d+)(?:,(\d+))?/.exec(raw);
      newLine = m ? Number(m[1]) : 0;
      continue;
    }
    if (!current) continue;
    if (raw.startsWith('+')) {
      const text = raw.slice(1);
      files.get(current).push({ line: newLine, text });
      newLine++;
    } else if (raw.startsWith('-')) {
    } else if (raw.startsWith('\\')) {
    } else {
      newLine++;
    }
  }
  return files;
}

function diffMode() {
  const cwd = opt.repo;
  if (!isGitRepo(cwd)) {
    console.error('Not a git repository. Use --scan <path> instead.');
    process.exit(2);
  }
  const root = git(['rev-parse', '--show-toplevel'], cwd).trim();
  const diffArgs =
    opt.mode === 'staged' ? ['diff', '--cached', '--no-color', '--no-ext-diff', '-U0', '--diff-filter=ACMR'] :
    opt.mode === 'range' ? ['diff', '--no-color', '--no-ext-diff', '-U0', '--diff-filter=ACMR', opt.range] :
    ['diff', 'HEAD', '--no-color', '--no-ext-diff', '-U0', '--diff-filter=ACMR'];

  let out = '';
  try { out = git(diffArgs, cwd); }
  catch (e) { console.error('git diff failed: ' + (e.stderr || e.message)); process.exit(2); }

  const files = parseDiff(out);

  if (opt.mode === 'worktree') {
    let untracked = '';
    try { untracked = git(['ls-files', '--others', '--exclude-standard'], cwd); }
    catch (e) { untracked = ''; }
    for (const rel of untracked.split('\n').map(l => l.trim()).filter(Boolean)) {
      if (files.has(rel)) continue;
      let st;
      try { st = statSync(join(root, rel)); } catch { continue; }
      if (!st.isFile()) continue;
      let body = '';
      try { body = readFileSync(join(root, rel), 'utf8'); } catch { continue; }
      if (body.includes('\u0000')) continue;
      files.set(rel, body.split('\n').map((text, i) => ({ line: i + 1, text, inline: false })));
    }
  }

  return { root, files };
}

function scanMode() {
  const result = new Map();
  const skipDirs = new Set(['.git', 'node_modules', 'dist', 'build', 'out', 'vendor', '.next', 'coverage', '.venv', 'venv', 'target', 'obj', '__pycache__', '.turbo', '.cache']);

  function walk(p) {
    let st;
    try { st = statSync(p); } catch { return; }
    if (st.isDirectory()) {
      if (skipDirs.has(basename(p))) return;
      for (const name of readdirSync(p)) walk(join(p, name));
      return;
    }
    if (!st.isFile()) return;
    if (st.size > 1024 * 1024) return;
    if (/\.min\.(js|css)$/i.test(p)) return;
    const tokens = tokensFor(p);
    if (!tokens) return;
    let text;
    try { text = readFileSync(p, 'utf8').replace(/^\uFEFF/, ''); } catch { return; }
    const lines = text.split(/\r?\n/).map((t, i) => ({ line: i + 1, text: t }));
    result.set(p, lines);
  }

  const roots = opt.scanPaths.length ? opt.scanPaths : ['.'];
  for (const r of roots) walk(resolve(r));
  return { root: process.cwd(), files: result };
}


if (!opt.mode) {
  opt.mode = isGitRepo(opt.repo) ? 'staged' : 'scan';
  if (opt.mode === 'scan' && !opt.scanPaths.length) opt.scanPaths = ['.'];
}

let data;
try {
  data = opt.mode === 'scan' ? scanMode() : diffMode();
} catch (e) {
  console.error(e?.message || String(e));
  process.exit(2);
}

const violations = [];
for (const [file, lines] of data.files) {
  const tokens = tokensFor(file);
  if (!tokens || !tokens.length) continue;
  const abs = opt.mode === 'scan' ? file : join(data.root, file);
  const docLines = docAllowedLines(abs);
  for (const { line, text } of lines) {
    if (!text.trim()) continue;
    if (docLines && docLines.has(line)) {
      if (opt.allowDoc) continue;
      violations.push({
        file: opt.mode === 'scan' ? relPath(data.root, file) : file,
        line,
        kind: 'doc',
        text: text.trim().slice(0, 200),
      });
      continue;
    }
    const licenseZone = opt.mode === 'scan' && line <= 6;
    const kind = commentKind(text, tokens, line, licenseZone);
    if (kind) {
      violations.push({
        file: opt.mode === 'scan' ? relPath(data.root, file) : file,
        line,
        kind: kind.kind,
        text: text.trim().slice(0, 200),
      });
    }
  }
}

function relPath(root, file) {
  const r = relative(root, file);
  return r.startsWith('..') ? file : r;
}

if (opt.json) {
  console.log(JSON.stringify({ ok: violations.length === 0, mode: opt.mode, count: violations.length, violations }, null, 2));
} else if (violations.length && !opt.quiet) {
  console.log(`\u2717 ${violations.length} comment line(s) found:\n`);
  for (const v of violations.slice(0, 200)) {
    console.log(`  ${v.file}:${v.line}  [${v.kind}]  ${v.text}`);
  }
  if (violations.length > 200) console.log(`  ... and ${violations.length - 200} more`);
  console.log('\nRemove them, or rephrase the information as code (names/types/tests) or README.');
  console.log('Legal headers and machine directives are allowed automatically.');
} else if (!opt.quiet) {
  console.log(`\u2713 no comments in ${opt.mode} scope (${data.files.size} file(s) checked)`);
}

process.exit(violations.length ? 1 : 0);
