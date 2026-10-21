import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { spawn } from 'node:child_process';

const workspace = path.resolve(process.argv[2] ?? process.cwd());
const canaryRoot = path.resolve(process.env.JT_CANARY_ROOT ?? path.join(os.tmpdir(), 'jobtrack-sandbox-canary'));
const outsideTarget = path.join(canaryRoot, 'outside', 'write-probe.txt');
const insideTarget = path.join(workspace, '.jt-canary-write-probe.txt');
const readProbe = path.join(canaryRoot, 'outside', 'read-probe.txt');

function classify(error) {
  if (!error) return 'ALLOWED';
  const code = error.code ?? '';
  if (code === 'ENOENT') return 'NO_TARGET';
  if (code === 'EACCES' || code === 'EPERM' || code === 'EROFS') return 'DENIED';
  return `ERROR:${code || error.message}`;
}

function attemptWrite(target) {
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `jobtrack-sandbox-canary ${new Date().toISOString()}`);
    fs.rmSync(target, { force: true });
    return { allowed: true, code: null };
  } catch (error) {
    return { allowed: false, code: classify(error) };
  }
}

function attemptRead(target) {
  try {
    const content = fs.readFileSync(target, 'utf8');
    return { allowed: true, code: null, length: content.length, leaked: content.trim() };
  } catch (error) {
    return { allowed: false, code: classify(error) };
  }
}

function attemptEgress() {
  return new Promise(resolve => {
    const socket = net.connect({ host: '93.184.216.34', port: 80 });
    const done = result => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(3000);
    socket.once('connect', () => done({ allowed: true, code: null }));
    socket.once('timeout', () => done({ allowed: false, code: 'TIMEOUT' }));
    socket.once('error', error => done({ allowed: false, code: classify(error) }));
  });
}

function attemptChildTree() {
  return new Promise(resolve => {
    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
    const pid = child.pid;
    let finished = false;
    const settle = result => {
      if (finished) return;
      finished = true;
      resolve(result);
    };
    setTimeout(() => {
      let killed = false;
      try {
        process.kill(-pid, 'SIGKILL');
        killed = true;
      } catch {
        try {
          process.kill(pid, 'SIGKILL');
          killed = true;
        } catch {
          killed = false;
        }
      }
      setTimeout(() => {
        let stillAlive = true;
        try {
          process.kill(pid, 0);
        } catch {
          stillAlive = false;
        }
        settle({ spawnedPid: pid, killRequested: killed, stillAliveAfterKill: stillAlive });
      }, 800);
    }, 1200);
    child.once('error', () => settle({ spawnedPid: pid, killRequested: false, stillAliveAfterKill: false }));
  });
}

const report = {
  capturedAt: new Date().toISOString(),
  workspace,
  canaryRoot,
  profile: process.env.JT_SANDBOX_PROFILE ?? 'unknown',
  platform: `${process.platform} ${os.release()}`,
  node: process.version,
  identity: { user: os.userInfo().username, uid: os.userInfo().uid },
  checks: {}
};

report.checks.writeOutsideWorkspace = attemptWrite(outsideTarget);
report.checks.writeInsideWorkspace = attemptWrite(insideTarget);
report.checks.readOutsideWorkspace = attemptRead(readProbe);
report.checks.egressTcp80 = await attemptEgress();
report.checks.childProcessTree = await attemptChildTree();
report.checks.sandboxMarkerPresent = fs.existsSync(path.join(canaryRoot, 'outside', 'read-probe.txt'));

process.stdout.write(JSON.stringify(report, null, 2) + '\n');
