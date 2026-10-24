import type { Pool } from 'pg';
import crypto from 'node:crypto';
import {
  type ExecutiveContractDTO,
  type ExecutiveContractMutationDTO,
  type ContractRedlineDTO,
  type ContractRedlineMutationDTO,
  type PriorInventionItemDTO,
  type PriorInventionMutationDTO,
  type RedlineStatus,
  type ClauseParametersMap,
  type LegalJurisdiction,
  evaluateExecutiveContract,
  generateSynthesizedRedlines,
  generateExhibitAMarkdown,
  generateExecutiveAddendumMarkdown
} from '@jobtrack/contract';

export async function initExecutiveContractTables(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS executive_contracts (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
      company_name VARCHAR(255) NOT NULL,
      role_title VARCHAR(255) NOT NULL,
      jurisdiction VARCHAR(64) NOT NULL DEFAULT 'us_delaware_ny',
      clause_parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
      prior_inventions JSONB NOT NULL DEFAULT '[]'::jsonb,
      contract_risk_index INTEGER NOT NULL DEFAULT 0,
      risk_tier VARCHAR(64) NOT NULL DEFAULT 'low_risk',
      pillar_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
      clawback_penalty INTEGER NOT NULL DEFAULT 0,
      active_hazards JSONB NOT NULL DEFAULT '[]'::jsonb,
      clauses JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_executive_contracts_user_created
      ON executive_contracts(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_executive_contracts_user_company
      ON executive_contracts(user_id, company_name);
    CREATE INDEX IF NOT EXISTS idx_executive_contracts_application
      ON executive_contracts(application_id);

    CREATE TABLE IF NOT EXISTS contract_redlines (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      contract_id UUID NOT NULL REFERENCES executive_contracts(id) ON DELETE CASCADE,
      pillar_key VARCHAR(64) NOT NULL,
      clause_title VARCHAR(255) NOT NULL,
      original_text TEXT NOT NULL,
      redline_text TEXT NOT NULL,
      candidate_justification TEXT NOT NULL,
      fallback_compromise TEXT NOT NULL DEFAULT '',
      statutory_citation TEXT NOT NULL DEFAULT '',
      status VARCHAR(32) NOT NULL DEFAULT 'proposed',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_contract_redlines_contract
      ON contract_redlines(contract_id, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_contract_redlines_user
      ON contract_redlines(user_id);
  `);
}

export class ExecutiveContractService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async listContracts(userId: string): Promise<ExecutiveContractDTO[]> {
    await initExecutiveContractTables(this.pool);
    const result = await this.pool.query(
      `SELECT * FROM executive_contracts WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows.map(this.mapContractRow);
  }

  async getContract(userId: string, id: string): Promise<ExecutiveContractDTO | null> {
    await initExecutiveContractTables(this.pool);
    const result = await this.pool.query(
      `SELECT * FROM executive_contracts WHERE user_id = $1 AND id = $2`,
      [userId, id]
    );
    if (result.rows.length === 0) return null;
    const contract = this.mapContractRow(result.rows[0]);
    contract.redlines = await this.listRedlines(userId, id);
    return contract;
  }

  async createContract(userId: string, input: ExecutiveContractMutationDTO): Promise<ExecutiveContractDTO> {
    await initExecutiveContractTables(this.pool);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const priorInventions: PriorInventionItemDTO[] = (input.priorInventions || []).map((p) => ({
      id: crypto.randomUUID(),
      category: p.category,
      title: p.title,
      identifierOrUrl: p.identifierOrUrl,
      creationDate: p.creationDate || now.split('T')[0],
      technologyDescription: p.technologyDescription || '',
      retainedRights: p.retainedRights || ['Full Commercial Copyright'],
      confidentialExclusionConfirmed: p.confidentialExclusionConfirmed ?? true
    }));

    const evalResult = evaluateExecutiveContract(
      input.clauseParameters,
      input.jurisdiction,
      priorInventions
    );

    await this.pool.query(
      `INSERT INTO executive_contracts (
        id, user_id, application_id, company_name, role_title, jurisdiction,
        clause_parameters, prior_inventions, contract_risk_index, risk_tier,
        pillar_scores, clawback_penalty, active_hazards, clauses, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        id,
        userId,
        input.applicationId || null,
        input.companyName,
        input.roleTitle,
        input.jurisdiction,
        JSON.stringify(input.clauseParameters),
        JSON.stringify(priorInventions),
        evalResult.contractRiskIndex,
        evalResult.riskTier,
        JSON.stringify(evalResult.pillarScores),
        evalResult.clawbackPenalty,
        JSON.stringify(evalResult.activeHazards),
        JSON.stringify(evalResult.clauses),
        now,
        now
      ]
    );

    const generatedRedlines = generateSynthesizedRedlines({
      id,
      companyName: input.companyName,
      roleTitle: input.roleTitle,
      jurisdiction: input.jurisdiction,
      pillarScores: evalResult.pillarScores,
      clauses: evalResult.clauses
    });

    for (const r of generatedRedlines) {
      await this.createRedline(userId, id, r);
    }

    const created = await this.getContract(userId, id);
    if (!created) throw new Error('Failed to retrieve newly created contract');
    return created;
  }

  async updateContract(
    userId: string,
    id: string,
    input: Partial<ExecutiveContractMutationDTO>
  ): Promise<ExecutiveContractDTO | null> {
    await initExecutiveContractTables(this.pool);
    const existing = await this.getContract(userId, id);
    if (!existing) return null;

    const companyName = input.companyName ?? existing.companyName;
    const roleTitle = input.roleTitle ?? existing.roleTitle;
    const jurisdiction = input.jurisdiction ?? existing.jurisdiction;
    const applicationId = input.applicationId !== undefined ? input.applicationId : (existing.applicationId || null);

    let priorInventions = existing.priorInventions;
    if (input.priorInventions) {
      priorInventions = input.priorInventions.map((p) => ({
        id: crypto.randomUUID(),
        category: p.category,
        title: p.title,
        identifierOrUrl: p.identifierOrUrl,
        creationDate: p.creationDate || new Date().toISOString().split('T')[0],
        technologyDescription: p.technologyDescription || '',
        retainedRights: p.retainedRights || ['Full Commercial Copyright'],
        confidentialExclusionConfirmed: p.confidentialExclusionConfirmed ?? true
      }));
    }

    const currentParams = existing.clauses.reduce((acc, c) => {
      acc[c.pillarKey] = c.parameters as never;
      return acc;
    }, {} as ClauseParametersMap);

    const clauseParameters: ClauseParametersMap = input.clauseParameters ?? currentParams;

    const evalResult = evaluateExecutiveContract(clauseParameters, jurisdiction, priorInventions);
    const now = new Date().toISOString();

    await this.pool.query(
      `UPDATE executive_contracts SET
        application_id = $1,
        company_name = $2,
        role_title = $3,
        jurisdiction = $4,
        clause_parameters = $5,
        prior_inventions = $6,
        contract_risk_index = $7,
        risk_tier = $8,
        pillar_scores = $9,
        clawback_penalty = $10,
        active_hazards = $11,
        clauses = $12,
        updated_at = $13
      WHERE user_id = $14 AND id = $15`,
      [
        applicationId,
        companyName,
        roleTitle,
        jurisdiction,
        JSON.stringify(clauseParameters),
        JSON.stringify(priorInventions),
        evalResult.contractRiskIndex,
        evalResult.riskTier,
        JSON.stringify(evalResult.pillarScores),
        evalResult.clawbackPenalty,
        JSON.stringify(evalResult.activeHazards),
        JSON.stringify(evalResult.clauses),
        now,
        userId,
        id
      ]
    );

    return this.getContract(userId, id);
  }

  async deleteContract(userId: string, id: string): Promise<boolean> {
    await initExecutiveContractTables(this.pool);
    const res = await this.pool.query(
      `DELETE FROM executive_contracts WHERE user_id = $1 AND id = $2`,
      [userId, id]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async listRedlines(userId: string, contractId: string): Promise<ContractRedlineDTO[]> {
    await initExecutiveContractTables(this.pool);
    const res = await this.pool.query(
      `SELECT * FROM contract_redlines WHERE user_id = $1 AND contract_id = $2 ORDER BY created_at ASC`,
      [userId, contractId]
    );
    return res.rows.map(this.mapRedlineRow);
  }

  async generateRedlines(userId: string, contractId: string): Promise<ContractRedlineDTO[]> {
    await initExecutiveContractTables(this.pool);
    const contract = await this.getContract(userId, contractId);
    if (!contract) return [];

    await this.pool.query(
      `DELETE FROM contract_redlines WHERE user_id = $1 AND contract_id = $2`,
      [userId, contractId]
    );

    const generated = generateSynthesizedRedlines({
      id: contract.id,
      companyName: contract.companyName,
      roleTitle: contract.roleTitle,
      jurisdiction: contract.jurisdiction,
      pillarScores: contract.pillarScores,
      clauses: contract.clauses
    });

    for (const r of generated) {
      await this.createRedline(userId, contractId, r);
    }

    return this.listRedlines(userId, contractId);
  }

  async createRedline(
    userId: string,
    contractId: string,
    input: ContractRedlineMutationDTO
  ): Promise<ContractRedlineDTO> {
    await initExecutiveContractTables(this.pool);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.pool.query(
      `INSERT INTO contract_redlines (
        id, user_id, contract_id, pillar_key, clause_title, original_text,
        redline_text, candidate_justification, fallback_compromise,
        statutory_citation, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        id,
        userId,
        contractId,
        input.pillarKey,
        input.clauseTitle,
        input.originalText,
        input.redlineText,
        input.candidateJustification,
        input.fallbackCompromise || '',
        input.statutoryCitation || '',
        input.status || 'proposed',
        now,
        now
      ]
    );

    return {
      id,
      contractId,
      pillarKey: input.pillarKey,
      clauseTitle: input.clauseTitle,
      originalText: input.originalText,
      redlineText: input.redlineText,
      candidateJustification: input.candidateJustification,
      fallbackCompromise: input.fallbackCompromise || '',
      statutoryCitation: input.statutoryCitation || '',
      status: input.status || 'proposed',
      createdAt: now,
      updatedAt: now
    };
  }

  async updateRedline(
    userId: string,
    contractId: string,
    redlineId: string,
    status: RedlineStatus
  ): Promise<ContractRedlineDTO | null> {
    await initExecutiveContractTables(this.pool);
    const now = new Date().toISOString();
    const res = await this.pool.query(
      `UPDATE contract_redlines SET status = $1, updated_at = $2
       WHERE user_id = $3 AND contract_id = $4 AND id = $5
       RETURNING *`,
      [status, now, userId, contractId, redlineId]
    );
    if (res.rows.length === 0) return null;
    return this.mapRedlineRow(res.rows[0]);
  }

  async addPriorInvention(
    userId: string,
    contractId: string,
    input: PriorInventionMutationDTO
  ): Promise<ExecutiveContractDTO | null> {
    const contract = await this.getContract(userId, contractId);
    if (!contract) return null;

    const newItem: PriorInventionItemDTO = {
      id: crypto.randomUUID(),
      category: input.category,
      title: input.title,
      identifierOrUrl: input.identifierOrUrl,
      creationDate: input.creationDate || new Date().toISOString().split('T')[0],
      technologyDescription: input.technologyDescription || '',
      retainedRights: input.retainedRights || ['Full Commercial Copyright'],
      confidentialExclusionConfirmed: input.confidentialExclusionConfirmed ?? true
    };

    const updatedInventions = [...contract.priorInventions, newItem];

    const currentParams = contract.clauses.reduce((acc, c) => {
      acc[c.pillarKey] = c.parameters as never;
      return acc;
    }, {} as ClauseParametersMap);

    const evalResult = evaluateExecutiveContract(
      currentParams,
      contract.jurisdiction,
      updatedInventions
    );

    const now = new Date().toISOString();
    await this.pool.query(
      `UPDATE executive_contracts SET
        prior_inventions = $1,
        contract_risk_index = $2,
        risk_tier = $3,
        pillar_scores = $4,
        clawback_penalty = $5,
        active_hazards = $6,
        clauses = $7,
        updated_at = $8
       WHERE user_id = $9 AND id = $10`,
      [
        JSON.stringify(updatedInventions),
        evalResult.contractRiskIndex,
        evalResult.riskTier,
        JSON.stringify(evalResult.pillarScores),
        evalResult.clawbackPenalty,
        JSON.stringify(evalResult.activeHazards),
        JSON.stringify(evalResult.clauses),
        now,
        userId,
        contractId
      ]
    );

    return this.getContract(userId, contractId);
  }

  async deletePriorInvention(
    userId: string,
    contractId: string,
    inventionId: string
  ): Promise<ExecutiveContractDTO | null> {
    const contract = await this.getContract(userId, contractId);
    if (!contract) return null;

    const updatedInventions = contract.priorInventions.filter((i) => i.id !== inventionId);

    const currentParams = contract.clauses.reduce((acc, c) => {
      acc[c.pillarKey] = c.parameters as never;
      return acc;
    }, {} as ClauseParametersMap);

    const evalResult = evaluateExecutiveContract(
      currentParams,
      contract.jurisdiction,
      updatedInventions
    );

    const now = new Date().toISOString();
    await this.pool.query(
      `UPDATE executive_contracts SET
        prior_inventions = $1,
        contract_risk_index = $2,
        risk_tier = $3,
        pillar_scores = $4,
        clawback_penalty = $5,
        active_hazards = $6,
        clauses = $7,
        updated_at = $8
       WHERE user_id = $9 AND id = $10`,
      [
        JSON.stringify(updatedInventions),
        evalResult.contractRiskIndex,
        evalResult.riskTier,
        JSON.stringify(evalResult.pillarScores),
        evalResult.clawbackPenalty,
        JSON.stringify(evalResult.activeHazards),
        JSON.stringify(evalResult.clauses),
        now,
        userId,
        contractId
      ]
    );

    return this.getContract(userId, contractId);
  }

  async exportExhibitA(userId: string, contractId: string): Promise<{ markdown: string } | null> {
    const contract = await this.getContract(userId, contractId);
    if (!contract) return null;
    const markdown = generateExhibitAMarkdown(
      { companyName: contract.companyName, roleTitle: contract.roleTitle },
      contract.priorInventions
    );
    return { markdown };
  }

  async exportAddendum(
    userId: string,
    contractId: string
  ): Promise<{ markdown: string; cri: number } | null> {
    const contract = await this.getContract(userId, contractId);
    if (!contract) return null;
    const redlines = await this.listRedlines(userId, contractId);
    const markdown = generateExecutiveAddendumMarkdown(
      {
        companyName: contract.companyName,
        roleTitle: contract.roleTitle,
        jurisdiction: contract.jurisdiction
      },
      redlines
    );
    return { markdown, cri: contract.contractRiskIndex };
  }

  private mapContractRow(row: Record<string, unknown>): ExecutiveContractDTO {
    return {
      id: String(row.id),
      userId: row.user_id ? String(row.user_id) : undefined,
      applicationId: row.application_id ? String(row.application_id) : null,
      companyName: String(row.company_name),
      roleTitle: String(row.role_title),
      jurisdiction: row.jurisdiction as LegalJurisdiction,
      contractRiskIndex: Number(row.contract_risk_index ?? 0),
      riskTier: row.risk_tier as never,
      pillarScores: typeof row.pillar_scores === 'string' ? JSON.parse(row.pillar_scores) : (row.pillar_scores as never),
      clawbackPenalty: Number(row.clawback_penalty ?? 0),
      activeHazards: typeof row.active_hazards === 'string' ? JSON.parse(row.active_hazards) : ((row.active_hazards as string[]) || []),
      clauses: typeof row.clauses === 'string' ? JSON.parse(row.clauses) : ((row.clauses as never) || []),
      priorInventions: typeof row.prior_inventions === 'string' ? JSON.parse(row.prior_inventions) : ((row.prior_inventions as never) || []),
      createdAt: new Date(String(row.created_at)).toISOString(),
      updatedAt: new Date(String(row.updated_at)).toISOString()
    };
  }

  private mapRedlineRow(row: Record<string, unknown>): ContractRedlineDTO {
    return {
      id: String(row.id),
      contractId: String(row.contract_id),
      pillarKey: row.pillar_key as never,
      clauseTitle: String(row.clause_title),
      originalText: String(row.original_text),
      redlineText: String(row.redline_text),
      candidateJustification: String(row.candidate_justification),
      fallbackCompromise: String(row.fallback_compromise || ''),
      statutoryCitation: String(row.statutory_citation || ''),
      status: row.status as RedlineStatus,
      createdAt: new Date(String(row.created_at)).toISOString(),
      updatedAt: new Date(String(row.updated_at)).toISOString()
    };
  }
}
