import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

const config = JSON.parse(Buffer.from(process.env.JT_PROBE_CONFIG ?? '', 'base64').toString('utf8'));
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const output = { checks: {}, observations: {} };

const record = (name, value) => { output.checks[name] = value; };

const readTarget = (target, kind) => {
  try {
    const content = fs.readFileSync(target);
    return { ok: true, kind, bytes: content.length, sha256: sha256(content) };
  } catch (error) {
    return { ok: false, kind, code: error.code ?? 'UNKNOWN' };
  }
};

const writeTarget = (target, text) => {
  try {
    fs.writeFileSync(target, text);
    return { ok: true, kind: 'write' };
  } catch (error) {
    return { ok: false, kind: 'write', code: error.code ?? 'UNKNOWN' };
  }
};

const connect = (endpoint, timeoutMs) => new Promise(resolve => {
  let host = endpoint;
  let port = 443;
  const match = /^(?:https?:\/\/)?([^/:]+)(?::(\d+))?/i.exec(endpoint);
  if (match) {
    host = match[1];
    port = match[2] ? Number(match[2]) : 443;
  }
  const socket = net.connect({ host, port });
  const settle = result => { socket.removeAllListeners(); socket.destroy(); resolve(result); };
  socket.setTimeout(timeoutMs);
  socket.once('connect', () => settle({ connected: true }));
  socket.once('timeout', () => settle({ connected: false, code: 'TIMEOUT' }));
  socket.once('error', error => settle({ connected: false, code: error.code ?? 'ERROR' }));
});

const alive = pid => {
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
    const state = stat.slice(stat.lastIndexOf(')') + 2).trim().split(' ')[0];
    return state !== 'Z';
  } catch {
    return false;
  }
};

const childProgram = `
  const { spawn } = require('node:child_process');
  const grandchild = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
  process.stdout.write(String(grandchild.pid));
  setInterval(() => {}, 1000);
`;

const runLiveness = async () => {
  const child = spawn(process.execPath, ['-e', childProgram], { stdio: ['ignore', 'pipe', 'ignore'], detached: true });
  const grandchildPid = await new Promise(resolve => {
    let buffer = '';
    const timer = setTimeout(() => resolve(''), 4000);
    child.stdout.on('data', chunk => {
      buffer += chunk.toString();
      if (/^\d+$/.test(buffer.trim())) { clearTimeout(timer); resolve(buffer.trim()); }
    });
    child.once('error', () => { clearTimeout(timer); resolve(''); });
  });
  const childPid = child.pid;
  const before = { child: alive(childPid), grandchild: grandchildPid ? alive(Number(grandchildPid)) : false };
  let killRequested = false;
  try {
    process.kill(-childPid, 'SIGKILL');
    killRequested = true;
  } catch {
    try { process.kill(childPid, 'SIGKILL'); killRequested = true; } catch { killRequested = false; }
  }
  await new Promise(resolve => setTimeout(resolve, 800));
  const after = { child: alive(childPid), grandchild: grandchildPid ? alive(Number(grandchildPid)) : false };
  return { spawnedPid: childPid, grandchildPid: grandchildPid ? Number(grandchildPid) : null, before, killRequested, after };
};

const main = async () => {
  const manifestEntries = Array.isArray(config.manifest) ? config.manifest : [];
  const projectionRead = manifestEntries.map(entry => ({
    path: entry.path,
    result: readTarget(path.join(config.projectionTarget, entry.path), 'read')
  }));
  const projectionReadable = projectionRead.length > 0 && projectionRead.every(item => item.result.ok && item.result.sha256 === manifestEntries.find(entry => entry.path === item.path).sha256);
  record('projection-read', { allowed: projectionReadable, checked: projectionRead.length });
  output.observations.projectionRead = { outcome: projectionReadable ? 'allowed' : 'denied', files: projectionRead.length, hashMatched: projectionReadable };

  const scratchProbe = writeTarget(path.join(config.scratchTarget, '.isolation-probe'), 'probe');
  record('scratch-write', { allowed: scratchProbe.ok, code: scratchProbe.code ?? null });
  output.observations.scratchWrite = { outcome: scratchProbe.ok ? 'allowed' : 'denied', code: scratchProbe.code ?? null };

  const projectionWrite = writeTarget(path.join(config.projectionTarget, manifestEntries[0]?.path ?? '.probe'), 'x');
  const projectionWriteDenied = !projectionWrite.ok;
  record('projection-write', { allowed: projectionWrite.ok, code: projectionWrite.code ?? null });
  output.observations.projectionWrite = { outcome: projectionWriteDenied ? 'denied' : 'allowed', code: projectionWrite.code ?? null };

  const hostReads = (config.hostPaths ?? []).map(hostPath => ({ hostPath, result: readTarget(hostPath.containerPath, 'read') }));
  const hostAbsent = hostReads.length > 0 && hostReads.every(item => !item.result.ok && item.result.code === 'ENOENT');
  record('host-repo-read', { allowed: false, code: hostAbsent ? 'ENOENT' : 'INCONSISTENT' });
  output.observations.hostPaths = hostReads.map(item => ({ hostPath: item.hostPath.hostPath, containerPath: item.hostPath.containerPath, outcome: item.result.ok ? 'allowed' : 'absent', code: item.result.code ?? null }));

  const hostWrite = writeTarget((config.hostPaths ?? [])[0]?.containerPath ?? '/host-nonexistent', 'x');
  record('host-write', { allowed: hostWrite.ok, code: hostWrite.code ?? null });
  output.observations.hostWrite = { outcome: hostWrite.ok ? 'allowed' : 'absent', code: hostWrite.code ?? null };

  const liveness = await runLiveness();
  record('child-liveness', { stillAliveAfterKill: liveness.after.child });
  record('grandchild-liveness', { stillAliveAfterKill: liveness.after.grandchild });
  output.observations.liveness = [
    { processId: String(liveness.spawnedPid), generation: 'child', before: liveness.before.child, after: liveness.after.child },
    { processId: String(liveness.grandchildPid ?? ''), generation: 'grandchild', before: liveness.before.grandchild, after: liveness.after.grandchild }
  ];

  if (config.generalEgressEndpoint) {
    const egress = await connect(config.generalEgressEndpoint, config.timeoutMs ?? 3000);
    record('transport-general-egress', { allowed: egress.connected, code: egress.code ?? null });
    output.observations.generalEgress = { outcome: egress.connected ? 'allowed' : 'denied', code: egress.code ?? null };
  }
  if (config.modelEndpoint) {
    const transport = await connect(config.modelEndpoint, config.timeoutMs ?? 3000);
    record('transport-positive', { allowed: transport.connected, code: transport.code ?? null });
    output.observations.transport = { endpoint: config.modelEndpoint, positiveConnected: transport.connected, code: transport.code ?? null };
  }

  process.stdout.write(JSON.stringify(output));
};

main().catch(error => {
  process.stdout.write(JSON.stringify({ error: String(error && error.message ? error.message : error) }));
  process.exitCode = 1;
});
