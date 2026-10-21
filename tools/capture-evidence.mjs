#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(rootDir, 'apps', 'web', 'dist');
const evidenceDir = path.join(rootDir, 'output', 'evidence');

if (!fs.existsSync(distDir)) {
  console.error(`Dist directory does not exist: ${distDir}`);
  process.exit(1);
}
fs.mkdirSync(evidenceDir, { recursive: true });

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  const rawPath = (req.url || '/').split('?')[0];
  const relativePath = rawPath === '/' ? 'index.html' : rawPath.replace(/^\/+/, '');
  let filePath = path.join(distDir, relativePath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

await new Promise(resolve => server.listen(64365, '127.0.0.1', resolve));
console.log('Static preview server listening on http://127.0.0.1:64365');

const viewports = [
  { name: '320px', size: '320,640' },
  { name: '390px', size: '390,844' },
  { name: '768px', size: '768,1024' },
  { name: '1440px', size: '1440,900' }
];

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: true, stdio: 'inherit' });
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed with code ${code}`));
    });
    child.on('error', reject);
  });
}

try {
  for (const vp of viewports) {
    const outFile = path.join(evidenceDir, `responsive-${vp.name}.png`);
    console.log(`Capturing screenshot for viewport ${vp.name} (${vp.size}) -> ${outFile}...`);
    const args = [
      'playwright',
      'screenshot',
      '--channel', 'chrome',
      `--viewport-size="${vp.size}"`,
      '--wait-for-timeout', '1000',
      'http://127.0.0.1:64365',
      `"${outFile}"`
    ];
    await run('npx', args);
  }
  console.log('All responsive screenshots captured successfully.');
} finally {
  server.close();
}
