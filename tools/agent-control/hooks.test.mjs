import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./claude-hook.mjs', import.meta.url));
const hook = command => spawnSync(process.execPath, [script], { input: JSON.stringify({ tool_input: { command } }), encoding: 'utf8', windowsHide: true, shell: false });

test('Claude hook allows simple version/status reads', () => {
  assert.equal(hook('rtk proxy node --version').status, 0);
  assert.equal(hook('rtk git status').status, 0);
});

test('Claude hook blocks dangerous commands, shell chaining and executable wrappers', () => {
  for (const command of ['git push origin main', 'git reset --hard', 'git clean -fd', 'git branch -D main', 'git restore .', 'git checkout .', 'node -e require(x)', 'powershell Remove-Item -Recurse x', 'rtk git status; git push', 'rtk git status\ngit clean -f', 'rtk proxy powershell -Command x']) {
    const result = hook(command);
    assert.equal(result.status, 2, command);
    assert.match(result.stderr, /BLOCKED/);
  }
});
