import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { aiRepository, interviewsRepository } from './data';
import { fixture } from './demo';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('aiRepository mock interview & coach (demoMode)', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('generates interview prep questions and reverse questions in demoMode', async () => {
    const prep = await aiRepository.getInterviewPrep({
      position: 'Senior Frontend Engineer',
      company: 'TechCorp Vietnam',
      notes: 'React TypeScript Next.js Performance Optimization Microfrontends',
      skills: ['React', 'TypeScript', 'Tailwind', 'GraphQL']
    });

    expect(prep).toBeDefined();
    expect(prep.domainTrack).toBe('frontend');
    expect(prep.roleLevel).toBe('Senior');
    expect(prep.questions.length).toBeGreaterThan(0);
    expect(prep.reverseQuestions.length).toBeGreaterThan(0);

    const techQuestion = prep.questions.find(q => q.category === 'technical');
    expect(techQuestion).toBeDefined();
    expect(techQuestion?.starGuidelines.situation).toBeDefined();
    expect(techQuestion?.starGuidelines.action).toBeDefined();
  });

  it('evaluates candidate answer using STAR rubric and yields score and improved version', async () => {
    const evaluation = await aiRepository.evaluateInterviewAnswer({
      questionId: 'q-test-perf',
      question: 'Kể về một sự cố hiệu năng nghiêm trọng bạn đã từng giải quyết thành công?',
      category: 'technical',
      answer: 'Tại dự án trước ở hệ thống thương mại điện tử, màn hình thanh toán bị chậm 4.2s vào giờ cao điểm Black Friday do re-render và N+1 query. Nhiệm vụ của tôi là tối ưu phản hồi dưới 800ms trong 48 giờ. Tôi đã dùng React Profiler phát hiện memoization bị thiếu, viết custom hook cache data và batch GraphQL queries. Kết quả thời gian tải trang giảm còn 450ms (giảm 89%), tỷ lệ hoàn tất đơn hàng tăng 24% và không ghi nhận lỗi nào.',
      targetRole: 'Senior Frontend Engineer'
    });

    expect(evaluation).toBeDefined();
    expect(evaluation.overallScore).toBeGreaterThanOrEqual(7);
    expect(evaluation.rubric.situationScore).toBeGreaterThanOrEqual(7);
    expect(evaluation.rubric.taskScore).toBeGreaterThanOrEqual(7);
    expect(evaluation.rubric.actionScore).toBeGreaterThanOrEqual(7);
    expect(evaluation.rubric.resultScore).toBeGreaterThanOrEqual(7);
    expect(evaluation.strengths.length).toBeGreaterThan(0);
    expect(evaluation.improvedAnswer.length).toBeGreaterThan(30);
  });

  it('updates interview preparation content via interviewsRepository in demoMode', async () => {
    const apps = fixture();
    storageMap.set('jobtrack.design.v1', JSON.stringify(apps));

    const updated = await interviewsRepository.updateInterview('round-1', {
      preparation: 'Xem lại tài liệu System Design\n\n[STAR Câu 1]: Chuẩn bị ví dụ về Kafka Partitioning và Zero-downtime migration.'
    });

    expect(updated).toBeDefined();
    expect(updated.preparation).toContain('[STAR Câu 1]');

    const storedApps = JSON.parse(storageMap.get('jobtrack.design.v1') || '[]');
    const storedRound = storedApps[0].interviews.find((r: { id: string }) => r.id === 'round-1');
    expect(storedRound.preparation).toContain('[STAR Câu 1]');
  });
});
