import express, { type NextFunction, type Request, type Response } from 'express';
import { Pool, type PoolClient } from 'pg';
import argon2 from 'argon2';
import { SignJWT, jwtVerify } from 'jose';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { Server } from 'node:http';
import { checkMigrationReadiness } from './migrator.ts';
import {
  validateApplicationInput,
  validateInterviewInput,
  validateListQuery,
  validateCandidateProfileInput,
  canonicalIntentHash,
  type StructuredErrorDTO,
  type ApplicationWireDTO,
  type InterviewWireDTO,
  type DashboardWireDTO,
  type ValidatedApplicationData,
  type ValidatedInterviewData,
  type InterviewAgendaItemDTO,
  type IcsCalendarEvent,
  type DatasetCategory,
  generateIcsCalendar,
  formatApplicationsAsCsv,
  validateBulkStatusInput,
  validateBulkTrashInput,
  validateInterviewPrepInput,
  validateInterviewEvaluateInput,
  validateCsvImportRequest,
  validateOfferEvaluationInput,
  validateOfferComparisonInput,
  validateCounterOfferInput,
  validateCheckoutInput,
  validateSimulateWebhookInput
} from '../../../packages/jobtrack-contract/src/index.ts';
import {
  JobTrackService,
  DomainError as Problem,
  fail,
  uuid,
  etag,
  parseEtagVersion
} from './services/jobtrack-service.ts';
import { createMcpRouter } from './routes/mcp.ts';
import {
  decideCredential,
  isOriginExemptGrant,
  parseBearerToken,
  type BearerGrant,
  type SessionIdentity
} from './security/credential-policy.ts';
import { resolveBearerGrant, resolveGrantIdentity } from './security/grant-resolver.ts';
import { fetchPageContent, extractJobDetails } from './services/url-fetcher.ts';
import { SubscriptionCrawlerService } from './services/subscription-crawler.ts';
import { CandidateProfileService } from './services/candidate-profile.ts';
import { AiProService, normalizeProPlan } from './services/ai-pro-service.ts';
import { DatasetService } from './services/dataset-service.ts';
import { AnalyticsService } from './services/analytics-service.ts';
import { ResumeService } from './services/resume-service.ts';
import { CompanyService } from './services/company-service.ts';
import { signPaymentPayload } from './security/payment-signature.ts';
import { parseVietnameseCurrency } from '@jobtrack/contract';
import { createHash } from 'node:crypto';

const isTest = process.env.NODE_ENV === 'test';
const devDatabaseUrl = process.env.DATABASE_URL;
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (isTest) {
  if (!testDatabaseUrl) throw Error('Set TEST_DATABASE_URL for test environment.');
  if (devDatabaseUrl && testDatabaseUrl === devDatabaseUrl) throw Error('TEST_DATABASE_URL must be distinct from development DATABASE_URL.');
}

const databaseUrl = isTest ? testDatabaseUrl : devDatabaseUrl;
const secret = process.env.JWT_SECRET || (isTest ? 'jobtrack_test_jwt_secret_with_minimum_32_characters' : undefined);
const origin = process.env.APP_ORIGIN || 'http://127.0.0.1:64364';
if (!databaseUrl || !secret || secret.length < 32) throw Error('Set DATABASE_URL and a JWT_SECRET of at least 32 characters.');
if (process.env.NODE_ENV === 'production' && !process.env.APP_ORIGIN) throw Error('Set APP_ORIGIN in production.');
if (!process.env.PAYMENT_WEBHOOK_SECRET && process.env.NODE_ENV !== 'production') {
  process.env.PAYMENT_WEBHOOK_SECRET = 'jobtrack_dev_test_payment_webhook_secret_key_32_characters';
}
if (!process.env.PAYMENT_MODE && process.env.NODE_ENV !== 'production') {
  process.env.PAYMENT_MODE = 'test';
}
const key = new TextEncoder().encode(secret);

const pool = new Pool({
  connectionString: databaseUrl,
  max: 12,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  statement_timeout: 10000,
  query_timeout: 10000
});

export const jobTrackService = new JobTrackService(pool);
export const subscriptionCrawlerService = new SubscriptionCrawlerService(pool, jobTrackService);
export const candidateProfileService = new CandidateProfileService(pool);
export const aiProService = new AiProService(pool);
export const datasetService = new DatasetService(pool);
export const analyticsService = new AnalyticsService(pool);
export const resumeService = new ResumeService(pool);
export const companyService = new CompanyService(pool);

const app = express();
app.disable('x-powered-by');

let activeRequests = 0;
let isShuttingDown = false;
let drainResolve: (() => void) | null = null;

app.use((req, res, next) => {
  const incoming = req.get('X-Request-Id');
  const reqId = (incoming && /^[0-9a-f-]{36}$/i.test(incoming)) ? incoming : randomUUID();
  (req as unknown as { requestId: string }).requestId = reqId;
  res.set('X-Request-Id', reqId);

  if (isShuttingDown) {
    res.set('Connection', 'close');
    res.status(503).json({ code: 'service_unavailable', message: 'Máy chủ đang tắt.', requestId: reqId });
    return;
  }
  activeRequests++;
  res.on('finish', () => {
    activeRequests--;
    if (isShuttingDown && activeRequests === 0 && drainResolve) {
      drainResolve();
    }
  });
  next();
});

app.use(express.json({
  limit: '32kb',
  verify: (req, _res, buffer) => {
    (req as RawBodyRequest).rawBody = Buffer.from(buffer);
  }
}));

const str = (value: unknown, max: number, field: string, required = false): string => {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) {
    throw new Problem(422, `Trường ${field} chưa hợp lệ.`, 'invalid_request', { [field]: `Trường ${field} chưa hợp lệ.` });
  }
  return value.trim();
};

const terminal = new Set(['Rejected', 'Withdrawn']);
const active = (status: string) => !terminal.has(status);

const bodyObject = (body: unknown): Record<string, unknown> =>
  body && typeof body === 'object' && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : fail(422, 'Nội dung yêu cầu chưa hợp lệ.');

type SessionRequest = Request & { userId: string; sessionId: string; requestId: string; scopes?: string[]; client?: string };
type RawBodyRequest = Request & { rawBody?: Buffer };

async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function lockSessionAndOwner(client: PoolClient, userId: string, sessionId: string) {
  const sRes = await client.query(
    'SELECT id FROM sessions WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP FOR SHARE',
    [sessionId, userId]
  );
  if (!sRes.rowCount) {
    fail(401, 'Phiên đăng nhập đã hết hạn.', 'unauthorized');
  }
  await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
}

async function ownerLock(client: PoolClient, userId: string) {
  await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
}

const cookieSecure = process.env.COOKIE_SECURE !== undefined
  ? process.env.COOKIE_SECURE === 'true'
  : origin.startsWith('https://');

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: cookieSecure,
  path: '/api',
  maxAge: 30 * 24 * 60 * 60 * 1000
};

const cookies = (header?: string) =>
  Object.fromEntries(
    (header || '').split(';').map(part => part.trim().split(/=(.*)/s).slice(0, 2))
  );

async function createSession(userId: string, client: PoolClient | Pool = pool) {
  const sessionId = randomUUID();
  await client.query(
    "INSERT INTO sessions(id,user_id,expires_at) VALUES($1,$2,CURRENT_TIMESTAMP + interval '30 days')",
    [sessionId, userId]
  );
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(key);
}

async function auth(req: Request, _res: Response, next: NextFunction) {
  try {
    const bearer = parseBearerToken(req.get('Authorization'));
    let grant: BearerGrant | null = null;
    let session: SessionIdentity | null = null;

    if (bearer.form === 'canonical') {
      const resolved = await resolveBearerGrant(pool, req.get('Authorization'));
      grant = resolved.grant;
    } else if (bearer.form === 'absent') {
      const token = cookies(req.headers.cookie).jobtrack_session;
      if (token) {
        const verified = await jwtVerify(token, key, { algorithms: ['HS256'] }).catch(() => null);
        if (verified) {
          const payload = verified.payload;
          if (uuid(payload.sub) && uuid(payload.sid)) {
            const result = await pool.query(
              'SELECT id FROM sessions WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL AND expires_at>CURRENT_TIMESTAMP',
              [payload.sid, payload.sub]
            );
            if (result.rowCount) session = { userId: payload.sub, sessionId: payload.sid };
          }
        }
      }
    }

    const decision = decideCredential({ bearerForm: bearer.form, grant, session });
    if (decision.kind === 'rejected') fail(401, 'Phiên đăng nhập đã hết hạn.', 'unauthorized');
    if (decision.kind === 'grant') {
      Object.assign(req, {
        userId: decision.userId,
        sessionId: decision.sessionId,
        scopes: decision.scopes,
        client: decision.client
      });
    } else {
      Object.assign(req, {
        userId: decision.userId,
        sessionId: decision.sessionId,
        scopes: decision.scopes
      });
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function requireScope(scope: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const scopes = (req as any).scopes || [];
    if (scopes.includes('*') || scopes.includes('full_control') || scopes.includes(scope)) {
      return next();
    }
    return fail(403, `Yêu cầu quyền truy cập: ${scope}`, 'forbidden');
  };
}

app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) return next();
  const requestOrigin = req.get('origin');
  if (!requestOrigin || requestOrigin === origin) return next();
  if (req.originalUrl?.startsWith('/api/pro/webhook') || req.path?.startsWith('/pro/webhook')) {
    return next();
  }
  // Only a grant that the shared resolver verified and whose scopes cover the
  // target path may cross the origin boundary.
  resolveGrantIdentity(pool, req.get('Authorization'))
    .then(identity => {
      if (identity && isOriginExemptGrant({
        verifiedByGrant: true,
        scopes: identity.scopes,
        path: req.path ?? ''
      })) {
        return next();
      }
      return next(new Problem(403, 'Nguồn yêu cầu không được phép.', 'invalid_origin'));
    })
    .catch(error => next(error));
});

app.use('/api/mcp', createMcpRouter(pool));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/ready', async (_req, res) => {
  if (isShuttingDown) {
    return res.status(503).json({ status: 'not_ready', error: 'server_shutting_down' });
  }
  try {
    await pool.query('SELECT 1');
    const readiness = await checkMigrationReadiness(pool);
    if (!readiness.ready) {
      return res.status(503).json({ status: 'not_ready', error: readiness.reason || 'schema_pending' });
    }
    return res.json({ status: 'ready', version: readiness.version });
  } catch (_error) {
    return res.status(503).json({ status: 'not_ready', error: 'database_unavailable' });
  }
});

export function getClientIp(req: Request): string {
  const remoteAddr = req.socket.remoteAddress || '';
  const isLocalEdge = remoteAddr === '127.0.0.1' || remoteAddr === '::1' || remoteAddr === '::ffff:127.0.0.1';
  if (isLocalEdge) {
    const forwarded = req.get('X-Forwarded-For');
    if (forwarded) {
      const ips = forwarded.split(',').map(s => s.trim());
      if (ips[0] && /^[\w.:-]+$/.test(ips[0])) {
        return ips[0];
      }
    }
  }
  return remoteAddr || '127.0.0.1';
}

export async function checkRateLimit(
  clientOrPool: Pool | PoolClient,
  ip: string,
  maxAttempts = 15,
  windowMinutes = 15
): Promise<{ allowed: boolean; retryAfter: number; count: number }> {
  const key = `auth:${ip}`;
  const res = await clientOrPool.query<{ count: number; retry_after: number }>(
    `INSERT INTO rate_limits (key, count, reset_at)
     VALUES ($1, 1, CURRENT_TIMESTAMP + ($2 || ' minutes')::interval)
     ON CONFLICT (key) DO UPDATE
     SET count = CASE
       WHEN rate_limits.reset_at <= CURRENT_TIMESTAMP THEN 1
       ELSE rate_limits.count + 1
     END,
     reset_at = CASE
       WHEN rate_limits.reset_at <= CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP + ($2 || ' minutes')::interval
       ELSE rate_limits.reset_at
     END
     RETURNING count, CEIL(EXTRACT(EPOCH FROM (reset_at - CURRENT_TIMESTAMP)))::integer AS retry_after`,
    [key, String(windowMinutes)]
  );
  const count = Number(res.rows[0].count);
  const retryAfter = Math.max(1, Number(res.rows[0].retry_after) || 1);
  return { allowed: count <= maxAttempts, retryAfter, count };
}

async function authLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const ip = getClientIp(req);
    const { allowed, retryAfter } = await checkRateLimit(pool, ip);
    if (!allowed) {
      res.set('Retry-After', String(retryAfter));
      return next(new Problem(429, 'Đã thử quá nhiều lần. Hãy đợi vài phút.', 'rate_limit_exceeded'));
    }
    next();
  } catch (err) {
    next(err);
  }
}

app.post('/api/auth/register', authLimit, async (req, res, next) => {
  try {
    const b = bodyObject(req.body);
    const email = str(b.email, 254, 'email', true).toLowerCase();
    const password = b.password;
    const invalidPassMsg = 'Mật khẩu chưa hợp lệ.';
    const passLenMsg = 'Mật khẩu cần từ 15–64 ký tự.';
    if (typeof password !== 'string' || password.length > 64) {
      throw new Problem(422, invalidPassMsg, 'invalid_request', { password: invalidPassMsg });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 15) {
      fail(422, 'Email hoặc mật khẩu chưa hợp lệ. Mật khẩu cần từ 15–64 ký tự.', 'invalid_request', {
        email: 'Email hoặc mật khẩu chưa hợp lệ.',
        password: passLenMsg
      });
    }
    const userId = randomUUID();
    const hash = await argon2.hash(password, { type: argon2.argon2id });
    let token: string;
    try {
      token = await transaction(async client => {
        await client.query(
          'INSERT INTO users(id,email,email_normalized,password_hash) VALUES($1,$2,$3,$4)',
          [userId, email, email, hash]
        );
        return createSession(userId, client);
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        fail(409, 'Email này đã có tài khoản.', 'duplicate');
      }
      throw error;
    }
    res.cookie('jobtrack_session', token, cookieOptions);
    res.status(201).json({ id: userId, email });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/login', authLimit, async (req, res, next) => {
  try {
    const b = bodyObject(req.body);
    const email = str(b.email, 254, 'email', true).toLowerCase();
    const password = b.password;
    if (typeof password !== 'string' || password.length > 64) {
      throw new Problem(422, 'Email hoặc mật khẩu chưa đúng.', 'invalid_credentials');
    }
    const result = await pool.query('SELECT id,email,password_hash FROM users WHERE email_normalized=$1', [email]);
    const user = result.rows[0];
    if (!user || !(await argon2.verify(user.password_hash, password))) {
      fail(401, 'Email hoặc mật khẩu chưa đúng.', 'invalid_credentials');
    }
    res.cookie('jobtrack_session', await createSession(user.id), cookieOptions);
    res.json({ id: user.id, email: user.email });
  } catch (error) {
    next(error);
  }
});

app.get('/api/auth/me', auth, async (req, res, next) => {
  try {
    const r = await pool.query('SELECT id,email FROM users WHERE id=$1', [(req as SessionRequest).userId]);
    res.json(r.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/logout', async (req, res, next) => {
  try {
    const token = cookies(req.headers.cookie).jobtrack_session;
    if (!token) {
      res.clearCookie('jobtrack_session', { path: '/api' });
      return res.status(204).end();
    }
    let sid: string | null = null;
    try {
      const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
      if (uuid(payload.sid)) sid = payload.sid as string;
    } catch {
      // Invalid/expired token: already logged out safely
      res.clearCookie('jobtrack_session', { path: '/api' });
      return res.status(204).end();
    }

    if (sid) {
      await transaction(async client => {
        await client.query(
          'UPDATE sessions SET revoked_at=CURRENT_TIMESTAMP WHERE id=$1 AND revoked_at IS NULL',
          [sid]
        );
      });
    }
    res.clearCookie('jobtrack_session', { path: '/api' });
    res.status(204).end();
  } catch (error) {
    return res.status(503).json({
      code: 'service_unavailable',
      message: 'Máy chủ gặp lỗi khi đăng xuất. Hãy thử lại.',
      requestId: (req as unknown as { requestId?: string }).requestId || randomUUID()
    });
  }
});

function keyFor(req: Request): string {
  const value = req.get('Idempotency-Key');
  if (!uuid(value)) throw new Problem(428, 'Thiếu khóa yêu cầu. Hãy thử lại.', 'missing_idempotency_key');
  return value;
}

app.get('/api/applications', auth, async (req, res, next) => {
  try {
    const qVal = validateListQuery(req.query as Record<string, unknown>);
    if (!qVal.ok) {
      throw new Problem(422, qVal.message, 'invalid_query', qVal.errors);
    }
    const records = await jobTrackService.listApplications((req as SessionRequest).userId, qVal.data);
    res.json(records);
  } catch (error) {
    next(error);
  }
});

app.get('/api/applications/trash', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const all = await jobTrackService.listApplications(userId, { includeDeleted: true });
    const trash = all.filter(a => a.deletedAt !== null);
    res.json(trash);
  } catch (error) {
    next(error);
  }
});

app.get('/api/applications/export.csv', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const records = await jobTrackService.listApplications(userId, { includeDeleted: false });
    const csv = formatApplicationsAsCsv(records);
    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="jobtrack-applications-${dateStr}.csv"`);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
});

app.post('/api/applications/bulk-status', auth, async (req, res, next) => {
  try {
    const val = validateBulkStatusInput(req.body);
    if (!val.ok) {
      throw new Problem(422, val.message, 'invalid_request', val.errors);
    }
    const userId = (req as SessionRequest).userId;
    const sessionId = (req as SessionRequest).sessionId;
    const result = await jobTrackService.bulkUpdateStatus(userId, val.data.ids, val.data.status, { sessionId });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/applications/bulk-trash', auth, async (req, res, next) => {
  try {
    const val = validateBulkTrashInput(req.body);
    if (!val.ok) {
      throw new Problem(422, val.message, 'invalid_request', val.errors);
    }
    const userId = (req as SessionRequest).userId;
    const sessionId = (req as SessionRequest).sessionId;
    const result = await jobTrackService.bulkMoveToTrash(userId, val.data.ids, { sessionId });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/applications/import-csv', auth, async (req, res, next) => {
  try {
    const val = validateCsvImportRequest(req.body);
    if (!val.ok) {
      throw new Problem(422, val.message, 'invalid_request', val.errors);
    }
    const userId = (req as SessionRequest).userId;
    const sessionId = (req as SessionRequest).sessionId;
    const result = await jobTrackService.bulkImportFromCsv(userId, val.data, { sessionId });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

app.get('/api/applications/:id', auth, async (req, res, next) => {
  try {
    const record = await jobTrackService.getApplication((req as SessionRequest).userId, String(req.params.id));
    if (!record || record.deletedAt) throw new Problem(404, 'Không tìm thấy hồ sơ.', 'not_found');
    res.set('ETag', etag(String(record.id), Number(record.version))).json(record);
  } catch (error) {
    next(error);
  }
});

app.post('/api/applications', auth, async (req, res, next) => {
  try {
    const val = validateApplicationInput(req.body, false);
    if (!val.ok) {
      throw new Problem(422, val.message, 'invalid_request', val.errors);
    }
    const userId = (req as SessionRequest).userId;
    const input = val.data as ValidatedApplicationData;
    const key = keyFor(req);

    const result = await jobTrackService.createApplication(userId, input, {
      idempotencyKey: key,
      sessionId: (req as SessionRequest).sessionId
    });

    if (result.replay) {
      res.set('Idempotency-Replayed', 'true');
    }
    res
      .set('ETag', etag(result.application.id, result.application.version))
      .status(result.replay ? 200 : 201)
      .json(result.application);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/applications/:id', auth, async (req, res, next) => {
  try {
    const val = validateApplicationInput(req.body, true);
    if (!val.ok) {
      throw new Problem(422, val.message, 'invalid_request', val.errors);
    }
    const userId = (req as SessionRequest).userId;
    const id = String(req.params.id);
    const ifMatch = req.get('If-Match');

    const updatedRecord = await jobTrackService.updateApplication(userId, id, val.data, {
      ifMatch,
      sessionId: (req as SessionRequest).sessionId
    });

    res.set('ETag', etag(id, updatedRecord.version)).json(updatedRecord);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/applications/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const id = String(req.params.id);
    const ifMatch = req.get('If-Match');
    const purge = req.query.soft !== 'true';

    await jobTrackService.deleteApplication(userId, id, {
      ifMatch,
      sessionId: (req as SessionRequest).sessionId,
      purge
    });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post('/api/applications/:id/trash', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const id = String(req.params.id);
    const ifMatch = req.get('If-Match');

    await jobTrackService.deleteApplication(userId, id, {
      ifMatch,
      sessionId: (req as SessionRequest).sessionId,
      purge: false
    });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post('/api/applications/:id/restore', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const id = String(req.params.id);
    const ifMatch = req.get('If-Match');

    const restored = await jobTrackService.restoreApplication(userId, id, {
      ifMatch,
      sessionId: (req as SessionRequest).sessionId
    });
    res.set('ETag', etag(id, restored.version)).json(restored);
  } catch (error) {
    next(error);
  }
});

app.get('/api/applications/:id/timeline', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const timeline = await jobTrackService.getApplicationTimeline(userId, String(req.params.id));
    res.status(200).json(timeline);
  } catch (error) {
    next(error);
  }
});

app.post('/api/applications/:id/interviews', auth, async (req, res, next) => {
  try {
    const val = validateInterviewInput(req.body, false);
    if (!val.ok) {
      throw new Problem(422, val.message, 'invalid_request', val.errors);
    }
    const userId = (req as SessionRequest).userId;
    const id = String(req.params.id);
    const input = val.data as ValidatedInterviewData;
    const key = keyFor(req);
    const ifMatch = req.get('If-Match');

    const result = await jobTrackService.createInterview(userId, id, input, {
      idempotencyKey: key,
      ifMatch,
      sessionId: (req as SessionRequest).sessionId
    });

    if (result.replay) {
      res.set('Idempotency-Replayed', 'true');
    }
    if (result.newApplicationVersion) {
      res.set('ETag', etag(id, result.newApplicationVersion));
    }
    res.status(result.replay ? 200 : 201).json(result.round);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/interviews/:id', auth, async (req, res, next) => {
  try {
    const val = validateInterviewInput(req.body, true);
    if (!val.ok) {
      throw new Problem(422, val.message, 'invalid_request', val.errors);
    }
    const userId = (req as SessionRequest).userId;
    const id = String(req.params.id);
    const ifMatch = req.get('If-Match');

    const result = await jobTrackService.updateInterview(userId, id, val.data, {
      ifMatch,
      sessionId: (req as SessionRequest).sessionId
    });

    res
      .set('ETag', etag(result.parentId, result.newApplicationVersion))
      .json(result.round);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/interviews/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const id = String(req.params.id);
    const ifMatch = req.get('If-Match');

    const result = await jobTrackService.deleteInterview(userId, id, {
      ifMatch,
      sessionId: (req as SessionRequest).sessionId
    });
    res.set('ETag', etag(result.parentId, result.newApplicationVersion)).status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get('/api/interviews', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const apps = await jobTrackService.listApplications(userId, { includeDeleted: false });
    const items: InterviewAgendaItemDTO[] = apps.flatMap(app =>
      (app.interviews || []).map(interview => ({
        ...interview,
        company: app.company,
        position: app.position,
        applicationStatus: app.status
      }))
    );
    items.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    res.json(items);
  } catch (error) {
    next(error);
  }
});

app.get('/api/interviews/export.ics', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const apps = await jobTrackService.listApplications(userId, { includeDeleted: false });
    const events: IcsCalendarEvent[] = apps.flatMap(app =>
      (app.interviews || []).map(interview => ({
        id: interview.id,
        title: interview.title,
        company: app.company,
        position: app.position,
        at: interview.at,
        timezone: interview.timezone,
        format: interview.format,
        location: interview.location,
        notes: interview.notes
      }))
    );
    const icsContent = generateIcsCalendar(events);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="jobtrack-interviews.ics"');
    res.send(icsContent);
  } catch (error) {
    next(error);
  }
});

app.get('/api/dashboard', auth, async (req, res, next) => {
  try {
    const dashboard = await jobTrackService.getDashboardSummary((req as SessionRequest).userId);
    res.json(dashboard);
  } catch (error) {
    next(error);
  }
});

app.get('/api/events', auth, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write('data: {"type":"CONNECTED"}\n\n');

  const unsubscribe = jobTrackService.subscribeEvents((req as SessionRequest).userId, event => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  req.on('close', () => {
    unsubscribe();
  });
});

app.post('/api/ai/import-url', auth, async (req, res, next) => {
  try {
    const b = bodyObject(req.body);
    const url = str(b.url, 2048, 'url', true);
    const { html, finalUrl } = await fetchPageContent(url);
    const extracted = extractJobDetails(html, finalUrl);
    res.json(extracted);
  } catch (error) {
    next(error);
  }
});

app.post('/api/ai/chat', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const sessionId = (req as SessionRequest).sessionId;
    const body = (req.body && typeof req.body === 'object') ? req.body as Record<string, unknown> : {};
    const message = String(body.chatInput || body.message || '').trim();
    if (!message) {
      throw new Problem(422, 'Nội dung tin nhắn không được để trống.', 'invalid_message');
    }

    const n8nUrl = process.env.N8N_WEBHOOK_URL || 'https://maximum-eastcoast-obstruct.ngrok-free.dev/webhook/jobtrack-agent';
    const n8nApiKey = process.env.N8N_API_KEY || process.env.CHATBOT_API_KEY || '';

    try {
      const n8nRes = await fetch(n8nUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(n8nApiKey ? { 'Authorization': `Bearer ${n8nApiKey}` } : {})
        },
        body: JSON.stringify({
          chatInput: message,
          sessionId,
          userId,
          context: {
            origin,
            timestamp: new Date().toISOString()
          }
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (n8nRes.ok) {
        const data = await n8nRes.json().catch(() => null);
        if (data) {
          return res.json(data);
        }
      }
    } catch (n8nErr) {
      console.warn('[BFF] n8n webhook call failed, falling back to local grounded response:', (n8nErr as Error).message);
    }

    // Grounded intelligence response (AI12 workflows)
    const summary = await jobTrackService.getDashboardSummary(userId);
    const lower = message.toLowerCase();

    let reply = '';
    if (lower.includes('hôm nay') || lower.includes('today') || lower.includes('làm gì') || lower.includes('deadline')) {
      const apps = await jobTrackService.listApplications(userId);
      const withDeadline = apps.filter(a => a.deadline);
      const interviews = apps.flatMap(a => (a.interviews || []).map(i => ({ ...i, company: a.company, position: a.position })));

      reply = `📋 **Kế hoạch công việc hôm nay:**\n\n` +
        `• Tổng quan: ${summary.total} hồ sơ đang theo dõi (${summary.upcoming} phỏng vấn sắp tới, ${summary.offers} offer).\n`;

      if (interviews.length > 0) {
        reply += `\n🎯 **Lịch phỏng vấn:**\n` +
          interviews.slice(0, 3).map(i => `  - **${i.company}** (${i.position}): ${i.title} vào lúc ${i.at}`).join('\n') + '\n';
      }
      if (withDeadline.length > 0) {
        reply += `\n⏰ **Hạn chót & Bước tiếp theo cần làm:**\n` +
          withDeadline.slice(0, 3).map(a => `  - **${a.company}** - ${a.position}: "${a.nextAction || 'Chưa có bước tiếp theo'}" (Deadline: ${a.deadline})`).join('\n') + '\n';
      }
      if (interviews.length === 0 && withDeadline.length === 0) {
        reply += `\nHiện chưa có deadline gấp trong ngày. Bạn có thể dành thời gian tìm kiếm thêm cơ hội mới hoặc cập nhật ghi chú cho các hồ sơ đang chờ.`;
      }
    } else if (lower.includes('phỏng vấn') || lower.includes('interview') || lower.includes('prep') || lower.includes('chuẩn bị')) {
      const apps = await jobTrackService.listApplications(userId, { status: 'Interview' });
      if (apps.length > 0) {
        const target = apps[0];
        reply = `🎯 **Chuẩn bị phỏng vấn cho ${target.company} (${target.position}):**\n\n` +
          `1. **Tìm hiểu công ty:** Xem lại mô tả công việc (JD), sản phẩm cốt lõi và tin tức gần đây của ${target.company}.\n` +
          `2. **Kỹ thuật & Dự án:** Chuẩn bị 2-3 câu chuyện STAR về thử thách kỹ thuật tiêu biểu bạn đã giải quyết.\n` +
          `3. **Câu hỏi cho nhà tuyển dụng:** Chuẩn bị 3 câu hỏi về cấu trúc team, quy trình deploy và kỳ vọng trong 3 tháng đầu.\n` +
          `4. **Kiểm tra thiết bị:** Kiểm tra đường truyền internet, webcam, micro và môi trường yên tĩnh trước 10 phút.`;
      } else {
        reply = `Hiện bạn chưa có hồ sơ nào ở trạng thái "Interview". Khi có lịch phỏng vấn, tôi sẽ giúp bạn lên checklist chuẩn bị chi tiết theo từng vòng!`;
      }
    } else if (lower.includes('lâu') || lower.includes('stale') || lower.includes('nhắc') || lower.includes('chưa cập nhật')) {
      const apps = await jobTrackService.listApplications(userId);
      const activeApps = apps.filter(a => !['Offer', 'Rejected', 'Withdrawn'].includes(a.status));
      const staleApps = activeApps.filter(a => {
        const updated = new Date(a.updatedAt).getTime();
        return (Date.now() - updated) > 7 * 86400000; // > 7 days
      });

      if (staleApps.length > 0) {
        reply = `⏰ **Hồ sơ lâu chưa có cập nhật (> 7 ngày):**\n\n` +
          staleApps.slice(0, 5).map(a => `• **${a.company}** (${a.position}) - Trạng thái: ${a.status}. Cập nhật lần cuối: ${new Date(a.updatedAt).toLocaleDateString('vi-VN')}`).join('\n') +
          `\n\n💡 Bạn có thể gửi email follow-up nhẹ nhàng để hỏi thăm tiến độ tuyển dụng.`;
      } else {
        reply = `Tuyệt vời! Tất cả các hồ sơ đang ứng tuyển của bạn đều được cập nhật gần đây (trong vòng 7 ngày qua).`;
      }
    } else if (lower.includes('thư') || lower.includes('email') || lower.includes('follow-up') || lower.includes('nháp')) {
      reply = `✉️ **Mẫu thư Follow-up sau ứng tuyển / phỏng vấn:**\n\n` +
        `**Tiêu đề:** [Họ và tên] - Thư hỏi thăm tiến độ ứng tuyển vị trí [Tên vị trí]\n\n` +
        `Kính gửi Bộ phận Tuyển dụng [Tên công ty],\n\n` +
        `Em là [Họ và tên]. Vừa qua em đã có cơ hội tham gia ứng tuyển vị trí [Tên vị trí] tại quý công ty.\n\n` +
        `Em rất ấn tượng với định hướng phát triển cũng như văn hóa làm việc của [Tên công ty]. Em viết thư này để hỏi thăm tình hình xét duyệt hồ sơ / kết quả vòng trao đổi vừa qua, cũng như sẵn sàng cung cấp thêm bất kỳ thông tin nào nếu công ty cần.\n\n` +
        `Rất mong sớm nhận được phản hồi từ anh/chị.\n\n` +
        `Trân trọng,\n[Họ và tên của bạn] - [Số điện thoại]`;
    } else {
      reply = `Chào bạn! Tôi là trợ lý JobTrack AI (Full Control). Hiện bạn đang có ${summary.total} hồ sơ ứng tuyển, ${summary.upcoming} phỏng vấn sắp tới và ${summary.offers} offer.\n\nBạn có thể hỏi tôi:\n• "Hôm nay tôi cần làm gì?"\n• "Chuẩn bị phỏng vấn"\n• "Kiểm tra hồ sơ lâu chưa cập nhật"\n• "Nháp thư follow-up"\nHoặc nhập trực tiếp link tuyển dụng từ nút "Nhập từ link"!`;
    }

    return res.json({
      output: reply,
      text: reply
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/ai/grants', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const grants = (
      await pool.query(
        'SELECT id, client, scopes, created_at AS "createdAt", expires_at AS "expiresAt" FROM ai_grants WHERE user_id=$1 AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP ORDER BY created_at DESC',
        [userId]
      )
    ).rows;
    res.json(grants);
  } catch (error) {
    next(error);
  }
});

app.post('/api/ai/grants', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const b = bodyObject(req.body);
    const client = str(b.client || 'claude-desktop', 64, 'client', false);
    const plainToken = `jt_sec_${randomUUID().replace(/-/g, '')}`;
    const tokenHash = createHash('sha256').update(plainToken).digest('hex');
    const id = randomUUID();

    await pool.query(
      "INSERT INTO ai_grants(id, user_id, client, token_hash, scopes, expires_at) VALUES($1, $2, $3, $4, ARRAY['full_control'], CURRENT_TIMESTAMP + interval '90 days')",
      [id, userId, client, tokenHash]
    );

    res.status(201).json({
      id,
      client,
      token: plainToken,
      expiresIn: '90 days'
    });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/ai/grants/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const id = String(req.params.id);
    await pool.query(
      'UPDATE ai_grants SET revoked_at=CURRENT_TIMESTAMP WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL',
      [id, userId]
    );
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get('/api/profile', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const profile = await candidateProfileService.getProfile(userId);
    if (!profile) {
      return res.status(404).json({ code: 'not_found', message: 'Hồ sơ ứng viên chưa được khởi tạo.' });
    }
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

app.put('/api/profile', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateCandidateProfileInput(req.body);
    if (!validation.ok) {
      throw new Problem(422, validation.message, 'invalid_request', validation.errors);
    }
    const input = { ...validation.data };
    const ifMatch = req.headers['if-match'];
    if (typeof ifMatch === 'string' && ifMatch.trim()) {
      input.expectedUpdatedAt = ifMatch.replace(/^"|"$/g, '').trim();
    }
    const profile = await candidateProfileService.upsertProfile(userId, input);
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

app.get('/api/subscriptions', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const subs = await subscriptionCrawlerService.listSubscriptions(userId);
    res.json(subs);
  } catch (error) {
    next(error);
  }
});

app.post('/api/subscriptions', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const b = bodyObject(req.body);
    const title = str(b.title, 250, 'title', true);
    const keywords = Array.isArray(b.keywords) ? b.keywords.map(String) : [];
    const sub = await subscriptionCrawlerService.createSubscription(userId, {
      title,
      keywords,
      location: typeof b.location === 'string' ? b.location.trim() : null,
      minSalary: typeof b.minSalary === 'number' ? b.minSalary : null,
      sources: Array.isArray(b.sources) ? b.sources.map(String) : ['rss', 'public_board']
    });
    res.status(201).json(sub);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/subscriptions/:id/toggle', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const id = String(req.params.id);
    const b = (req.body && typeof req.body === 'object') ? req.body as Record<string, unknown> : {};
    const isActive = typeof b.isActive === 'boolean' ? b.isActive : undefined;
    const updated = await subscriptionCrawlerService.toggleSubscription(userId, id, isActive);
    if (!updated) {
      return res.status(404).json({ code: 'not_found', message: 'Không tìm thấy bộ lọc đăng ký.' });
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/subscriptions/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const id = String(req.params.id);
    const deleted = await subscriptionCrawlerService.deleteSubscription(userId, id);
    if (!deleted) {
      return res.status(404).json({ code: 'not_found', message: 'Không tìm thấy bộ lọc đăng ký.' });
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post('/api/subscriptions/:id/run', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const id = String(req.params.id);
    const b = (req.body && typeof req.body === 'object') ? req.body as Record<string, unknown> : {};
    const feedItems = Array.isArray(b.feedItems) ? b.feedItems : [];
    const result = await subscriptionCrawlerService.runSubscription(userId, id, feedItems);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get('/api/pro/status', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const status = await aiProService.getProStatus(userId);
    res.json(status);
  } catch (error) {
    next(error);
  }
});

app.get('/api/pro/plans', auth, async (_req, res, next) => {
  try {
    const plans = aiProService.getPlans();
    res.json({ plans });
  } catch (error) {
    next(error);
  }
});

app.get('/api/pro/orders/:orderId', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const orderId = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
    const order = await aiProService.getOrder(userId, orderId);
    res.json(order);
  } catch (error) {
    next(error);
  }
});

app.post('/api/pro/checkout', auth, async (req, res, next) => {
  try {
    const val = validateCheckoutInput(req.body);
    if (!val.ok) {
      throw new Problem(422, val.message, 'invalid_request', val.errors);
    }
    const userId = (req as SessionRequest).userId;
    const checkout = await aiProService.createCheckout(userId, val.data.plan);
    res.json(checkout);
  } catch (error) {
    next(error);
  }
});

app.post('/api/pro/activate', (_req, _res, next) => {
  next(new Problem(403, 'Gói Pro chỉ được kích hoạt bằng webhook thanh toán đã ký.', 'activation_requires_payment'));
});

app.post('/api/pro/webhook', async (req, res, next) => {
  try {
    const b = (req.body && typeof req.body === 'object' && !Array.isArray(req.body))
      ? req.body as Record<string, unknown>
      : {};

    const result = await aiProService.handlePaymentWebhook({
      rawBody: (req as RawBodyRequest).rawBody ?? Buffer.alloc(0),
      signature: req.get('X-JobTrack-Signature') ?? undefined,
      timestamp: req.get('X-JobTrack-Timestamp') ?? undefined,
      payload: b
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/pro/test/simulate-webhook', auth, async (req, res, next) => {
  try {
    const val = validateSimulateWebhookInput(req.body);
    if (!val.ok) {
      throw new Problem(422, val.message, 'invalid_request', val.errors);
    }
    const userId = (req as SessionRequest).userId;
    const order = await aiProService.getOrder(userId, val.data.orderId);
    if (order.status === 'paid') {
      return res.json({
        success: true,
        replayed: true,
        orderId: order.orderId,
        plan: order.plan
      });
    }

    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || 'jobtrack_dev_test_payment_webhook_secret_key_32_characters';
    const payload = {
      transferCode: order.transferCode,
      amount: order.amount,
      currency: order.currency
    };
    const rawBody = Buffer.from(JSON.stringify(payload));
    const timestamp = Date.now();
    const signature = signPaymentPayload({
      secret: webhookSecret,
      timestamp,
      rawBody
    });

    const result = await aiProService.handlePaymentWebhook({
      rawBody,
      signature,
      timestamp: String(timestamp),
      payload
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get('/api/analytics/summary', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const summary = await analyticsService.getSummary(userId, req.query);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

app.get('/api/analytics/goals', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const goals = await analyticsService.getGoals(userId);
    res.json(goals);
  } catch (error) {
    next(error);
  }
});

app.put('/api/analytics/goals', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const goals = await analyticsService.updateGoals(userId, req.body);
    res.json(goals);
  } catch (error) {
    next(error);
  }
});

app.get('/api/resumes', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const items = await resumeService.listResumes(userId);
    res.json(items);
  } catch (error) {
    next(error);
  }
});

app.post('/api/resumes', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const created = await resumeService.createResume(userId, req.body);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

app.get('/api/resumes/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const item = await resumeService.getResume(userId, String(req.params.id));
    res.json(item);
  } catch (error) {
    next(error);
  }
});

app.put('/api/resumes/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const updated = await resumeService.updateResume(userId, String(req.params.id), req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/resumes/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    await resumeService.deleteResume(userId, String(req.params.id));
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post('/api/resumes/tailor', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const result = await resumeService.tailorResume(userId, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get('/api/companies/:name', auth, async (req, res, next) => {
  try {
    const profile = await companyService.getCompany(String(req.params.name));
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

app.post('/api/companies/:name/reviews', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const review = await companyService.addReview(userId, String(req.params.name), req.body);
    res.status(201).json(review);
  } catch (error) {
    next(error);
  }
});

app.get('/api/companies/:name/salaries', auth, async (req, res, next) => {
  try {
    const salaries = await companyService.getSalaryBenchmarks(String(req.params.name));
    res.json(salaries);
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/extension/pair', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const b = (req.body && typeof req.body === 'object') ? req.body as Record<string, unknown> : {};
    const client = str(b.client || 'PageWeave Extension', 64, 'client', false);
    const plainToken = `jt_sec_${randomUUID().replace(/-/g, '')}`;
    const tokenHash = createHash('sha256').update(plainToken).digest('hex');
    const id = randomUUID();

    const scopes = ['extension:capture', 'datasets:write', 'jobtrack:apply', 'ai:pro'];

    await pool.query(
      "INSERT INTO ai_grants(id, user_id, client, token_hash, scopes, expires_at) VALUES($1, $2, $3, $4, $5, CURRENT_TIMESTAMP + interval '90 days')",
      [id, userId, client, tokenHash, scopes]
    );

    res.status(201).json({
      id,
      client,
      token: plainToken,
      scopes,
      expiresIn: '90 days'
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/auth/extension/status', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const proStatus = await aiProService.getProStatus(userId);
    const scopes = (req as SessionRequest).scopes || [];
    res.json({
      valid: true,
      userId,
      tier: proStatus.tier,
      isPro: proStatus.isPro,
      expiresAt: proStatus.expiresAt,
      scopes,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/datasets', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const datasets = await datasetService.listDatasets(userId);
    res.json(datasets);
  } catch (error) {
    next(error);
  }
});

app.post('/api/datasets', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const b = bodyObject(req.body);
    const name = str(b.name, 200, 'name', true);
    const description = typeof b.description === 'string' ? b.description.trim() : null;
    const allowedCategories: DatasetCategory[] = ['product_research', 'research_notes', 'company_list', 'jobtrack', 'custom'];
    const rawCat = typeof b.category === 'string' ? b.category : 'custom';
    const category: DatasetCategory = allowedCategories.includes(rawCat as DatasetCategory) ? (rawCat as DatasetCategory) : 'custom';
    const columns = Array.isArray(b.columns) ? b.columns : [];

    const dataset = await datasetService.createDataset(userId, {
      name,
      description,
      category,
      columns
    });
    res.status(201).json(dataset);
  } catch (error) {
    next(error);
  }
});

app.get('/api/datasets/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const id = String(req.params.id);
    const dataset = await datasetService.getDataset(id, userId);
    if (!dataset) {
      return res.status(404).json({ code: 'not_found', message: 'Không tìm thấy bộ dữ liệu.' });
    }
    res.json(dataset);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/datasets/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const id = String(req.params.id);
    const b = bodyObject(req.body);
    const updated = await datasetService.updateDataset(id, userId, {
      name: typeof b.name === 'string' ? b.name : undefined,
      description: typeof b.description === 'string' ? b.description : undefined,
      columns: Array.isArray(b.columns) ? b.columns : undefined
    });
    if (!updated) {
      return res.status(404).json({ code: 'not_found', message: 'Không tìm thấy bộ dữ liệu.' });
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/datasets/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const id = String(req.params.id);
    const deleted = await datasetService.deleteDataset(id, userId);
    if (!deleted) {
      return res.status(404).json({ code: 'not_found', message: 'Không tìm thấy bộ dữ liệu.' });
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get('/api/datasets/:id/records', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const id = String(req.params.id);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '100'), 10), 1), 500);
    const offset = Math.max(parseInt(String(req.query.offset || '0'), 10), 0);
    const result = await datasetService.listRecords(id, userId, limit, offset);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/datasets/:id/records', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const id = String(req.params.id);
    const b = bodyObject(req.body);
    const records = Array.isArray(b.records) ? b.records : b.record ? [b.record] : [];
    if (records.length === 0) {
      throw new Problem(422, 'Vui lòng cung cấp danh sách bản ghi cần lưu.', 'invalid_request');
    }
    const dedup = b.dedup !== false;
    const result = await datasetService.addRecords(id, userId, records, dedup);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.get('/api/datasets/:id/export', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const id = String(req.params.id);
    const { filename, content } = await datasetService.exportDatasetAsCsv(id, userId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(content);
  } catch (error) {
    next(error);
  }
});

app.get('/api/usage/summary', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const summary = await datasetService.getUsageSummary(userId);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

app.post('/api/ai/transform', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const b = bodyObject(req.body);
    const mode = str(b.mode || 'normalize', 32, 'mode', true);
    const input = typeof b.input === 'string' ? b.input : JSON.stringify(b.input || '');

    let output: unknown;
    if (mode === 'currency') {
      output = parseVietnameseCurrency(input);
    } else if (mode === 'summarize') {
      const sentences = input.replace(/\s+/g, ' ').split(/[.!?]\s+/).filter(s => s.trim().length > 15);
      const summary = sentences.slice(0, 3).join('. ') + (sentences.length > 3 ? '.' : '');
      output = {
        summary: summary || input.slice(0, 300),
        keyPoints: sentences.slice(0, 4),
        wordCount: input.split(/\s+/).length
      };
    } else {
      output = {
        text: input.trim().normalize('NFKC'),
        currency: parseVietnameseCurrency(input)
      };
    }

    await datasetService.logUsage(userId, 'ai_transform', 1, { mode });
    res.json({ mode, result: output });
  } catch (error) {
    next(error);
  }
});

app.post('/api/ai/pro/ats-match', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const b = bodyObject(req.body);
    const company = typeof b.company === 'string' ? b.company.trim() : '';
    const position = typeof b.position === 'string' ? b.position.trim() : '';
    const notes = typeof b.notes === 'string' ? b.notes.trim() : '';
    if (!position) {
      throw new Problem(422, 'Vui lòng cung cấp vị trí ứng tuyển.', 'invalid_request');
    }

    const profile = await candidateProfileService.getProfile(userId);
    const result = await aiProService.analyzeAtsMatch({ company, position, notes }, profile);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/ai/pro/cover-letter', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const b = bodyObject(req.body);
    const company = typeof b.company === 'string' ? b.company.trim() : '';
    const position = typeof b.position === 'string' ? b.position.trim() : '';
    const notes = typeof b.notes === 'string' ? b.notes.trim() : '';
    const language = b.language === 'en' ? 'en' : 'vi';
    if (!position) {
      throw new Problem(422, 'Vui lòng cung cấp vị trí ứng tuyển.', 'invalid_request');
    }

    const profile = await candidateProfileService.getProfile(userId);
    const result = await aiProService.generateCoverLetter({ company, position, notes }, profile, { language });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/ai/pro/interview-prep', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateInterviewPrepInput(req.body);
    if (!val.ok) {
      throw new Problem(422, val.message, 'invalid_request', val.errors);
    }
    const profile = await candidateProfileService.getProfile(userId);
    const result = await aiProService.generateInterviewPrep(val.data, profile);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/ai/pro/interview-evaluate', auth, async (req, res, next) => {
  try {
    const val = validateInterviewEvaluateInput(req.body);
    if (!val.ok) {
      throw new Problem(422, val.message, 'invalid_request', val.errors);
    }
    const result = await aiProService.evaluateInterviewAnswer(val.data);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/ai/pro/offer-evaluate', auth, async (req, res, next) => {
  try {
    const val = validateOfferEvaluationInput(req.body);
    if (!val.ok) {
      throw new Problem(422, val.message, 'invalid_request', val.errors);
    }
    const userId = (req as SessionRequest).userId;
    const result = await aiProService.evaluateOffer(userId, val.data);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/ai/pro/offer-compare', auth, async (req, res, next) => {
  try {
    const val = validateOfferComparisonInput(req.body);
    if (!val.ok) {
      throw new Problem(422, val.message, 'invalid_request', val.errors);
    }
    const userId = (req as SessionRequest).userId;
    const result = await aiProService.compareOfferList(userId, val.data);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/ai/pro/counter-offer', auth, async (req, res, next) => {
  try {
    const val = validateCounterOfferInput(req.body);
    if (!val.ok) {
      throw new Problem(422, val.message, 'invalid_request', val.errors);
    }
    const userId = (req as SessionRequest).userId;
    const result = await aiProService.generateCounterOffer(userId, val.data);
    res.json(result);
  } catch (error) {
    next(error);
  }
});



app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
  const reqId = (req as unknown as { requestId?: string }).requestId || randomUUID();
  res.set('X-Request-Id', reqId);

  if (error instanceof Problem) {
    const resp: StructuredErrorDTO = {
      code: error.code,
      message: error.message,
      requestId: reqId
    };
    if (error.fields) resp.fields = error.fields;
    if (error.existing) resp.existing = error.existing as StructuredErrorDTO['existing'];
    return res.status(error.status).json(resp);
  }

  if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
    return res.status(400).json({
      code: 'malformed_json',
      message: 'Dữ liệu JSON không hợp lệ.',
      requestId: reqId
    });
  }

  if ((error as unknown as { type?: string; status?: number }).type === 'entity.too.large' || (error as unknown as { status?: number }).status === 413) {
    return res.status(413).json({
      code: 'payload_too_large',
      message: 'Nội dung yêu cầu vượt quá dung lượng cho phép.',
      requestId: reqId
    });
  }

  const code = (error as { code?: string })?.code;
  if (code === '23505') {
    return res.status(409).json({
      code: 'duplicate',
      message: 'Tin tuyển dụng này đã có hồ sơ đang hoạt động.',
      requestId: reqId
    });
  }

  if (code === '23514' || code === '22P02' || code === '22007') {
    return res.status(422).json({
      code: 'invalid_request',
      message: 'Dữ liệu chưa hợp lệ. Kiểm tra lại trước khi lưu.',
      requestId: reqId
    });
  }

  console.error('API error', { name: (error as Error)?.name, code, reqId });
  return res.status(500).json({
    code: 'server_error',
    message: 'Máy chủ gặp lỗi. Thử lại sau.',
    requestId: reqId
  });
});

const port = Number(process.env.PORT || 64366);
const host = process.env.HOST || process.env.BIND_ADDRESS || '127.0.0.1';

export async function gracefulShutdown(server?: Server, timeoutMs = 10000): Promise<void> {
  isShuttingDown = true;
  if (server) {
    await new Promise<void>(resolve => {
      server.close(() => resolve());
    });
  }
  if (activeRequests > 0) {
    await Promise.race([
      new Promise<void>(resolve => {
        drainResolve = resolve;
      }),
      new Promise<void>(resolve => setTimeout(resolve, timeoutMs))
    ]);
  }
  await pool.end();
}

export function startServer(p = port, h = host): Promise<Server> {
  return new Promise(resolve => {
    const s = app.listen(p, h, () => {
      resolve(s);
    });
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const server = app.listen(port, host, () => {
    console.info(`JobTrack API listening on ${host}:${port}`);
  });
  const handleSignal = (sig: string) => {
    console.info(`Received ${sig}. Starting graceful shutdown...`);
    gracefulShutdown(server)
      .then(() => {
        console.info('Server shutdown cleanly.');
        process.exit(0);
      })
      .catch(err => {
        console.error('Error during shutdown:', err);
        process.exit(1);
      });
  };
  process.on('SIGTERM', () => handleSignal('SIGTERM'));
  process.on('SIGINT', () => handleSignal('SIGINT'));
}

export { app, pool, cookieSecure };
