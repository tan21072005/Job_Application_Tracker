import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool, privacyDataSovereigntyNexusService } from './server.ts';
import type {
  PrivacyNexusOverview,
  CrossBorderTransfer,
  DsrRequest,
  RopaActivity,
  DpiaAssessment,
  BoardRatification
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 9930;

const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw Error('Test server did not start.');
const base = 'http:' + '/' + `/127.0.0.1:${address.port}`;
const origin = 'http:' + '/' + '/127.0.0.1:64364';

let userA: { userId: string; cookie: string };
let userB: { userId: string; cookie: string };

test.before(async () => {
  await privacyDataSovereigntyNexusService.ensureSchema();
  userA = await registerUser();
  userB = await registerUser();
});

test.after(async () => {
  for (const id of testUsers) {
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
  }
  server.closeAllConnections?.();
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await pool.end();
  await serverPool.end();
});

async function registerUser(): Promise<{ userId: string; cookie: string }> {
  const email = `privacy_nexus_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.56.${forwardedIp++}`
    },
    body: JSON.stringify({ email, password: 'StrongPassword123!' })
  });
  assert.equal(res.status, 201);
  const cookie = res.headers.get('set-cookie') || '';
  const body = (await res.json()) as { id: string };
  testUsers.push(body.id);
  return { userId: body.id, cookie };
}

test('privacy-data-sovereignty: GET /api/privacy/overview requires authentication', async () => {
  const res = await fetch(`${base}/api/privacy/overview`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('privacy-data-sovereignty: POST endpoints validate input schemas and reject invalid payloads', async () => {
  const badTransfer = await fetch(`${base}/api/privacy/transfers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({})
  });
  assert.equal(badTransfer.status, 400);

  const badDsr = await fetch(`${base}/api/privacy/dsr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ subjectEmail: 'invalid-email' })
  });
  assert.equal(badDsr.status, 400);

  const badRopa = await fetch(`${base}/api/privacy/ropa`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ activityCode: '' })
  });
  assert.equal(badRopa.status, 400);
});

test('privacy-data-sovereignty: complete lifecycle with transfer evaluation, DSR, RoPA, DPIA, and tripartite ratification', async () => {
  const overviewRes = await fetch(`${base}/api/privacy/overview`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(overviewRes.status, 200);
  const overview = (await overviewRes.json()) as PrivacyNexusOverview;
  assert.ok(overview.summary);
  assert.ok(overview.transfers.length > 0);
  assert.ok(overview.pendingDsrRequests.length > 0);
  assert.ok(overview.latestRatification);

  const transferRes = await fetch(`${base}/api/privacy/transfers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      corridorCode: 'EU-JP-ADEQUACY-01',
      originCountry: 'FRA',
      destinationCountry: 'JPN',
      destinationJurisdictionTier: 'adequacy_recognized',
      transferMechanism: 'adequacy_decision',
      legalInstrumentReference: 'Commission Implementing Decision (EU) 2019/419',
      dataSensitivityCategory: 'b2b_professional_contacts',
      supplementaryTechnicalMeasure: 'eea_sovereign_hsm_encryption',
      annualDataSubjectVolume: 35000
    })
  });
  assert.equal(transferRes.status, 201);
  const transfer = (await transferRes.json()) as CrossBorderTransfer;
  assert.equal(transfer.corridorCode, 'EU-JP-ADEQUACY-01');
  assert.equal(transfer.riskTier, 'safe_harbor');

  const dsrRes = await fetch(`${base}/api/privacy/dsr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      subjectIdentifier: 'DATA-SUB-77192',
      subjectEmail: 'applicant.john@cloudnet.de',
      regulatoryFramework: 'gdpr_eu',
      requestType: 'erasure_deletion',
      identityVerificationMethod: 'bank_id_oidc_token'
    })
  });
  assert.equal(dsrRes.status, 201);
  const dsr = (await dsrRes.json()) as DsrRequest;
  assert.equal(dsr.subjectIdentifier, 'DATA-SUB-77192');

  const extendRes = await fetch(`${base}/api/privacy/dsr/extend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      dsrRequestId: dsr.id,
      extensionReason: 'Statutory complexity extension under GDPR Art. 12(3) due to cold-storage tape archives.'
    })
  });
  assert.equal(extendRes.status, 200);
  const extendedDsr = (await extendRes.json()) as DsrRequest;
  assert.equal(extendedDsr.isExtensionTriggered, true);
  assert.equal(extendedDsr.status, 'extended');

  const ropaRes = await fetch(`${base}/api/privacy/ropa`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      activityCode: 'ROPA-REC-99',
      name: 'Automated Background & Credential Verification',
      businessUnit: 'Global Operations',
      processOwner: 'Director of Trust & Safety',
      processingPurpose: 'Criminal record and academic verification with candidate consent',
      gdprArticle6Basis: 'consent',
      dataCategories: ['identity_card', 'diploma', 'verification_report'],
      specialCategoriesPresent: false,
      dataSubjectsCategory: 'Executive Job Applicants',
      recipientCategories: ['Accredited Background Check Agencies'],
      crossBorderTransferInvolved: true,
      retentionPeriodMonths: 12,
      retentionLegalGround: 'Statutory verification obligations under labor codes',
      technicalSecurityMeasures: ['AES-256 GCM', 'Mutual TLS', 'Role-Based Access'],
      isDpiaRequired: true
    })
  });
  assert.equal(ropaRes.status, 201);
  const ropa = (await ropaRes.json()) as RopaActivity;
  assert.equal(ropa.activityCode, 'ROPA-REC-99');

  const dpiaRes = await fetch(`${base}/api/privacy/dpia`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      ropaActivityId: ropa.id,
      dpiaReference: 'DPIA-2026-REC-01',
      title: 'Automated Criminal and Identity Cross-Referencing',
      systematicMonitoringFlag: false,
      largeScaleProcessingFlag: true,
      innovativeTechFlag: true,
      vulnerableSubjectsFlag: false,
      automatedDecisionFlag: false,
      threatItems: [
        {
          threatScenario: 'Third-party processor unauthorized data retention',
          privacyHarmType: 'Loss of subject data control',
          likelihoodRating: 2,
          severityRating: 4,
          mitigationControls: 'Automated tombstone webhook protocol with audit confirmation',
          controlWeight: 0.90
        }
      ],
      dpoOpinion: 'Processing approved subject to sub-processor annual SOC2 Type II certification.'
    })
  });
  assert.equal(dpiaRes.status, 201);
  const dpia = (await dpiaRes.json()) as DpiaAssessment;
  assert.equal(dpia.dpiaReference, 'DPIA-2026-REC-01');

  if (overview.latestRatification) {
    const ratifRes = await fetch(`${base}/api/privacy/ratify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        Cookie: userA.cookie
      },
      body: JSON.stringify({
        ratificationId: overview.latestRatification.id,
        role: 'chief_privacy_officer',
        signatoryFullName: 'Marcus Sterling, Esq., CPO',
        notes: 'CPO legal audit completed without reservations.'
      })
    });
    assert.equal(ratifRes.status, 200);
    const ratif = (await ratifRes.json()) as BoardRatification;
    assert.equal(ratif.cpoFullName, 'Marcus Sterling, Esq., CPO');
    assert.equal(ratif.ratificationStatus, 'pending_ceo');
  }

  const resetRes = await fetch(`${base}/api/privacy/reset-demo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    }
  });
  assert.equal(resetRes.status, 200);
  const postReset = (await resetRes.json()) as PrivacyNexusOverview;
  assert.ok(postReset.transfers.length >= 4);
});

test('privacy-data-sovereignty: multi-tenant boundary ensures User B cannot access User A data', async () => {
  const overviewBRes = await fetch(`${base}/api/privacy/overview`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(overviewBRes.status, 200);
  const overviewB = (await overviewBRes.json()) as PrivacyNexusOverview;

  const overviewARes = await fetch(`${base}/api/privacy/overview`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  const overviewA = (await overviewARes.json()) as PrivacyNexusOverview;

  const idsA = new Set(overviewA.transfers.map((t) => t.id));
  for (const transferB of overviewB.transfers) {
    assert.equal(idsA.has(transferB.id), false);
  }
});
