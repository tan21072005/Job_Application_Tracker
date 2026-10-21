import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import crypto from 'node:crypto';

const config = JSON.parse(Buffer.from(process.env.JT_PROBE_CONFIG ?? '', 'base64').toString('utf8'));
const REQUIRED_READ_TARGETS = ['host-repo-read', 'common-git-read', 'control-state-read', 'host-credential-read'];
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const output = { checks: {}, observations: {} };

const record = (name, value) => { output.checks[name] = value; };

const readTarget = target => {
  try {
    const content = fs.readFileSync(target);
    return { ok: true, bytes: content.length, sha256: sha256(content) };
  } catch (error) {
    return { ok: false, code: error.code ?? 'UNKNOWN' };
  }
};

const writeTarget = (target, text) => {
  try {
    fs.writeFileSync(target, text);
    return { ok: true };
  } catch (error) {
    return { ok: false, code: error.code ?? 'UNKNOWN' };
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

const readMounts = () => {
  try {
    const raw = fs.readFileSync('/proc/self/mountinfo', 'utf8');
    return raw.split('\n').filter(Boolean).map(line => {
      const parts = line.split(' ');
      return { root: parts[3] ?? null, mountPoint: parts[4] ?? null, options: parts[5] ?? null };
    }).filter(entry => ['/projection', '/scratch', '/fixtures', '/candidate'].includes(entry.mountPoint));
  } catch {
    return [];
  }
};

const main = async () => {
  const manifestEntries = Array.isArray(config.manifest) ? config.manifest : [];
  const projectionRead = manifestEntries.map(entry => ({
    path: entry.path,
    result: readTarget(path.join(config.projectionTarget, entry.path))
  }));
  const projectionReadable = manifestEntries.length > 0 && projectionRead.every(item => {
    const expected = manifestEntries.find(entry => entry.path === item.path);
    return item.result.ok && item.result.sha256 === expected.sha256;
  });
  record('projection-read', { allowed: projectionReadable, checked: projectionRead.length });
  output.observations.projectionRead = { outcome: projectionReadable ? 'allowed' : 'denied', files: projectionRead.length, hashMatched: projectionReadable };

  const scratchProbe = writeTarget(path.join(config.scratchTarget, '.isolation-probe'), 'probe');
  record('scratch-write', { allowed: scratchProbe.ok, code: scratchProbe.code ?? null });
  output.observations.scratchWrite = { outcome: scratchProbe.ok ? 'allowed' : 'denied', code: scratchProbe.code ?? null };

  const projectionWrite = writeTarget(path.join(config.projectionTarget, manifestEntries[0]?.path ?? '.probe'), 'x');
  record('projection-write', { allowed: projectionWrite.ok, code: projectionWrite.code ?? null });
  output.observations.projectionWrite = { outcome: projectionWrite.ok ? 'allowed' : 'denied', code: projectionWrite.code ?? null };

  const hostPaths = Array.isArray(config.hostPaths) ? config.hostPaths : [];
  const hostResults = hostPaths.map(entry => ({
    targetId: entry.targetId ?? null,
    hostPath: entry.hostPath ?? null,
    containerPath: entry.containerPath ?? null,
    result: readTarget(entry.containerPath ?? '/host-nonexistent')
  }));
  for (const entry of hostResults) {
    if (!entry.targetId) continue;
    const absent = !entry.result.ok && entry.result.code === 'ENOENT';
    record(entry.targetId, { allowed: entry.result.ok, code: entry.result.code ?? null, absent });
  }
  for (const targetId of REQUIRED_READ_TARGETS) {
    if (!output.checks[targetId]) record(targetId, { allowed: false, code: 'NOT_PROBED', absent: false });
  }
  output.observations.hostPaths = hostResults.map(entry => ({
    targetId: entry.targetId,
    hostPath: entry.hostPath,
    containerPath: entry.containerPath,
    outcome: entry.result.ok ? 'allowed' : 'absent',
    code: entry.result.code ?? null
  }));

  const hostWriteEntry = hostPaths.find(entry => entry.targetId === 'host-write') ?? hostPaths[hostPaths.length - 1];
  const hostWrite = writeTarget(hostWriteEntry?.containerPath ?? '/host-nonexistent', 'x');
  record('host-write', { allowed: hostWrite.ok, code: hostWrite.code ?? null, absent: !hostWrite.ok && hostWrite.code === 'ENOENT' });
  output.observations.hostWrite = { outcome: hostWrite.ok ? 'allowed' : 'absent', code: hostWrite.code ?? null };

  const liveness = await runLiveness();
  record('child-liveness', { stillAliveAfterKill: liveness.after.child });
  record('grandchild-liveness', { stillAliveAfterKill: liveness.after.grandchild });
  output.observations.liveness = [
    { processId: String(liveness.spawnedPid), generation: 'child', before: liveness.before.child, after: liveness.after.child },
    { processId: String(liveness.grandchildPid ?? ''), generation: 'grandchild', before: liveness.before.grandchild, after: liveness.after.grandchild }
  ];

  if (config.modelEndpoint) {
    const transport = await connect(config.modelEndpoint, config.timeoutMs ?? 3000);
    record('transport-positive', {
      allowed: transport.connected,
      code: transport.code ?? null,
      mediatedByBroker: transport.connected === false
    });
    output.observations.transport = {
      endpoint: config.modelEndpoint,
      directConnected: transport.connected,
      code: transport.code ?? null,
      mediation: 'broker-scratch-channel'
    };
  } else {
    record('transport-positive', { allowed: false, code: 'NO_ENDPOINT', mediatedByBroker: true });
    output.observations.transport = { endpoint: null, directConnected: false, code: 'NO_ENDPOINT', mediation: 'broker-scratch-channel' };
  }

  if (config.generalEgressEndpoint) {
    const egress = await connect(config.generalEgressEndpoint, config.timeoutMs ?? 3000);
    record('transport-general-egress', { allowed: egress.connected, code: egress.code ?? null });
    output.observations.generalEgress = { outcome: egress.connected ? 'allowed' : 'denied', code: egress.code ?? null };
  } else {
    record('transport-general-egress', { allowed: false, code: 'NO_ENDPOINT' });
    output.observations.generalEgress = { outcome: 'denied', code: 'NO_ENDPOINT' };
  }

  output.observations.containerMounts = readMounts();

  process.stdout.write(JSON.stringify(output));
};

main().catch(error => {
  process.stdout.write(JSON.stringify({ error: String(error && error.message ? error.message : error) }));
  process.exitCode = 1;
});
