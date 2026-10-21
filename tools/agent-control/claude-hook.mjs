import { assertSafeCommand } from './policy.mjs';

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  input += chunk;
  if (input.length > 65_536) { process.stderr.write('BLOCKED: oversized hook payload\n'); process.exit(2); }
});
process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(input);
    const command = payload.tool_input?.command;
    if (typeof command !== 'string' || !command.trim() || /[\r\n"'`$;&|<>]/.test(command)) throw Error('Only simple read-only commands are allowed.');
    const argv = command.trim().split(/\s+/);
    if (argv[0] === 'rtk') { argv.shift(); if (argv[0] === 'proxy') argv.shift(); }
    assertSafeCommand(argv);
  } catch (error) { process.stderr.write(`BLOCKED: ${error.message}\n`); process.exitCode = 2; }
});
