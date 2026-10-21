import { readFileSync, writeFileSync } from 'node:fs';

export const REQUIRED_CHECKS = Object.freeze({
  readOutsideWorkspace: 'allowed',
  gitCommonDirHead: 'opened',
  gitCommonDirConfig: 'opened',
  credentialFileOpen: 'opened',
  accountsFileOpen: 'opened',
  siblingWorktreeList: 'listed',
  controlStateList: 'listed',
  homeCredentialList: 'listed',
  writeInsideWorkspace: 'allowed',
  writeOutsideWorkspace: 'allowed',
  childProcessTree: 'stillAliveAfterKill',
  egressTcp80: 'allowed'
});

function readOutcome(report, name) {
  const key = REQUIRED_CHECKS[name];
  const checks = report && typeof report === 'object' ? report.checks : null;
  if (!checks || typeof checks !== 'object') return { present: false, value: null };
  const entry = checks[name];
  if (!entry || typeof entry !== 'object') return { present: false, value: null };
  if (!(key in entry)) return { present: false, value: null };
  if (entry.code === 'NO_TARGET') return { present: false, value: null };
  const value = entry[key];
  if (typeof value !== 'boolean') return { present: false, value: null };
  if (typeof entry.code === 'string' && entry.code.startsWith('ERROR:')) return { present: false, value: null };
  if (value === false && name !== 'childProcessTree') {
    const deniedCodes = name === 'egressTcp80' ? ['DENIED', 'TIMEOUT'] : ['DENIED'];
    if (!deniedCodes.includes(entry.code)) return { present: false, value: null };
  }
  return { present: true, value };
}

export function resolveCanaryReports(input) {
  const source = input || {};
  const list = Array.isArray(source.canaries) ? source.canaries : [];
  const byProfile = profile => list.find(entry => entry && entry.profile === profile) || null;
  return {
    readOnly: source.readOnly ?? byProfile(':read-only'),
    workspaceProfile: source.workspaceProfile ?? byProfile(':workspace'),
    hostBaseline: source.hostBaseline ?? byProfile('host-direct')
  };
}

export function evaluateCanaryEvidence(input) {
  const { doctor } = input || {};
  const { readOnly, workspaceProfile, hostBaseline } = resolveCanaryReports(input);
  const failures = [];
  const verdicts = {};
  const report = (name, ready, reason) => {
    verdicts[name] = ready;
    if (!ready) failures.push(reason);
  };

  const sandboxCode = doctor && doctor.sandbox ? doctor.sandbox.code : null;
  report('sandboxProbePass', sandboxCode === 0 && doctor.sandbox.timedOut === false, `sandbox probe did not pass (code ${sandboxCode})`);

  const readChecks = ['readOutsideWorkspace', 'gitCommonDirHead', 'gitCommonDirConfig', 'credentialFileOpen', 'accountsFileOpen', 'siblingWorktreeList', 'controlStateList', 'homeCredentialList'];
  const readFailures = [];
  for (const name of readChecks) {
    const outcome = readOutcome(readOnly, name);
    if (!outcome.present) readFailures.push(`${name}: no evidence`);
    else if (outcome.value !== false) readFailures.push(`${name}: expected denied, observed ${outcome.value ? 'allowed' : 'denied'}`);
  }
  report('V01_readIsolation', readFailures.length === 0, `read isolation is not proven: ${readFailures.join('; ')}`);

  const writeFailures = [];
  for (const name of ['writeInsideWorkspace', 'writeOutsideWorkspace']) {
    const outcome = readOutcome(readOnly, name);
    if (!outcome.present) writeFailures.push(`${name}: no evidence`);
    else if (outcome.value !== false) writeFailures.push(`${name}: expected denied, observed ${outcome.value ? 'allowed' : 'denied'}`);
  }
  report('V02_writeIsolation', writeFailures.length === 0, `write isolation is not proven: ${writeFailures.join('; ')}`);

  const child = readOutcome(readOnly, 'childProcessTree');
  const tree = readOnly?.checks?.childProcessTree;
  const treeObserved = Number.isSafeInteger(tree?.spawnedPid) && tree.spawnedPid > 0 && Number.isSafeInteger(tree?.grandchildPid) && tree.grandchildPid > 0 && tree.spawnedPid !== tree.grandchildPid && tree.childAliveBeforeKill === true && tree.grandchildAliveBeforeKill === true && tree.killRequested === true;
  report('V15_childProcessTreeCleaned', child.present && child.value === false && treeObserved && tree.grandchildAliveAfterKill === false, child.present && child.value === true ? 'child process tree survived the kill' : 'child process cleanup: no complete tree evidence');

  const hostEgress = readOutcome(hostBaseline, 'egressTcp80');
  const sandboxEgress = readOutcome(readOnly, 'egressTcp80');
  if (!hostEgress.present) {
    report('V08_egressDenied', false, 'egress positive control is missing on the host');
  } else if (hostEgress.value !== true) {
    report('V08_egressDenied', false, 'egress positive control did not connect, denial cannot be distinguished');
  } else if (!sandboxEgress.present) {
    report('V08_egressDenied', false, 'egress: no evidence from the isolated run');
  } else {
    report('V08_egressDenied', sandboxEgress.value === false, `egress: expected denied, observed ${sandboxEgress.value ? 'allowed' : 'denied'}`);
  }

  const workspaceWrite = readOutcome(workspaceProfile, 'writeOutsideWorkspace');
  report('V02_checkProfileConfined', workspaceWrite.present && workspaceWrite.value === false, 'the check runner profile can write outside the checkout');

  const gateA = Object.values(verdicts).every(value => value === true);
  return { verdicts, gateA, blockedBy: failures };
}

function main() {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath || !outputPath) throw Error('Usage: verdict.mjs <input.json> <output.json>');
  const input = JSON.parse(readFileSync(inputPath, 'utf8'));
  const verdict = evaluateCanaryEvidence(input);
  const evidence = {
    ...input,
    verdicts: verdict.verdicts,
    gateA: { passed: verdict.gateA, blockedBy: verdict.blockedBy },
    liveWorkersVerified: false
  };
  writeFileSync(outputPath, JSON.stringify(evidence, null, 2) + '\n');
  process.stdout.write(JSON.stringify(verdict, null, 2) + '\n');
  process.exitCode = verdict.gateA ? 0 : 2;
}

if (process.argv[1] && process.argv[1].endsWith('verdict.mjs')) main();
