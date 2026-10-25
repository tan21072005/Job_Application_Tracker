import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool, globalTradeSanctionsNexusService } from './server.ts';
import type {
  GlobalTradeNexusOverviewDTO,
  SanctionsScreeningResultDTO,
  EccnClassificationResultDTO,
  DeemedExportAuditResultDTO,
  CfiusTidAssessmentResultDTO,
  CustomsLandedDutyResultDTO,
  VoluntarySelfDisclosureDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 9990;

const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw Error('Test server did not start.');
const base = 'http:' + '/' + `/127.0.0.1:${address.port}`;
const origin = 'http:' + '/' + '/127.0.0.1:64364';

let userA: { userId: string; cookie: string };
let userB: { userId: string; cookie: string };

test.before(async () => {
  await globalTradeSanctionsNexusService.ensureSchema();
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
  const email = `trade_nexus_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.52.${forwardedIp++}`
    },
    body: JSON.stringify({ email, password: 'StrongPassword123!' })
  });
  assert.equal(res.status, 201);
  const cookie = res.headers.get('set-cookie') || '';
  const body = (await res.json()) as { id: string };
  testUsers.push(body.id);
  return { userId: body.id, cookie };
}

test('global-trade-sanctions-nexus: GET /api/trade/overview requires authentication', async () => {
  const res = await fetch(`${base}/api/trade/overview`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('global-trade-sanctions-nexus: POST endpoints validate input schemas and reject invalid payloads', async () => {
  const badScreenRes = await fetch(`${base}/api/trade/sanctions/screen`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({})
  });
  assert.equal(badScreenRes.status, 400);

  const badEccnRes = await fetch(`${base}/api/trade/export-control/classify-eccn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({})
  });
  assert.equal(badEccnRes.status, 400);

  const badDeemedRes = await fetch(`${base}/api/trade/export-control/deemed-export-audit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({})
  });
  assert.equal(badDeemedRes.status, 400);

  const badCfiusRes = await fetch(`${base}/api/trade/cfius/assess-transaction`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({})
  });
  assert.equal(badCfiusRes.status, 400);

  const badDutyRes = await fetch(`${base}/api/trade/customs/calculate-landed-duty`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({})
  });
  assert.equal(badDutyRes.status, 400);

  const badVsdRes = await fetch(`${base}/api/trade/vsd/generate-report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({})
  });
  assert.equal(badVsdRes.status, 400);

  const badSignoffRes = await fetch(`${base}/api/trade/vsd/signoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({})
  });
  assert.equal(badSignoffRes.status, 400);
});

test('global-trade-sanctions-nexus: full operational lifecycle and multi-tenant isolation', async () => {
  const overviewRes = await fetch(`${base}/api/trade/overview`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(overviewRes.status, 200);
  const overview = (await overviewRes.json()) as GlobalTradeNexusOverviewDTO;
  assert.ok(overview.ctsriScore >= 0);
  assert.ok(overview.activeEccnClassificationsCount >= 1);
  assert.ok(overview.activeCfiusAssessmentsCount >= 1);
  assert.ok(overview.activeHtsCatalogItemsCount >= 1);

  const screenRes = await fetch(`${base}/api/trade/sanctions/screen`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      queryName: 'Vnesheconombank Capital Trust',
      countryCode: 'RU',
      beneficialOwnershipRoot: {
        id: randomUUID(),
        name: 'Vnesheconombank Capital Trust',
        country: 'RU',
        isDirectlySanctioned: false,
        ownershipPercentage: 100,
        votingRightsPercentage: 100,
        children: [
          {
            id: randomUUID(),
            name: 'VEB Holding Parent',
            country: 'RU',
            isDirectlySanctioned: true,
            ownershipPercentage: 55,
            votingRightsPercentage: 55,
            children: []
          }
        ]
      }
    })
  });
  assert.equal(screenRes.status, 200);
  const screenResult = (await screenRes.json()) as SanctionsScreeningResultDTO;
  assert.equal(screenResult.isBlockedByFiftyPercentRule, true);
  assert.ok(screenResult.aggregateBlockedOwnership >= 50);
  assert.ok(screenResult.secondarySanctionsExposureIndex > 50);

  const eccnRes = await fetch(`${base}/api/trade/export-control/classify-eccn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      itemId: randomUUID(),
      itemName: 'NextGen Quantum Micro-Kernel',
      functionalDescription: 'Low latency kernel software with cryptographic primitives',
      eccnCandidate: '5D002',
      implementsSymmetricEncryption: true,
      symmetricKeyLengthBits: 256,
      implementsAsymmetricEncryption: true,
      asymmetricKeyLengthBits: 2048,
      implementsEllipticCurve: true,
      ellipticCurveBits: 256,
      isMassMarketRetailAvailable: false,
      isUserModifiableCryptographicArchitecture: false,
      destinationCountry: 'DE'
    })
  });
  assert.equal(eccnRes.status, 200);
  const eccnResult = (await eccnRes.json()) as EccnClassificationResultDTO;
  assert.equal(eccnResult.assignedEccn, '5D002.a.1');
  assert.equal(eccnResult.requiresSemiAnnualReporting, true);

  const deemedRes = await fetch(`${base}/api/trade/export-control/deemed-export-audit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      employeeId: randomUUID(),
      employeeName: 'Dr. Dmitry Volkov',
      citizenshipCountry: 'RU',
      isUsPerson: false,
      accessedEccn: '5D002.a.1',
      technicalDataScope: 'source_code_read'
    })
  });
  assert.equal(deemedRes.status, 200);
  const deemedResult = (await deemedRes.json()) as DeemedExportAuditResultDTO;
  assert.equal(deemedResult.earCountryGroup, 'group_d_1_national_security');
  assert.equal(deemedResult.requiresDeemedExportLicense, true);

  const cfiusRes = await fetch(`${base}/api/trade/cfius/assess-transaction`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      transactionId: randomUUID(),
      targetCompanyName: 'BioTelemetry Health Technologies',
      dealValueUsd: 85000000,
      producesCriticalTechnology: false,
      operatesCriticalInfrastructure: false,
      sensitivePersonalDataRecordsCount: 2500000,
      targetsMilitaryOrIntelligencePersonnel: false,
      foreignInvestorCountry: 'SG',
      foreignInvestorOwnershipPercentage: 55.0,
      foreignInvestorBoardSeats: 2,
      foreignInvestorMaterialNonpublicAccess: true,
      foreignGovernmentVotingPercentage: 35.0
    })
  });
  assert.equal(cfiusRes.status, 200);
  const cfiusResult = (await cfiusRes.json()) as CfiusTidAssessmentResultDTO;
  assert.equal(cfiusResult.tidStatus, 'sensitive_personal_data_d');
  assert.equal(cfiusResult.sensitiveDataThresholdExceeded, true);
  assert.equal(cfiusResult.filingRequirement, 'mandatory_declaration_part_800');

  const dutyRes = await fetch(`${base}/api/trade/customs/calculate-landed-duty`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      partNumber: 'GPU-ACCEL-PRO-02',
      description: 'Advanced Enterprise AI Processing Board',
      htsCode: '8542.31.0000',
      countryOfOrigin: 'CN',
      exportCountry: 'US',
      customsValueUsd: 1000000,
      freightInsuranceUsd: 25000,
      qualifyingFta: 'usmca',
      totalTransactionValueUsd: 1200000,
      netCostUsd: 900000,
      valueNonOriginatingMaterialsUsd: 360000
    })
  });
  assert.equal(dutyRes.status, 200);
  const dutyResult = (await dutyRes.json()) as CustomsLandedDutyResultDTO;
  assert.equal(dutyResult.section301DutyRate, 25.0);
  assert.equal(dutyResult.regionalValueContentPercentage, 70);
  assert.equal(dutyResult.isFtaOriginQualified, true);

  const vsdRes = await fetch(`${base}/api/trade/vsd/generate-report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      vsdReferenceNumber: 'VSD-2026-EAR-TEST-01',
      targetAuthority: 'bis_oee',
      title: 'Inadvertent Encryption Source Code Deemed Export',
      suspectedRegulationBreach: '15 CFR § 734.13 Violation',
      incidentStartDate: '2026-08-01',
      incidentEndDate: '2026-10-15',
      estimatedTransactionsCount: 12,
      estimatedTransactionVolumeUsd: 1500000,
      narrativeSummary: 'Foreign national engineers accessed repository with cryptographic source code prior to deemed export license issuance.',
      rootCauseAnalysis: 'Git access control permissions failed to parse foreign national employee metadata.',
      remedialActionsImplemented: [
        'Revoked branch access for non-US persons',
        'Implemented automated export classification pre-commit hooks'
      ]
    })
  });
  assert.equal(vsdRes.status, 201);
  const vsdResult = (await vsdRes.json()) as VoluntarySelfDisclosureDTO;
  assert.ok(vsdResult.id);
  assert.equal(vsdResult.vsdReferenceNumber, 'VSD-2026-EAR-TEST-01');

  const signoff1 = await fetch(`${base}/api/trade/vsd/signoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      vsdId: vsdResult.id,
      role: 'head_of_global_trade_compliance',
      signerName: 'Victoria Price',
      signatureHash: 'sha256:112233445566778899aabbccddeeff00'
    })
  });
  assert.equal(signoff1.status, 200);
  const signoff1Res = await signoff1.json();
  assert.equal(signoff1Res.totalSignoffs, 1);
  assert.equal(signoff1Res.isFullySigned, false);

  const signoff2 = await fetch(`${base}/api/trade/vsd/signoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      vsdId: vsdResult.id,
      role: 'chief_legal_officer',
      signerName: 'Alexander Vance',
      signatureHash: 'sha256:2233445566778899aabbccddeeff0011'
    })
  });
  assert.equal(signoff2.status, 200);

  const signoff3 = await fetch(`${base}/api/trade/vsd/signoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      vsdId: vsdResult.id,
      role: 'chief_executive_officer',
      signerName: 'Eleanor Sterling',
      signatureHash: 'sha256:33445566778899aabbccddeeff001122'
    })
  });
  assert.equal(signoff3.status, 200);
  const signoff3Res = await signoff3.json();
  assert.equal(signoff3Res.totalSignoffs, 3);
  assert.equal(signoff3Res.isFullySigned, true);

  const overviewUserB = await fetch(`${base}/api/trade/overview`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(overviewUserB.status, 200);
  const overviewB = (await overviewUserB.json()) as GlobalTradeNexusOverviewDTO;
  assert.equal(overviewB.activeSanctionsScreeningCount, 0);
  assert.equal(overviewB.pendingVsdFilingsCount, 0);
});
