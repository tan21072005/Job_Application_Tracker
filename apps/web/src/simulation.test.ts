import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateSimulationQuestions,
  evaluateSimulationTurn,
  synthesizeSessionReport,
  getPacingDurationSeconds,
  type SimulationSessionDTO,
  type TurnEvaluationDTO
} from './domain';
import { simulationRepository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Mock Interview Simulation Studio', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Pure Algorithms', () => {
    it('maps pacing modes to correct duration seconds', () => {
      expect(getPacingDurationSeconds('rapid_fire_1min')).toBe(60);
      expect(getPacingDurationSeconds('standard_2min')).toBe(120);
      expect(getPacingDurationSeconds('relaxed_5min')).toBe(300);
    });

    it('generates role-tailored questions for system design and technical deepdive tracks', () => {
      const sysQuestions = generateSimulationQuestions('system_design', 'senior', 'Senior Architect', 'Shopee');
      expect(sysQuestions).toHaveLength(3);
      expect(sysQuestions[0]).toContain('Shopee');

      const techQuestions = generateSimulationQuestions('technical_deepdive', 'mid', 'Go Developer', 'VNG');
      expect(techQuestions).toHaveLength(3);
      expect(techQuestions[0]).toContain('Go Developer');
    });

    it('evaluates answers with rubric scores, strengths, and exemplar', () => {
      const question = 'Bạn tối ưu throughput của message broker thế nào?';
      const answer = 'Tình huống là hệ thống xử lý order bị nghẽn queue. Tôi phân tách Kafka partition và cấu hình batching 500ms. Kết quả throughput tăng 300% và latency giảm từ 1500ms xuống còn 40ms.';
      const evaluation = evaluateSimulationTurn(question, answer, 80, 'standard_2min', 'system_design');

      expect(evaluation.structureScore).toBeGreaterThanOrEqual(70);
      expect(evaluation.metricImpactScore).toBeGreaterThanOrEqual(70);
      expect(evaluation.compositeScore).toBeGreaterThanOrEqual(70);
      expect(evaluation.strengths.length).toBeGreaterThan(0);
      expect(evaluation.improvements.length).toBeGreaterThan(0);
      expect(evaluation.exemplarAnswer.length).toBeGreaterThan(20);
    });

    it('synthesizes comprehensive session report with readiness grade', () => {
      const sampleTurns: TurnEvaluationDTO[] = [
        {
          turnNumber: 1,
          question: 'Q1',
          answer: 'A1',
          timeTakenSeconds: 70,
          structureScore: 85,
          technicalDepthScore: 90,
          metricImpactScore: 80,
          compositeScore: 85,
          strengths: ['Dẫn chứng số liệu rõ ràng'],
          improvements: ['Bổ sung phương án fallback'],
          exemplarAnswer: 'Exemplar 1'
        },
        {
          turnNumber: 2,
          question: 'Q2',
          answer: 'A2',
          timeTakenSeconds: 95,
          structureScore: 90,
          technicalDepthScore: 85,
          metricImpactScore: 85,
          compositeScore: 87,
          strengths: ['Tư duy kiến trúc vững vàng'],
          improvements: ['Nêu rõ SLA'],
          exemplarAnswer: 'Exemplar 2'
        }
      ];

      const report = synthesizeSessionReport(sampleTurns);
      expect(report.overallScore).toBe(86);
      expect(report.readinessGrade).toBe('Ready');
      expect(report.summary).toContain('86/100');
      expect(report.topStrengths.length).toBeGreaterThan(0);
      expect(report.recommendedFocus.length).toBeGreaterThan(0);
    });
  });

  describe('simulationRepository in demoMode', () => {
    it('returns default initial session when storage is empty', async () => {
      const list = await simulationRepository.listSessions();
      expect(list.length).toBeGreaterThanOrEqual(1);
      expect(list[0].targetCompany).toBe('Shopee');
      expect(list[0].turns.length).toBe(1);
    });

    it('starts a new session with generated questions and prepends to list', async () => {
      const session = await simulationRepository.startSession({
        targetRole: 'Staff Engineer',
        targetCompany: 'Tiki',
        track: 'technical_deepdive',
        difficulty: 'lead',
        pacingMode: 'relaxed_5min'
      });

      expect(session.id).toBeDefined();
      expect(session.targetCompany).toBe('Tiki');
      expect(session.questions).toHaveLength(3);
      expect(session.turns).toHaveLength(0);
      expect(session.status).toBe('in_progress');

      const all = await simulationRepository.listSessions();
      expect(all[0].id).toBe(session.id);
    });

    it('submits a turn, evaluates score, and advances question index', async () => {
      const session = await simulationRepository.startSession({
        targetRole: 'Product Lead',
        targetCompany: 'Grab',
        track: 'culture_leadership',
        difficulty: 'senior',
        pacingMode: 'standard_2min'
      });

      const { session: updated, evaluation } = await simulationRepository.submitTurn(session.id, {
        answer: 'Tôi dẫn dắt đội ngũ 15 kỹ sư giải quyết xung đột bằng bảng đánh giá ma trận quyết định. Kết quả bàn giao đúng hạn 100%.',
        timeTakenSeconds: 65
      });

      expect(updated.currentQuestionIndex).toBe(1);
      expect(updated.turns).toHaveLength(1);
      expect(evaluation.compositeScore).toBeGreaterThanOrEqual(50);
      expect(updated.status).toBe('in_progress');
    });

    it('completes session and generates report when all turns submitted', async () => {
      const session = await simulationRepository.startSession({
        targetRole: 'Frontend Dev',
        targetCompany: 'Zalo',
        track: 'behavioral_star',
        difficulty: 'junior',
        pacingMode: 'rapid_fire_1min'
      });

      for (let i = 0; i < session.questions.length; i++) {
        await simulationRepository.submitTurn(session.id, {
          answer: 'Tôi nhận nhiệm vụ tối ưu First Contentful Paint. Tôi chia bundle và lazy-load hình ảnh. Tốc độ tải trang cải thiện 45%.',
          timeTakenSeconds: 40
        });
      }

      const completed = await simulationRepository.getSession(session.id);
      expect(completed?.status).toBe('completed');
      expect(completed?.report).toBeDefined();
      expect(completed?.report?.overallScore).toBeGreaterThanOrEqual(50);
    });

    it('deletes session successfully', async () => {
      const session = await simulationRepository.startSession({
        targetRole: 'DevOps',
        targetCompany: 'Viettel',
        track: 'system_design',
        difficulty: 'senior',
        pacingMode: 'standard_2min'
      });

      const deleted = await simulationRepository.deleteSession(session.id);
      expect(deleted).toBe(true);

      const found = await simulationRepository.getSession(session.id);
      expect(found).toBeNull();
    });
  });
});
