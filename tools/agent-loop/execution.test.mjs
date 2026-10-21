import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { execute } from './runner.mjs';

const fixturePath = fileURLToPath(import.meta.url);
const mode = process.argv[2];

if (mode === 'descendant') {
  const heartbeatPath = process.argv[3];
  setInterval(() => writeFileSync(heartbeatPath, String(Date.now())), 40);
} else if (mode === 'wrapper') {
  const [, , , pidPath, heartbeatPath] = process.argv;
  const descendant = spawn(process.execPath, [fixturePath, 'descendant', heartbeatPath], {
    windowsHide: true,
    stdio: 'ignore',
  });
  writeFileSync(pidPath, JSON.stringify({ wrapper: process.pid, descendant: descendant.pid }));
  setInterval(() => {}, 1_000);
} else {
  const waitFor = async (predicate, timeoutMs = 4_000) => {
    const deadline = Date.now() + timeoutMs;
    while (!predicate()) {
      if (Date.now() > deadline) throw Error('fixture did not reach expected state');
      await new Promise(resolve => setTimeout(resolve, 25));
    }
  };
  const isAlive = pid => {
    try { process.kill(pid, 0); return true; }
    catch (error) { if (error.code === 'ESRCH') return false; throw error; }
  };

  test('timeout kills the rtk command tree before settling', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'agent-loop-execution-'));
    const pidPath = join(dir, 'descendant.pid');
    const heartbeatPath = join(dir, 'heartbeat');
    const logPath = join(dir, 'execution.log');
    let wrapperPid, descendantPid;
    try {
      const run = execute(process.execPath, [fixturePath, 'wrapper', pidPath, heartbeatPath], {
        timeoutMs: 1_200,
        logPath,
      });
      await waitFor(() => existsSync(pidPath) && existsSync(heartbeatPath));
      ({ wrapper: wrapperPid, descendant: descendantPid } = JSON.parse(readFileSync(pidPath, 'utf8')));
      assert.ok(isAlive(descendantPid), 'nested process started before timeout');

      const result = await run;
      assert.equal(result.timedOut, true);
      assert.equal(result.error, '', 'process-tree termination must succeed before the runner advances');
      assert.notEqual(result.code, 0);
      assert.equal(typeof result.tail, 'string');
      assert.equal(result.logPath.endsWith('execution.log'), true);
      await waitFor(() => !isAlive(descendantPid));
      const heartbeat = readFileSync(heartbeatPath, 'utf8');
      await new Promise(resolve => setTimeout(resolve, 200));
      assert.equal(readFileSync(heartbeatPath, 'utf8'), heartbeat, 'runner did not advance while descendant was active');
    } finally {
      if (descendantPid && isAlive(descendantPid)) process.kill(descendantPid, 'SIGKILL');
      if (wrapperPid && isAlive(wrapperPid)) process.kill(wrapperPid, 'SIGKILL');
    }
  });
}
