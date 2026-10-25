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
  validateSimulateWebhookInput,
  validateContactInput,
  validateInteractionInput,
  validatePipelineMetadataInput,
  validateWeightsInput,
  validateScorecardInput,
  validateChatInput,
  DEFAULT_SUGGESTED_CHAT_PROMPTS,
  type ChatActionReceiptDTO,
  validateMilestoneUpdateInput,
  validateRoadmapGenerateInput,
  validateEmailParseInput,
  validateEmailApplyInput,
  validateCreateCampaignInput,
  validateUpdateRecipientStepInput,
  validateStartSimulationInput,
  validateSubmitTurnInput,
  validatePortfolioConfigInput,
  validateGenerateTokenInput
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
import { FollowUpService } from './services/follow-up-service.ts';
import { ContactService } from './services/contact-service.ts';
import { PipelineService } from './services/pipeline-service.ts';
import { DecisionService } from './services/decision-service.ts';
import { ChatService } from './services/chat-service.ts';
import { RoadmapService } from './services/roadmap-service.ts';
import { EmailIngestService } from './services/email-ingest-service.ts';
import { OutreachService } from './services/outreach-service.ts';
import { SimulationService } from './services/simulation-service.ts';
import { PortfolioService } from './services/portfolio-service.ts';
import { CompensationService } from './services/compensation-service.ts';
import { TrajectoryService } from './services/trajectory-service.ts';
import { ResumeOptimizerService } from './services/resume-optimizer-service.ts';
import { PipelineVelocityService } from './services/pipeline-velocity-service.ts';
import { CultureRadarService } from './services/culture-radar-service.ts';
import { HeadhunterCrmService } from './services/headhunter-crm-service.ts';
import { SystemDesignService } from './services/system-design-service.ts';
import { EquityLiquidityService } from './services/equity-liquidity-service.ts';
import { BackchannelService } from './services/backchannel-service.ts';
import { ExecutiveContractService } from './services/executive-contract-service.ts';
import { ExecutiveOnboardingService } from './services/executive-onboarding-service.ts';
import { BoardAdvisoryNexusService } from './services/board-advisory-nexus-service.ts';
import { ExecutiveSeveranceService } from './services/executive-severance-service.ts';
import { TechnicalDueDiligenceService } from './services/technical-due-diligence-service.ts';
import { OrgTopologyStudioService } from './services/org-topology-studio-service.ts';
import { ValueStreamStudioService } from './services/value-stream-studio-service.ts';
import { CloudFinopsStudioService } from './services/cloud-finops-studio-service.ts';
import { AiGovernanceStudioService } from './services/ai-governance-studio-service.ts';
import { SuccessionPipelineStudioService } from './services/succession-pipeline-studio-service.ts';
import { CyberRiskGovernanceStudioService } from './services/cyber-risk-governance-studio-service.ts';
import { EsgSustainabilityStudioService } from './services/esg-sustainability-studio-service.ts';
import { SupplyChainResilienceStudioService } from './services/supply-chain-resilience-studio-service.ts';
import { WorkforceTotalRewardsStudioService } from './services/workforce-total-rewards-studio-service.ts';
import { CorporateTreasuryNexusService } from './services/corporate-treasury-nexus-service.ts';
import { InternalAuditErmNexusService } from './services/internal-audit-erm-nexus-service.ts';
import { LegalOperationsNexusService } from './services/legal-operations-nexus-service.ts';
import { InvestorRelationsNexusService } from './services/investor-relations-nexus-service.ts';
import { CorpDevPmiNexusService } from './services/corp-dev-pmi-nexus-service.ts';
import { GlobalTradeSanctionsNexusService } from './services/global-trade-sanctions-nexus-service.ts';
import { StrategicCommsCrisisNexusService } from './services/strategic-comms-crisis-nexus-service.ts';
import { ShareholderActivismDefenseNexusService } from './services/shareholder-activism-defense-nexus-service.ts';
import { AntitrustCompetitionNexusService } from './services/antitrust-competition-nexus-service.ts';
import {
  validateSupplierBomNodeInput,
  validateDisruptionSimulationInput,
  validateHubComparisonInput,
  validateSupplyChainBoardMemoGenerateInput,
  validateSupplyChainSignoffInput,
  type BoardSignoffRole,
  validateSalaryBandGradeInput,
  validateRelativeTsrSimulationInput,
  validateSection83bArbitrageInput,
  validateGenerateCdaBoardMemoInput,
  validateSignoffCdaBoardMemoInput,
  type TotalRewardsBoardSignoffRole,
  validateWorkingCapitalSimulationInput,
  validateFxSimulationInput,
  validateBailInStressInput,
  validateGenerateTreasuryBoardMemoInput,
  validateSignoffTreasuryBoardMemoInput,
  validateSoxControlInput,
  validateEnterpriseRiskInput,
  validateCcmEventInput,
  validateWhistleblowerReportInput,
  validateRemediationPlanInput,
  validateTripartiteSignOffInput,
  validateLegalEntityInput,
  validateMaterialContractInput,
  validateLitigationMatterInput,
  validateLegalHoldInput,
  validateBoardSignoffInput,
  validateShareholderInput as validateIrShareholderInput,
  validateConsensusGuidanceInput as validateIrConsensusGuidanceInput,
  validateNdrMeetingInput as validateIrNdrMeetingInput,
  validateCapitalFinancingInput as validateIrCapitalFinancingInput,
  validateForm8KSignoffInput as validateIrForm8KSignoffInput,
  validateCorpDevTargetInput,
  validateVdrFindingInput,
  validateDcfSimulationInput,
  validateLboSimulationInput,
  validateSynergiesSimulationInput,
  validateCollarSimulationInput,
  validateAntitrustAssessmentInput,
  validateTalentRetentionInput,
  validateCorpDevSignoffInput,
  validateSanctionsScreeningInput,
  validateEccnClassificationInput,
  validateDeemedExportAuditInput,
  validateCfiusAssessmentInput,
  validateCustomsDutyInput,
  validateCompileVsdInput,
  validateExecuteSignoffInput,
  validateCreateCrisisIncidentInput,
  validateCreateHoldingStatementInput,
  validateRecordVerifiedFactInput,
  validateRecordQaBridgeItemInput,
  validateSubmitTripartiteSignoffInput,
  validateCreateActivistCampaignInput,
  validateRegisterWolfpackAccumulationInput,
  validateDeployRightsPlanInput,
  validateRecordNomineeComparisonInput,
  validateSubmitActivismSignoffInput,
  validateCreateMergerTransactionInput,
  validateDefineMarketInput,
  validateProposeDivestiturePackageInput,
  validateSubmitAntitrustSignoffInput
} from '../../../packages/jobtrack-contract/src/index.ts';
import { signPaymentPayload } from './security/payment-signature.ts';
import {
  parseVietnameseCurrency,
  validateCreateCompensationForecastInput,
  validateSimulateTrajectoryInput,
  validateUpdateCompetenciesInput,
  validateOptimizeResumeInput,
  validateRewriteBulletInput,
  rewriteBulletPointsXyz,
  validateCalculateVelocityReportInput,
  validateAnalyzeCultureInput,
  validateParsePitchInput,
  validateRecruiterLeadInput,
  validateMandateInput,
  validateRecruiterReplyDraftInput,
  validateCapacityInput,
  validateSystemDesignSessionInput,
  validateSystemDesignBlueprintInput,
  validateEquityGrantInput,
  validateEquityModelMutationInput,
  validateReferenceAdvocateInput,
  validateBackchannelAuditInput,
  validateExecutiveContractInput,
  validatePriorInventionInput,
  validateContractRedlineInput,
  validateExecutiveOnboardingPlanInput,
  validateStakeholderInput,
  validateMilestoneInput,
  validateDiagnosticsInput,
  validateBoardMandateInput,
  validateGovernanceMatrixInput,
  validateSeveranceCaseInput,
  validateGoodReasonEventInput,
  validateDueDiligenceAuditInput,
  validateDiligenceFindingInput,
  validateTeamTopologyInput,
  validateReorgScenarioInput,
  validateValueStreamInput,
  validateStrategicOkrInput,
  validateDoraCalculationInput,
  validateFlowSimulationInput,
  validateCapitalizedProjectInput,
  validateBoardMemoGenerateInput,
  validateTenantAllocationInput,
  validateCommitmentInput,
  validateCommitmentPurchaseSimulationInput,
  validateAnomalyDetectionInput,
  validateIdleWasteRemediationInput,
  validateKubernetesRightsizingInput,
  validateCfoMemoGenerateInput,
  validateLlmEvaluationInput,
  validateCascadeSimulationInput,
  validateGuardrailThresholds,
  validateVectorIndexConfig,
  validateAiBoardMemoGenerateInput,
  validateTalentProfileInput,
  validateRetentionInterventionInput,
  validateCriticalRoleInput,
  validateSuccessorCandidateInput,
  validateExecutiveDevelopmentPlanInput,
  validateSuccessionPlanInput,
  validateSignOffInput
} from '@jobtrack/contract';
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
export const followUpService = new FollowUpService(pool);
export const contactService = new ContactService(pool);
export const pipelineService = new PipelineService(pool);
export const decisionService = new DecisionService(pool);
export const chatService = new ChatService(pool);
export const roadmapService = new RoadmapService(pool);
export const emailIngestService = new EmailIngestService(pool);
export const outreachService = new OutreachService(pool);
export const simulationService = new SimulationService(pool);
export const portfolioService = new PortfolioService(pool);
export const compensationService = new CompensationService(pool);
export const trajectoryService = new TrajectoryService(pool);
export const resumeOptimizerService = new ResumeOptimizerService(pool);
export const pipelineVelocityService = new PipelineVelocityService(pool);
export const cultureRadarService = new CultureRadarService(pool);
export const headhunterCrmService = new HeadhunterCrmService(pool);
export const systemDesignService = new SystemDesignService(pool);
export const equityLiquidityService = new EquityLiquidityService(pool);
export const backchannelService = new BackchannelService(pool);
export const executiveContractService = new ExecutiveContractService(pool);
export const executiveOnboardingService = new ExecutiveOnboardingService(pool);
export const boardAdvisoryNexusService = new BoardAdvisoryNexusService(pool);
export const executiveSeveranceService = new ExecutiveSeveranceService(pool);
export const technicalDueDiligenceService = new TechnicalDueDiligenceService(pool);
export const orgTopologyStudioService = new OrgTopologyStudioService(pool);
export const valueStreamStudioService = new ValueStreamStudioService(pool);
export const cloudFinopsStudioService = new CloudFinopsStudioService(pool);
export const aiGovernanceStudioService = new AiGovernanceStudioService(pool);
export const successionPipelineStudioService = new SuccessionPipelineStudioService(pool);
export const cyberRiskGovernanceStudioService = new CyberRiskGovernanceStudioService(pool);
export const esgSustainabilityStudioService = new EsgSustainabilityStudioService(pool);
export const supplyChainResilienceStudioService = new SupplyChainResilienceStudioService(pool);
export const workforceTotalRewardsStudioService = new WorkforceTotalRewardsStudioService(pool);
export const corporateTreasuryNexusService = new CorporateTreasuryNexusService(pool);
export const internalAuditErmNexusService = new InternalAuditErmNexusService(pool);
export const legalOperationsNexusService = new LegalOperationsNexusService(pool);
export const investorRelationsNexusService = new InvestorRelationsNexusService(pool);
export const corpDevPmiNexusService = new CorpDevPmiNexusService(pool);
export const globalTradeSanctionsNexusService = new GlobalTradeSanctionsNexusService(pool);
export const strategicCommsCrisisNexusService = new StrategicCommsCrisisNexusService(pool);
export const shareholderActivismDefenseNexusService = new ShareholderActivismDefenseNexusService(pool);
export const antitrustCompetitionNexusService = new AntitrustCompetitionNexusService(pool);

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

app.get('/api/applications/stagnant', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const list = await pipelineService.getStagnantApplications(userId);
    res.json(list);
  } catch (error) {
    next(error);
  }
});

app.get('/api/pipeline/summary', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const summary = await pipelineService.getPipelineSummary(userId);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

app.get('/api/decision-matrix/weights', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const weights = await decisionService.getWeights(userId);
    res.json(weights);
  } catch (error) {
    next(error);
  }
});

app.put('/api/decision-matrix/weights', auth, async (req, res, next) => {
  try {
    const val = validateWeightsInput(req.body);
    if (!val.ok) {
      throw new Problem(422, val.message, 'invalid_request', val.errors);
    }
    const userId = (req as SessionRequest).userId;
    const updated = await decisionService.saveWeights(userId, val.data);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});


app.get('/api/decision-matrix', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const idsParam = req.query.ids;
    let appIds: string[] | undefined = undefined;
    if (typeof idsParam === 'string' && idsParam.trim()) {
      appIds = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
    }
    const matrix = await decisionService.getDecisionMatrix(userId, appIds);
    res.json(matrix);
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

app.patch('/api/applications/:id/pipeline', auth, async (req, res, next) => {
  try {
    const val = validatePipelineMetadataInput(req.body);
    if (!val.ok) {
      throw new Problem(422, val.message, 'invalid_request', val.errors);
    }
    const userId = (req as SessionRequest).userId;
    const updated = await pipelineService.updatePipelineMetadata(userId, String(req.params.id), val.data);
    if (!updated) {
      throw new Problem(404, 'Không tìm thấy hồ sơ ứng tuyển cần cập nhật tiến độ.', 'not_found');
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

app.get('/api/applications/:id/scorecard', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const scorecard = await decisionService.getScorecard(userId, String(req.params.id));
    if (!scorecard) {
      throw new Problem(404, 'Không tìm thấy phiếu điểm của hồ sơ.', 'not_found');
    }
    res.json(scorecard);
  } catch (error) {
    next(error);
  }
});

app.put('/api/applications/:id/scorecard', auth, async (req, res, next) => {
  try {
    const val = validateScorecardInput(req.body);
    if (!val.ok) {
      throw new Problem(422, val.message, 'invalid_request', val.errors);
    }
    const userId = (req as SessionRequest).userId;
    const updated = await decisionService.updateScorecard(userId, String(req.params.id), val.data);
    if (!updated) {
      throw new Problem(404, 'Không tìm thấy hồ sơ để cập nhật phiếu điểm.', 'not_found');
    }
    res.json(updated);
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
    
    const valid = validateChatInput({
      message: body.message || body.chatInput,
      sessionId,
      context: typeof body.context === 'object' && body.context !== null ? (body.context as Record<string, unknown>) : undefined
    });

    if (!valid.ok) {
      throw new Problem(422, valid.message, 'invalid_message');
    }

    const message = valid.data.message;

    const plainGrantToken = `jt_grant_${randomUUID().replace(/-/g, '')}`;
    const grantTokenHash = createHash('sha256').update(plainGrantToken).digest('hex');
    const grantId = randomUUID();
    await pool.query(
      "INSERT INTO ai_grants(id, user_id, client, token_hash, scopes, expires_at) VALUES($1, $2, $3, $4, ARRAY['full_control'], CURRENT_TIMESTAMP + interval '10 minutes')",
      [grantId, userId, 'n8n-agent', grantTokenHash]
    );

    await chatService.saveMessage(userId, sessionId, {
      sender: 'user',
      message
    });

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
          grantToken: plainGrantToken,
          context: {
            ...(valid.data.context || {}),
            grantToken: plainGrantToken,
            origin,
            timestamp: new Date().toISOString()
          }
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (n8nRes.ok) {
        const data = await n8nRes.json().catch(() => null);
        if (data && typeof data === 'object') {
          const rec = data as Record<string, unknown>;
          const extractedText = String(rec.output || rec.reply || rec.text || rec.message || '').trim();
          if (extractedText) {
            const receipts = Array.isArray(rec.receipts) ? (rec.receipts as ChatActionReceiptDTO[]) : [];
            await chatService.saveMessage(userId, sessionId, {
              sender: 'assistant',
              message: extractedText,
              receipts,
              provenance: 'n8n'
            });
            return res.json({
              reply: extractedText,
              sessionId,
              receipts,
              provenance: 'n8n',
              suggestedPrompts: DEFAULT_SUGGESTED_CHAT_PROMPTS,
              timestamp: new Date().toISOString(),
              output: extractedText,
              text: extractedText
            });
          }
        }
      }
    } catch (n8nErr) {
      console.warn('[BFF] n8n webhook call failed, falling back to local grounded response:', (n8nErr as Error).message);
    }

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
        return (Date.now() - updated) > 7 * 86400000;
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
    } else if (lower.includes('so sánh') || lower.includes('đánh giá') || lower.includes('matrix') || lower.includes('cơ hội')) {
      const matrix = await decisionService.getDecisionMatrix(userId);
      if (matrix.opportunities.length > 0) {
        const top = matrix.opportunities[0];
        reply = `⚖️ **Bảng so sánh cơ hội ứng tuyển:**\n\n` +
          `Hiện bạn đang so sánh **${matrix.totalCompared} cơ hội**.\n` +
          `• Lựa chọn dẫn đầu hiện tại: **${top.company}** (${top.position}) với điểm tổng hợp: **${top.compositeScore}/100**.\n` +
          (matrix.categoryWinners.length > 0 ? `• Điểm sáng vượt trội: ${matrix.categoryWinners.map(w => `${w.company} (${w.score}/10)`).slice(0, 3).join(', ')}.\n` : '') +
          `\n💡 Bạn có thể mở bảng Ma trận Đánh giá (Decision Matrix) trên thanh công cụ để tinh chỉnh trọng số cá nhân!`;
      } else {
        reply = `Bạn chưa có hồ sơ nào được chấm điểm trong Ma trận Đánh giá. Hãy vào mục "So sánh cơ hội" để gán điểm cho các công ty bạn quan tâm nhé!`;
      }
    } else {
      reply = `Chào bạn! Tôi là trợ lý JobTrack AI (Full Control). Hiện bạn đang có ${summary.total} hồ sơ ứng tuyển, ${summary.upcoming} phỏng vấn sắp tới và ${summary.offers} offer.\n\nBạn có thể hỏi tôi:\n• "Hôm nay tôi cần làm gì?"\n• "Chuẩn bị phỏng vấn"\n• "Kiểm tra hồ sơ lâu chưa cập nhật"\n• "So sánh các cơ hội ứng tuyển"\n• "Nháp thư follow-up"\nHoặc nhập trực tiếp link tuyển dụng từ nút "Nhập từ link"!`;
    }

    await chatService.saveMessage(userId, sessionId, {
      sender: 'assistant',
      message: reply,
      receipts: [],
      provenance: 'local_fallback'
    });

    return res.json({
      reply,
      sessionId,
      receipts: [],
      provenance: 'local_fallback',
      suggestedPrompts: DEFAULT_SUGGESTED_CHAT_PROMPTS,
      timestamp: new Date().toISOString(),
      output: reply,
      text: reply
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/ai/chat/history', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const sessionId = String(req.query.sessionId || (req as SessionRequest).sessionId || 'default');
    const messages = await chatService.getHistory(userId, sessionId);
    res.json({
      sessionId,
      messages,
      total: messages.length
    });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/ai/chat/history', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const sessionId = String(req.query.sessionId || (req as SessionRequest).sessionId || 'default');
    const cleared = await chatService.clearHistory(userId, sessionId);
    res.json({
      success: true,
      cleared
    });
  } catch (error) {
    next(error);
  }
});

app.get(['/api/career/skill-gap', '/api/career/gap-analysis'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const gap = await roadmapService.getSkillGapAnalysis(userId);
    res.json(gap);
  } catch (error) {
    next(error);
  }
});

app.get('/api/career/roadmap', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const roadmap = await roadmapService.getRoadmap(userId);
    res.json(roadmap);
  } catch (error) {
    next(error);
  }
});

app.post('/api/career/roadmap/generate', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateRoadmapGenerateInput(req.body);
    if (!val.ok) {
      return res.status(422).json({
        code: 'invalid_request',
        message: val.message
      });
    }
    const roadmap = await roadmapService.generateRoadmap(userId, val.data);
    res.status(201).json(roadmap);
  } catch (error) {
    next(error);
  }
});

app.patch(['/api/career/roadmap/milestones/:id', '/api/career/roadmap/:roadmapId/milestones/:id'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const milestoneId = String(req.params.id);
    const val = validateMilestoneUpdateInput(req.body);
    if (!val.ok) {
      return res.status(422).json({
        code: 'invalid_request',
        message: val.message
      });
    }
    const roadmap = await roadmapService.updateMilestone(userId, milestoneId, val.data.status);
    res.json(roadmap);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/career/roadmap/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const roadmapId = String(req.params.id);
    const deleted = await roadmapService.deleteRoadmap(userId, roadmapId);
    if (!deleted) {
      return res.status(404).json({
        code: 'not_found',
        message: 'Không tìm thấy lộ trình sự nghiệp.'
      });
    }
    res.json({ success: true, deletedId: roadmapId });
  } catch (error) {
    next(error);
  }
});

app.post('/api/ingest/email/parse', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateEmailParseInput(req.body);
    if (!val.ok) {
      return res.status(422).json({
        code: 'invalid_request',
        message: val.message
      });
    }
    const proposal = await emailIngestService.parseAndPropose(userId, val.data);
    res.json(proposal);
  } catch (error) {
    next(error);
  }
});

app.post('/api/ingest/email/apply', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateEmailApplyInput(req.body);
    if (!val.ok) {
      return res.status(422).json({
        code: 'invalid_request',
        message: val.message
      });
    }
    const result = await emailIngestService.applyProposal(userId, val.data);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.get('/api/outreach/campaigns', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const campaigns = await outreachService.listCampaigns(userId);
    res.json(campaigns);
  } catch (error) {
    next(error);
  }
});

app.post('/api/outreach/campaigns', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateCreateCampaignInput(req.body);
    if (!val.valid) {
      return res.status(422).json({
        code: 'invalid_request',
        message: val.errors.join(' ')
      });
    }
    const created = await outreachService.createCampaign(userId, req.body);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

app.get('/api/outreach/campaigns/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const campaign = await outreachService.getCampaign(userId, String(req.params.id));
    if (!campaign) {
      return res.status(404).json({ code: 'not_found', message: 'Chiến dịch không tồn tại.' });
    }
    res.json(campaign);
  } catch (error) {
    next(error);
  }
});

app.post('/api/outreach/campaigns/:id/recipients', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    if (!req.body || typeof req.body.name !== 'string' || !req.body.name.trim()) {
      return res.status(422).json({ code: 'invalid_request', message: 'Tên người nhận không được để trống.' });
    }
    if (!req.body.company || typeof req.body.company !== 'string' || !req.body.company.trim()) {
      return res.status(422).json({ code: 'invalid_request', message: 'Công ty người nhận không được để trống.' });
    }
    const recipient = await outreachService.addRecipient(userId, String(req.params.id), req.body);
    res.status(201).json(recipient);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/outreach/recipients/:recipientId/step', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateUpdateRecipientStepInput(req.body);
    if (!val.valid) {
      return res.status(422).json({
        code: 'invalid_request',
        message: val.errors.join(' ')
      });
    }
    const updated = await outreachService.updateRecipientStep(userId, String(req.params.recipientId), req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/outreach/campaigns/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const deleted = await outreachService.deleteCampaign(userId, String(req.params.id));
    if (!deleted) {
      return res.status(404).json({ code: 'not_found', message: 'Chiến dịch không tồn tại.' });
    }
    res.json({ success: true, message: 'Đã xóa chiến dịch.' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/simulation/sessions', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const sessions = await simulationService.listSessions(userId);
    res.json(sessions);
  } catch (error) {
    next(error);
  }
});

app.post('/api/simulation/sessions', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateStartSimulationInput(req.body);
    if (!val.valid) {
      return res.status(422).json({
        code: 'invalid_request',
        message: val.errors.join(' ')
      });
    }
    const session = await simulationService.startSession(userId, req.body);
    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
});

app.get('/api/simulation/sessions/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const session = await simulationService.getSession(userId, String(req.params.id));
    if (!session) {
      return res.status(404).json({ code: 'not_found', message: 'Phiên phỏng vấn không tồn tại.' });
    }
    res.json(session);
  } catch (error) {
    next(error);
  }
});

app.post('/api/simulation/sessions/:id/turn', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateSubmitTurnInput(req.body);
    if (!val.valid) {
      return res.status(422).json({
        code: 'invalid_request',
        message: val.errors.join(' ')
      });
    }
    const result = await simulationService.submitTurn(userId, String(req.params.id), req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/simulation/sessions/:id/complete', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const session = await simulationService.completeSession(userId, String(req.params.id));
    res.json(session);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/simulation/sessions/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const deleted = await simulationService.deleteSession(userId, String(req.params.id));
    if (!deleted) {
      return res.status(404).json({ code: 'not_found', message: 'Phiên phỏng vấn không tồn tại.' });
    }
    res.json({ success: true, message: 'Đã xóa phiên phỏng vấn.' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/portfolio', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const portfolio = await portfolioService.getPortfolio(userId);
    res.json(portfolio);
  } catch (error) {
    next(error);
  }
});

app.put('/api/portfolio', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validatePortfolioConfigInput(req.body);
    if (!val.valid) {
      return res.status(422).json({
        code: 'invalid_request',
        message: val.errors.join(' ')
      });
    }
    const updated = await portfolioService.updatePortfolio(userId, req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

app.post('/api/portfolio/token', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateGenerateTokenInput(req.body);
    if (!val.valid) {
      return res.status(422).json({
        code: 'invalid_request',
        message: val.errors.join(' ')
      });
    }
    const tokenInfo = await portfolioService.generateToken(userId, req.body?.expiryDays);
    res.status(201).json(tokenInfo);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/portfolio/token', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    await portfolioService.revokeToken(userId);
    res.json({ success: true, message: 'Đã hủy liên kết chia sẻ công khai.' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/public/dossier/:token', async (req, res, next) => {
  try {
    const dossier = await portfolioService.getPublicDossier(
      req.params.token,
      req.ip,
      req.headers['user-agent']
    );
    if (!dossier) {
      return res.status(404).json({ code: 'not_found', message: 'Hồ sơ năng lực không tồn tại hoặc liên kết đã hết hạn.' });
    }
    res.json(dossier);
  } catch (error) {
    next(error);
  }
});

app.get('/api/compensation/forecasts', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const forecasts = await compensationService.listForecasts(userId);
    res.json(forecasts);
  } catch (error) {
    next(error);
  }
});

app.post('/api/compensation/forecasts', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateCreateCompensationForecastInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({
        code: 'validation_error',
        message: validation.message || 'Dữ liệu không hợp lệ.',
        errors: validation.errors
      });
    }
    const created = await compensationService.createForecast(userId, validation.data);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

app.get('/api/compensation/benchmark', auth, async (req, res, next) => {
  try {
    const role = typeof req.query.role === 'string' ? req.query.role : 'Frontend Engineer';
    const level = typeof req.query.level === 'string' ? (req.query.level as any) : 'senior';
    const annualCash = typeof req.query.annualCash === 'string' ? Number(req.query.annualCash) || 0 : 0;
    const currency = req.query.currency === 'USD' ? 'USD' : 'VND';
    const benchmark = await compensationService.getBenchmark(role, level, annualCash, currency);
    res.json(benchmark);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/compensation/forecasts/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const deleted = await compensationService.deleteForecast(userId, String(req.params.id));
    if (!deleted) {
      return res.status(404).json({ code: 'not_found', message: 'Không tìm thấy bản dự báo thu nhập.' });
    }
    res.json({ success: true, message: 'Đã xóa bản dự báo thu nhập.' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/trajectory', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const trajectory = await trajectoryService.getTrajectory(userId);
    res.json(trajectory);
  } catch (error) {
    next(error);
  }
});

app.post('/api/trajectory/simulate', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateSimulateTrajectoryInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({
        code: 'validation_error',
        message: validation.message || 'Dữ liệu không hợp lệ.',
        errors: validation.errors
      });
    }
    const simulation = await trajectoryService.simulate(userId, validation.data);
    res.status(200).json(simulation);
  } catch (error) {
    next(error);
  }
});

app.put('/api/trajectory/competencies', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateUpdateCompetenciesInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({
        code: 'validation_error',
        message: validation.message || 'Dữ liệu không hợp lệ.',
        errors: validation.errors
      });
    }
    const updated = await trajectoryService.updateCompetencies(userId, validation.data);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

app.post('/api/resume/diagnose', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateOptimizeResumeInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({
        code: 'validation_error',
        message: validation.message || 'Dữ liệu không hợp lệ.',
        errors: validation.errors
      });
    }
    const result = await resumeOptimizerService.diagnoseAndOptimize(userId, validation.data);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/resume/rewrite-bullets', auth, async (req, res, next) => {
  try {
    const validation = validateRewriteBulletInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({
        code: 'validation_error',
        message: validation.message || 'Dữ liệu không hợp lệ.',
        errors: validation.errors
      });
    }
    const proposals = rewriteBulletPointsXyz(validation.data.bullets, validation.data.targetKeywords);
    res.status(200).json(proposals);
  } catch (error) {
    next(error);
  }
});

app.get('/api/resume/optimizations', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const list = await resumeOptimizerService.listOptimizations(userId);
    res.json(list);
  } catch (error) {
    next(error);
  }
});

app.get('/api/resume/optimizations/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const opt = await resumeOptimizerService.getOptimization(userId, String(req.params.id));
    if (!opt) {
      return res.status(404).json({ code: 'not_found', message: 'Không tìm thấy bản tối ưu hóa CV.' });
    }
    res.json(opt);
  } catch (error) {
    next(error);
  }
});

app.post('/api/resume/optimizations/:id/apply', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const acceptedBullets = req.body?.acceptedBullets;
    if (!acceptedBullets || typeof acceptedBullets !== 'object') {
      return res.status(400).json({
        code: 'validation_error',
        message: 'Danh sách bullet point được chọn là bắt buộc.',
        errors: { acceptedBullets: 'Bắt buộc' }
      });
    }
    const injectedKeywords = Array.isArray(req.body?.injectedKeywords) ? req.body.injectedKeywords : [];
    const updated = await resumeOptimizerService.applyRewrites(userId, String(req.params.id), {
      acceptedBullets,
      injectedKeywords
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/resume/optimizations/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const deleted = await resumeOptimizerService.deleteOptimization(userId, String(req.params.id));
    if (!deleted) {
      return res.status(404).json({ code: 'not_found', message: 'Không tìm thấy bản tối ưu hóa CV.' });
    }
    res.json({ success: true, message: 'Đã xóa bản tối ưu hóa CV.' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/pipeline/velocity/report', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const report = await pipelineVelocityService.getLatestReport(userId);
    res.json(report);
  } catch (error) {
    next(error);
  }
});

app.post('/api/pipeline/velocity/report', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateCalculateVelocityReportInput(req.body);
    if (!validation.ok) {
      throw new Problem(422, validation.message, 'invalid_request', validation.errors);
    }
    const report = await pipelineVelocityService.generateReport(userId, validation.data);
    res.json(report);
  } catch (error) {
    next(error);
  }
});

app.post('/api/pipeline/velocity/simulate', auth, async (req, res, next) => {
  try {
    const b = req.body as {
      weeklyVelocity?: number;
      weeksHorizon?: number;
      stageMetrics?: any;
    };
    const weeklyVelocity = typeof b?.weeklyVelocity === 'number' ? b.weeklyVelocity : 5;
    const weeksHorizon = typeof b?.weeksHorizon === 'number' ? b.weeksHorizon : 12;
    const simulation = pipelineVelocityService.simulate({
      weeklyVelocity,
      weeksHorizon,
      stageMetrics: Array.isArray(b?.stageMetrics) ? b.stageMetrics : undefined
    });
    res.json(simulation);
  } catch (error) {
    next(error);
  }
});

app.get('/api/culture/radar', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const company = typeof req.query.company === 'string' ? req.query.company : undefined;
    const report = await cultureRadarService.getLatestRadar(userId, company);
    res.json(report);
  } catch (error) {
    next(error);
  }
});

app.post('/api/culture/analyze', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateAnalyzeCultureInput(req.body);
    if (!validation.ok) {
      throw new Problem(422, validation.message, 'invalid_request', validation.errors);
    }
    const report = await cultureRadarService.analyzeCulture(userId, validation.data);
    res.json(report);
  } catch (error) {
    next(error);
  }
});

app.post('/api/culture/questions', auth, async (req, res, next) => {
  try {
    const b = req.body as {
      dimensionScores?: any[];
      targetRole?: any;
    };
    const questions = cultureRadarService.generateQuestions({
      dimensionScores: Array.isArray(b?.dimensionScores) ? b.dimensionScores : [],
      targetRole: typeof b?.targetRole === 'string' ? (b.targetRole as any) : undefined
    });
    res.json(questions);
  } catch (error) {
    next(error);
  }
});

app.get('/api/headhunters', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const agency = typeof req.query.agency === 'string' ? req.query.agency : undefined;
    const tier = typeof req.query.tier === 'string' ? (req.query.tier as any) : undefined;
    const query = typeof req.query.q === 'string' ? req.query.q : undefined;
    const leads = await headhunterCrmService.listLeads(userId, { agency, tier, query });
    res.json(leads);
  } catch (error) {
    next(error);
  }
});

app.post('/api/headhunters', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateRecruiterLeadInput(req.body);
    if (!val.ok) {
      throw new Problem(422, val.message, 'invalid_request', val.errors);
    }
    const existingId = typeof req.query.id === 'string' ? req.query.id : typeof (req.body as any)?.id === 'string' ? (req.body as any).id : undefined;
    const lead = await headhunterCrmService.upsertLead(userId, val.data, existingId);
    res.status(existingId ? 200 : 201).json(lead);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/headhunters/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const success = await headhunterCrmService.deleteLead(userId, String(req.params.id));
    if (!success) {
      return res.status(404).json({ code: 'not_found', message: 'Không tìm thấy thông tin recruiter.' });
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post('/api/headhunters/parse-pitch', auth, async (req, res, next) => {
  try {
    const val = validateParsePitchInput(req.body);
    if (!val.ok) {
      throw new Problem(422, val.message, 'invalid_request', val.errors);
    }
    const result = headhunterCrmService.parsePitch(val.data);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/headhunters/reply-draft', auth, async (req, res, next) => {
  try {
    const val = validateRecruiterReplyDraftInput(req.body);
    if (!val.ok) {
      throw new Problem(422, val.message, 'invalid_request', val.errors);
    }
    const result = headhunterCrmService.generateReply(val.data);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get('/api/headhunters/mandates', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const leadId = typeof req.query.leadId === 'string' ? req.query.leadId : undefined;
    const mandates = await headhunterCrmService.listMandates(userId, leadId);
    res.json(mandates);
  } catch (error) {
    next(error);
  }
});

app.post('/api/headhunters/mandates', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateMandateInput(req.body);
    if (!val.ok) {
      throw new Problem(422, val.message, 'invalid_request', val.errors);
    }
    const mandate = await headhunterCrmService.createMandate(userId, val.data);
    res.status(201).json(mandate);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/headhunters/mandates/:id/status', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const b = bodyObject(req.body);
    const status = typeof b.status === 'string' ? b.status : '';
    if (!status) {
      throw new Problem(422, 'Vui lòng cung cấp trạng thái mandate.', 'invalid_request');
    }
    const updated = await headhunterCrmService.updateMandateStatus(userId, String(req.params.id), status as any);
    if (!updated) {
      return res.status(404).json({ code: 'not_found', message: 'Không tìm thấy mandate.' });
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

app.get('/api/system-design/scenarios', auth, (req, res) => {
  const scenarios = systemDesignService.listScenarios();
  res.json(scenarios);
});

app.post('/api/system-design/estimate', auth, (req, res, next) => {
  try {
    const val = validateCapacityInput(req.body);
    if (!val.ok) {
      throw new Problem(422, val.message, 'invalid_request', val.errors);
    }
    const estimate = systemDesignService.calculateCapacity(val.data);
    res.json(estimate);
  } catch (error) {
    next(error);
  }
});

app.get('/api/system-design/sessions', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const scenarioId = typeof req.query.scenarioId === 'string' ? req.query.scenarioId : undefined;
    const sessions = await systemDesignService.listSessions(userId, scenarioId);
    res.json(sessions);
  } catch (error) {
    next(error);
  }
});

app.post('/api/system-design/sessions', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateSystemDesignSessionInput(req.body);
    if (!val.ok) {
      throw new Problem(422, val.message, 'invalid_request', val.errors);
    }
    const session = await systemDesignService.createSession(userId, val.data);
    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
});

app.get('/api/system-design/sessions/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const session = await systemDesignService.getSession(userId, String(req.params.id));
    if (!session) {
      return res.status(404).json({ code: 'not_found', message: 'Không tìm thấy phiên thiết kế hệ thống.' });
    }
    res.json(session);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/system-design/sessions/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const b = bodyObject(req.body);
    const updated = await systemDesignService.updateSession(userId, String(req.params.id), b as any);
    if (!updated) {
      return res.status(404).json({ code: 'not_found', message: 'Không tìm thấy phiên thiết kế hệ thống.' });
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/system-design/sessions/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const deleted = await systemDesignService.deleteSession(userId, String(req.params.id));
    if (!deleted) {
      return res.status(404).json({ code: 'not_found', message: 'Không tìm thấy phiên thiết kế hệ thống.' });
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post('/api/system-design/sessions/:id/evaluate', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const b = bodyObject(req.body);
    const targetRole = typeof b.targetRole === 'string' ? b.targetRole : undefined;
    const evaluation = await systemDesignService.evaluateSession(userId, String(req.params.id), targetRole);
    if (!evaluation) {
      return res.status(404).json({ code: 'not_found', message: 'Không tìm thấy phiên thiết kế hệ thống.' });
    }
    res.json(evaluation);
  } catch (error) {
    next(error);
  }
});

app.get('/api/system-design/sessions/:id/export', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const markdown = await systemDesignService.exportMarkdown(userId, String(req.params.id));
    if (markdown === null) {
      return res.status(404).json({ code: 'not_found', message: 'Không tìm thấy phiên thiết kế hệ thống.' });
    }
    res.json({ markdown });
  } catch (error) {
    next(error);
  }
});

app.get('/api/equity/grants', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const grants = await equityLiquidityService.listGrants(userId);
    res.json(grants);
  } catch (err) {
    next(err);
  }
});

app.post('/api/equity/grants', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateEquityGrantInput(req.body);
    if (!val.ok) {
      throw new Problem(422, val.message, 'invalid_request', val.errors);
    }
    const grant = await equityLiquidityService.createGrant(userId, val.data);
    res.status(201).json(grant);
  } catch (err) {
    next(err);
  }
});

app.get('/api/equity/models', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const models = await equityLiquidityService.listModels(userId);
    res.json(models);
  } catch (err) {
    next(err);
  }
});

app.post('/api/equity/models', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateEquityModelMutationInput(req.body);
    if (!val.ok) {
      throw new Problem(422, val.message, 'invalid_request', val.errors);
    }
    const model = await equityLiquidityService.createModel(userId, val.data);
    res.status(201).json(model);
  } catch (err) {
    next(err);
  }
});

app.get('/api/equity/models/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const model = await equityLiquidityService.getModel(userId, String(req.params.id));
    if (!model) {
      return res.status(404).json({ code: 'not_found', message: 'Khong tim thay mo hinh co phan.' });
    }
    res.json(model);
  } catch (err) {
    next(err);
  }
});

app.patch('/api/equity/models/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const updated = await equityLiquidityService.updateModel(userId, String(req.params.id), req.body);
    if (!updated) {
      return res.status(404).json({ code: 'not_found', message: 'Khong tim thay mo hinh co phan.' });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/equity/models/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const deleted = await equityLiquidityService.deleteModel(userId, String(req.params.id));
    if (!deleted) {
      return res.status(404).json({ code: 'not_found', message: 'Khong tim thay mo hinh co phan.' });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

app.get('/api/equity/models/:id/export', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const markdown = await equityLiquidityService.exportMarkdown(userId, String(req.params.id));
    if (markdown === null) {
      return res.status(404).json({ code: 'not_found', message: 'Khong tim thay mo hinh co phan.' });
    }
    res.json({ markdown });
  } catch (err) {
    next(err);
  }
});

app.post('/api/equity/compare', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const b = bodyObject(req.body);
    const modelIdA = typeof b.modelIdA === 'string' ? b.modelIdA : '';
    const modelIdB = typeof b.modelIdB === 'string' ? b.modelIdB : '';
    if (!modelIdA || !modelIdB) {
      throw new Problem(422, 'modelIdA va modelIdB la bat buoc.', 'invalid_request');
    }
    const comparison = await equityLiquidityService.compareModels(userId, modelIdA, modelIdB);
    if (!comparison) {
      return res.status(404).json({ code: 'not_found', message: 'Mot hoac ca hai mo hinh khong ton tai.' });
    }
    res.json(comparison);
  } catch (err) {
    next(err);
  }
});

app.get('/api/backchannel/advocates', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const advocates = await backchannelService.listAdvocates(userId);
    res.json(advocates);
  } catch (err) {
    next(err);
  }
});

app.post('/api/backchannel/advocates', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateReferenceAdvocateInput(req.body);
    if (!validation.ok) {
      throw new Problem(422, validation.message, 'validation_error', validation.errors);
    }
    const created = await backchannelService.createAdvocate(userId, validation.data);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

app.get('/api/backchannel/advocates/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const advocate = await backchannelService.getAdvocate(userId, String(req.params.id));
    if (!advocate) {
      return res.status(404).json({ code: 'not_found', message: 'Nguoi bao chung khong ton tai.' });
    }
    res.json(advocate);
  } catch (err) {
    next(err);
  }
});

app.patch('/api/backchannel/advocates/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const advocateId = String(req.params.id);
    const existing = await backchannelService.getAdvocate(userId, advocateId);
    if (!existing) {
      return res.status(404).json({ code: 'not_found', message: 'Nguoi bao chung khong ton tai.' });
    }
    const merged = { ...existing, ...req.body };
    const validation = validateReferenceAdvocateInput(merged);
    if (!validation.ok) {
      throw new Problem(422, validation.message, 'validation_error', validation.errors);
    }
    const updated = await backchannelService.updateAdvocate(userId, advocateId, validation.data);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/backchannel/advocates/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const deleted = await backchannelService.deleteAdvocate(userId, String(req.params.id));
    if (!deleted) {
      return res.status(404).json({ code: 'not_found', message: 'Nguoi bao chung khong ton tai.' });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

app.get('/api/backchannel/audits', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const audits = await backchannelService.listAudits(userId);
    res.json(audits);
  } catch (err) {
    next(err);
  }
});

app.post('/api/backchannel/audits', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateBackchannelAuditInput(req.body);
    if (!validation.ok) {
      throw new Problem(422, validation.message, 'validation_error', validation.errors);
    }
    const created = await backchannelService.createAudit(userId, validation.data);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

app.get('/api/backchannel/audits/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const audit = await backchannelService.getAudit(userId, String(req.params.id));
    if (!audit) {
      return res.status(404).json({ code: 'not_found', message: 'Dot kiem toan backchannel khong ton tai.' });
    }
    res.json(audit);
  } catch (err) {
    next(err);
  }
});

app.patch('/api/backchannel/audits/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const auditId = String(req.params.id);
    const existing = await backchannelService.getAudit(userId, auditId);
    if (!existing) {
      return res.status(404).json({ code: 'not_found', message: 'Dot kiem toan backchannel khong ton tai.' });
    }
    const merged = { ...existing, ...req.body };
    const validation = validateBackchannelAuditInput(merged);
    if (!validation.ok) {
      throw new Problem(422, validation.message, 'validation_error', validation.errors);
    }
    const updated = await backchannelService.updateAudit(userId, auditId, validation.data);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/backchannel/audits/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const deleted = await backchannelService.deleteAudit(userId, String(req.params.id));
    if (!deleted) {
      return res.status(404).json({ code: 'not_found', message: 'Dot kiem toan backchannel khong ton tai.' });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

app.post('/api/backchannel/audits/:id/generate-briefing', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const auditId = String(req.params.id);
    const b = bodyObject(req.body);
    const advocateId = typeof b.advocateId === 'string' ? b.advocateId : '';
    if (!advocateId) {
      throw new Problem(422, 'advocateId la bat buoc.', 'invalid_request');
    }
    const packet = await backchannelService.generateBriefing(userId, auditId, advocateId);
    if (!packet) {
      return res.status(404).json({ code: 'not_found', message: 'Khong tim thay dot kiem toan hoac nguoi bao chung.' });
    }
    res.status(201).json(packet);
  } catch (err) {
    next(err);
  }
});

app.get('/api/executive-contracts', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const contracts = await executiveContractService.listContracts(userId);
    res.json(contracts);
  } catch (err) {
    next(err);
  }
});

app.post('/api/executive-contracts', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateExecutiveContractInput(req.body);
    if (!validation.ok) {
      return res.status(422).json({ code: 'validation_error', message: validation.message, errors: validation.errors });
    }
    const created = await executiveContractService.createContract(userId, validation.data);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

app.get('/api/executive-contracts/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const contract = await executiveContractService.getContract(userId, String(req.params.id));
    if (!contract) {
      return res.status(404).json({ code: 'not_found', message: 'Khong tim thay hop dong lanh dao.' });
    }
    res.json(contract);
  } catch (err) {
    next(err);
  }
});

app.patch('/api/executive-contracts/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const contractId = String(req.params.id);
    const existing = await executiveContractService.getContract(userId, contractId);
    if (!existing) {
      return res.status(404).json({ code: 'not_found', message: 'Khong tim thay hop dong lanh dao.' });
    }
    const updated = await executiveContractService.updateContract(userId, contractId, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/executive-contracts/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const deleted = await executiveContractService.deleteContract(userId, String(req.params.id));
    if (!deleted) {
      return res.status(404).json({ code: 'not_found', message: 'Khong tim thay hop dong lanh dao.' });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

app.post('/api/executive-contracts/:id/generate-redlines', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const contract = await executiveContractService.getContract(userId, String(req.params.id));
    if (!contract) {
      return res.status(404).json({ code: 'not_found', message: 'Khong tim thay hop dong lanh dao.' });
    }
    const redlines = await executiveContractService.generateRedlines(userId, contract.id);
    res.json(redlines);
  } catch (err) {
    next(err);
  }
});

app.post('/api/executive-contracts/:id/redlines', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const contractId = String(req.params.id);
    const existing = await executiveContractService.getContract(userId, contractId);
    if (!existing) {
      return res.status(404).json({ code: 'not_found', message: 'Khong tim thay hop dong lanh dao.' });
    }
    const validation = validateContractRedlineInput(req.body);
    if (!validation.ok) {
      return res.status(422).json({ code: 'validation_error', message: validation.message, errors: validation.errors });
    }
    const created = await executiveContractService.createRedline(userId, contractId, validation.data);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

app.patch('/api/executive-contracts/:id/redlines/:redlineId', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const contractId = String(req.params.id);
    const redlineId = String(req.params.redlineId);
    const b = bodyObject(req.body);
    const status = b.status as never;
    const updated = await executiveContractService.updateRedline(userId, contractId, redlineId, status);
    if (!updated) {
      return res.status(404).json({ code: 'not_found', message: 'Khong tim thay dieu khoan sua doi.' });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.post('/api/executive-contracts/:id/prior-inventions', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const contractId = String(req.params.id);
    const validation = validatePriorInventionInput(req.body);
    if (!validation.ok) {
      return res.status(422).json({ code: 'validation_error', message: validation.message, errors: validation.errors });
    }
    const updated = await executiveContractService.addPriorInvention(userId, contractId, validation.data);
    if (!updated) {
      return res.status(404).json({ code: 'not_found', message: 'Khong tim thay hop dong lanh dao.' });
    }
    res.status(201).json(updated);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/executive-contracts/:id/prior-inventions/:itemId', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const contractId = String(req.params.id);
    const itemId = String(req.params.itemId);
    const updated = await executiveContractService.deletePriorInvention(userId, contractId, itemId);
    if (!updated) {
      return res.status(404).json({ code: 'not_found', message: 'Khong tim thay hop dong hoac sang che.' });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.get('/api/executive-contracts/:id/export-addendum', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const contractId = String(req.params.id);
    const result = await executiveContractService.exportAddendum(userId, contractId);
    if (!result) {
      return res.status(404).json({ code: 'not_found', message: 'Khong tim thay hop dong lanh dao.' });
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.get('/api/executive-contracts/:id/export-exhibit-a', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const contractId = String(req.params.id);
    const result = await executiveContractService.exportExhibitA(userId, contractId);
    if (!result) {
      return res.status(404).json({ code: 'not_found', message: 'Khong tim thay hop dong lanh dao.' });
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.get('/api/executive-onboarding', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const plans = await executiveOnboardingService.listPlans(userId);
    res.json(plans);
  } catch (err) {
    next(err);
  }
});

app.post('/api/executive-onboarding', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateExecutiveOnboardingPlanInput(req.body);
    if (!validation.ok) {
      return res.status(422).json({ code: 'validation_error', message: validation.message, errors: validation.errors });
    }
    const created = await executiveOnboardingService.createPlan(userId, validation.data);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

app.get('/api/executive-onboarding/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const plan = await executiveOnboardingService.getPlan(userId, String(req.params.id));
    if (!plan) {
      return res.status(404).json({ code: 'not_found', message: 'Khong tim thay ke hoach 100 ngay executive.' });
    }
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

app.put('/api/executive-onboarding/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const planId = String(req.params.id);
    const existing = await executiveOnboardingService.getPlan(userId, planId);
    if (!existing) {
      return res.status(404).json({ code: 'not_found', message: 'Khong tim thay ke hoach 100 ngay executive.' });
    }
    const updated = await executiveOnboardingService.updatePlan(userId, planId, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/executive-onboarding/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const deleted = await executiveOnboardingService.deletePlan(userId, String(req.params.id));
    if (!deleted) {
      return res.status(404).json({ code: 'not_found', message: 'Khong tim thay ke hoach 100 ngay executive de xoa.' });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

app.post('/api/executive-onboarding/:id/stakeholders', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const planId = String(req.params.id);
    const validation = validateStakeholderInput(req.body);
    if (!validation.ok) {
      return res.status(422).json({ code: 'validation_error', message: validation.message, errors: validation.errors });
    }
    const created = await executiveOnboardingService.addStakeholder(userId, planId, validation.data);
    if (!created) {
      return res.status(404).json({ code: 'not_found', message: 'Khong tim thay ke hoach de them stakeholder.' });
    }
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

app.put('/api/executive-onboarding/:id/stakeholders/:sid', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const planId = String(req.params.id);
    const sid = String(req.params.sid);
    const updated = await executiveOnboardingService.updateStakeholder(userId, planId, sid, req.body);
    if (!updated) {
      return res.status(404).json({ code: 'not_found', message: 'Khong tim thay stakeholder de cap nhat.' });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/executive-onboarding/:id/stakeholders/:sid', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const planId = String(req.params.id);
    const sid = String(req.params.sid);
    const deleted = await executiveOnboardingService.deleteStakeholder(userId, planId, sid);
    if (!deleted) {
      return res.status(404).json({ code: 'not_found', message: 'Khong tim thay stakeholder de xoa.' });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

app.post('/api/executive-onboarding/:id/milestones', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const planId = String(req.params.id);
    const validation = validateMilestoneInput(req.body);
    if (!validation.ok) {
      return res.status(422).json({ code: 'validation_error', message: validation.message, errors: validation.errors });
    }
    const created = await executiveOnboardingService.addMilestone(userId, planId, validation.data);
    if (!created) {
      return res.status(404).json({ code: 'not_found', message: 'Khong tim thay ke hoach de them milestone.' });
    }
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

app.put('/api/executive-onboarding/:id/milestones/:mid', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const planId = String(req.params.id);
    const mid = String(req.params.mid);
    const updated = await executiveOnboardingService.updateMilestone(userId, planId, mid, req.body);
    if (!updated) {
      return res.status(404).json({ code: 'not_found', message: 'Khong tim thay milestone de cap nhat.' });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/executive-onboarding/:id/milestones/:mid', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const planId = String(req.params.id);
    const mid = String(req.params.mid);
    const deleted = await executiveOnboardingService.deleteMilestone(userId, planId, mid);
    if (!deleted) {
      return res.status(404).json({ code: 'not_found', message: 'Khong tim thay milestone de xoa.' });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

app.put('/api/executive-onboarding/:id/diagnostics', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const planId = String(req.params.id);
    const validation = validateDiagnosticsInput(req.body);
    if (!validation.ok) {
      return res.status(422).json({ code: 'validation_error', message: validation.message, errors: validation.errors });
    }
    const updated = await executiveOnboardingService.updateDiagnostics(userId, planId, validation.data);
    if (!updated) {
      return res.status(404).json({ code: 'not_found', message: 'Khong tim thay ke hoach de cap nhat diagnostics.' });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.get('/api/executive-onboarding/:id/memo/:memoType', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const planId = String(req.params.id);
    const memoType = String(req.params.memoType) as Parameters<typeof executiveOnboardingService.getMemo>[2];
    const memo = await executiveOnboardingService.getMemo(userId, planId, memoType);
    if (!memo) {
      return res.status(404).json({ code: 'not_found', message: 'Khong tim thay ke hoach de xuat executive memo.' });
    }
    res.json(memo);
  } catch (err) {
    next(err);
  }
});

app.get('/api/board-advisory-nexus/mandates', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const mandates = await boardAdvisoryNexusService.listMandates(userId);
    res.json(mandates);
  } catch (err) {
    next(err);
  }
});

app.post('/api/board-advisory-nexus/mandates', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateBoardMandateInput(req.body);
    if (!validation.ok) {
      return res.status(422).json({ code: 'validation_error', errors: validation.errors });
    }
    const created = await boardAdvisoryNexusService.createMandate(userId, validation.data);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

app.get('/api/board-advisory-nexus/mandates/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const mandate = await boardAdvisoryNexusService.getMandate(userId, String(req.params.id));
    if (!mandate) {
      return res.status(404).json({ code: 'not_found', message: 'Mandate not found.' });
    }
    res.json(mandate);
  } catch (err) {
    next(err);
  }
});

app.put('/api/board-advisory-nexus/mandates/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const mandateId = String(req.params.id);
    const existing = await boardAdvisoryNexusService.getMandate(userId, mandateId);
    if (!existing) {
      return res.status(404).json({ code: 'not_found', message: 'Mandate not found.' });
    }
    const updated = await boardAdvisoryNexusService.updateMandate(userId, mandateId, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/board-advisory-nexus/mandates/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const deleted = await boardAdvisoryNexusService.deleteMandate(userId, String(req.params.id));
    if (!deleted) {
      return res.status(404).json({ code: 'not_found', message: 'Mandate not found.' });
    }
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});

app.get('/api/board-advisory-nexus/mandates/:id/dilution-model', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const mandateId = String(req.params.id);
    const stage = (req.query.stage as any) || 'seed_stage';
    const impact = (req.query.impact as any) || 'standard';
    const rounds = req.query.rounds ? Number(req.query.rounds) : 2;
    const dilution = req.query.dilution ? Number(req.query.dilution) : 0.2;

    const model = await boardAdvisoryNexusService.getDilutionModel(
      userId,
      mandateId,
      stage,
      impact,
      rounds,
      dilution
    );
    if (!model) {
      return res.status(404).json({ code: 'not_found', message: 'Mandate not found.' });
    }
    res.json(model);
  } catch (err) {
    next(err);
  }
});

app.post('/api/board-advisory-nexus/mandates/:id/conflict-check', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const mandateId = String(req.params.id);
    const check = await boardAdvisoryNexusService.checkConflict(userId, mandateId, req.body || {});
    if (!check) {
      return res.status(404).json({ code: 'not_found', message: 'Mandate not found.' });
    }
    res.json(check);
  } catch (err) {
    next(err);
  }
});

app.post('/api/board-advisory-nexus/mandates/:id/waiver-letter', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const mandateId = String(req.params.id);
    const letter = await boardAdvisoryNexusService.generateWaiverLetter(userId, mandateId, req.body || {});
    if (!letter) {
      return res.status(404).json({ code: 'not_found', message: 'Mandate not found.' });
    }
    res.json(letter);
  } catch (err) {
    next(err);
  }
});

app.get('/api/board-advisory-nexus/governance-matrix', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const matrix = await boardAdvisoryNexusService.getGovernanceMatrix(userId);
    res.json(matrix);
  } catch (err) {
    next(err);
  }
});

app.put('/api/board-advisory-nexus/governance-matrix', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateGovernanceMatrixInput(req.body);
    if (!validation.ok) {
      return res.status(422).json({ code: 'validation_error', errors: validation.errors });
    }
    const updated = await boardAdvisoryNexusService.updateGovernanceMatrix(userId, validation.data);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.get('/api/board-advisory-nexus/dossier', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const dossier = await boardAdvisoryNexusService.getBoardDossier(userId);
    res.json(dossier);
  } catch (err) {
    next(err);
  }
});

app.get('/api/executive-severance', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const list = await executiveSeveranceService.listCases(userId);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

app.post('/api/executive-severance', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateSeveranceCaseInput(req.body);
    if (!validation.ok) {
      return res.status(422).json({ code: 'validation_error', errors: validation.errors });
    }
    const created = await executiveSeveranceService.createCase(userId, validation.data);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

app.get('/api/executive-severance/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const single = await executiveSeveranceService.getCase(userId, req.params.id);
    if (!single) {
      return res.status(404).json({ code: 'case_not_found', error: 'Executive severance case not found' });
    }
    res.json(single);
  } catch (err) {
    next(err);
  }
});

app.put('/api/executive-severance/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const updated = await executiveSeveranceService.updateCase(userId, req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ code: 'case_not_found', error: 'Executive severance case not found' });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/executive-severance/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const deleted = await executiveSeveranceService.deleteCase(userId, req.params.id);
    if (!deleted) {
      return res.status(404).json({ code: 'case_not_found', error: 'Executive severance case not found' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

app.post('/api/executive-severance/:id/good-reason-events', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateGoodReasonEventInput(req.body);
    if (!validation.ok) {
      return res.status(422).json({ code: 'validation_error', errors: validation.errors });
    }
    const event = await executiveSeveranceService.addGoodReasonEvent(userId, req.params.id, validation.data);
    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/executive-severance/good-reason-events/:eventId', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const deleted = await executiveSeveranceService.deleteGoodReasonEvent(userId, req.params.eventId);
    if (!deleted) {
      return res.status(404).json({ code: 'event_not_found', error: 'Good reason event not found' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

app.post('/api/executive-severance/:id/counter-proposal', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const proposal = await executiveSeveranceService.createCounterProposal(userId, req.params.id);
    if (!proposal) {
      return res.status(404).json({ code: 'case_not_found', error: 'Executive severance case not found' });
    }
    res.status(201).json(proposal);
  } catch (err) {
    next(err);
  }
});

app.get('/api/technical-due-diligence/audits', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const list = await technicalDueDiligenceService.listAudits(userId);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

app.post('/api/technical-due-diligence/audits', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateDueDiligenceAuditInput(req.body);
    if (!validation.ok) {
      return res.status(422).json({ code: 'validation_error', errors: validation.errors });
    }
    const audit = await technicalDueDiligenceService.createAudit(userId, req.body);
    res.status(201).json(audit);
  } catch (err) {
    next(err);
  }
});

app.get('/api/technical-due-diligence/audits/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const audit = await technicalDueDiligenceService.getAudit(userId, req.params.id);
    if (!audit) {
      return res.status(404).json({ code: 'audit_not_found', error: 'Technical diligence audit not found' });
    }
    res.json(audit);
  } catch (err) {
    next(err);
  }
});

app.put('/api/technical-due-diligence/audits/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateDueDiligenceAuditInput(req.body);
    if (!validation.ok) {
      return res.status(422).json({ code: 'validation_error', errors: validation.errors });
    }
    const updated = await technicalDueDiligenceService.updateAudit(userId, req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ code: 'audit_not_found', error: 'Technical diligence audit not found' });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/technical-due-diligence/audits/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const deleted = await technicalDueDiligenceService.deleteAudit(userId, req.params.id);
    if (!deleted) {
      return res.status(404).json({ code: 'audit_not_found', error: 'Technical diligence audit not found' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

app.get('/api/technical-due-diligence/audits/:id/findings', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const findings = await technicalDueDiligenceService.listFindings(userId, req.params.id);
    res.json(findings);
  } catch (err) {
    next(err);
  }
});

app.post('/api/technical-due-diligence/audits/:id/findings', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateDiligenceFindingInput(req.body);
    if (!validation.ok) {
      return res.status(422).json({ code: 'validation_error', errors: validation.errors });
    }
    const finding = await technicalDueDiligenceService.addFinding(userId, req.params.id, req.body);
    if (!finding) {
      return res.status(404).json({ code: 'audit_not_found', error: 'Technical diligence audit not found' });
    }
    res.status(201).json(finding);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/technical-due-diligence/findings/:findingId', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const deleted = await technicalDueDiligenceService.deleteFinding(userId, req.params.findingId);
    if (!deleted) {
      return res.status(404).json({ code: 'finding_not_found', error: 'Finding not found' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

app.post('/api/technical-due-diligence/audits/:id/generate-memo', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const memo = await technicalDueDiligenceService.generateMemo(userId, req.params.id);
    if (!memo) {
      return res.status(404).json({ code: 'audit_not_found', error: 'Technical diligence audit not found' });
    }
    res.json({ markdown: memo });
  } catch (err) {
    next(err);
  }
});

app.get('/api/org-topology-studio/scenarios', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const list = await orgTopologyStudioService.listScenarios(userId);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

app.post('/api/org-topology-studio/scenarios', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateReorgScenarioInput(req.body);
    if (!validation.ok) {
      return res.status(422).json({ code: 'validation_error', errors: validation.errors });
    }
    const scenario = await orgTopologyStudioService.createScenario(userId, req.body);
    res.status(201).json(scenario);
  } catch (err) {
    next(err);
  }
});

app.get('/api/org-topology-studio/scenarios/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const scenario = await orgTopologyStudioService.getScenario(userId, req.params.id);
    if (!scenario) {
      return res.status(404).json({ code: 'scenario_not_found', error: 'Organization scenario not found' });
    }
    res.json(scenario);
  } catch (err) {
    next(err);
  }
});

app.put('/api/org-topology-studio/scenarios/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateReorgScenarioInput(req.body);
    if (!validation.ok) {
      return res.status(422).json({ code: 'validation_error', errors: validation.errors });
    }
    const updated = await orgTopologyStudioService.updateScenario(userId, req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ code: 'scenario_not_found', error: 'Organization scenario not found' });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/org-topology-studio/scenarios/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const deleted = await orgTopologyStudioService.deleteScenario(userId, req.params.id);
    if (!deleted) {
      return res.status(404).json({ code: 'scenario_not_found', error: 'Organization scenario not found' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

app.get('/api/org-topology-studio/scenarios/:id/teams', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const teams = await orgTopologyStudioService.listTeams(userId, req.params.id);
    res.json(teams);
  } catch (err) {
    next(err);
  }
});

app.post('/api/org-topology-studio/scenarios/:id/teams', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateTeamTopologyInput(req.body);
    if (!validation.ok) {
      return res.status(422).json({ code: 'validation_error', errors: validation.errors });
    }
    const team = await orgTopologyStudioService.addTeam(userId, req.params.id, req.body);
    res.status(201).json(team);
  } catch (err) {
    next(err);
  }
});

app.put('/api/org-topology-studio/teams/:teamId', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const updated = await orgTopologyStudioService.updateTeam(userId, req.params.teamId, req.body);
    if (!updated) {
      return res.status(404).json({ code: 'team_not_found', error: 'Team topology not found' });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/org-topology-studio/teams/:teamId', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const deleted = await orgTopologyStudioService.deleteTeam(userId, req.params.teamId);
    if (!deleted) {
      return res.status(404).json({ code: 'team_not_found', error: 'Team topology not found' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

app.get('/api/org-topology-studio/scenarios/:id/employees', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const employees = await orgTopologyStudioService.listEmployees(userId, req.params.id);
    res.json(employees);
  } catch (err) {
    next(err);
  }
});

app.post('/api/org-topology-studio/scenarios/:id/generate-memo', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const memo = await orgTopologyStudioService.generateMemo(userId, req.params.id);
    if (!memo) {
      return res.status(404).json({ code: 'scenario_not_found', error: 'Organization scenario not found' });
    }
    res.json({ markdown: memo });
  } catch (err) {
    next(err);
  }
});

app.get(['/api/value-stream-studio/overview', '/api/vsm/overview'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const overview = await valueStreamStudioService.getOverview(userId);
    res.json(overview);
  } catch (err) {
    next(err);
  }
});

app.get(['/api/value-stream-studio/value-streams', '/api/vsm/value-streams'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const list = await valueStreamStudioService.listValueStreams(userId);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/value-stream-studio/value-streams', '/api/vsm/value-streams'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateValueStreamInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ code: 'validation_failed', errors: validation.errors });
    }
    const created = await valueStreamStudioService.createValueStream(userId, req.body);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

app.put(['/api/value-stream-studio/value-streams/:id', '/api/vsm/value-streams/:id'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateValueStreamInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ code: 'validation_failed', errors: validation.errors });
    }
    const updated = await valueStreamStudioService.updateValueStream(userId, req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ code: 'value_stream_not_found', error: 'Value stream not found' });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.delete(['/api/value-stream-studio/value-streams/:id', '/api/vsm/value-streams/:id'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const deleted = await valueStreamStudioService.deleteValueStream(userId, req.params.id);
    if (!deleted) {
      return res.status(404).json({ code: 'value_stream_not_found', error: 'Value stream not found' });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

app.get(['/api/value-stream-studio/okrs', '/api/vsm/okrs'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const list = await valueStreamStudioService.listOkrs(userId);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/value-stream-studio/okrs', '/api/vsm/okrs'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateStrategicOkrInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ code: 'validation_failed', errors: validation.errors });
    }
    const created = await valueStreamStudioService.createOkr(userId, req.body);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

app.delete(['/api/value-stream-studio/okrs/:id', '/api/vsm/okrs/:id'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const deleted = await valueStreamStudioService.deleteOkr(userId, req.params.id);
    if (!deleted) {
      return res.status(404).json({ code: 'okr_not_found', error: 'Strategic OKR linkage not found' });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

app.post(['/api/value-stream-studio/dora/calculate', '/api/vsm/dora/calculate'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateDoraCalculationInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ code: 'validation_failed', errors: validation.errors });
    }
    const snapshot = await valueStreamStudioService.calculateDora(userId, req.body);
    res.json(snapshot);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/value-stream-studio/flow/simulate', '/api/vsm/flow/simulate'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateFlowSimulationInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ code: 'validation_failed', errors: validation.errors });
    }
    const snapshot = await valueStreamStudioService.simulateFlow(userId, req.body);
    res.json(snapshot);
  } catch (err) {
    next(err);
  }
});

app.get(['/api/value-stream-studio/capitalized-projects', '/api/vsm/capitalized-projects'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const list = await valueStreamStudioService.listCapitalizedProjects(userId);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/value-stream-studio/capitalized-projects', '/api/vsm/capitalized-projects', '/api/vsm/capitalization/project'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateCapitalizedProjectInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ code: 'validation_failed', errors: validation.errors });
    }
    const created = await valueStreamStudioService.createCapitalizedProject(userId, req.body);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

app.delete(['/api/value-stream-studio/capitalized-projects/:id', '/api/vsm/capitalized-projects/:id'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const deleted = await valueStreamStudioService.deleteCapitalizedProject(userId, req.params.id);
    if (!deleted) {
      return res.status(404).json({ code: 'project_not_found', error: 'Capitalized project not found' });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

app.post(['/api/value-stream-studio/board-memos/generate', '/api/vsm/board-memo/generate'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateBoardMemoGenerateInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ code: 'validation_failed', errors: validation.errors });
    }
    const memo = await valueStreamStudioService.generateBoardMemo(userId, req.body);
    res.status(201).json(memo);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/value-stream-studio/board-memos/:id/approve', '/api/vsm/board-memo/:id/approve'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const role = req.body?.role === 'cfo' ? 'cfo' : 'cto';
    const updated = await valueStreamStudioService.approveBoardMemo(userId, String(req.params.id), role);
    if (!updated) {
      return res.status(404).json({ code: 'memo_not_found', error: 'Board memorandum not found' });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.get(['/api/cloud-finops-studio/overview', '/api/finops/overview'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const overview = await cloudFinopsStudioService.getOverview(userId);
    res.json(overview);
  } catch (err) {
    next(err);
  }
});

app.get(['/api/cloud-finops-studio/allocations', '/api/finops/allocations'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const allocs = await cloudFinopsStudioService.listAllocations(userId);
    res.json(allocs);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/cloud-finops-studio/allocations', '/api/finops/allocations'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateTenantAllocationInput(req.body);
    if (!val.ok) {
      return res.status(400).json({ code: 'validation_failed', errors: val.errors });
    }
    const created = await cloudFinopsStudioService.createAllocation(userId, req.body);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

app.put(['/api/cloud-finops-studio/allocations/:id', '/api/finops/allocations/:id'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateTenantAllocationInput(req.body);
    if (!val.ok) {
      return res.status(400).json({ code: 'validation_failed', errors: val.errors });
    }
    const updated = await cloudFinopsStudioService.updateAllocation(userId, String(req.params.id), req.body);
    if (!updated) {
      return res.status(404).json({ code: 'allocation_not_found', error: 'Tenant cost allocation not found' });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.delete(['/api/cloud-finops-studio/allocations/:id', '/api/finops/allocations/:id'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const ok = await cloudFinopsStudioService.deleteAllocation(userId, String(req.params.id));
    if (!ok) {
      return res.status(404).json({ code: 'allocation_not_found', error: 'Tenant cost allocation not found' });
    }
    res.json({ ok: true, deleted: true });
  } catch (err) {
    next(err);
  }
});

app.get(['/api/cloud-finops-studio/commitments', '/api/finops/commitments'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const commits = await cloudFinopsStudioService.listCommitments(userId);
    res.json(commits);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/cloud-finops-studio/commitments', '/api/finops/commitments'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateCommitmentInput(req.body);
    if (!val.ok) {
      return res.status(400).json({ code: 'validation_failed', errors: val.errors });
    }
    const created = await cloudFinopsStudioService.createCommitment(userId, req.body);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

app.delete(['/api/cloud-finops-studio/commitments/:id', '/api/finops/commitments/:id'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const ok = await cloudFinopsStudioService.deleteCommitment(userId, String(req.params.id));
    if (!ok) {
      return res.status(404).json({ code: 'commitment_not_found', error: 'Commitment not found' });
    }
    res.json({ ok: true, deleted: true });
  } catch (err) {
    next(err);
  }
});

app.post(['/api/cloud-finops-studio/commitments/simulate-npv', '/api/finops/commitments/simulate-npv'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateCommitmentPurchaseSimulationInput(req.body);
    if (!val.ok) {
      return res.status(400).json({ code: 'validation_failed', errors: val.errors });
    }
    const scenarios = await cloudFinopsStudioService.simulateCommitmentNpv(userId, req.body);
    res.json(scenarios);
  } catch (err) {
    next(err);
  }
});

app.get(['/api/cloud-finops-studio/anomalies', '/api/finops/anomalies'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const anomalies = await cloudFinopsStudioService.listAnomalies(userId);
    res.json(anomalies);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/cloud-finops-studio/anomalies/detect', '/api/finops/anomalies/detect'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateAnomalyDetectionInput(req.body);
    if (!val.ok) {
      return res.status(400).json({ code: 'validation_failed', errors: val.errors });
    }
    const detected = await cloudFinopsStudioService.detectAnomalies(userId, req.body);
    res.json(detected);
  } catch (err) {
    next(err);
  }
});

app.get(['/api/cloud-finops-studio/idle-waste', '/api/finops/idle-waste'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const assets = await cloudFinopsStudioService.listIdleAssets(userId);
    res.json(assets);
  } catch (err) {
    next(err);
  }
});

app.patch(['/api/cloud-finops-studio/idle-waste/:id/remediate', '/api/finops/idle-waste/:id/remediate'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateIdleWasteRemediationInput(req.body);
    if (!val.ok) {
      return res.status(400).json({ code: 'validation_failed', errors: val.errors });
    }
    const updated = await cloudFinopsStudioService.remediateIdleAsset(userId, String(req.params.id), req.body);
    if (!updated) {
      return res.status(404).json({ code: 'asset_not_found', error: 'Idle asset not found' });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.get(['/api/cloud-finops-studio/k8s-rightsizing', '/api/finops/k8s-rightsizing'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const workloads = await cloudFinopsStudioService.listK8sWorkloads(userId);
    res.json(workloads);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/cloud-finops-studio/k8s-rightsizing/simulate', '/api/finops/k8s-rightsizing/simulate'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateKubernetesRightsizingInput(req.body);
    if (!val.ok) {
      return res.status(400).json({ code: 'validation_failed', errors: val.errors });
    }
    const simulated = await cloudFinopsStudioService.simulateK8sRightsizing(userId, req.body);
    res.json(simulated);
  } catch (err) {
    next(err);
  }
});

app.get(['/api/cloud-finops-studio/cfo-memos', '/api/finops/cfo-memos'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const memos = await cloudFinopsStudioService.listCfoMemos(userId);
    res.json(memos);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/cloud-finops-studio/cfo-memos/generate', '/api/finops/cfo-memos/generate'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateCfoMemoGenerateInput(req.body);
    if (!val.ok) {
      return res.status(400).json({ code: 'validation_failed', errors: val.errors });
    }
    const memo = await cloudFinopsStudioService.generateCfoMemo(userId, req.body);
    res.status(201).json(memo);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/cloud-finops-studio/cfo-memos/:id/approve', '/api/finops/cfo-memos/:id/approve'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const role = req.body?.role === 'cfo' ? 'cfo' : req.body?.role === 'cto' ? 'cto' : 'vp_infra';
    const updated = await cloudFinopsStudioService.approveCfoMemo(userId, String(req.params.id), role);
    if (!updated) {
      return res.status(404).json({ code: 'memo_not_found', error: 'CFO memorandum not found' });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.get(['/api/ai-governance-studio/overview', '/api/ai-governance/overview'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const overview = await aiGovernanceStudioService.getOverview(userId);
    res.json(overview);
  } catch (err) {
    next(err);
  }
});

app.get(['/api/ai-governance-studio/evaluations', '/api/ai-governance/evaluations'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const domain = typeof req.query.domain === 'string' ? (req.query.domain as any) : undefined;
    const evaluations = await aiGovernanceStudioService.listModelEvaluations(userId, domain);
    res.json(evaluations);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/ai-governance-studio/evaluations/run', '/api/ai-governance/evaluations/run'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateLlmEvaluationInput(req.body);
    if (!val.ok) {
      return res.status(400).json({ code: 'invalid_evaluation_request', errors: val.errors });
    }
    const result = await aiGovernanceStudioService.runModelEvaluation(userId, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.get(['/api/ai-governance-studio/token-economics', '/api/ai-governance/token-economics'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const tokenEcon = await aiGovernanceStudioService.getTokenEconomics(userId);
    res.json(tokenEcon);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/ai-governance-studio/token-economics/simulate-cascade', '/api/ai-governance/token-economics/simulate-cascade'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateCascadeSimulationInput(req.body);
    if (!val.ok) {
      return res.status(400).json({ code: 'invalid_cascade_simulation_request', errors: val.errors });
    }
    const simulation = await aiGovernanceStudioService.simulateCascadeArbitrage(userId, req.body);
    res.json(simulation);
  } catch (err) {
    next(err);
  }
});

app.get(['/api/ai-governance-studio/responsible-ai', '/api/ai-governance/responsible-ai'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const responsibleAi = await aiGovernanceStudioService.getResponsibleAiOverview(userId);
    res.json(responsibleAi);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/ai-governance-studio/responsible-ai/test-masking', '/api/ai-governance/responsible-ai/test-masking'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    if (!req.body?.rawPrompt || typeof req.body.rawPrompt !== 'string') {
      return res.status(400).json({ code: 'invalid_masking_request', errors: { rawPrompt: 'Vui lòng nhập văn bản cần thử nghiệm che dấu PII.' } });
    }
    const result = await aiGovernanceStudioService.testPiiMasking(userId, {
      rawPrompt: req.body.rawPrompt,
      strategy: req.body.strategy || 'full_mask'
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.get(['/api/ai-governance-studio/security-incidents', '/api/ai-governance/security-incidents'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const incidents = await aiGovernanceStudioService.scanSecurityIncidents(userId);
    res.json(incidents);
  } catch (err) {
    next(err);
  }
});

app.patch(['/api/ai-governance-studio/security-incidents/:id/resolve', '/api/ai-governance/security-incidents/:id/resolve'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const updated = await aiGovernanceStudioService.resolveSecurityIncident(userId, String(req.params.id), req.body?.notes);
    if (!updated) {
      return res.status(404).json({ code: 'incident_not_found', error: 'Security incident not found' });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.get(['/api/ai-governance-studio/rag', '/api/ai-governance/rag'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const rag = await aiGovernanceStudioService.getRagOverview(userId);
    res.json(rag);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/ai-governance-studio/rag/tune-chunking', '/api/ai-governance/rag/tune-chunking'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const chunkSize = Number(req.body?.chunkSizeTokens);
    const chunkOverlap = Number(req.body?.chunkOverlapTokens);
    if (isNaN(chunkSize) || chunkSize < 128 || chunkSize > 4096) {
      return res.status(400).json({ code: 'invalid_chunking_request', errors: { chunkSizeTokens: 'Kích thước đoạn văn bản phải từ 128 đến 4096 tokens.' } });
    }
    const result = await aiGovernanceStudioService.tuneChunking(userId, {
      chunkSizeTokens: chunkSize,
      chunkOverlapTokens: isNaN(chunkOverlap) ? 64 : chunkOverlap,
      indexingStrategy: req.body?.indexingStrategy || 'semantic_parent'
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.get(['/api/ai-governance-studio/board-memos', '/api/ai-governance/board-memos'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const memos = await aiGovernanceStudioService.listBoardMemos(userId);
    res.json(memos);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/ai-governance-studio/board-memos/generate', '/api/ai-governance/board-memos/generate'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateAiBoardMemoGenerateInput(req.body);
    if (!val.ok) {
      return res.status(400).json({ code: 'invalid_board_memo_request', errors: val.errors });
    }
    const memo = await aiGovernanceStudioService.generateBoardMemo(userId, req.body);
    res.status(201).json(memo);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/ai-governance-studio/board-memos/:id/approve', '/api/ai-governance/board-memos/:id/approve'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const role = req.body?.role === 'chief_legal_officer' ? 'chief_legal_officer' : req.body?.role === 'cto' ? 'cto' : 'vp_ai';
    const updated = await aiGovernanceStudioService.approveBoardMemo(userId, String(req.params.id), role);
    if (!updated) {
      return res.status(404).json({ code: 'board_memo_not_found', error: 'Executive board memorandum not found' });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.get(['/api/succession-pipeline-studio/overview', '/api/succession/overview'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const overview = await successionPipelineStudioService.getOverview(userId);
    res.json(overview);
  } catch (err) {
    next(err);
  }
});

app.get(['/api/succession-pipeline-studio/talent-profiles', '/api/succession/talent-profiles'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const profiles = await successionPipelineStudioService.listTalentProfiles(userId);
    res.json(profiles);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/succession-pipeline-studio/talent-profiles', '/api/succession/talent-profiles'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const profile = await successionPipelineStudioService.createTalentProfile(userId, req.body);
    res.status(201).json(profile);
  } catch (err) {
    res.status(400).json({ code: 'invalid_talent_profile_payload', error: (err as Error).message });
  }
});

app.put(['/api/succession-pipeline-studio/talent-profiles/:id', '/api/succession/talent-profiles/:id'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const updated = await successionPipelineStudioService.updateTalentProfile(userId, String(req.params.id), req.body);
    res.json(updated);
  } catch (err) {
    if ((err as Error).message === 'talent_profile_not_found') {
      return res.status(404).json({ code: 'talent_profile_not_found', error: 'Talent profile not found' });
    }
    res.status(400).json({ code: 'invalid_talent_profile_update', error: (err as Error).message });
  }
});

app.delete(['/api/succession-pipeline-studio/talent-profiles/:id', '/api/succession/talent-profiles/:id'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const deleted = await successionPipelineStudioService.deleteTalentProfile(userId, String(req.params.id));
    if (!deleted) {
      return res.status(404).json({ code: 'talent_profile_not_found', error: 'Talent profile not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.get(['/api/succession-pipeline-studio/critical-roles', '/api/succession/critical-roles'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const plan = await successionPipelineStudioService.getPlan(userId);
    const roles = await successionPipelineStudioService.listCriticalRoles(userId, plan.id);
    res.json(roles);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/succession-pipeline-studio/critical-roles', '/api/succession/critical-roles'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const role = await successionPipelineStudioService.createCriticalRole(userId, req.body);
    res.status(201).json(role);
  } catch (err) {
    res.status(400).json({ code: 'invalid_critical_role_payload', error: (err as Error).message });
  }
});

app.post(['/api/succession-pipeline-studio/successors', '/api/succession/successors'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const successor = await successionPipelineStudioService.addSuccessorCandidate(userId, req.body);
    res.status(201).json(successor);
  } catch (err) {
    res.status(400).json({ code: 'invalid_successor_payload', error: (err as Error).message });
  }
});

app.delete(['/api/succession-pipeline-studio/successors/:id', '/api/succession/successors/:id'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const removed = await successionPipelineStudioService.removeSuccessorCandidate(userId, String(req.params.id));
    if (!removed) {
      return res.status(404).json({ code: 'successor_not_found', error: 'Successor candidate not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.get(['/api/succession-pipeline-studio/interventions', '/api/succession/interventions'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const interventions = await successionPipelineStudioService.listRetentionInterventions(userId);
    res.json(interventions);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/succession-pipeline-studio/interventions', '/api/succession/interventions'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const intervention = await successionPipelineStudioService.createRetentionIntervention(userId, req.body);
    res.status(201).json(intervention);
  } catch (err) {
    res.status(400).json({ code: 'invalid_intervention_payload', error: (err as Error).message });
  }
});

app.patch(['/api/succession-pipeline-studio/interventions/:id/status', '/api/succession/interventions/:id/status'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const status = req.body?.status;
    const authorizedBy = typeof req.body?.authorizedBy === 'string' ? req.body.authorizedBy : undefined;
    const updated = await successionPipelineStudioService.updateInterventionStatus(userId, String(req.params.id), status, authorizedBy);
    res.json(updated);
  } catch (err) {
    if ((err as Error).message === 'intervention_not_found') {
      return res.status(404).json({ code: 'intervention_not_found', error: 'Intervention not found' });
    }
    res.status(400).json({ code: 'invalid_intervention_status_payload', error: (err as Error).message });
  }
});

app.get(['/api/succession-pipeline-studio/development-plans', '/api/succession/development-plans'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const plans = await successionPipelineStudioService.listDevelopmentPlans(userId);
    res.json(plans);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/succession-pipeline-studio/development-plans', '/api/succession/development-plans'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const devPlan = await successionPipelineStudioService.createOrUpdateDevelopmentPlan(userId, req.body);
    res.status(201).json(devPlan);
  } catch (err) {
    res.status(400).json({ code: 'invalid_development_plan_payload', error: (err as Error).message });
  }
});

app.get(['/api/succession-pipeline-studio/plan', '/api/succession/plan'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const planId = typeof req.query.planId === 'string' ? req.query.planId : undefined;
    const plan = await successionPipelineStudioService.getPlan(userId, planId);
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/succession-pipeline-studio/plan/:id/sign-off', '/api/succession/plan/:id/sign-off'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const updated = await successionPipelineStudioService.signOffPlan(userId, String(req.params.id), req.body);
    res.json(updated);
  } catch (err) {
    if ((err as Error).message === 'succession_plan_not_found') {
      return res.status(404).json({ code: 'succession_plan_not_found', error: 'Succession plan not found' });
    }
    res.status(400).json({ code: 'invalid_sign_off_payload', error: (err as Error).message });
  }
});

app.get(['/api/cyber-risk-governance-studio/overview', '/api/cyber-risk/overview'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const overview = await cyberRiskGovernanceStudioService.getOverview(userId);
    res.json(overview);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/cyber-risk-governance-studio/scenarios', '/api/cyber-risk/scenarios'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const scenario = await cyberRiskGovernanceStudioService.createScenario(userId, req.body);
    res.status(201).json(scenario);
  } catch (err) {
    res.status(400).json({ code: 'invalid_scenario_payload', error: (err as Error).message });
  }
});

app.delete(['/api/cyber-risk-governance-studio/scenarios/:id', '/api/cyber-risk/scenarios/:id'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const deleted = await cyberRiskGovernanceStudioService.deleteScenario(userId, String(req.params.id));
    if (!deleted) {
      return res.status(404).json({ code: 'scenario_not_found', error: 'Scenario not found' });
    }
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    next(err);
  }
});

app.post(['/api/cyber-risk-governance-studio/vulnerabilities', '/api/cyber-risk/vulnerabilities'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const vuln = await cyberRiskGovernanceStudioService.createVulnerability(userId, req.body);
    res.status(201).json(vuln);
  } catch (err) {
    res.status(400).json({ code: 'invalid_vulnerability_payload', error: (err as Error).message });
  }
});

app.delete(['/api/cyber-risk-governance-studio/vulnerabilities/:id', '/api/cyber-risk/vulnerabilities/:id'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const deleted = await cyberRiskGovernanceStudioService.deleteVulnerability(userId, String(req.params.id));
    if (!deleted) {
      return res.status(404).json({ code: 'vulnerability_not_found', error: 'Vulnerability not found' });
    }
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    next(err);
  }
});

app.post(['/api/cyber-risk-governance-studio/dark-web', '/api/cyber-risk/dark-web'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const exp = await cyberRiskGovernanceStudioService.createDarkWebExposure(userId, req.body);
    res.status(201).json(exp);
  } catch (err) {
    res.status(400).json({ code: 'invalid_dark_web_payload', error: (err as Error).message });
  }
});

app.delete(['/api/cyber-risk-governance-studio/dark-web/:id', '/api/cyber-risk/dark-web/:id'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const deleted = await cyberRiskGovernanceStudioService.deleteDarkWebExposure(userId, String(req.params.id));
    if (!deleted) {
      return res.status(404).json({ code: 'exposure_not_found', error: 'Dark web exposure not found' });
    }
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    next(err);
  }
});

app.post(['/api/cyber-risk-governance-studio/controls', '/api/cyber-risk/controls'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const ctrl = await cyberRiskGovernanceStudioService.createComplianceControl(userId, req.body);
    res.status(201).json(ctrl);
  } catch (err) {
    res.status(400).json({ code: 'invalid_control_payload', error: (err as Error).message });
  }
});

app.delete(['/api/cyber-risk-governance-studio/controls/:id', '/api/cyber-risk/controls/:id'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const deleted = await cyberRiskGovernanceStudioService.deleteComplianceControl(userId, String(req.params.id));
    if (!deleted) {
      return res.status(404).json({ code: 'control_not_found', error: 'Compliance control not found' });
    }
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    next(err);
  }
});

app.post(['/api/cyber-risk-governance-studio/tabletop', '/api/cyber-risk/tabletop'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const sim = await cyberRiskGovernanceStudioService.createTabletopSimulation(userId, req.body);
    res.status(201).json(sim);
  } catch (err) {
    res.status(400).json({ code: 'invalid_tabletop_payload', error: (err as Error).message });
  }
});

app.delete(['/api/cyber-risk-governance-studio/tabletop/:id', '/api/cyber-risk/tabletop/:id'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const deleted = await cyberRiskGovernanceStudioService.deleteTabletopSimulation(userId, String(req.params.id));
    if (!deleted) {
      return res.status(404).json({ code: 'simulation_not_found', error: 'Tabletop simulation not found' });
    }
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    next(err);
  }
});

app.post(['/api/cyber-risk-governance-studio/memorandum/:id/sign-off', '/api/cyber-risk/memorandum/:id/sign-off'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const updated = await cyberRiskGovernanceStudioService.signOffMemorandum(userId, String(req.params.id), req.body);
    res.json(updated);
  } catch (err) {
    if ((err as Error).message.includes('not found')) {
      return res.status(404).json({ code: 'memorandum_not_found', error: 'Memorandum not found' });
    }
    res.status(400).json({ code: 'invalid_sign_off_payload', error: (err as Error).message });
  }
});

app.get(['/api/esg-sustainability-studio/overview', '/api/esg-studio/overview'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const overview = await esgSustainabilityStudioService.getOverview(userId);
    res.json(overview);
  } catch (err) {
    next(err);
  }
});

app.get(['/api/esg-sustainability-studio/carbon-inventory', '/api/esg-studio/carbon-inventory'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const year = req.query.year ? parseInt(String(req.query.year), 10) : 2026;
    const inv = await esgSustainabilityStudioService.getCarbonInventory(userId, year);
    res.json(inv);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/esg-sustainability-studio/carbon-inventory', '/api/esg-studio/carbon-inventory'], auth, async (req, res) => {
  try {
    const userId = (req as SessionRequest).userId;
    const inv = await esgSustainabilityStudioService.recordCarbonEmissions(userId, req.body);
    res.status(201).json(inv);
  } catch (err) {
    res.status(400).json({ code: 'invalid_carbon_payload', error: (err as Error).message });
  }
});

app.get(['/api/esg-sustainability-studio/tcfd-scenarios', '/api/esg-studio/tcfd-scenarios'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const scenarios = await esgSustainabilityStudioService.getTcfdScenarios(userId);
    res.json(scenarios);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/esg-sustainability-studio/scenarios/simulate', '/api/esg-studio/scenarios/simulate'], auth, async (req, res) => {
  try {
    const userId = (req as SessionRequest).userId;
    const result = await esgSustainabilityStudioService.simulateTcfdScenario(userId, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ code: 'invalid_tcfd_simulation_payload', error: (err as Error).message });
  }
});

app.get(['/api/esg-sustainability-studio/materiality', '/api/esg-studio/materiality'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const matrix = await esgSustainabilityStudioService.getDoubleMaterialityMatrix(userId);
    res.json(matrix);
  } catch (err) {
    next(err);
  }
});

app.put(['/api/esg-sustainability-studio/materiality/:code', '/api/esg-studio/materiality/:code'], auth, async (req, res) => {
  try {
    const userId = (req as SessionRequest).userId;
    const topic = await esgSustainabilityStudioService.updateMaterialityAssessment(userId, req.params.code, req.body);
    res.json(topic);
  } catch (err) {
    if ((err as Error).message.includes('not found')) {
      return res.status(404).json({ code: 'topic_not_found', error: 'Topic not found' });
    }
    res.status(400).json({ code: 'invalid_materiality_payload', error: (err as Error).message });
  }
});

app.get(['/api/esg-sustainability-studio/suppliers', '/api/esg-studio/suppliers'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const supplyChain = await esgSustainabilityStudioService.getSupplierDecarbonization(userId);
    res.json(supplyChain);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/esg-sustainability-studio/suppliers/simulate', '/api/esg-studio/suppliers/simulate'], auth, async (req, res) => {
  try {
    const userId = (req as SessionRequest).userId;
    const result = await esgSustainabilityStudioService.simulateSupplierDecarbonization(userId, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ code: 'invalid_supplier_simulation_payload', error: (err as Error).message });
  }
});

app.get(['/api/esg-sustainability-studio/sec-audit', '/api/esg-studio/sec-audit'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const audit = await esgSustainabilityStudioService.getSecDisclosureAudit(userId);
    res.json(audit);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/esg-sustainability-studio/board-memos/generate', '/api/esg-studio/board-memos/generate'], auth, async (req, res) => {
  try {
    const userId = (req as SessionRequest).userId;
    const memo = await esgSustainabilityStudioService.generateBoardMemorandum(userId, req.body);
    res.status(201).json(memo);
  } catch (err) {
    res.status(400).json({ code: 'invalid_board_memo_payload', error: (err as Error).message });
  }
});

app.post(['/api/esg-sustainability-studio/board-memos/:id/approve', '/api/esg-studio/board-memos/:id/approve'], auth, async (req, res) => {
  try {
    const userId = (req as SessionRequest).userId;
    const role = req.body.role;
    if (!role || !['cso', 'cfo', 'board_esg_chair'].includes(role)) {
      return res.status(400).json({ code: 'invalid_role', error: 'Invalid sign-off role' });
    }
    const updated = await esgSustainabilityStudioService.signOffBoardMemorandum(userId, req.params.id, role);
    res.json(updated);
  } catch (err) {
    if ((err as Error).message.includes('not found')) {
      return res.status(404).json({ code: 'memo_not_found', error: 'Board memorandum not found' });
    }
    res.status(400).json({ code: 'sign_off_failed', error: (err as Error).message });
  }
});

app.get(['/api/supply-chain-resilience-studio/overview', '/api/supply-chain-studio/overview'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const overview = await supplyChainResilienceStudioService.getOverview(userId);
    res.json(overview);
  } catch (err) {
    next(err);
  }
});

app.get(['/api/supply-chain-resilience-studio/bom', '/api/supply-chain-studio/bom'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const nodes = await supplyChainResilienceStudioService.getBomNodes(userId);
    res.json(nodes);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/supply-chain-resilience-studio/bom', '/api/supply-chain-studio/bom'], auth, async (req, res) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateSupplierBomNodeInput(req.body);
    if (!val.ok) {
      return res.status(400).json({ code: 'validation_error', errors: val.errors });
    }
    const node = await supplyChainResilienceStudioService.saveBomNode(userId, req.body);
    res.status(201).json(node);
  } catch (err) {
    res.status(400).json({ code: 'save_bom_failed', error: (err as Error).message });
  }
});

app.get(['/api/supply-chain-resilience-studio/geopolitical', '/api/supply-chain-studio/geopolitical'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const exposures = await supplyChainResilienceStudioService.getGeopoliticalExposures(userId);
    res.json(exposures);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/supply-chain-resilience-studio/geopolitical/screen', '/api/supply-chain-studio/geopolitical/screen'], auth, async (req, res) => {
  try {
    const userId = (req as SessionRequest).userId;
    const results = await supplyChainResilienceStudioService.screenSanctions(userId);
    res.json(results);
  } catch (err) {
    res.status(400).json({ code: 'screen_failed', error: (err as Error).message });
  }
});

app.get(['/api/supply-chain-resilience-studio/buffers', '/api/supply-chain-studio/buffers'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const buffers = await supplyChainResilienceStudioService.getInventoryBuffers(userId);
    res.json(buffers);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/supply-chain-resilience-studio/buffers/simulate', '/api/supply-chain-studio/buffers/simulate'], auth, async (req, res) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateDisruptionSimulationInput(req.body);
    if (!val.ok) {
      return res.status(400).json({ code: 'validation_error', errors: val.errors });
    }
    const result = await supplyChainResilienceStudioService.simulateLeadTimeDisruption(userId, req.body);
    res.json(result);
  } catch (err) {
    if ((err as Error).message.includes('not found')) {
      return res.status(404).json({ code: 'buffer_not_found', error: (err as Error).message });
    }
    res.status(400).json({ code: 'simulation_failed', error: (err as Error).message });
  }
});

app.get(['/api/supply-chain-resilience-studio/hubs', '/api/supply-chain-studio/hubs'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const hubs = await supplyChainResilienceStudioService.getNetworkHubs(userId);
    res.json(hubs);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/supply-chain-resilience-studio/hubs/compare', '/api/supply-chain-studio/hubs/compare'], auth, async (req, res) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateHubComparisonInput(req.body);
    if (!val.ok) {
      return res.status(400).json({ code: 'validation_error', errors: val.errors });
    }
    const result = await supplyChainResilienceStudioService.compareHubLandedCosts(userId, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ code: 'hub_comparison_failed', error: (err as Error).message });
  }
});

app.get(['/api/supply-chain-resilience-studio/board-memos', '/api/supply-chain-studio/board-memos'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const memos = await supplyChainResilienceStudioService.getBoardMemos(userId);
    res.json(memos);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/supply-chain-resilience-studio/board-memos/generate', '/api/supply-chain-studio/board-memos/generate'], auth, async (req, res) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateSupplyChainBoardMemoGenerateInput(req.body);
    if (!val.ok) {
      return res.status(400).json({ code: 'validation_error', errors: val.errors });
    }
    const memo = await supplyChainResilienceStudioService.generateBoardMemorandum(userId, req.body);
    res.status(201).json(memo);
  } catch (err) {
    res.status(400).json({ code: 'memo_generation_failed', error: (err as Error).message });
  }
});

app.post(['/api/supply-chain-resilience-studio/board-memos/:id/approve', '/api/supply-chain-studio/board-memos/:id/approve', '/api/supply-chain-resilience-studio/board-memos/:id/signoff', '/api/supply-chain-studio/board-memos/:id/signoff'], auth, async (req, res) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateSupplyChainSignoffInput(req.body);
    if (!val.ok) {
      return res.status(400).json({ code: 'validation_error', errors: val.errors });
    }
    const updated = await supplyChainResilienceStudioService.signOffBoardMemorandum(userId, req.params.id, req.body.role as BoardSignoffRole, req.body.signoffNotes);
    res.json(updated);
  } catch (err) {
    if ((err as Error).message.includes('not found')) {
      return res.status(404).json({ code: 'memo_not_found', error: 'Board memorandum not found' });
    }
    res.status(400).json({ code: 'sign_off_failed', error: (err as Error).message });
  }
});

app.get(['/api/workforce-total-rewards-studio/overview', '/api/total-rewards-studio/overview'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const overview = await workforceTotalRewardsStudioService.getOverview(userId);
    res.json(overview);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/workforce-total-rewards-studio/lti/simulate-tsr', '/api/total-rewards-studio/lti/simulate-tsr'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateRelativeTsrSimulationInput(req.body);
    if (!val.ok) {
      return res.status(400).json({ code: 'validation_error', errors: val.errors });
    }
    const result = await workforceTotalRewardsStudioService.simulateRelativeTsr(userId, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ code: 'simulation_failed', error: (err as Error).message });
  }
});

app.post(['/api/workforce-total-rewards-studio/tax/optimize', '/api/total-rewards-studio/tax/optimize'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateSection83bArbitrageInput(req.body);
    if (!val.ok) {
      return res.status(400).json({ code: 'validation_error', errors: val.errors });
    }
    const result = await workforceTotalRewardsStudioService.optimizeEquityTax(userId, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ code: 'tax_optimization_failed', error: (err as Error).message });
  }
});

app.post(['/api/workforce-total-rewards-studio/board-memos', '/api/total-rewards-studio/board-memos'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateGenerateCdaBoardMemoInput(req.body);
    if (!val.ok) {
      return res.status(400).json({ code: 'validation_error', errors: val.errors });
    }
    const memo = await workforceTotalRewardsStudioService.generateBoardMemo(userId, req.body);
    res.status(201).json(memo);
  } catch (err) {
    res.status(400).json({ code: 'memo_generation_failed', error: (err as Error).message });
  }
});

app.post(['/api/workforce-total-rewards-studio/board-memos/:id/signoff', '/api/total-rewards-studio/board-memos/:id/signoff'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateSignoffCdaBoardMemoInput(req.body);
    if (!val.ok) {
      return res.status(400).json({ code: 'validation_error', errors: val.errors });
    }
    const memoId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const updated = await workforceTotalRewardsStudioService.signoffBoardMemo(userId, memoId, req.body);
    res.json(updated);
  } catch (err) {
    if ((err as Error).message.includes('not found')) {
      return res.status(404).json({ code: 'memo_not_found', error: 'Board memorandum not found' });
    }
    res.status(400).json({ code: 'sign_off_failed', error: (err as Error).message });
  }
});

app.get(['/api/corporate-treasury-nexus/overview', '/api/treasury-nexus/overview'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const overview = await corporateTreasuryNexusService.getOverview(userId);
    res.json(overview);
  } catch (err) {
    next(err);
  }
});

app.post(['/api/corporate-treasury-nexus/sweeps/execute', '/api/treasury-nexus/sweeps/execute'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const result = await corporateTreasuryNexusService.executeCashSweep(userId, req.body || {});
    res.json(result);
  } catch (err) {
    res.status(400).json({ code: 'sweep_execution_failed', error: (err as Error).message });
  }
});

app.post(['/api/corporate-treasury-nexus/forecast/simulate-ccc', '/api/treasury-nexus/forecast/simulate-ccc'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateWorkingCapitalSimulationInput(req.body);
    if (!val.ok) {
      return res.status(400).json({ code: 'validation_error', errors: val.errors });
    }
    const result = await corporateTreasuryNexusService.simulateWorkingCapital(userId, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ code: 'working_capital_simulation_failed', error: (err as Error).message });
  }
});

app.post(['/api/corporate-treasury-nexus/fx/simulate-var', '/api/treasury-nexus/fx/simulate-var'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateFxSimulationInput(req.body);
    if (!val.ok) {
      return res.status(400).json({ code: 'validation_error', errors: val.errors });
    }
    const result = await corporateTreasuryNexusService.simulateFxSensitivity(userId, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ code: 'fx_simulation_failed', error: (err as Error).message });
  }
});

app.post(['/api/corporate-treasury-nexus/counterparty/simulate-bailin', '/api/treasury-nexus/counterparty/simulate-bailin'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateBailInStressInput(req.body);
    if (!val.ok) {
      return res.status(400).json({ code: 'validation_error', errors: val.errors });
    }
    const result = await corporateTreasuryNexusService.simulateBailInStress(userId, req.body);
    res.json(result);
  } catch (err) {
    if ((err as Error).message.includes('not found')) {
      return res.status(404).json({ code: 'counterparty_not_found', error: (err as Error).message });
    }
    res.status(400).json({ code: 'bailin_simulation_failed', error: (err as Error).message });
  }
});

app.post(['/api/corporate-treasury-nexus/board-memos/generate', '/api/treasury-nexus/board-memos/generate'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateGenerateTreasuryBoardMemoInput(req.body);
    if (!val.ok) {
      return res.status(400).json({ code: 'validation_error', errors: val.errors });
    }
    const memo = await corporateTreasuryNexusService.generateBoardMemo(userId, req.body);
    res.status(201).json(memo);
  } catch (err) {
    res.status(400).json({ code: 'memo_generation_failed', error: (err as Error).message });
  }
});

app.post(['/api/corporate-treasury-nexus/board-memos/:id/signoff', '/api/treasury-nexus/board-memos/:id/signoff'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateSignoffTreasuryBoardMemoInput(req.body);
    if (!val.ok) {
      return res.status(400).json({ code: 'validation_error', errors: val.errors });
    }
    const memoId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const updated = await corporateTreasuryNexusService.signoffBoardMemo(userId, memoId, req.body);
    res.json(updated);
  } catch (err) {
    if ((err as Error).message.includes('not found')) {
      return res.status(404).json({ code: 'memo_not_found', error: 'Board memorandum not found' });
    }
    res.status(400).json({ code: 'sign_off_failed', error: (err as Error).message });
  }
});

app.get(['/api/internal-audit-erm/overview', '/api/sox/overview'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const overview = await internalAuditErmNexusService.getOverview(userId);
    res.json(overview);
  } catch (err) {
    res.status(500).json({ code: 'internal_error', error: (err as Error).message });
  }
});

app.get(['/api/internal-audit-erm/controls', '/api/sox/controls'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const controls = await internalAuditErmNexusService.listControls(userId);
    res.json(controls);
  } catch (err) {
    res.status(500).json({ code: 'internal_error', error: (err as Error).message });
  }
});

app.post(['/api/internal-audit-erm/controls', '/api/sox/controls'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateSoxControlInput(req.body);
    if (!val.ok) {
      return res.status(400).json({ code: 'validation_error', errors: val.errors });
    }
    const created = await internalAuditErmNexusService.createControl(userId, req.body);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ code: 'control_creation_failed', error: (err as Error).message });
  }
});

app.post(['/api/internal-audit-erm/controls/:id/test', '/api/sox/controls/:id/test'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const controlId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const updated = await internalAuditErmNexusService.executeControlTest(userId, controlId, req.body);
    res.json(updated);
  } catch (err) {
    if ((err as Error).message.includes('not found')) {
      return res.status(404).json({ code: 'control_not_found', error: 'Control not found' });
    }
    res.status(400).json({ code: 'control_test_failed', error: (err as Error).message });
  }
});

app.get(['/api/internal-audit-erm/risks', '/api/sox/risks'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const risks = await internalAuditErmNexusService.listRisks(userId);
    res.json(risks);
  } catch (err) {
    res.status(500).json({ code: 'internal_error', error: (err as Error).message });
  }
});

app.post(['/api/internal-audit-erm/risks', '/api/sox/risks'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateEnterpriseRiskInput(req.body);
    if (!val.ok) {
      return res.status(400).json({ code: 'validation_error', errors: val.errors });
    }
    const created = await internalAuditErmNexusService.createRisk(userId, req.body);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ code: 'risk_creation_failed', error: (err as Error).message });
  }
});

app.get(['/api/internal-audit-erm/risks/heatmap', '/api/sox/risks/heatmap'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const heatmap = await internalAuditErmNexusService.getRiskHeatmap(userId);
    res.json(heatmap);
  } catch (err) {
    res.status(500).json({ code: 'internal_error', error: (err as Error).message });
  }
});

app.get(['/api/internal-audit-erm/ccm/events', '/api/sox/ccm/events'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const events = await internalAuditErmNexusService.listCcmEvents(userId);
    res.json(events);
  } catch (err) {
    res.status(500).json({ code: 'internal_error', error: (err as Error).message });
  }
});

app.post(['/api/internal-audit-erm/ccm/evaluate-sod', '/api/sox/ccm/evaluate-sod'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const result = await internalAuditErmNexusService.evaluateSod(userId, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ code: 'sod_evaluation_failed', error: (err as Error).message });
  }
});

app.post(['/api/internal-audit-erm/ccm/events/:id/remediate', '/api/sox/ccm/events/:id/remediate'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const eventId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { resolutionStatus, compensatingControlActive } = req.body;
    const updated = await internalAuditErmNexusService.remediateCcmEvent(
      userId,
      eventId,
      resolutionStatus || 'remediated',
      Boolean(compensatingControlActive)
    );
    res.json(updated);
  } catch (err) {
    if ((err as Error).message.includes('not found')) {
      return res.status(404).json({ code: 'ccm_event_not_found', error: 'CCM event not found' });
    }
    res.status(400).json({ code: 'ccm_remediation_failed', error: (err as Error).message });
  }
});

app.get(['/api/internal-audit-erm/whistleblower/reports', '/api/sox/whistleblower/reports'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const overview = await internalAuditErmNexusService.getOverview(userId);
    res.json(overview.whistleblowerReports);
  } catch (err) {
    res.status(500).json({ code: 'internal_error', error: (err as Error).message });
  }
});

app.post(['/api/internal-audit-erm/whistleblower/reports', '/api/sox/whistleblower/reports'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateWhistleblowerReportInput(req.body);
    if (!val.ok) {
      return res.status(400).json({ code: 'validation_error', errors: val.errors });
    }
    const outcome = await internalAuditErmNexusService.submitWhistleblowerReport(userId, req.body);
    res.status(201).json(outcome);
  } catch (err) {
    res.status(400).json({ code: 'whistleblower_submission_failed', error: (err as Error).message });
  }
});

app.put(['/api/internal-audit-erm/whistleblower/reports/:id/triage', '/api/sox/whistleblower/reports/:id/triage'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const reportId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const updated = await internalAuditErmNexusService.triageWhistleblowerReport(userId, reportId, req.body);
    res.json(updated);
  } catch (err) {
    if ((err as Error).message.includes('not found')) {
      return res.status(404).json({ code: 'report_not_found', error: 'Whistleblower report not found' });
    }
    res.status(400).json({ code: 'triage_failed', error: (err as Error).message });
  }
});

app.get(['/api/internal-audit-erm/remediations', '/api/sox/remediations'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const remediations = await internalAuditErmNexusService.listRemediations(userId);
    res.json(remediations);
  } catch (err) {
    res.status(500).json({ code: 'internal_error', error: (err as Error).message });
  }
});

app.post(['/api/internal-audit-erm/remediations', '/api/sox/remediations'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateRemediationPlanInput(req.body);
    if (!val.ok) {
      return res.status(400).json({ code: 'validation_error', errors: val.errors });
    }
    const created = await internalAuditErmNexusService.createRemediation(userId, req.body);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ code: 'remediation_creation_failed', error: (err as Error).message });
  }
});

app.post(['/api/internal-audit-erm/board-war-room/generate-memo', '/api/sox/board-war-room/generate-memo'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const { fiscalPeriod = 'Q3-2026', fiscalYear = 2026, auditorFirmName = 'PricewaterhouseCoopers LLP', managementEvaluationDate = '2026-09-30' } = req.body;
    const memo = await internalAuditErmNexusService.generateSecItem9AMemo(userId, {
      fiscalPeriod,
      fiscalYear: Number(fiscalYear),
      auditorFirmName,
      managementEvaluationDate
    });
    res.status(201).json(memo);
  } catch (err) {
    res.status(400).json({ code: 'memo_generation_failed', error: (err as Error).message });
  }
});

app.post(['/api/internal-audit-erm/board-war-room/certifications/:id/signoff', '/api/sox/board-war-room/certifications/:id/signoff'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateTripartiteSignOffInput(req.body);
    if (!val.ok) {
      return res.status(400).json({ code: 'validation_error', errors: val.errors });
    }
    const certId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const updated = await internalAuditErmNexusService.signoffCertification(userId, certId, req.body);
    res.json(updated);
  } catch (err) {
    if ((err as Error).message.includes('not found')) {
      return res.status(404).json({ code: 'certification_not_found', error: 'Audit certification not found' });
    }
    res.status(400).json({ code: 'sign_off_failed', error: (err as Error).message });
  }
});

app.get(['/api/legal-operations-nexus/overview', '/api/legal/overview'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const overview = await legalOperationsNexusService.getOverview(userId);
    res.json(overview);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/legal-operations-nexus/entities', '/api/legal/entities'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateLegalEntityInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const created = await legalOperationsNexusService.createEntity(userId, req.body);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/legal-operations-nexus/ip-portfolio/calculate-pqdi', '/api/legal/ip-portfolio/calculate-pqdi'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const { assetId, parameters } = req.body;
    if (!assetId || !parameters) {
      return res.status(400).json({ error: 'assetId and parameters are required' });
    }
    const updated = await legalOperationsNexusService.updateAssetPqdi(userId, assetId, parameters);
    res.json({ assetId, pqdiScore: updated.pqdiScore, asset: updated });
  } catch (error) {
    if ((error as Error).message.includes('not found')) {
      return res.status(404).json({ error: (error as Error).message });
    }
    next(error);
  }
});

app.post(['/api/legal-operations-nexus/contracts', '/api/legal/contracts'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateMaterialContractInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const created = await legalOperationsNexusService.createContract(userId, req.body);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/legal-operations-nexus/litigation/asc450-assessment', '/api/legal/litigation/asc450-assessment'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const { matterId, probabilityPercent, estimatedLossMinUsd, estimatedLossMaxUsd, singlePointEstimateUsd } = req.body;
    if (!matterId || typeof probabilityPercent !== 'number') {
      return res.status(400).json({ error: 'matterId and probabilityPercent are required' });
    }
    const updated = await legalOperationsNexusService.updateMatterAsc450(userId, matterId, {
      probabilityPercent,
      estimatedLossMinUsd: estimatedLossMinUsd || 0,
      estimatedLossMaxUsd: estimatedLossMaxUsd || 0,
      singlePointEstimateUsd
    });
    res.json(updated);
  } catch (error) {
    if ((error as Error).message.includes('not found')) {
      return res.status(404).json({ error: (error as Error).message });
    }
    next(error);
  }
});

app.post(['/api/legal-operations-nexus/legal-holds', '/api/legal/legal-holds'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateLegalHoldInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const created = await legalOperationsNexusService.createLegalHold(userId, req.body);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/legal-operations-nexus/board-war-room/sign-off', '/api/legal/board-war-room/sign-off'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateBoardSignoffInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const updated = await legalOperationsNexusService.executeDigitalSignoff(userId, req.body.memoId, {
      role: req.body.role,
      signerName: req.body.signerName,
      signerTitle: req.body.signerTitle
    });
    res.json(updated);
  } catch (error) {
    if ((error as Error).message.includes('not found')) {
      return res.status(404).json({ error: (error as Error).message });
    }
    next(error);
  }
});

app.get(['/api/investor-relations-nexus/overview', '/api/ir/overview'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const overview = await investorRelationsNexusService.getOverview(userId);
    res.json(overview);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/investor-relations-nexus/activist/simulate', '/api/ir/activist/simulate'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const {
      tsrUnderperformancePercent,
      valuationDiscountPercent,
      governanceDefenseScore,
      freeCashFlowMarginGap,
      activistOwnershipPercent
    } = req.body;
    if (
      typeof tsrUnderperformancePercent !== 'number' ||
      typeof valuationDiscountPercent !== 'number' ||
      typeof governanceDefenseScore !== 'number' ||
      typeof freeCashFlowMarginGap !== 'number' ||
      typeof activistOwnershipPercent !== 'number'
    ) {
      return res.status(400).json({ error: 'All simulation parameters are required numbers' });
    }
    const result = await investorRelationsNexusService.simulateActivistVulnerability(userId, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/investor-relations-nexus/earnings/reconcile', '/api/ir/earnings/reconcile'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const { fiscalQuarter, gaapNetIncomeUsd } = req.body;
    if (!fiscalQuarter || typeof gaapNetIncomeUsd !== 'number') {
      return res.status(400).json({ error: 'fiscalQuarter and gaapNetIncomeUsd are required' });
    }
    const result = await investorRelationsNexusService.reconcileNonGaapEarnings(userId, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/investor-relations-nexus/roadshow/meetings', '/api/ir/roadshow/meetings'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateIrNdrMeetingInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const created = await investorRelationsNexusService.logInvestorMeeting(userId, req.body);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/investor-relations-nexus/capital/simulate', '/api/ir/capital/simulate'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateIrCapitalFinancingInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const result = await investorRelationsNexusService.simulateCapitalScenario(userId, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/investor-relations-nexus/disclosures/generate-8k', '/api/ir/disclosures/generate-8k'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const { fiscalQuarter, filingTitle } = req.body;
    if (!fiscalQuarter || !filingTitle) {
      return res.status(400).json({ error: 'fiscalQuarter and filingTitle are required' });
    }
    const created = await investorRelationsNexusService.generateSecForm8K(userId, req.body);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/investor-relations-nexus/disclosures/:id/signoff', '/api/ir/disclosures/:id/signoff'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateIrForm8KSignoffInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const updated = await investorRelationsNexusService.signoffSecForm8K(userId, req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    if ((error as Error).message.includes('not found')) {
      return res.status(404).json({ error: (error as Error).message });
    }
    next(error);
  }
});

app.get(['/api/corp-dev-pmi-nexus/overview', '/api/corpdev/overview'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const overview = await corpDevPmiNexusService.getOverview(userId);
    res.json(overview);
  } catch (error) {
    next(error);
  }
});

app.get(['/api/corp-dev-pmi-nexus/targets/:id', '/api/corpdev/targets/:id'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const details = await corpDevPmiNexusService.getTargetDetails(userId, req.params.id);
    if (!details) {
      return res.status(404).json({ error: 'Target not found' });
    }
    res.json(details);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/corp-dev-pmi-nexus/targets', '/api/corpdev/targets'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateCorpDevTargetInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const created = await corpDevPmiNexusService.createTarget(userId, req.body);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/corp-dev-pmi-nexus/findings', '/api/corpdev/findings'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateVdrFindingInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const created = await corpDevPmiNexusService.createFinding(userId, req.body);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/corp-dev-pmi-nexus/dcf/simulate', '/api/corpdev/dcf/simulate'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateDcfSimulationInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const result = await corpDevPmiNexusService.simulateDcf(userId, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/corp-dev-pmi-nexus/lbo/simulate', '/api/corpdev/lbo/simulate'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateLboSimulationInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const result = await corpDevPmiNexusService.simulateLbo(userId, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/corp-dev-pmi-nexus/synergies/simulate', '/api/corpdev/synergies/simulate'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateSynergiesSimulationInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const result = await corpDevPmiNexusService.simulateSynergies(userId, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/corp-dev-pmi-nexus/collar/simulate', '/api/corpdev/collar/simulate'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateCollarSimulationInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const result = await corpDevPmiNexusService.simulateCollar(userId, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/corp-dev-pmi-nexus/antitrust/assess', '/api/corpdev/antitrust/assess'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateAntitrustAssessmentInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const result = await corpDevPmiNexusService.assessAntitrust(userId, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/corp-dev-pmi-nexus/retention/lock', '/api/corpdev/retention/lock'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateTalentRetentionInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const result = await corpDevPmiNexusService.lockTalentRetention(userId, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/corp-dev-pmi-nexus/targets/:id/signoff', '/api/corpdev/targets/:id/signoff'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateCorpDevSignoffInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const updated = await corpDevPmiNexusService.executeSignoff(userId, req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    if ((error as Error).message.includes('does not exist')) {
      return res.status(404).json({ error: (error as Error).message });
    }
    if ((error as Error).message.includes('must sign before')) {
      return res.status(400).json({ error: (error as Error).message });
    }
    next(error);
  }
});

app.get(['/api/global-trade-sanctions-nexus/overview', '/api/trade/overview'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const overview = await globalTradeSanctionsNexusService.getOverview(userId);
    res.json(overview);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/global-trade-sanctions-nexus/sanctions/screen', '/api/trade/sanctions/screen'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateSanctionsScreeningInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const result = await globalTradeSanctionsNexusService.executeSanctionsScreening(userId, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/global-trade-sanctions-nexus/export-control/classify-eccn', '/api/trade/export-control/classify-eccn'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateEccnClassificationInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const result = await globalTradeSanctionsNexusService.classifyEccnItem(userId, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/global-trade-sanctions-nexus/export-control/deemed-export-audit', '/api/trade/export-control/deemed-export-audit'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateDeemedExportAuditInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const result = await globalTradeSanctionsNexusService.auditDeemedExport(userId, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/global-trade-sanctions-nexus/cfius/assess-transaction', '/api/trade/cfius/assess-transaction'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateCfiusAssessmentInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const result = await globalTradeSanctionsNexusService.assessCfiusTransaction(userId, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/global-trade-sanctions-nexus/customs/calculate-landed-duty', '/api/trade/customs/calculate-landed-duty'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateCustomsDutyInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const result = await globalTradeSanctionsNexusService.calculateLandedDuty(userId, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/global-trade-sanctions-nexus/vsd/generate-report', '/api/trade/vsd/generate-report'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateCompileVsdInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const result = await globalTradeSanctionsNexusService.compileVsdReport(userId, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/global-trade-sanctions-nexus/vsd/signoff', '/api/trade/vsd/signoff'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateExecuteSignoffInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const result = await globalTradeSanctionsNexusService.executeSignoff(userId, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get(['/api/strategic-comms-crisis-nexus/overview', '/api/comms/overview'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const overview = await strategicCommsCrisisNexusService.getOverview(userId);
    res.json(overview);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/strategic-comms-crisis-nexus/incidents', '/api/comms/incidents'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateCreateCrisisIncidentInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const result = await strategicCommsCrisisNexusService.createIncident(userId, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/strategic-comms-crisis-nexus/holding-statements', '/api/comms/holding-statements'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateCreateHoldingStatementInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const result = await strategicCommsCrisisNexusService.createHoldingStatement(userId, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/strategic-comms-crisis-nexus/facts/verify', '/api/comms/facts/verify'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateRecordVerifiedFactInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const result = await strategicCommsCrisisNexusService.registerFactMoatEntry(userId, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/strategic-comms-crisis-nexus/qa-bridge', '/api/comms/qa-bridge'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateRecordQaBridgeItemInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const result = await strategicCommsCrisisNexusService.recordQaBridgeItem(userId, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/strategic-comms-crisis-nexus/releases/signoff', '/api/comms/releases/signoff'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateSubmitTripartiteSignoffInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const result = await strategicCommsCrisisNexusService.submitSignoff(
      userId,
      req.body.holdingStatementId,
      req.body.role,
      req.body.signerName,
      req.body.legalComments
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get(['/api/shareholder-activism-defense-nexus/overview', '/api/activism/overview'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const overview = await shareholderActivismDefenseNexusService.getOverview(userId);
    res.json(overview);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/shareholder-activism-defense-nexus/campaigns', '/api/activism/campaigns'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateCreateActivistCampaignInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const campaign = await shareholderActivismDefenseNexusService.createCampaign(userId, req.body);
    res.status(201).json(campaign);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/shareholder-activism-defense-nexus/wolfpack', '/api/activism/wolfpack'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateRegisterWolfpackAccumulationInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const wolfpack = await shareholderActivismDefenseNexusService.registerWolfpackAccumulation(userId, req.body);
    res.status(201).json(wolfpack);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/shareholder-activism-defense-nexus/rights-plan', '/api/activism/rights-plan'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateDeployRightsPlanInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const plan = await shareholderActivismDefenseNexusService.deployRightsPlan(userId, req.body);
    res.status(201).json(plan);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/shareholder-activism-defense-nexus/nominees', '/api/activism/nominees'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateRecordNomineeComparisonInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const nominee = await shareholderActivismDefenseNexusService.recordNomineeComparison(userId, req.body);
    res.status(201).json(nominee);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/shareholder-activism-defense-nexus/signoff', '/api/activism/signoff'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateSubmitActivismSignoffInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const signoff = await shareholderActivismDefenseNexusService.submitTripartiteSignoff(userId, req.body);
    res.json(signoff);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/shareholder-activism-defense-nexus/reset-demo', '/api/activism/reset-demo'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const resetResult = await shareholderActivismDefenseNexusService.resetDemoData(userId);
    res.json(resetResult);
  } catch (error) {
    next(error);
  }
});

app.get(['/api/antitrust-competition-nexus/overview', '/api/antitrust/overview'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const overview = await antitrustCompetitionNexusService.getOverview(userId);
    res.json(overview);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/antitrust-competition-nexus/transactions', '/api/antitrust/transactions'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateCreateMergerTransactionInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.error });
    }
    const transaction = await antitrustCompetitionNexusService.createTransaction(userId, validation.data);
    res.status(201).json(transaction);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/antitrust-competition-nexus/markets', '/api/antitrust/markets'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateDefineMarketInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.error });
    }
    const market = await antitrustCompetitionNexusService.defineMarket(userId, validation.data);
    res.status(201).json(market);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/antitrust-competition-nexus/remedies', '/api/antitrust/remedies'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateProposeDivestiturePackageInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.error });
    }
    const remedy = await antitrustCompetitionNexusService.proposeDivestiturePackage(userId, validation.data);
    res.status(201).json(remedy);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/antitrust-competition-nexus/signoff', '/api/antitrust/signoff'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const validation = validateSubmitAntitrustSignoffInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: 'Validation failed', details: validation.error });
    }
    const signoff = await antitrustCompetitionNexusService.submitTripartiteSignoff(userId, validation.data);
    res.json(signoff);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/antitrust-competition-nexus/reset-demo', '/api/antitrust/reset-demo'], auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    await antitrustCompetitionNexusService.resetDemoData(userId);
    const overview = await antitrustCompetitionNexusService.getOverview(userId);
    res.json(overview);
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

app.get('/api/applications/:id/follow-ups', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const summary = await followUpService.getFollowUpsForApplication(userId, String(req.params.id));
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

app.post('/api/applications/:id/follow-ups/generate', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const draft = await followUpService.generateDraft(userId, String(req.params.id), req.body || {});
    res.json(draft);
  } catch (error) {
    next(error);
  }
});

app.post('/api/applications/:id/follow-ups/logs', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const log = await followUpService.createLog(userId, String(req.params.id), req.body);
    res.status(201).json(log);
  } catch (error) {
    next(error);
  }
});

app.get('/api/follow-ups/due', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const dueList = await followUpService.getDueFollowUps(userId);
    res.json(dueList);
  } catch (error) {
    next(error);
  }
});

app.get('/api/contacts', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const { query, company, type, strength } = req.query as Record<string, string | undefined>;
    const list = await contactService.listContacts(userId, { query, company, type, strength });
    res.json(list);
  } catch (error) {
    next(error);
  }
});

app.get('/api/contacts/reconnect-due', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const dueList = await contactService.getReconnectDueContacts(userId);
    res.json(dueList);
  } catch (error) {
    next(error);
  }
});

app.get('/api/contacts/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const found = await contactService.getContact(userId, String(req.params.id));
    if (!found) {
      throw new Problem(404, 'Không tìm thấy người liên hệ này.', 'not_found');
    }
    res.json(found);
  } catch (error) {
    next(error);
  }
});

app.post('/api/contacts', auth, async (req, res, next) => {
  try {
    const val = validateContactInput(req.body);
    if (!val.ok) {
      throw new Problem(422, val.message, 'invalid_request', val.errors);
    }
    const userId = (req as SessionRequest).userId;
    const created = await contactService.createContact(userId, val.data);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/contacts/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const val = validateContactInput(req.body);
    if (!val.ok) {
      throw new Problem(422, val.message, 'invalid_request', val.errors);
    }
    const updated = await contactService.updateContact(userId, String(req.params.id), val.data);
    if (!updated) {
      throw new Problem(404, 'Không tìm thấy người liên hệ cần cập nhật.', 'not_found');
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
});


app.delete('/api/contacts/:id', auth, async (req, res, next) => {
  try {
    const userId = (req as SessionRequest).userId;
    const deleted = await contactService.deleteContact(userId, String(req.params.id));
    if (!deleted) {
      throw new Problem(404, 'Không tìm thấy người liên hệ cần xóa.', 'not_found');
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post('/api/contacts/:id/interactions', auth, async (req, res, next) => {
  try {
    const val = validateInteractionInput(req.body);
    if (!val.ok) {
      throw new Problem(422, val.message, 'invalid_request', val.errors);
    }
    const userId = (req as SessionRequest).userId;
    const created = await contactService.createInteraction(userId, String(req.params.id), val.data);
    if (!created) {
      throw new Problem(404, 'Không tìm thấy người liên hệ để ghi nhật ký.', 'not_found');
    }
    res.status(201).json(created);
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
