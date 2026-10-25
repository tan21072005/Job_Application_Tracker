import type { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import {
  type StrategicCommsNexusOverviewDTO,
  type CrisisIncidentDTO,
  type CreateCrisisIncidentRequestDTO,
  type MediaMentionDTO,
  type MediaIntelligenceSummaryDTO,
  type NarrativeClusterDTO,
  type StakeholderImpactProfileDTO,
  type CrisisHoldingStatementDTO,
  type CreateHoldingStatementRequestDTO,
  type SpokespersonBriefingCardDTO,
  type QaBridgeItemDTO,
  type VerifiedFactMoatEntryDTO,
  type CrisisReleaseSignoffDTO,
  type BrandReputationResilienceIndexDTO,
  type CrisisTripartiteSignoffRole,
  calculateNetSentimentScore,
  calculateNarrativeVelocityIndex,
  calculateViralPropagationVector,
  calculateBrandReputationResilienceIndex,
  compileOmnichannelHoldingStatement,
  evaluateQaBridgeTransition
} from '@jobtrack/contract';

export class StrategicCommsCrisisNexusService {
  private pool: Pool;
  private schemaInitialized = false;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async ensureSchema(): Promise<void> {
    if (this.schemaInitialized) return;

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS crisis_incidents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        severity_level VARCHAR(50) NOT NULL,
        playbook_type VARCHAR(50) NOT NULL,
        declared_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        golden_hour_deadline TIMESTAMPTZ NOT NULL,
        incident_commander VARCHAR(100) NOT NULL,
        communications_lead VARCHAR(100) NOT NULL,
        legal_counsel_lead VARCHAR(100) NOT NULL,
        technical_lead VARCHAR(100) NOT NULL,
        summary TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        resolved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_crisis_incidents_user_active ON crisis_incidents(user_id, is_active);
      CREATE INDEX IF NOT EXISTS idx_crisis_incidents_user_playbook ON crisis_incidents(user_id, playbook_type);

      CREATE TABLE IF NOT EXISTS crisis_triage_checkpoints (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        incident_id UUID NOT NULL REFERENCES crisis_incidents(id) ON DELETE CASCADE,
        milestone VARCHAR(50) NOT NULL,
        target_minutes INTEGER NOT NULL,
        completed_at TIMESTAMPTZ,
        is_completed BOOLEAN NOT NULL DEFAULT FALSE,
        notes TEXT NOT NULL DEFAULT '',
        assigned_lead VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_triage_checkpoints_incident ON crisis_triage_checkpoints(user_id, incident_id);

      CREATE TABLE IF NOT EXISTS narrative_clusters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        incident_id UUID NOT NULL REFERENCES crisis_incidents(id) ON DELETE CASCADE,
        cluster_title VARCHAR(255) NOT NULL,
        dominant_theme VARCHAR(255) NOT NULL,
        mention_count INTEGER NOT NULL DEFAULT 0,
        net_sentiment_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
        narrative_velocity_index NUMERIC(5,2) NOT NULL DEFAULT 0.00,
        viral_propagation_vector NUMERIC(5,2) NOT NULL DEFAULT 0.00,
        is_adversarial_campaign BOOLEAN NOT NULL DEFAULT FALSE,
        first_observed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_narrative_clusters_incident ON narrative_clusters(user_id, incident_id);

      CREATE TABLE IF NOT EXISTS media_intelligence_mentions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        incident_id UUID NOT NULL REFERENCES crisis_incidents(id) ON DELETE CASCADE,
        narrative_cluster_id UUID REFERENCES narrative_clusters(id) ON DELETE SET NULL,
        source_outlet VARCHAR(150) NOT NULL,
        channel_type VARCHAR(50) NOT NULL,
        headline VARCHAR(500) NOT NULL,
        url TEXT NOT NULL DEFAULT '',
        sentiment VARCHAR(30) NOT NULL,
        sentiment_score NUMERIC(5,2) NOT NULL,
        reach_estimate BIGINT NOT NULL DEFAULT 0,
        is_syndicated BOOLEAN NOT NULL DEFAULT FALSE,
        published_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_media_mentions_user_incident ON media_intelligence_mentions(user_id, incident_id);
      CREATE INDEX IF NOT EXISTS idx_media_mentions_channel ON media_intelligence_mentions(user_id, channel_type);

      CREATE TABLE IF NOT EXISTS stakeholder_impact_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        incident_id UUID NOT NULL REFERENCES crisis_incidents(id) ON DELETE CASCADE,
        tier VARCHAR(50) NOT NULL,
        target_audience VARCHAR(200) NOT NULL,
        primary_concern TEXT NOT NULL,
        impact_score INTEGER NOT NULL DEFAULT 5,
        required_delivery_sla_minutes INTEGER NOT NULL DEFAULT 60,
        preferred_channel VARCHAR(100) NOT NULL,
        channel_delivered BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_stakeholder_profiles_incident ON stakeholder_impact_profiles(user_id, incident_id);

      CREATE TABLE IF NOT EXISTS crisis_holding_statements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        incident_id UUID NOT NULL REFERENCES crisis_incidents(id) ON DELETE CASCADE,
        version INTEGER NOT NULL DEFAULT 1,
        title VARCHAR(255) NOT NULL,
        target_tier VARCHAR(50) NOT NULL,
        tone_calibration VARCHAR(50) NOT NULL,
        headline VARCHAR(500) NOT NULL,
        body_text TEXT NOT NULL,
        safe_harbor_disclaimer TEXT NOT NULL DEFAULT '',
        regulation_fd_notice TEXT NOT NULL DEFAULT '',
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        channels_dispatched JSONB NOT NULL DEFAULT '[]'::jsonb,
        content_hash_sha256 VARCHAR(128) NOT NULL,
        dispatched_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_holding_statements_incident ON crisis_holding_statements(user_id, incident_id);
      CREATE INDEX IF NOT EXISTS idx_holding_statements_status ON crisis_holding_statements(user_id, status);

      CREATE TABLE IF NOT EXISTS spokesperson_briefing_cards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        incident_id UUID NOT NULL REFERENCES crisis_incidents(id) ON DELETE CASCADE,
        spokesperson_name VARCHAR(100) NOT NULL,
        spokesperson_role VARCHAR(100) NOT NULL,
        core_talking_points JSONB NOT NULL DEFAULT '[]'::jsonb,
        mandatory_phrases JSONB NOT NULL DEFAULT '[]'::jsonb,
        prohibited_phrases JSONB NOT NULL DEFAULT '[]'::jsonb,
        approved_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_spokesperson_cards_incident ON spokesperson_briefing_cards(user_id, incident_id);

      CREATE TABLE IF NOT EXISTS crisis_qa_bridge_matrix (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        incident_id UUID NOT NULL REFERENCES crisis_incidents(id) ON DELETE CASCADE,
        hostile_question TEXT NOT NULL,
        anticipated_outlet VARCHAR(150) NOT NULL,
        bridge_technique VARCHAR(50) NOT NULL,
        transition_phrase TEXT NOT NULL,
        pivot_message TEXT NOT NULL,
        risk_rating INTEGER NOT NULL DEFAULT 5,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_qa_bridge_matrix_incident ON crisis_qa_bridge_matrix(user_id, incident_id);

      CREATE TABLE IF NOT EXISTS verified_fact_moat_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        incident_id UUID NOT NULL REFERENCES crisis_incidents(id) ON DELETE CASCADE,
        fact_claim TEXT NOT NULL,
        technical_corroboration TEXT NOT NULL,
        source_owner VARCHAR(100) NOT NULL,
        corroboration_status VARCHAR(50) NOT NULL,
        refuted_rumor TEXT,
        evidence_reference_id VARCHAR(100) NOT NULL,
        verified_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_fact_moat_incident ON verified_fact_moat_entries(user_id, incident_id);
      CREATE INDEX IF NOT EXISTS idx_fact_moat_status ON verified_fact_moat_entries(user_id, corroboration_status);

      CREATE TABLE IF NOT EXISTS crisis_release_signoffs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        holding_statement_id UUID NOT NULL REFERENCES crisis_holding_statements(id) ON DELETE CASCADE,
        incident_id UUID NOT NULL REFERENCES crisis_incidents(id) ON DELETE CASCADE,
        content_hash_sha256 VARCHAR(128) NOT NULL,
        head_of_comms_signed BOOLEAN NOT NULL DEFAULT FALSE,
        head_of_comms_signer VARCHAR(100),
        head_of_comms_timestamp TIMESTAMPTZ,
        cl_officer_signed BOOLEAN NOT NULL DEFAULT FALSE,
        cl_officer_signer VARCHAR(100),
        cl_officer_timestamp TIMESTAMPTZ,
        cl_officer_comments TEXT,
        ceo_signed BOOLEAN NOT NULL DEFAULT FALSE,
        ceo_signer VARCHAR(100),
        ceo_timestamp TIMESTAMPTZ,
        is_fully_authorized BOOLEAN NOT NULL DEFAULT FALSE,
        finalized_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_release_signoffs_statement ON crisis_release_signoffs(user_id, holding_statement_id);

      CREATE TABLE IF NOT EXISTS crisis_brand_resilience_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        incident_id UUID NOT NULL REFERENCES crisis_incidents(id) ON DELETE CASCADE,
        composite_score NUMERIC(5,2) NOT NULL,
        resilience_band VARCHAR(50) NOT NULL,
        sentiment_stability_score NUMERIC(5,2) NOT NULL,
        velocity_mitigation_factor NUMERIC(5,2) NOT NULL,
        viral_containment_ratio NUMERIC(5,2) NOT NULL,
        stakeholder_trust_retention NUMERIC(5,2) NOT NULL,
        fact_moat_fortification_score NUMERIC(5,2) NOT NULL,
        calculated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_resilience_snapshots_incident ON crisis_brand_resilience_snapshots(user_id, incident_id);

      CREATE TABLE IF NOT EXISTS crisis_incident_event_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        incident_id UUID NOT NULL REFERENCES crisis_incidents(id) ON DELETE CASCADE,
        event_type VARCHAR(100) NOT NULL,
        event_description TEXT NOT NULL,
        actor_role VARCHAR(100) NOT NULL,
        actor_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_crisis_event_logs_incident ON crisis_incident_event_logs(user_id, incident_id);
    `);

    this.schemaInitialized = true;
  }

  async getOverview(userId: string): Promise<StrategicCommsNexusOverviewDTO> {
    await this.ensureSchema();

    let incidentsRes = await this.pool.query(
      `SELECT * FROM crisis_incidents WHERE user_id = $1 ORDER BY declared_at DESC`,
      [userId]
    );

    if (incidentsRes.rows.length === 0) {
      await this.seedDefaultIncident(userId);
      incidentsRes = await this.pool.query(
        `SELECT * FROM crisis_incidents WHERE user_id = $1 ORDER BY declared_at DESC`,
        [userId]
      );
    }

    const incidents: CrisisIncidentDTO[] = [];
    for (const row of incidentsRes.rows) {
      const checkpointsRes = await this.pool.query(
        `SELECT * FROM crisis_triage_checkpoints WHERE user_id = $1 AND incident_id = $2 ORDER BY target_minutes ASC`,
        [userId, row.id]
      );
      incidents.push({
        id: row.id,
        title: row.title,
        severityLevel: row.severity_level,
        playbookType: row.playbook_type,
        declaredAt: new Date(row.declared_at).toISOString(),
        goldenHourDeadline: new Date(row.golden_hour_deadline).toISOString(),
        incidentCommander: row.incident_commander,
        communicationsLead: row.communications_lead,
        legalCounselLead: row.legal_counsel_lead,
        technicalLead: row.technical_lead,
        summary: row.summary,
        checkpoints: checkpointsRes.rows.map(c => ({
          id: c.id,
          milestone: c.milestone,
          targetMinutes: c.target_minutes,
          completedAt: c.completed_at ? new Date(c.completed_at).toISOString() : undefined,
          isCompleted: c.is_completed,
          notes: c.notes,
          assignedLead: c.assigned_lead
        })),
        isActive: row.is_active,
        resolvedAt: row.resolved_at ? new Date(row.resolved_at).toISOString() : undefined
      });
    }

    const primaryActiveIncident = incidents.find(i => i.isActive) || incidents[0];
    const incidentId = primaryActiveIncident?.id;

    let mediaSummary: MediaIntelligenceSummaryDTO = {
      incidentId: incidentId || '',
      totalMentions: 0,
      netSentimentScore: 0,
      narrativeVelocityIndex: 0,
      viralPropagationVector: 0,
      sentimentDistribution: { positive: 0, neutral: 0, negative: 0, hostileAdversarial: 0 },
      topNarrativeClusters: [],
      recentMentions: []
    };

    let holdingStatements: CrisisHoldingStatementDTO[] = [];
    let factMoatEntries: VerifiedFactMoatEntryDTO[] = [];
    let qaBridgeItems: QaBridgeItemDTO[] = [];
    let spokespersonCards: SpokespersonBriefingCardDTO[] = [];
    let stakeholderProfiles: StakeholderImpactProfileDTO[] = [];
    let recentReleaseSignoffs: CrisisReleaseSignoffDTO[] = [];

    if (incidentId) {
      const mentionsRes = await this.pool.query(
        `SELECT * FROM media_intelligence_mentions WHERE user_id = $1 AND incident_id = $2 ORDER BY published_at DESC LIMIT 50`,
        [userId, incidentId]
      );

      const pos = mentionsRes.rows.filter(m => m.sentiment === 'positive').length;
      const neu = mentionsRes.rows.filter(m => m.sentiment === 'neutral').length;
      const neg = mentionsRes.rows.filter(m => m.sentiment === 'negative').length;
      const hostile = mentionsRes.rows.filter(m => m.sentiment === 'hostile_adversarial').length;

      const nss = calculateNetSentimentScore({ positive: pos, neutral: neu, negative: neg, hostileAdversarial: hostile });
      const nvi = calculateNarrativeVelocityIndex({
        hourlyMentionsCurrent: mentionsRes.rows.length,
        hourlyMentionsPrevious: Math.max(1, Math.floor(mentionsRes.rows.length * 0.7)),
        tier1OutletCount: mentionsRes.rows.filter(m => m.channel_type === 'tier_1_financial_press').length,
        syndicationMultiplier: 1.4
      });
      const r0 = calculateViralPropagationVector({
        retweetShareRatio: 1.8,
        influencerCentralityFactor: 1.5,
        narrativeHalfLifeHours: 6.0
      });

      const clustersRes = await this.pool.query(
        `SELECT * FROM narrative_clusters WHERE user_id = $1 AND incident_id = $2 ORDER BY mention_count DESC`,
        [userId, incidentId]
      );

      mediaSummary = {
        incidentId,
        totalMentions: mentionsRes.rows.length,
        netSentimentScore: nss,
        narrativeVelocityIndex: nvi,
        viralPropagationVector: r0,
        sentimentDistribution: { positive: pos, neutral: neu, negative: neg, hostileAdversarial: hostile },
        topNarrativeClusters: clustersRes.rows.map(c => ({
          id: c.id,
          incidentId: c.incident_id,
          clusterTitle: c.cluster_title,
          dominantTheme: c.dominant_theme,
          mentionCount: c.mention_count,
          netSentimentScore: Number(c.net_sentiment_score),
          narrativeVelocityIndex: Number(c.narrative_velocity_index),
          viralPropagationVector: Number(c.viral_propagation_vector),
          isAdversarialCampaign: c.is_adversarial_campaign,
          firstObservedAt: new Date(c.first_observed_at).toISOString(),
          lastUpdatedAt: new Date(c.last_updated_at).toISOString()
        })),
        recentMentions: mentionsRes.rows.map(m => ({
          id: m.id,
          incidentId: m.incident_id,
          sourceOutlet: m.source_outlet,
          channelType: m.channel_type,
          headline: m.headline,
          url: m.url,
          sentiment: m.sentiment,
          sentimentScore: Number(m.sentiment_score),
          reachEstimate: Number(m.reach_estimate),
          publishedAt: new Date(m.published_at).toISOString(),
          narrativeClusterId: m.narrative_cluster_id,
          isSyndicated: m.is_syndicated
        }))
      };

      const holdingRes = await this.pool.query(
        `SELECT * FROM crisis_holding_statements WHERE user_id = $1 AND incident_id = $2 ORDER BY version DESC`,
        [userId, incidentId]
      );
      holdingStatements = holdingRes.rows.map(h => ({
        id: h.id,
        incidentId: h.incident_id,
        version: h.version,
        title: h.title,
        targetTier: h.target_tier,
        toneCalibration: h.tone_calibration,
        headline: h.headline,
        bodyText: h.body_text,
        safeHarborDisclaimer: h.safe_harbor_disclaimer,
        regulationFdNotice: h.regulation_fd_notice,
        status: h.status,
        channelsDispatched: h.channels_dispatched,
        contentHashSha256: h.content_hash_sha256,
        createdAt: new Date(h.created_at).toISOString(),
        updatedAt: new Date(h.updated_at).toISOString(),
        dispatchedAt: h.dispatched_at ? new Date(h.dispatched_at).toISOString() : undefined
      }));

      const factsRes = await this.pool.query(
        `SELECT * FROM verified_fact_moat_entries WHERE user_id = $1 AND incident_id = $2 ORDER BY verified_at DESC`,
        [userId, incidentId]
      );
      factMoatEntries = factsRes.rows.map(f => ({
        id: f.id,
        incidentId: f.incident_id,
        factClaim: f.fact_claim,
        technicalCorroboration: f.technical_corroboration,
        sourceOwner: f.source_owner,
        corroborationStatus: f.corroboration_status,
        refutedRumor: f.refuted_rumor || undefined,
        evidenceReferenceId: f.evidence_reference_id,
        verifiedAt: new Date(f.verified_at).toISOString()
      }));

      const qaRes = await this.pool.query(
        `SELECT * FROM crisis_qa_bridge_matrix WHERE user_id = $1 AND incident_id = $2 ORDER BY risk_rating DESC`,
        [userId, incidentId]
      );
      qaBridgeItems = qaRes.rows.map(q => ({
        id: q.id,
        incidentId: q.incident_id,
        hostileQuestion: q.hostile_question,
        anticipatedOutlet: q.anticipated_outlet,
        bridgeTechnique: q.bridge_technique,
        transitionPhrase: q.transition_phrase,
        pivotMessage: q.pivot_message,
        riskRating: q.risk_rating
      }));

      const spokespersonRes = await this.pool.query(
        `SELECT * FROM spokesperson_briefing_cards WHERE user_id = $1 AND incident_id = $2`,
        [userId, incidentId]
      );
      spokespersonCards = spokespersonRes.rows.map(s => ({
        id: s.id,
        incidentId: s.incident_id,
        spokespersonName: s.spokesperson_name,
        spokespersonRole: s.spokesperson_role,
        coreTalkingPoints: s.core_talking_points,
        mandatoryPhrases: s.mandatory_phrases,
        prohibitedPhrases: s.prohibited_phrases,
        approvedDate: new Date(s.approved_date).toISOString()
      }));

      const stakeholderRes = await this.pool.query(
        `SELECT * FROM stakeholder_impact_profiles WHERE user_id = $1 AND incident_id = $2 ORDER BY tier ASC`,
        [userId, incidentId]
      );
      stakeholderProfiles = stakeholderRes.rows.map(st => ({
        id: st.id,
        incidentId: st.incident_id,
        tier: st.tier,
        targetAudience: st.target_audience,
        primaryConcern: st.primary_concern,
        impactScore: st.impact_score,
        requiredDeliverySlaMinutes: st.required_delivery_sla_minutes,
        preferredChannel: st.preferred_channel,
        channelDelivered: st.channel_delivered
      }));

      const signoffsRes = await this.pool.query(
        `SELECT * FROM crisis_release_signoffs WHERE user_id = $1 AND incident_id = $2 ORDER BY created_at DESC`,
        [userId, incidentId]
      );
      recentReleaseSignoffs = signoffsRes.rows.map(sr => ({
        id: sr.id,
        holdingStatementId: sr.holding_statement_id,
        incidentId: sr.incident_id,
        contentHashSha256: sr.content_hash_sha256,
        headOfCommsSignoff: sr.head_of_comms_signed ? {
          role: 'head_of_communications',
          signoffSignerName: sr.head_of_comms_signer,
          signoffTimestamp: new Date(sr.head_of_comms_timestamp).toISOString(),
          cryptographicSignature: 'sig_' + sr.content_hash_sha256.substring(0, 10),
          isSigned: true
        } : undefined,
        chiefLegalOfficerSignoff: sr.cl_officer_signed ? {
          role: 'chief_legal_officer',
          signoffSignerName: sr.cl_officer_signer,
          signoffTimestamp: new Date(sr.cl_officer_timestamp).toISOString(),
          cryptographicSignature: 'sig_' + sr.content_hash_sha256.substring(0, 10),
          isSigned: true,
          legalComments: sr.cl_officer_comments
        } : undefined,
        ceoSignoff: sr.ceo_signed ? {
          role: 'chief_executive_officer',
          signoffSignerName: sr.ceo_signer,
          signoffTimestamp: new Date(sr.ceo_timestamp).toISOString(),
          cryptographicSignature: 'sig_' + sr.content_hash_sha256.substring(0, 10),
          isSigned: true
        } : undefined,
        isFullyAuthorized: sr.is_fully_authorized,
        finalizedAt: sr.finalized_at ? new Date(sr.finalized_at).toISOString() : undefined
      }));
    }

    const brriCalculated = calculateBrandReputationResilienceIndex({
      netSentimentScore: mediaSummary.netSentimentScore,
      narrativeVelocityIndex: mediaSummary.narrativeVelocityIndex,
      viralPropagationVector: mediaSummary.viralPropagationVector,
      stakeholderTrustScores: stakeholderProfiles.map(s => 100 - (s.impactScore * 5)),
      verifiedFactCount: factMoatEntries.filter(f => f.corroborationStatus === 'verified_corroborated').length,
      activeRumorCount: factMoatEntries.filter(f => f.refutedRumor !== undefined).length
    });

    const resilienceIndex: BrandReputationResilienceIndexDTO = {
      incidentId: incidentId || '',
      compositeScore: brriCalculated.compositeScore,
      resilienceBand: brriCalculated.resilienceBand,
      sentimentStabilityScore: brriCalculated.sentimentStabilityScore,
      velocityMitigationFactor: brriCalculated.velocityMitigationFactor,
      viralContainmentRatio: brriCalculated.viralContainmentRatio,
      stakeholderTrustRetention: brriCalculated.stakeholderTrustRetention,
      factMoatFortificationScore: brriCalculated.factMoatFortificationScore,
      calculatedAt: new Date().toISOString()
    };

    return {
      activeIncidents: incidents,
      primaryActiveIncident,
      mediaSummary,
      holdingStatements,
      factMoatSummary: {
        incidentId: incidentId || '',
        totalVerifiedFacts: factMoatEntries.filter(f => f.corroborationStatus === 'verified_corroborated').length,
        activeRumorsRefuted: factMoatEntries.filter(f => f.refutedRumor !== undefined).length,
        pendingCorroborations: factMoatEntries.filter(f => f.corroborationStatus === 'provisional_pending_audit').length,
        entries: factMoatEntries
      },
      qaBridgeItems,
      spokespersonCards,
      stakeholderProfiles,
      resilienceIndex,
      recentReleaseSignoffs
    };
  }

  async createIncident(userId: string, req: CreateCrisisIncidentRequestDTO): Promise<CrisisIncidentDTO> {
    await this.ensureSchema();
    const now = new Date();
    const goldenHourDeadline = new Date(now.getTime() + 60 * 60 * 1000);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const incidentRes = await client.query(
        `INSERT INTO crisis_incidents (
          user_id, title, severity_level, playbook_type, declared_at, golden_hour_deadline,
          incident_commander, communications_lead, legal_counsel_lead, technical_lead, summary, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE)
        RETURNING *`,
        [
          userId, req.title, req.initialSeverity, req.playbookType, now, goldenHourDeadline,
          req.incidentCommander, req.communicationsLead, req.legalCounselLead, req.technicalLead, req.summary
        ]
      );
      const row = incidentRes.rows[0];

      const milestones = [
        { milestone: 't_00_initial_incident_ingest', targetMinutes: 0, lead: req.incidentCommander, notes: 'Incident detected and command declared' },
        { milestone: 't_15_technical_fact_verification', targetMinutes: 15, lead: req.technicalLead, notes: 'Corroborate primary technical telemetry and isolate blast radius' },
        { milestone: 't_30_spokesperson_marshalling', targetMinutes: 30, lead: req.communicationsLead, notes: 'Align messaging and bridge matrix with executive spokesperson' },
        { milestone: 't_45_legal_counsel_review', targetMinutes: 45, lead: req.legalCounselLead, notes: 'Audit Reg FD, PSLRA safe harbor, and statutory liabilities' },
        { milestone: 't_60_holding_statement_broadcast', targetMinutes: 60, lead: req.communicationsLead, notes: 'Deploy omnichannel verified holding statement' }
      ];

      const checkpoints: any[] = [];
      for (const m of milestones) {
        const cpRes = await client.query(
          `INSERT INTO crisis_triage_checkpoints (
            user_id, incident_id, milestone, target_minutes, is_completed, completed_at, notes, assigned_lead
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *`,
          [
            userId, row.id, m.milestone, m.targetMinutes,
            m.targetMinutes === 0, m.targetMinutes === 0 ? now : null, m.notes, m.lead
          ]
        );
        const cp = cpRes.rows[0];
        checkpoints.push({
          id: cp.id,
          milestone: cp.milestone,
          targetMinutes: cp.target_minutes,
          completedAt: cp.completed_at ? new Date(cp.completed_at).toISOString() : undefined,
          isCompleted: cp.is_completed,
          notes: cp.notes,
          assignedLead: cp.assigned_lead
        });
      }

      await client.query('COMMIT');

      return {
        id: row.id,
        title: row.title,
        severityLevel: row.severity_level,
        playbookType: row.playbook_type,
        declaredAt: new Date(row.declared_at).toISOString(),
        goldenHourDeadline: new Date(row.golden_hour_deadline).toISOString(),
        incidentCommander: row.incident_commander,
        communicationsLead: row.communications_lead,
        legalCounselLead: row.legal_counsel_lead,
        technicalLead: row.technical_lead,
        summary: row.summary,
        checkpoints,
        isActive: row.is_active
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async createHoldingStatement(userId: string, req: CreateHoldingStatementRequestDTO): Promise<CrisisHoldingStatementDTO> {
    await this.ensureSchema();
    const compiled = compileOmnichannelHoldingStatement({
      incidentTitle: 'Incident Response',
      playbookType: 'cyber_ransomware_data_breach',
      targetTier: req.targetTier,
      toneCalibration: req.toneCalibration,
      headline: req.headline,
      bodyText: req.bodyText,
      includePslraSafeHarbor: req.includePslraSafeHarbor,
      includeRegulationFdNotice: req.includeRegulationFdNotice
    });

    const res = await this.pool.query(
      `INSERT INTO crisis_holding_statements (
        user_id, incident_id, version, title, target_tier, tone_calibration, headline, body_text,
        safe_harbor_disclaimer, regulation_fd_notice, status, content_hash_sha256
      ) VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8, $9, 'draft', $10)
      RETURNING *`,
      [
        userId, req.incidentId, req.headline, req.targetTier, req.toneCalibration,
        compiled.headline, compiled.bodyText, compiled.safeHarborDisclaimer, compiled.regulationFdNotice,
        compiled.contentHashSha256
      ]
    );
    const row = res.rows[0];

    return {
      id: row.id,
      incidentId: row.incident_id,
      version: row.version,
      title: row.title,
      targetTier: row.target_tier,
      toneCalibration: row.tone_calibration,
      headline: row.headline,
      bodyText: row.body_text,
      safeHarborDisclaimer: row.safe_harbor_disclaimer,
      regulationFdNotice: row.regulation_fd_notice,
      status: row.status,
      channelsDispatched: row.channels_dispatched || [],
      contentHashSha256: row.content_hash_sha256,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString()
    };
  }

  async registerFactMoatEntry(
    userId: string,
    req: {
      incidentId: string;
      factClaim: string;
      technicalCorroboration: string;
      sourceOwner: string;
      corroborationStatus: string;
      refutedRumor?: string;
      evidenceReferenceId: string;
    }
  ): Promise<VerifiedFactMoatEntryDTO> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `INSERT INTO verified_fact_moat_entries (
        user_id, incident_id, fact_claim, technical_corroboration, source_owner,
        corroboration_status, refuted_rumor, evidence_reference_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        userId, req.incidentId, req.factClaim, req.technicalCorroboration, req.sourceOwner,
        req.corroborationStatus, req.refutedRumor || null, req.evidenceReferenceId
      ]
    );
    const row = res.rows[0];
    return {
      id: row.id,
      incidentId: row.incident_id,
      factClaim: row.fact_claim,
      technicalCorroboration: row.technical_corroboration,
      sourceOwner: row.source_owner,
      corroborationStatus: row.corroboration_status,
      refutedRumor: row.refuted_rumor || undefined,
      evidenceReferenceId: row.evidence_reference_id,
      verifiedAt: new Date(row.verified_at).toISOString()
    };
  }

  async recordQaBridgeItem(
    userId: string,
    req: {
      incidentId: string;
      hostileQuestion: string;
      anticipatedOutlet: string;
      bridgeTechnique: any;
      transitionPhrase?: string;
      pivotMessage: string;
      riskRating: number;
    }
  ): Promise<QaBridgeItemDTO> {
    await this.ensureSchema();
    const finalTransition = evaluateQaBridgeTransition(req.bridgeTechnique, req.transitionPhrase);
    const res = await this.pool.query(
      `INSERT INTO crisis_qa_bridge_matrix (
        user_id, incident_id, hostile_question, anticipated_outlet, bridge_technique,
        transition_phrase, pivot_message, risk_rating
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        userId, req.incidentId, req.hostileQuestion, req.anticipatedOutlet,
        req.bridgeTechnique, finalTransition, req.pivotMessage, req.riskRating
      ]
    );
    const row = res.rows[0];
    return {
      id: row.id,
      incidentId: row.incident_id,
      hostileQuestion: row.hostile_question,
      anticipatedOutlet: row.anticipated_outlet,
      bridgeTechnique: row.bridge_technique,
      transitionPhrase: row.transition_phrase,
      pivotMessage: row.pivot_message,
      riskRating: row.risk_rating
    };
  }

  async submitSignoff(
    userId: string,
    statementId: string,
    role: CrisisTripartiteSignoffRole,
    signerName: string,
    legalComments?: string
  ): Promise<CrisisReleaseSignoffDTO> {
    await this.ensureSchema();
    const statementRes = await this.pool.query(
      `SELECT * FROM crisis_holding_statements WHERE user_id = $1 AND id = $2`,
      [userId, statementId]
    );
    if (statementRes.rows.length === 0) {
      throw new Error('Holding statement not found');
    }
    const statement = statementRes.rows[0];

    const signoffRes = await this.pool.query(
      `SELECT * FROM crisis_release_signoffs WHERE user_id = $1 AND holding_statement_id = $2`,
      [userId, statementId]
    );

    let signoffRow;
    const now = new Date();
    if (signoffRes.rows.length === 0) {
      const insertRes = await this.pool.query(
        `INSERT INTO crisis_release_signoffs (
          user_id, holding_statement_id, incident_id, content_hash_sha256
        ) VALUES ($1, $2, $3, $4)
        RETURNING *`,
        [userId, statementId, statement.incident_id, statement.content_hash_sha256]
      );
      signoffRow = insertRes.rows[0];
    } else {
      signoffRow = signoffRes.rows[0];
    }

    let updateQuery = '';
    let params: any[] = [];
    if (role === 'head_of_communications') {
      updateQuery = `UPDATE crisis_release_signoffs SET head_of_comms_signed = TRUE, head_of_comms_signer = $3, head_of_comms_timestamp = $4 WHERE user_id = $1 AND id = $2 RETURNING *`;
      params = [userId, signoffRow.id, signerName, now];
    } else if (role === 'chief_legal_officer') {
      updateQuery = `UPDATE crisis_release_signoffs SET cl_officer_signed = TRUE, cl_officer_signer = $3, cl_officer_timestamp = $4, cl_officer_comments = $5 WHERE user_id = $1 AND id = $2 RETURNING *`;
      params = [userId, signoffRow.id, signerName, now, legalComments || ''];
    } else {
      updateQuery = `UPDATE crisis_release_signoffs SET ceo_signed = TRUE, ceo_signer = $3, ceo_timestamp = $4 WHERE user_id = $1 AND id = $2 RETURNING *`;
      params = [userId, signoffRow.id, signerName, now];
    }

    const updatedRes = await this.pool.query(updateQuery, params);
    let updated = updatedRes.rows[0];

    if (updated.head_of_comms_signed && updated.cl_officer_signed && updated.ceo_signed) {
      const finalRes = await this.pool.query(
        `UPDATE crisis_release_signoffs SET is_fully_authorized = TRUE, finalized_at = $3 WHERE user_id = $1 AND id = $2 RETURNING *`,
        [userId, updated.id, now]
      );
      updated = finalRes.rows[0];

      await this.pool.query(
        `UPDATE crisis_holding_statements SET status = 'approved_for_release', updated_at = $3 WHERE user_id = $1 AND id = $2`,
        [userId, statementId, now]
      );
    }

    return {
      id: updated.id,
      holdingStatementId: updated.holding_statement_id,
      incidentId: updated.incident_id,
      contentHashSha256: updated.content_hash_sha256,
      headOfCommsSignoff: updated.head_of_comms_signed ? {
        role: 'head_of_communications',
        signoffSignerName: updated.head_of_comms_signer,
        signoffTimestamp: new Date(updated.head_of_comms_timestamp).toISOString(),
        cryptographicSignature: 'sig_' + updated.content_hash_sha256.substring(0, 10),
        isSigned: true
      } : undefined,
      chiefLegalOfficerSignoff: updated.cl_officer_signed ? {
        role: 'chief_legal_officer',
        signoffSignerName: updated.cl_officer_signer,
        signoffTimestamp: new Date(updated.cl_officer_timestamp).toISOString(),
        cryptographicSignature: 'sig_' + updated.content_hash_sha256.substring(0, 10),
        isSigned: true,
        legalComments: updated.cl_officer_comments
      } : undefined,
      ceoSignoff: updated.ceo_signed ? {
        role: 'chief_executive_officer',
        signoffSignerName: updated.ceo_signer,
        signoffTimestamp: new Date(updated.ceo_timestamp).toISOString(),
        cryptographicSignature: 'sig_' + updated.content_hash_sha256.substring(0, 10),
        isSigned: true
      } : undefined,
      isFullyAuthorized: updated.is_fully_authorized,
      finalizedAt: updated.finalized_at ? new Date(updated.finalized_at).toISOString() : undefined
    };
  }

  private async seedDefaultIncident(userId: string): Promise<void> {
    const now = new Date();
    const goldenHourDeadline = new Date(now.getTime() + 42 * 60 * 1000);

    const incidentRes = await this.pool.query(
      `INSERT INTO crisis_incidents (
        user_id, title, severity_level, playbook_type, declared_at, golden_hour_deadline,
        incident_commander, communications_lead, legal_counsel_lead, technical_lead, summary, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE)
      RETURNING id`,
      [
        userId,
        'Project Titan: Production Core Cloud Ransomware & Credential Exfiltration Incident',
        'level_4_acute_enterprise_crisis',
        'cyber_ransomware_data_breach',
        new Date(now.getTime() - 18 * 60 * 1000),
        goldenHourDeadline,
        'Elena Vance, VP Incident Response',
        'Marcus Vance, Head of Comms',
        'Rachel Thorne, General Counsel',
        'Dr. Gregory House, CISO',
        'Containment protocol engaged following anomalous encrypted exfiltration across staging microservices. Perimeter firewall holds; blast radius quarantined.'
      ]
    );
    const incidentId = incidentRes.rows[0].id;

    const milestones = [
      { milestone: 't_00_initial_incident_ingest', targetMinutes: 0, done: true, lead: 'Elena Vance', notes: 'Automated SOC alert triggered SIEM severity escalation' },
      { milestone: 't_15_technical_fact_verification', targetMinutes: 15, done: true, lead: 'Dr. Gregory House', notes: 'Mandiant forensics confirmed customer PII storage unaffected' },
      { milestone: 't_30_spokesperson_marshalling', targetMinutes: 30, done: false, lead: 'Marcus Vance', notes: 'Briefing card lock with CTO and investor relations' },
      { milestone: 't_45_legal_counsel_review', targetMinutes: 45, done: false, lead: 'Rachel Thorne', notes: 'SEC Form 8-K Item 1.05 materiality audit and PSLRA compliance' },
      { milestone: 't_60_holding_statement_broadcast', targetMinutes: 60, done: false, lead: 'Marcus Vance', notes: 'Simultaneous wire distribution across PR Newswire & SEC EDGAR' }
    ];

    for (const m of milestones) {
      await this.pool.query(
        `INSERT INTO crisis_triage_checkpoints (
          user_id, incident_id, milestone, target_minutes, is_completed, completed_at, notes, assigned_lead
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId, incidentId, m.milestone, m.targetMinutes, m.done,
          m.done ? new Date(now.getTime() - 10 * 60 * 1000) : null, m.notes, m.lead
        ]
      );
    }

    const clusterRes = await this.pool.query(
      `INSERT INTO narrative_clusters (
        user_id, incident_id, cluster_title, dominant_theme, mention_count,
        net_sentiment_score, narrative_velocity_index, viral_propagation_vector, is_adversarial_campaign
      ) VALUES
      ($1, $2, 'Alleged Enterprise Database Leak', 'Short seller syndicate alleging total customer loss', 48, -72.50, 68.20, 1.85, TRUE),
      ($1, $2, 'Security Patch Deployment Telemetry', 'Engineering team confirmed zero customer data accessed', 24, 45.00, 32.10, 0.42, FALSE)
      RETURNING id`,
      [userId, incidentId]
    );
    const cluster1Id = clusterRes.rows[0].id;

    await this.pool.query(
      `INSERT INTO media_intelligence_mentions (
        user_id, incident_id, narrative_cluster_id, source_outlet, channel_type,
        headline, url, sentiment, sentiment_score, reach_estimate, is_syndicated
      ) VALUES
      ($1, $2, $3, 'Bloomberg Terminal', 'tier_1_financial_press', 'Tech Giant Probes Unauthorized Lateral System Incursion', 'https://bloomberg.com/news/articles/2026-titan-probe', 'negative', -0.65, 450000, TRUE),
      ($1, $2, $3, 'Reuters Financial Wire', 'broadcast_wire_service', 'Company Discloses Immediate Remediation of Network Anomaly', 'https://reuters.com/tech/enterprise-incident-statement', 'neutral', -0.15, 680000, TRUE),
      ($1, $2, $3, 'X / Twitter InfoSec Community', 'social_media_platform', 'Rumors circulate of customer database dump by extortion syndicate', 'https://x.com/infosec_watch/status/19928374', 'hostile_adversarial', -0.92, 120000, FALSE)`,
      [userId, incidentId, cluster1Id]
    );

    const compiledHolding = compileOmnichannelHoldingStatement({
      incidentTitle: 'Cyber Incident Response',
      playbookType: 'cyber_ransomware_data_breach',
      targetTier: 'tier_2_institutional_investors',
      toneCalibration: 'authoritative_transparent',
      headline: 'JobTrack Corporate Statement on Network Security and Remediation',
      bodyText: 'We recently identified unauthorized activity within an isolated staging environment. Our cybersecurity defense protocols immediately quarantined the impacted components. Primary client databases remain intact and encrypted under AES-256 standard.',
      includePslraSafeHarbor: true,
      includeRegulationFdNotice: true
    });

    const stmtRes = await this.pool.query(
      `INSERT INTO crisis_holding_statements (
        user_id, incident_id, version, title, target_tier, tone_calibration, headline, body_text,
        safe_harbor_disclaimer, regulation_fd_notice, status, content_hash_sha256
      ) VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8, $9, 'draft', $10)
      RETURNING id`,
      [
        userId, incidentId, 'Investor Response Release Draft', 'tier_2_institutional_investors',
        'authoritative_transparent', compiledHolding.headline, compiledHolding.bodyText,
        compiledHolding.safeHarborDisclaimer, compiledHolding.regulationFdNotice,
        compiledHolding.contentHashSha256
      ]
    );
    const statementId = stmtRes.rows[0].id;

    await this.pool.query(
      `INSERT INTO crisis_release_signoffs (
        user_id, holding_statement_id, incident_id, content_hash_sha256,
        head_of_comms_signed, head_of_comms_signer, head_of_comms_timestamp
      ) VALUES ($1, $2, $3, $4, TRUE, 'Marcus Vance', CURRENT_TIMESTAMP)`,
      [userId, statementId, incidentId, compiledHolding.contentHashSha256]
    );

    await this.pool.query(
      `INSERT INTO verified_fact_moat_entries (
        user_id, incident_id, fact_claim, technical_corroboration, source_owner,
        corroboration_status, refuted_rumor, evidence_reference_id
      ) VALUES
      ($1, $2, 'Customer production databases are hosted on air-gapped clusters and remain completely untouched.', 'CrowdStrike Falcon telemetry audit and AWS CloudTrail immutable logs.', 'Dr. Gregory House, CISO', 'verified_corroborated', 'Dark web chatter claiming 50M records exfiltrated.', 'MOAT-EVID-9021'),
      ($1, $2, 'Perimeter zero-trust authentication was not bypassed; unauthorized access was constrained to internal sandbox.', 'Okta Identity Threat Protection logs verified by external forensics.', 'Rachel Thorne, General Counsel', 'verified_corroborated', 'Social media claim of active master key compromise.', 'MOAT-EVID-9022')`,
      [userId, incidentId]
    );

    await this.pool.query(
      `INSERT INTO crisis_qa_bridge_matrix (
        user_id, incident_id, hostile_question, anticipated_outlet, bridge_technique,
        transition_phrase, pivot_message, risk_rating
      ) VALUES
      ($1, $2, 'Is it true that hackers have your entire customer list and are demanding 100 Bitcoin?', 'CNBC TechCheck', 'bridge_to_facts', 'What the verified engineering and forensic evidence specifically shows is...', 'Our primary customer databases remain completely secure, quarantined, and monitored 24/7 by top-tier forensics partners.', 9),
      ($1, $2, 'Why did it take 4 hours for you to notify the public?', 'Wall Street Journal', 'bridge_to_values', 'Our uncompromised organizational priority has always been accuracy and transparency, and...', 'We immediately mobilized forensics to verify ground truth rather than disseminate speculative or misleading rumors.', 7)`,
      [userId, incidentId]
    );

    await this.pool.query(
      `INSERT INTO spokesperson_briefing_cards (
        user_id, incident_id, spokesperson_name, spokesperson_role,
        core_talking_points, mandatory_phrases, prohibited_phrases
      ) VALUES ($1, $2, 'Marcus Vance', 'VP Global Corporate Communications',
        '["Perimeter held; customer databases were not breached.", "External forensic firms Mandiant and CrowdStrike are on-site.", "Operations continue with zero business interruption."]'::jsonb,
        '["Customer trust is paramount", "Decisive forensic containment", "Statutory transparency"]'::jsonb,
        '["We got hacked", "Total disaster", "No idea who did this", "Catastrophic breach"]'::jsonb
      )`,
      [userId, incidentId]
    );

    await this.pool.query(
      `INSERT INTO stakeholder_impact_profiles (
        user_id, incident_id, tier, target_audience, primary_concern,
        impact_score, required_delivery_sla_minutes, preferred_channel, channel_delivered
      ) VALUES
      ($1, $2, 'tier_1_workforce_employees', 'Global Workforce (12,000 Staff)', 'Workstation security and internal communication integrity', 4, 30, 'Internal Slack & Townhall Stream', TRUE),
      ($1, $2, 'tier_2_institutional_investors', 'Institutional Shareholders & Analysts', 'Material revenue blast radius and 8-K disclosure liabilities', 8, 45, 'SEC EDGAR 8-K & IR Portal', FALSE),
      ($1, $2, 'tier_3_enterprise_customers', 'Fortune 500 Enterprise Customers', 'SLA uptime, data confidentiality, and SOC2 compliance status', 7, 60, 'Enterprise Customer Portal Notice', FALSE),
      ($1, $2, 'tier_4_regulators_government', 'SEC, CISA, and FTC Regulators', 'Compliance with 4-day cyber disclosure mandate (Item 1.05)', 8, 60, 'Formal Regulatory Liaison Transmission', FALSE),
      ($1, $2, 'tier_5_media_general_public', 'Financial and Tech Press', 'Accurate narrative reporting vs clickbait amplification', 6, 60, 'Wire Release via PR Newswire', FALSE)`,
      [userId, incidentId]
    );
  }
}
