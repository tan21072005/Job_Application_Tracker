import type { Pool } from 'pg';
import crypto from 'node:crypto';
import {
  type SimulationTrack,
  type SimulationDifficulty,
  type SimulationPacingMode,
  type TurnEvaluationDTO,
  type SimulationSessionReportDTO,
  type SimulationSessionDTO,
  type StartSimulationInputDTO,
  type SubmitTurnInputDTO,
  generateSimulationQuestions,
  evaluateSimulationTurn,
  synthesizeSessionReport
} from '@jobtrack/contract';

export async function initSimulationTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS interview_simulation_sessions (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_role VARCHAR(255) NOT NULL,
      target_company VARCHAR(255) NOT NULL,
      track VARCHAR(64) NOT NULL,
      difficulty VARCHAR(64) NOT NULL,
      pacing_mode VARCHAR(64) NOT NULL,
      status VARCHAR(64) NOT NULL DEFAULT 'in_progress',
      questions JSONB NOT NULL DEFAULT '[]'::jsonb,
      current_question_index INT NOT NULL DEFAULT 0,
      turns JSONB NOT NULL DEFAULT '[]'::jsonb,
      report JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS interview_simulation_user_idx ON interview_simulation_sessions (user_id, updated_at DESC);
  `);
}

export class SimulationService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async listSessions(userId: string): Promise<SimulationSessionDTO[]> {
    await initSimulationTable(this.pool);
    const res = await this.pool.query(
      `SELECT * FROM interview_simulation_sessions WHERE user_id = $1 ORDER BY updated_at DESC`,
      [userId]
    );

    return res.rows.map(row => this.mapRow(row));
  }

  async getSession(userId: string, sessionId: string): Promise<SimulationSessionDTO | null> {
    await initSimulationTable(this.pool);
    const res = await this.pool.query(
      `SELECT * FROM interview_simulation_sessions WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );
    if (res.rowCount === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async startSession(userId: string, input: StartSimulationInputDTO): Promise<SimulationSessionDTO> {
    await initSimulationTable(this.pool);
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const questions = generateSimulationQuestions(input.track, input.difficulty, input.targetRole, input.targetCompany);

    const res = await this.pool.query(
      `INSERT INTO interview_simulation_sessions (
        id, user_id, target_role, target_company, track, difficulty, pacing_mode,
        status, questions, current_question_index, turns, report, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'in_progress', $8, 0, '[]'::jsonb, NULL, $9, $9)
      RETURNING *`,
      [
        sessionId,
        userId,
        input.targetRole,
        input.targetCompany,
        input.track,
        input.difficulty,
        input.pacingMode,
        JSON.stringify(questions),
        now
      ]
    );

    return this.mapRow(res.rows[0]);
  }

  async submitTurn(
    userId: string,
    sessionId: string,
    input: SubmitTurnInputDTO
  ): Promise<{ session: SimulationSessionDTO; evaluation: TurnEvaluationDTO }> {
    await initSimulationTable(this.pool);
    const session = await this.getSession(userId, sessionId);
    if (!session) {
      throw new Error('Phiên phỏng vấn không tồn tại hoặc không thuộc quyền sở hữu.');
    }
    if (session.status !== 'in_progress') {
      throw new Error('Phiên phỏng vấn đã kết thúc.');
    }

    const currentQuestion = session.questions[session.currentQuestionIndex] || 'Câu hỏi tình huống';
    const evaluation = evaluateSimulationTurn(
      currentQuestion,
      input.answer,
      input.timeTakenSeconds,
      session.pacingMode,
      session.track
    );
    evaluation.turnNumber = session.currentQuestionIndex + 1;

    const updatedTurns = [...session.turns, evaluation];
    const nextQuestionIndex = session.currentQuestionIndex + 1;
    const isFinished = nextQuestionIndex >= session.questions.length;
    const nextStatus = isFinished ? 'completed' : 'in_progress';
    const report = isFinished ? synthesizeSessionReport(updatedTurns) : null;
    const now = new Date();

    const res = await this.pool.query(
      `UPDATE interview_simulation_sessions
       SET turns = $1, current_question_index = $2, status = $3, report = $4, updated_at = $5
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [
        JSON.stringify(updatedTurns),
        nextQuestionIndex,
        nextStatus,
        report ? JSON.stringify(report) : null,
        now,
        sessionId,
        userId
      ]
    );

    return {
      session: this.mapRow(res.rows[0]),
      evaluation
    };
  }

  async completeSession(userId: string, sessionId: string): Promise<SimulationSessionDTO> {
    await initSimulationTable(this.pool);
    const session = await this.getSession(userId, sessionId);
    if (!session) {
      throw new Error('Phiên phỏng vấn không tồn tại hoặc không thuộc quyền sở hữu.');
    }

    const report = synthesizeSessionReport(session.turns);
    const now = new Date();

    const res = await this.pool.query(
      `UPDATE interview_simulation_sessions
       SET status = 'completed', report = $1, updated_at = $2
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [JSON.stringify(report), now, sessionId, userId]
    );

    return this.mapRow(res.rows[0]);
  }

  async deleteSession(userId: string, sessionId: string): Promise<boolean> {
    await initSimulationTable(this.pool);
    const res = await this.pool.query(
      `DELETE FROM interview_simulation_sessions WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  private mapRow(row: Record<string, unknown>): SimulationSessionDTO {
    return {
      id: row.id as string,
      targetRole: row.target_role as string,
      targetCompany: row.target_company as string,
      track: row.track as SimulationTrack,
      difficulty: row.difficulty as SimulationDifficulty,
      pacingMode: row.pacing_mode as SimulationPacingMode,
      status: row.status as 'in_progress' | 'completed' | 'abandoned',
      questions: (Array.isArray(row.questions) ? row.questions : []) as string[],
      currentQuestionIndex: row.current_question_index as number,
      turns: (Array.isArray(row.turns) ? row.turns : []) as TurnEvaluationDTO[],
      report: row.report as SimulationSessionReportDTO | null,
      createdAt: new Date(row.created_at as string).toISOString(),
      updatedAt: new Date(row.updated_at as string).toISOString()
    };
  }
}
