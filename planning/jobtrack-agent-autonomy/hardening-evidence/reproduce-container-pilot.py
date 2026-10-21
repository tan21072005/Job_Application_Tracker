import json
import socket
import subprocess
import uuid
from pathlib import Path

base = Path(r'D:\Long-term')
run_root = base / ('JobTrack-isolation-pilot-' + uuid.uuid4().hex[:12])
if not base.is_dir() or run_root.parent.resolve() != base.resolve():
    raise SystemExit('Unexpected isolation storage root')
run_root.mkdir()
projection = run_root / 'projection'
scratch = run_root / 'scratch'
projection.mkdir()
scratch.mkdir()
marker = projection / 'module.js'
marker.write_text('export const jobtrackPilot = true;\n', encoding='utf-8')
outside = run_root / 'host-only-fixture.txt'
outside.write_text('synthetic-public-canary-marker\n', encoding='utf-8')
canary = r'''
import fs from 'node:fs';
import net from 'node:net';
import { spawn } from 'node:child_process';
const attempt = action => { try { action(); return { success: true }; } catch (error) { return { success: false, code: error.code }; } };
const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const grandchildCode = 'setInterval(() => {}, 1000)';
const childCode = `const {spawn}=require('node:child_process');const c=spawn(process.execPath,['-e',${JSON.stringify(grandchildCode)}],{stdio:'ignore'});c.once('spawn',()=>process.stdout.write(JSON.stringify({grandchildPid:c.pid})+String.fromCharCode(10)));setInterval(()=>{},1000);`;
const child = spawn(process.execPath, ['-e', childCode], { detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
let childError = '';
child.stderr.on('data', bytes => { childError = (childError + String(bytes)).slice(-2000); });
const tree = await new Promise(resolve => {
  let settled = false;
  const done = result => { if (!settled) { settled = true; clearTimeout(timer); resolve(result); } };
  const timer = setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL'); } catch {} done({ error: 'child readiness timeout', childError }); }, 4000);
  child.once('error', error => done({ error: error.code }));
  child.stdout.once('data', async bytes => {
    try {
      const { grandchildPid } = JSON.parse(String(bytes));
      const result = { spawnedPid: child.pid, grandchildPid, childAliveBeforeKill: alive(child.pid), grandchildAliveBeforeKill: alive(grandchildPid) };
      process.kill(-child.pid, 'SIGKILL');
      result.killRequested = true;
      for (let attempt = 0; attempt < 30 && (alive(child.pid) || alive(grandchildPid)); attempt++) await wait(50);
      result.stillAliveAfterKill = alive(child.pid);
      result.grandchildAliveAfterKill = alive(grandchildPid);
      done(result);
    } catch (error) { try { process.kill(-child.pid, 'SIGKILL'); } catch {} done({ error: error.message }); }
  });
});
const network = await new Promise(resolve => {
  const socket = net.connect({ host: '1.1.1.1', port: 443 });
  const done = result => { socket.removeAllListeners(); socket.destroy(); resolve(result); };
  socket.once('connect', () => done({ connected: true }));
  socket.once('error', error => done({ connected: false, code: error.code }));
  socket.setTimeout(3000, () => done({ connected: false, code: 'TIMEOUT' }));
});
console.log(JSON.stringify({
  uid: process.getuid(),
  projectionRead: attempt(() => fs.readFileSync('/projection/module.js')),
  projectionWrite: attempt(() => fs.writeFileSync('/projection/forbidden.txt', 'probe')),
  scratchWrite: attempt(() => fs.writeFileSync('/scratch/probe.txt', 'probe')),
  rootWrite: attempt(() => fs.writeFileSync('/forbidden.txt', 'probe')),
  hostNamespacePaths: Object.fromEntries(['/mnt/d/Project/Job_Application_Tracker', '/run/desktop/mnt/host/d/Project/Job_Application_Tracker', '/var/run/docker.sock', '/host'].map(path => [path, attempt(() => fs.readdirSync(path))])),
  tree,
  network
}));
'''
(projection / 'canary.mjs').write_text(canary, encoding='utf-8')
image = 'node@sha256:44fce696f38ba8c987c4db89954051000bbd05ffd8d8659ba15ed4a8602e937f'
name = 'jobtrack-isolation-pilot-' + uuid.uuid4().hex[:12]
def docker(*args, timeout=30):
    return subprocess.run(['rtk', 'proxy', 'docker', *args], capture_output=True, text=True, timeout=timeout, check=True).stdout.strip()
host_network = {'endpoint': '1.1.1.1:443', 'connected': False}
try:
    with socket.create_connection(('1.1.1.1', 443), timeout=5):
        host_network['connected'] = True
except OSError as error:
    host_network['code'] = type(error).__name__
container_id = docker('create', '--name', name, '--pull=never', '--init', '--network=none', '--read-only', '--user=65534:65534', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--pids-limit=64', '--memory=128m', '--cpus=0.5', '--mount', f'type=bind,source={projection},target=/projection,readonly', '--mount', f'type=bind,source={scratch},target=/scratch', '--workdir=/scratch', image, 'node', '/projection/canary.mjs')
if len(container_id) != 64 or any(c not in '0123456789abcdef' for c in container_id):
    raise SystemExit('Unexpected container identity')
try:
    configuration = json.loads(docker('inspect', '--format', '{{json .}}', container_id))
    host_config = configuration['HostConfig']
    mounts = configuration['Mounts']
    if host_config['NetworkMode'] != 'none' or not host_config['ReadonlyRootfs'] or host_config['Privileged'] or configuration['Config']['User'] != '65534:65534':
        raise SystemExit('Container security configuration mismatch')
    if sorted((m['Destination'], m['RW']) for m in mounts) != [('/projection', False), ('/scratch', True)]:
        raise SystemExit('Unexpected container mount')
    expected_sources = {'/projection': projection.resolve(), '/scratch': scratch.resolve()}
    if any(Path(m['Source']).resolve() != expected_sources[m['Destination']] for m in mounts):
        raise SystemExit('Unexpected container mount source')
    if host_config['CapDrop'] != ['ALL'] or 'no-new-privileges' not in host_config['SecurityOpt']:
        raise SystemExit('Container capabilities or privilege restriction mismatch')
    output = docker('start', '--attach', container_id, timeout=20)
    observed = json.loads(output.splitlines()[-1])
    report = {
        'kind': 'pilot-only-not-readiness-receipt',
        'image': image,
        'containerId': container_id,
        'storage': str(run_root),
        'mounts': [{'destination': m['Destination'], 'writable': m['RW'], 'source': m['Source']} for m in mounts],
        'hostPositiveControl': host_network,
        'observed': observed,
        'projectionBytesUnchanged': marker.read_text(encoding='utf-8') == 'export const jobtrackPilot = true;\n',
        'modelTransportVerified': False,
        'readinessReceiptIssued': False,
        'limitations': ['Synthetic projection only; no product source or credentials mounted.', 'Namespace absence is recorded as ENOENT, not relabeled as filesystem access denial.', 'No model transport allowlist or production worker exercised.'],
    }
finally:
    state = json.loads(docker('inspect', '--format', '{{json .State}}', container_id))
    if state['Running']:
        docker('kill', container_id)
    docker('rm', container_id)
    if docker('ps', '--all', '--no-trunc', '--filter', 'id=' + container_id, '--format', '{{.ID}}'):
        raise SystemExit('Owned pilot container remains after cleanup; no final evidence published')
report['ownedContainerCleanupVerified'] = True
(run_root / 'PILOT-EVIDENCE.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
Path(r'D:\Project\Job_Application_Tracker\.agent-state\CONTAINER-PILOT-LATEST.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report, indent=2))
