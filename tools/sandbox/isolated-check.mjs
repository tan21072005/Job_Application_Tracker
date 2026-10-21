import fs from 'node:fs';
import path from 'node:path';

const candidate = process.env.CANDIDATE_ROOT ?? '/candidate';
const scratch = process.env.SCRATCH_ROOT ?? '/scratch';
const fixtures = process.env.FIXTURE_ROOT ?? '/fixtures';
const result = { candidateRead: null, candidateWrite: null, fixtureRead: null, scratchWrite: null, hostWrite: null, environment: {} };

const readFirst = (root) => {
  const walk = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        const nested = walk(full);
        if (nested) return nested;
      } else {
        return full;
      }
    }
    return null;
  };
  return walk(root);
};

try {
  const first = readFirst(candidate);
  result.candidateRead = first ? { ok: true, bytes: fs.readFileSync(first).length } : { ok: false, code: 'EMPTY' };
} catch (error) {
  result.candidateRead = { ok: false, code: error.code ?? 'UNKNOWN' };
}

try {
  const first = readFirst(candidate);
  fs.writeFileSync(first ?? path.join(candidate, '.probe'), 'x');
  result.candidateWrite = { ok: true };
} catch (error) {
  result.candidateWrite = { ok: false, code: error.code ?? 'UNKNOWN' };
}

try {
  const first = readFirst(fixtures);
  result.fixtureRead = first ? { ok: true, bytes: fs.readFileSync(first).length } : { ok: false, code: 'EMPTY' };
} catch (error) {
  result.fixtureRead = { ok: false, code: error.code ?? 'UNKNOWN' };
}

try {
  const target = path.join(scratch, '.check-probe');
  fs.writeFileSync(target, 'x');
  result.scratchWrite = { ok: true };
} catch (error) {
  result.scratchWrite = { ok: false, code: error.code ?? 'UNKNOWN' };
}

const hostProbeTarget = process.env.HOST_PROBE_PATH || '/host-probe';
try {
  fs.writeFileSync(hostProbeTarget, 'x');
  result.hostWrite = { ok: true, target: hostProbeTarget };
} catch (error) {
  result.hostWrite = { ok: false, code: error.code ?? 'UNKNOWN', target: hostProbeTarget };
}

for (const key of Object.keys(process.env).sort()) {
  if (/DATABASE|PG|API_KEY|SECRET|PASSWORD|TOKEN|NODE_OPTIONS/i.test(key)) result.environment[key] = 'present';
}

process.stdout.write(JSON.stringify(result));
