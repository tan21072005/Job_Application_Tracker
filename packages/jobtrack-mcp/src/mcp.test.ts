import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { McpServer, type JsonRpcRequest, type JsonRpcResponse } from './mcp-server.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];

async function createTestUser(): Promise<string> {
  const id = randomUUID();
  const email = `mcp_test_${id.slice(0, 8)}@example.com`;
  await pool.query(
    "INSERT INTO users(id, email, email_normalized, password_hash) VALUES($1, $2, $2, '$argon2id$v=19$m=65536,t=3,p=4$dummy$hash')",
    [id, email]
  );
  testUsers.push(id);
  return id;
}

test.after(async () => {
  for (const id of testUsers) {
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
  }
  await pool.end();
});

test('MCP: initialize, ping and tools/list protocol parity', async () => {
  const userId = await createTestUser();
  const server = new McpServer(pool, userId, 'test-client');

  // 1. initialize
  const initReq: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'claude-desktop', version: '0.1.0' }
    }
  };
  const initRes = await server.handleRequest(initReq);
  assert.ok(initRes);
  assert.equal(initRes.id, 1);
  const result = initRes.result as Record<string, unknown>;
  assert.equal(result.protocolVersion, '2024-11-05');
  assert.ok((result.serverInfo as Record<string, unknown>).name === 'jobtrack-mcp');

  // 2. initialized notification
  const notifyRes = await server.handleRequest({
    jsonrpc: '2.0',
    method: 'notifications/initialized'
  });
  assert.equal(notifyRes, null); // Notifications return null

  // 3. ping
  const pingRes = await server.handleRequest({ jsonrpc: '2.0', id: 2, method: 'ping' });
  assert.ok(pingRes);
  assert.deepEqual(pingRes.result, {});

  // 4. tools/list
  const toolsRes = await server.handleRequest({ jsonrpc: '2.0', id: 3, method: 'tools/list' });
  assert.ok(toolsRes);
  const toolsList = (toolsRes.result as { tools: Array<{ name: string }> }).tools;
  assert.ok(toolsList.length >= 10);
  const toolNames = toolsList.map(t => t.name);
  assert.ok(toolNames.includes('list_applications'));
  assert.ok(toolNames.includes('get_application'));
  assert.ok(toolNames.includes('create_application'));
  assert.ok(toolNames.includes('update_application'));
  assert.ok(toolNames.includes('delete_application'));
  assert.ok(toolNames.includes('restore_application'));
  assert.ok(toolNames.includes('schedule_interview'));
  assert.ok(toolNames.includes('update_interview'));
  assert.ok(toolNames.includes('delete_interview'));
  assert.ok(toolNames.includes('get_dashboard_summary'));
});

test('MCP: full control mutation workflow with audit trail and trash recovery', async () => {
  const userId = await createTestUser();
  const server = new McpServer(pool, userId, 'claude-desktop');

  // 1. Full control create_application (no confirmation prompt, direct execution)
  const createRes = await server.handleRequest({
    jsonrpc: '2.0',
    id: 10,
    method: 'tools/call',
    params: {
      name: 'create_application',
      arguments: {
        company: 'Figma',
        position: 'Senior Design Systems Engineer',
        location: 'San Francisco, CA',
        workMode: 'Hybrid',
        salary: '$180,000 - $220,000',
        notes: 'Submitted portfolio',
        nextAction: 'Follow up with recruiter on Thursday',
        deadline: '2026-10-29T17:00:00Z',
        status: 'Applied'
      }
    }
  });

  assert.ok(createRes);
  const content = (createRes.result as { content: Array<{ text: string }> }).content;
  const createdApp = JSON.parse(content[0].text);
  assert.equal(createdApp.company, 'Figma');
  assert.equal(createdApp.position, 'Senior Design Systems Engineer');
  assert.equal(createdApp.status, 'Applied');
  assert.equal(createdApp.version, 1);
  const appId = createdApp.id;

  // 2. Schedule interview
  const interviewRes = await server.handleRequest({
    jsonrpc: '2.0',
    id: 11,
    method: 'tools/call',
    params: {
      name: 'schedule_interview',
      arguments: {
        applicationId: appId,
        title: 'Initial Screen with Recruiter',
        at: '2026-10-30T14:00:00Z',
        timezone: 'Asia/Ho_Chi_Minh',
        format: 'Online',
        location: 'https://meet.google.com/abc-defg-hij',
        preparation: 'Review company mission and values',
        ifMatchVersion: createdApp.version
      }
    }
  });
  assert.ok(interviewRes);
  const round = JSON.parse((interviewRes.result as { content: Array<{ text: string }> }).content[0].text);
  assert.equal(round.title, 'Initial Screen with Recruiter');
  assert.equal(round.format, 'Online');

  // 3. Verify application status synchronized to Interview
  const getRes = await server.handleRequest({
    jsonrpc: '2.0',
    id: 12,
    method: 'tools/call',
    params: {
      name: 'get_application',
      arguments: { id: appId }
    }
  });
  const refreshedApp = JSON.parse((getRes?.result as { content: Array<{ text: string }> }).content[0].text);
  assert.equal(refreshedApp.status, 'Interview');
  assert.equal(refreshedApp.interviews.length, 1);
  assert.equal(refreshedApp.version, 2);

  // 4. Soft-delete application to trash
  const deleteRes = await server.handleRequest({
    jsonrpc: '2.0',
    id: 13,
    method: 'tools/call',
    params: {
      name: 'delete_application',
      arguments: { id: appId, ifMatchVersion: refreshedApp.version, purge: false }
    }
  });
  assert.ok(deleteRes);

  // 5. Normal list does not show trashed application
  const listActive = await server.handleRequest({
    jsonrpc: '2.0',
    id: 14,
    method: 'tools/call',
    params: { name: 'list_applications', arguments: {} }
  });
  const activeApps = JSON.parse((listActive?.result as { content: Array<{ text: string }> }).content[0].text);
  assert.equal(activeApps.length, 0);

  // 6. Trash list shows application
  const listTrash = await server.handleRequest({
    jsonrpc: '2.0',
    id: 15,
    method: 'tools/call',
    params: { name: 'list_applications', arguments: { includeDeleted: true } }
  });
  const trashApps = JSON.parse((listTrash?.result as { content: Array<{ text: string }> }).content[0].text);
  assert.equal(trashApps.length, 1);
  assert.equal(trashApps[0].id, appId);

  // 7. Restore application
  const restoreRes = await server.handleRequest({
    jsonrpc: '2.0',
    id: 16,
    method: 'tools/call',
    params: {
      name: 'restore_application',
      arguments: { id: appId }
    }
  });
  const restoredApp = JSON.parse((restoreRes?.result as { content: Array<{ text: string }> }).content[0].text);
  assert.equal(restoredApp.deletedAt, null);

  // 8. Verify audit receipts in ai_commands table
  const auditRows = (
    await pool.query(
      'SELECT command, client, status FROM ai_commands WHERE user_id=$1 ORDER BY created_at ASC',
      [userId]
    )
  ).rows;

  assert.ok(auditRows.length >= 4);
  const executedCommands = auditRows.map(r => r.command);
  assert.ok(executedCommands.includes('create_application'));
  assert.ok(executedCommands.includes('schedule_interview'));
  assert.ok(executedCommands.includes('delete_application'));
  assert.ok(executedCommands.includes('restore_application'));
  assert.ok(auditRows.every(r => r.client === 'claude-desktop' && r.status === 'succeeded'));
});

test('MCP: create_application normalizes URL, workMode Onsite -> On-site, and satisfies DB constraints', async () => {
  const userId = await createTestUser();
  const server = new McpServer(pool, userId, 'web-clipper');

  const createRes = await server.handleRequest({
    jsonrpc: '2.0',
    id: 100,
    method: 'tools/call',
    params: {
      name: 'create_application',
      arguments: {
        company: 'CÔNG TY TNHH TOPCV VIỆT NAM',
        position: 'Kế Toán Trưởng',
        url: 'https://www.topcv.vn/viec-lam/ke-toan-truong/12345.html?utm_source=feed',
        workMode: 'Onsite',
        salary: '35M - 45M',
        location: 'Hà Nội',
        deadline: '2026-11-08T17:00:00.000Z',
        status: 'Saved'
      }
    }
  });

  assert.ok(createRes);
  assert.equal(createRes.error, undefined);
  const content = (createRes.result as { content: Array<{ text: string }> }).content;
  const created = JSON.parse(content[0].text);
  assert.equal(created.company, 'CÔNG TY TNHH TOPCV VIỆT NAM');
  assert.equal(created.position, 'Kế Toán Trưởng');
  assert.equal(created.workMode, 'On-site');
  assert.equal(created.nextAction, 'Nộp hồ sơ trước hạn chót');
  assert.ok(created.url.includes('topcv.vn'));
  assert.equal(created.status, 'Saved');
});

test('MCP: a tool call outside the granted scope is refused and no audit row is written', async () => {
  const userId = await createTestUser();
  const server = new McpServer(pool, userId, 'narrow-client', ['mcp:read']);

  const refused = await server.handleRequest({
    jsonrpc: '2.0',
    id: 200,
    method: 'tools/call',
    params: {
      name: 'create_application',
      arguments: { company: 'Scope Check Co', position: 'Engineer', status: 'Saved' }
    }
  });
  assert.ok(refused);
  assert.equal(refused.error, undefined);
  const result = refused.result as { isError?: boolean; content: Array<{ text: string }> };
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /mcp:write/);

  const readAllowed = await server.handleRequest({
    jsonrpc: '2.0',
    id: 201,
    method: 'tools/call',
    params: { name: 'list_applications', arguments: {} }
  });
  const listed = JSON.parse((readAllowed?.result as { content: Array<{ text: string }> }).content[0].text);
  assert.equal(Array.isArray(listed), true);

  const auditRows = (
    await pool.query('SELECT command FROM ai_commands WHERE user_id=$1', [userId])
  ).rows;
  assert.equal(auditRows.length, 0);
});
test('MCP: the shipped stdio binary starts only with an explicit identity', async () => {
  const binary = fileURLToPath(new URL('../bin/jobtrack-mcp.mjs', import.meta.url));
  const withoutIdentity = spawnSync(process.execPath, [binary], { encoding: 'utf8', timeout: 30_000, windowsHide: true });
  assert.equal(withoutIdentity.status, 1);
  assert.match(withoutIdentity.stderr, /No JobTrack identity/);
  const withInvalidToken = spawnSync(process.execPath, [binary], {
    encoding: 'utf8',
    timeout: 30_000,
    windowsHide: true,
    env: { ...process.env, JOBTRACK_AUTH_TOKEN: 'not-a-real-token' }
  });
  assert.equal(withInvalidToken.status, 1);
  assert.match(withInvalidToken.stderr, /invalid or expired/);
});