import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app } from './server.ts';
import type { InterviewPrepResultDTO, InterviewEvaluateResultDTO } from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 220;

const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw Error('Test server did not start.');
const base = `http://127.0.0.1:${address.port}`;
const origin = 'http://127.0.0.1:64364';

test.after(async () => {
  for (const id of testUsers) {
    await pool.query('DELETE FROM candidate_profiles WHERE user_id=$1', [id]);
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
  }
  await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
  await pool.end();
});

async function registerUser(): Promise<{ userId: string; cookie: string }> {
  const email = `prep_test_${randomUUID()}@example.com`;
  const pwd = 'StrongPassword123!';
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.10.${forwardedIp++}`
    },
    body: JSON.stringify({ email, password: pwd })
  });
  assert.equal(res.status, 201);
  const data = await res.json() as { id: string };
  testUsers.push(data.id);
  const cookie = res.headers.get('set-cookie');
  if (!cookie) throw new Error('Missing session cookie on registration');
  return { userId: data.id, cookie };
}

test('Interview Prep: requires authentication', async () => {
  const prepRes = await fetch(`${base}/api/ai/pro/interview-prep`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ position: 'Backend Developer', company: 'Acme Corp' })
  });
  assert.equal(prepRes.status, 401);

  const evalRes = await fetch(`${base}/api/ai/pro/interview-evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({
      questionId: 'q-1',
      question: 'Why do you want this job?',
      category: 'behavioral',
      answer: 'I love software engineering.'
    })
  });
  assert.equal(evalRes.status, 401);
});

test('Interview Prep: generates tailored questions and grounds on candidate profile skills', async () => {
  const { cookie } = await registerUser();

  const profileRes = await fetch(`${base}/api/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
      Origin: origin
    },
    body: JSON.stringify({
      fullName: 'Trần Văn Hoàng',
      email: 'hoang.tran@example.com',
      skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS']
    })
  });
  assert.equal(profileRes.status, 200);

  const prepRes = await fetch(`${base}/api/ai/pro/interview-prep`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
      Origin: origin
    },
    body: JSON.stringify({
      company: 'Shopee Vietnam',
      position: 'Senior Frontend Developer',
      notes: 'Yêu cầu tối ưu Core Web Vitals và thiết kế Design System'
    })
  });
  assert.equal(prepRes.status, 200);

  const data = await prepRes.json() as InterviewPrepResultDTO;
  assert.equal(data.company, 'Shopee Vietnam');
  assert.equal(data.position, 'Senior Frontend Developer');
  assert.equal(data.domainTrack, 'frontend');
  assert.equal(data.roleLevel, 'Senior');
  assert.ok(data.questions.length >= 4);

  const q = data.questions[0];
  assert.ok(q.question.length > 5);
  assert.ok(q.intent.length > 5);
  assert.ok(q.starGuidelines.situation.length > 0);
  assert.ok(q.starGuidelines.task.length > 0);
  assert.ok(q.starGuidelines.action.length > 0);
  assert.ok(q.starGuidelines.result.length > 0);
  assert.ok(q.sampleAnswer.length > 20);

  assert.ok(data.reverseQuestions.length >= 3);
  assert.ok(data.tips.length >= 2);
});

test('Interview Prep: rejects invalid payload with 422', async () => {
  const { cookie } = await registerUser();

  const missingPos = await fetch(`${base}/api/ai/pro/interview-prep`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
      Origin: origin
    },
    body: JSON.stringify({
      company: 'Shopee Vietnam',
      position: ''
    })
  });
  assert.equal(missingPos.status, 422);

  const unknownProp = await fetch(`${base}/api/ai/pro/interview-prep`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
      Origin: origin
    },
    body: JSON.stringify({
      company: 'Shopee Vietnam',
      position: 'Developer',
      unauthorizedField: 'attack'
    })
  });
  assert.equal(unknownProp.status, 422);
});

test('Interview Evaluate: evaluates candidate answer and returns rubric scores', async () => {
  const { cookie } = await registerUser();

  const evalRes = await fetch(`${base}/api/ai/pro/interview-evaluate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
      Origin: origin
    },
    body: JSON.stringify({
      questionId: 'fe-tech-1',
      question: 'Bạn làm thế nào để tối ưu hiệu năng trang web khi gặp dữ liệu lớn?',
      category: 'technical',
      answer: 'Khi làm việc tại công ty cũ, hệ thống bảng điều khiển của dự án gặp tình trạng tải chậm khi số lượng bản ghi tăng lên. Nhiệm vụ của tôi là đưa thời gian tải trang về dưới 200ms. Tôi đã quyết định phân tích bundle với webpack-bundle-analyzer, áp dụng virtual list windowing và refactor lại các memoized selectors. Kết quả thời gian tải trang giảm 65%, thời gian render từ 800ms xuống còn 120ms và người dùng phản hồi rất tốt.'
    })
  });
  assert.equal(evalRes.status, 200);

  const data = await evalRes.json() as InterviewEvaluateResultDTO;
  assert.ok(data.overallScore >= 7.5);
  assert.equal(data.verdict, 'Xuất sắc');
  assert.ok(data.rubric.actionScore >= 7);
  assert.ok(data.rubric.resultScore >= 7);
  assert.ok(data.strengths.length > 0);
  assert.ok(data.improvedAnswer.includes('[Tình huống]'));
  assert.ok(data.improvedAnswer.includes('[Kết quả]'));
});

test('Interview Evaluate: handles vague answers with constructive improvements', async () => {
  const { cookie } = await registerUser();

  const evalRes = await fetch(`${base}/api/ai/pro/interview-evaluate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
      Origin: origin
    },
    body: JSON.stringify({
      questionId: 'fe-behav-1',
      question: 'Bạn xử lý bất đồng quan điểm kỹ thuật như thế nào?',
      category: 'behavioral',
      answer: 'Chúng tôi chỉ thảo luận rồi quyết định.'
    })
  });
  assert.equal(evalRes.status, 200);

  const data = await evalRes.json() as InterviewEvaluateResultDTO;
  assert.ok(data.overallScore < 6.0);
  assert.equal(data.verdict, 'Cần cải thiện');
  assert.ok(data.improvements.length > 0);
});

test('Interview Evaluate: rejects invalid answer with 422', async () => {
  const { cookie } = await registerUser();

  const emptyAns = await fetch(`${base}/api/ai/pro/interview-evaluate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
      Origin: origin
    },
    body: JSON.stringify({
      question: 'Why?',
      category: 'behavioral',
      answer: ''
    })
  });
  assert.equal(emptyAns.status, 422);

  const badCat = await fetch(`${base}/api/ai/pro/interview-evaluate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
      Origin: origin
    },
    body: JSON.stringify({
      question: 'Why?',
      category: 'nonexistent-category',
      answer: 'Valid answer text that has enough words.'
    })
  });
  assert.equal(badCat.status, 422);
});
