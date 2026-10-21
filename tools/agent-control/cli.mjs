import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { AgentController } from './controller.mjs';
import { assertSafeCommand } from './policy.mjs';

const root = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '../..'));
const args = process.argv.slice(2);
const option = name => args.indexOf(name) < 0 ? undefined : args[args.indexOf(name) + 1];
const read = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const controller = new AgentController(root);

try {
  let result;
  switch (args[0]) {
    case 'doctor':
      result = { repository: controller.git(root, ['rev-parse', '--show-toplevel']), head: controller.git(root, ['rev-parse', 'HEAD']), features: ['web', 'api', 'extension', 'mcp', 'contracts'], sandbox: await controller.sandboxProbe(), liveWorkersVerified: false, safety: 'Read-only workers, scoped patch broker, local commits only. Hostile actors require OS/container isolation.' };
      break;
    case 'prepare': result = controller.prepare(read(option('--task'))); break;
    case 'status': result = controller.status(); break;
    case 'apply': result = controller.apply(option('--id'), read(option('--changes'))); break;
    case 'check': result = await controller.check(option('--id')); break;
    case 'commit': result = controller.commit(option('--id')); break;
    case 'abandon': result = controller.abandon(option('--id')); break;
    case 'run': result = await controller.run(read(option('--task'))); break;
    case 'dispatch': {
      const tasks = option('--tasks').split(',').map(read);
      const limit = Number(option('--concurrency') || 2);
      if (!Number.isInteger(limit) || limit < 1 || limit > 3 || tasks.length > 20) throw Error('Concurrency1–3 and at most20tasks.');
      tasks.forEach(task => controller.validateTask(task));
      if (new Set(tasks.map(task => task.id)).size !== tasks.length || new Set(tasks.map(task => task.feature)).size !== tasks.length) throw Error('Parallel tasks need unique ids and separate feature lanes.');
      if (tasks.some(task => task.dependencies.some(id => tasks.some(candidate => candidate.id === id)))) throw Error('Integrate dependencies before dispatching dependent work.');
      const pending = [...tasks];
      result = [];
      await Promise.all(Array.from({ length: limit }, async () => { while (pending.length) result.push(await controller.run(pending.shift())); }));
      break;
    }
    case 'guard': result = { allowed: assertSafeCommand(read(option('--argv'))) !== false }; break;
    default: throw Error('Use doctor|prepare|status|apply|check|commit|run|dispatch|guard|abandon.');
  }
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  if (result?.status?.startsWith('blocked') || Array.isArray(result) && result.some(r => r.status?.startsWith('blocked'))) process.exitCode = 1;
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
