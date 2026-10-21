import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCanaryEvidence, resolveCanaryReports } from './verdict.mjs';

const denied = { opened: false, allowed: false, listed: false };
const allowed = { opened: true, allowed: true, listed: true };

function report(overrides = {}) {
  return {
    environmentFingerprint: 'fixture',
    checks: {
      readOutsideWorkspace: { allowed: false, code: 'DENIED', length: 0, leaked: null },
      gitCommonDirHead: { opened: false, code: 'DENIED', size: 0 },
      gitCommonDirConfig: { opened: false, code: 'DENIED', size: 0 },
      credentialFileOpen: { opened: false, code: 'DENIED', size: 0 },
      accountsFileOpen: { opened: false, code: 'DENIED', size: 0 },
      siblingWorktreeList: { listed: false, code: 'DENIED', entries: 0 },
      controlStateList: { listed: false, code: 'DENIED', entries: 0 },
      homeCredentialList: { listed: false, code: 'DENIED', entries: 0 },
      writeInsideWorkspace: { allowed: false, code: 'DENIED' },
      writeOutsideWorkspace: { allowed: false, code: 'DENIED' },
      egressTcp80: { allowed: false, code: 'DENIED' },
      childProcessTree: { spawnedPid: 1, grandchildPid: 2, childAliveBeforeKill: true, grandchildAliveBeforeKill: true, killRequested: true, stillAliveAfterKill: false, grandchildAliveAfterKill: false },
      ...overrides
    }
  };
}

const hostConnected = report({ egressTcp80: { allowed: true, code: 'CONNECTED' } });
const doctor = { sandbox: { code: 0, timedOut: false, output: 'v24.18.0', error: '' } };

test('canary reports are resolved by profile when only the list is given', () => {
  const readOnly = report();
  const workspaceProfile = report();
  const hostBaseline = hostConnected;
  const resolved = resolveCanaryReports({
    canaries: [
      { ...readOnly, profile: ':read-only' },
      { ...workspaceProfile, profile: ':workspace' },
      { ...hostBaseline, profile: 'host-direct' }
    ]
  });
  assert.equal(resolved.readOnly.profile, ':read-only');
  assert.equal(resolved.workspaceProfile.profile, ':workspace');
  assert.equal(resolved.hostBaseline.profile, 'host-direct');
  const verdict = evaluateCanaryEvidence({
    doctor,
    canaries: [
      { ...readOnly, profile: ':read-only' },
      { ...workspaceProfile, profile: ':workspace' },
      { ...hostBaseline, profile: 'host-direct' }
    ]
  });
  assert.equal(verdict.gateA, true);
});

test('a complete evidence set passes the gate', () => {
  const verdict = evaluateCanaryEvidence({ doctor, readOnly: report(), workspaceProfile: report(), hostBaseline: hostConnected });
  assert.equal(verdict.gateA, true);
  assert.deepEqual(verdict.blockedBy, []);
  assert.equal(verdict.verdicts.V01_readIsolation, true);
  assert.equal(verdict.verdicts.V08_egressDenied, true);
});

test('a missing check is treated as no evidence and never as a pass', () => {
  const incomplete = report();
  delete incomplete.checks.credentialFileOpen;
  const verdict = evaluateCanaryEvidence({ doctor, readOnly: incomplete, workspaceProfile: report(), hostBaseline: hostConnected });
  assert.equal(verdict.gateA, false);
  assert.equal(verdict.verdicts.V01_readIsolation, false);
  assert.match(verdict.blockedBy.join(' '), /credentialFileOpen: no evidence/);
});

test('a check present without the expected field is no evidence', () => {
  const malformed = report();
  malformed.checks.accountsFileOpen = { size: 12 };
  const verdict = evaluateCanaryEvidence({ doctor, readOnly: malformed, workspaceProfile: report(), hostBaseline: hostConnected });
  assert.equal(verdict.gateA, false);
  assert.match(verdict.blockedBy.join(' '), /accountsFileOpen: no evidence/);
});

test('every read target must be denied', () => {
  const readable = {
    readOutsideWorkspace: { allowed: true, code: null, length: 4, leaked: 'x' },
    gitCommonDirHead: { opened: true, code: null, size: 4 },
    gitCommonDirConfig: { opened: true, code: null, size: 4 },
    credentialFileOpen: { opened: true, code: null, size: 4 },
    accountsFileOpen: { opened: true, code: null, size: 4 },
    siblingWorktreeList: { listed: true, code: null, entries: 3 },
    controlStateList: { listed: true, code: null, entries: 3 }
  };
  for (const [name, value] of Object.entries(readable)) {
    const verdict = evaluateCanaryEvidence({ doctor, readOnly: report({ [name]: value }), workspaceProfile: report(), hostBaseline: hostConnected });
    assert.equal(verdict.gateA, false, name);
    assert.match(verdict.blockedBy.join(' '), new RegExp(name), name);
  }
});

test('a missing canary report fails closed', () => {
  const verdict = evaluateCanaryEvidence({ doctor, readOnly: null, workspaceProfile: report(), hostBaseline: hostConnected });
  assert.equal(verdict.gateA, false);
  assert.ok(verdict.blockedBy.length > 0);
});

test('egress needs a host positive control', () => {
  const verdict = evaluateCanaryEvidence({ doctor, readOnly: report(), workspaceProfile: report(), hostBaseline: report({ egressTcp80: { allowed: false, code: 'TIMEOUT' } }) });
  assert.equal(verdict.gateA, false);
  assert.equal(verdict.verdicts.V08_egressDenied, false);
  assert.match(verdict.blockedBy.join(' '), /positive control/);
});

test('egress that stays open in the isolated run is a failure', () => {
  const verdict = evaluateCanaryEvidence({ doctor, readOnly: report({ egressTcp80: { allowed: true, code: 'CONNECTED' } }), workspaceProfile: report(), hostBaseline: hostConnected });
  assert.equal(verdict.gateA, false);
  assert.match(verdict.blockedBy.join(' '), /egress: expected denied/);
});

test('a failing sandbox probe blocks the gate', () => {
  const verdict = evaluateCanaryEvidence({ doctor: { sandbox: { code: 1, error: 'boom' } }, readOnly: report(), workspaceProfile: report(), hostBaseline: hostConnected });
  assert.equal(verdict.gateA, false);
  assert.match(verdict.blockedBy.join(' '), /sandbox probe did not pass/);
});

test('the check runner profile must not write outside the checkout', () => {
  const verdict = evaluateCanaryEvidence({ doctor, readOnly: report(), workspaceProfile: report({ writeOutsideWorkspace: { ...allowed } }), hostBaseline: hostConnected });
  assert.equal(verdict.gateA, false);
  assert.equal(verdict.verdicts.V02_checkProfileConfined, false);
});

test('a surviving child process is a failure', () => {
  const verdict = evaluateCanaryEvidence({ doctor, readOnly: report({ childProcessTree: { stillAliveAfterKill: true } }), workspaceProfile: report(), hostBaseline: hostConnected });
  assert.equal(verdict.gateA, false);
  assert.match(verdict.blockedBy.join(' '), /child process tree survived/);
});

test('a target that does not exist is no evidence and never a pass', () => {
  const verdict = evaluateCanaryEvidence({ doctor, readOnly: report({ gitCommonDirHead: { opened: false, code: 'NO_TARGET', size: 0 } }), workspaceProfile: report(), hostBaseline: hostConnected });
  assert.equal(verdict.gateA, false);
  assert.match(verdict.blockedBy.join(' '), /gitCommonDirHead: no evidence/);
});

test('every failing verdict is reported', () => {
  const verdict = evaluateCanaryEvidence({ doctor: { sandbox: { code: 1 } }, readOnly: report({ credentialFileOpen: { ...allowed } }), workspaceProfile: report(), hostBaseline: report() });
  assert.equal(verdict.gateA, false);
  assert.ok(verdict.blockedBy.length >= 3);
  assert.match(verdict.blockedBy.join(' '), /sandbox probe did not pass/);
  assert.match(verdict.blockedBy.join(' '), /read isolation is not proven/);
  assert.match(verdict.blockedBy.join(' '), /positive control/);
  for (const key of Object.keys(verdict.verdicts)) {
    if (verdict.verdicts[key] === false) assert.ok(verdict.blockedBy.some(reason => reason.length > 0), key);
  }
});

test('operational errors cannot stand in for denied read or write evidence', () => {
  const broken = report();
  for (const entry of Object.values(broken.checks)) if (entry.code === 'DENIED') entry.code = 'ERROR:EINVAL';
  const verdict = evaluateCanaryEvidence({ doctor, readOnly: broken, workspaceProfile: broken, hostBaseline: hostConnected });
  assert.equal(verdict.gateA, false);
  assert.equal(verdict.verdicts.V01_readIsolation, false);
  assert.equal(verdict.verdicts.V02_writeIsolation, false);
  assert.equal(verdict.verdicts.V02_checkProfileConfined, false);
  assert.equal(verdict.verdicts.V08_egressDenied, false);
});

test('a timed out probe cannot pass even with code zero', () => {
  const verdict = evaluateCanaryEvidence({ doctor: { sandbox: { code: 0, timedOut: true } }, readOnly: report(), workspaceProfile: report(), hostBaseline: hostConnected });
  assert.equal(verdict.gateA, false);
  assert.equal(verdict.verdicts.sandboxProbePass, false);
});

test('cleanup requires child and grandchild to have run before termination', () => {
  const complete = report().checks.childProcessTree;
  for (const key of ['spawnedPid', 'grandchildPid', 'childAliveBeforeKill', 'grandchildAliveBeforeKill', 'killRequested', 'grandchildAliveAfterKill']) {
    const childProcessTree = { ...complete };
    delete childProcessTree[key];
    const verdict = evaluateCanaryEvidence({ doctor, readOnly: report({ childProcessTree }), workspaceProfile: report(), hostBaseline: hostConnected });
    assert.equal(verdict.verdicts.V15_childProcessTreeCleaned, false, key);
  }
});

test('home credential visibility is part of read isolation', () => {
  const verdict = evaluateCanaryEvidence({ doctor, readOnly: report({ homeCredentialList: { listed: true, code: null } }), workspaceProfile: report(), hostBaseline: hostConnected });
  assert.equal(verdict.gateA, false);
  assert.equal(verdict.verdicts.V01_readIsolation, false);
});
