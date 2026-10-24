import { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ChevronRight,
  BookOpen,
  Send,
  LoaderCircle,
  HelpCircle,
  PlusCircle,
  Layers,
  Award
} from 'lucide-react';
import type {
  InterviewPrepResultDTO,
  InterviewEvaluateResultDTO,
  MockInterviewQuestionDTO,
  InterviewQuestionCategory
} from '@jobtrack/contract';
import { aiRepository } from '../data';
import { Button, Dialog } from './ui';

interface Props {
  company: string;
  position: string;
  roundTitle?: string;
  notes?: string | null;
  skills?: string[];
  onClose: () => void;
  onSaveToPrep?: (text: string) => Promise<void> | void;
  notify?: (message: string, isError?: boolean) => void;
}

const CATEGORIES: Array<{ key: InterviewQuestionCategory; label: string }> = [
  { key: 'technical', label: 'Kỹ thuật chuyên sâu' },
  { key: 'behavioral', label: 'Hành vi STAR' },
  { key: 'situational', label: 'Tình huống thực tế' },
  { key: 'reverse_qa', label: 'Hỏi lại nhà tuyển dụng' }
];

export default function MockInterviewModal({
  company,
  position,
  roundTitle,
  notes,
  skills,
  onClose,
  onSaveToPrep,
  notify
}: Props) {
  const [prepData, setPrepData] = useState<InterviewPrepResultDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<InterviewQuestionCategory>('technical');
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [candidateAnswer, setCandidateAnswer] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<InterviewEvaluateResultDTO | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const [savingPrep, setSavingPrep] = useState(false);

  useEffect(() => {
    let active = true;
    async function fetchPrep() {
      setLoading(true);
      try {
        const res = await aiRepository.getInterviewPrep({
          company,
          position,
          roundTitle,
          notes,
          skills
        });
        if (active) {
          setPrepData(res);
        }
      } catch (err) {
        notify?.((err as Error).message || 'Không thể tải bộ câu hỏi phỏng vấn.', true);
      } finally {
        if (active) setLoading(false);
      }
    }
    void fetchPrep();
    return () => {
      active = false;
    };
  }, [company, position, roundTitle, notes, skills, notify]);

  const categoryQuestions: MockInterviewQuestionDTO[] = (prepData?.questions || []).filter(
    q => q.category === activeCategory
  );

  const currentQuestion: MockInterviewQuestionDTO | undefined =
    categoryQuestions[selectedQuestionIndex] || categoryQuestions[0] || prepData?.questions[0];

  function handleCategoryChange(cat: InterviewQuestionCategory) {
    setActiveCategory(cat);
    setSelectedQuestionIndex(0);
    setEvaluation(null);
    setCandidateAnswer('');
    setShowSample(false);
  }

  function handleQuestionChange(idx: number) {
    setSelectedQuestionIndex(idx);
    setEvaluation(null);
    setCandidateAnswer('');
    setShowSample(false);
  }

  async function handleEvaluate() {
    if (!currentQuestion) return;
    const text = candidateAnswer.trim();
    if (!text) {
      notify?.('Vui lòng nhập câu trả lời của bạn trước khi chấm điểm.', true);
      return;
    }
    if (text.length < 15) {
      notify?.('Câu trả lời quá ngắn. Hãy diễn đạt chi tiết hơn theo khung STAR.', true);
      return;
    }

    setEvaluating(true);
    try {
      const res = await aiRepository.evaluateInterviewAnswer({
        questionId: currentQuestion.id,
        question: currentQuestion.question,
        category: currentQuestion.category,
        answer: text,
        targetRole: position,
        company
      });
      setEvaluation(res);
      notify?.('Đã hoàn tất đánh giá câu trả lời!');
    } catch (err) {
      notify?.((err as Error).message || 'Không thể đánh giá câu trả lời.', true);
    } finally {
      setEvaluating(false);
    }
  }

  async function handleCopyImproved() {
    if (!evaluation?.improvedAnswer) return;
    try {
      await navigator.clipboard.writeText(evaluation.improvedAnswer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      notify?.('Đã sao chép câu trả lời mẫu vào khay nhớ tạm.');
    } catch {
      notify?.('Không thể sao chép tự động.', true);
    }
  }

  async function handleSavePreparation() {
    if (!currentQuestion || !onSaveToPrep) return;
    setSavingPrep(true);
    try {
      const prepSnippet = `• Chuẩn bị: ${currentQuestion.question}\n  - S: ${currentQuestion.starGuidelines.situation}\n  - A: ${currentQuestion.starGuidelines.action}\n  - R: ${currentQuestion.starGuidelines.result}`;
      await onSaveToPrep(prepSnippet);
      notify?.('Đã lưu nội dung chuẩn bị vào vòng phỏng vấn.');
    } catch (err) {
      notify?.((err as Error).message || 'Không thể lưu vào nội dung chuẩn bị.', true);
    } finally {
      setSavingPrep(false);
    }
  }

  const wordCount = candidateAnswer.trim() ? candidateAnswer.trim().split(/\s+/).length : 0;

  return (
    <Dialog
      onClose={onClose}
      title="Huấn luyện viên Phỏng vấn AI · STAR Practice Coach"
      wide
      busy={loading || evaluating || savingPrep}
    >
      <div className="mock-interview-dialog">
      <div className="mock-interview-header-meta">
        <div>
          <h4 className="mock-role-title">
            {position}
            <span className="mock-company-pill">{company}</span>
          </h4>
          {prepData && (
            <div className="mock-badges-bar">
              <span className="mock-tag mock-tag-track">
                <Layers size={13} />
                Chuyên môn: {prepData.domainTrack.toUpperCase()}
              </span>
              <span className="mock-tag mock-tag-level">
                <Award size={13} />
                Cấp bậc: {prepData.roleLevel}
              </span>
            </div>
          )}
        </div>
      </div>

      <nav className="mock-category-tabs" aria-label="Danh mục câu hỏi phỏng vấn">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            type="button"
            className={`mock-cat-btn ${activeCategory === cat.key ? 'active' : ''}`}
            onClick={() => handleCategoryChange(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </nav>

      {loading ? (
        <div className="mock-loading-state">
          <LoaderCircle size={28} className="spin" />
          <p>AI đang tổng hợp bộ câu hỏi sát thực với vị trí và kinh nghiệm của bạn…</p>
        </div>
      ) : activeCategory === 'reverse_qa' ? (
        <section className="mock-reverse-section">
          <div className="mock-reverse-header">
            <HelpCircle size={18} />
            <div>
              <h3>Câu hỏi nên hỏi lại nhà tuyển dụng (Reverse Questions)</h3>
              <p>Thể hiện tư duy kiến trúc, văn hóa làm việc và mức độ quan tâm nghiêm túc tới sự phát triển của công ty.</p>
            </div>
          </div>
          <ul className="mock-reverse-list">
            {(prepData?.reverseQuestions || []).map((rq, idx) => (
              <li key={idx} className="mock-reverse-item">
                <span className="mock-reverse-num">{idx + 1}</span>
                <p>{rq}</p>
                <Button
                  kind="ghost"
                  onClick={() => {
                    void navigator.clipboard.writeText(rq);
                    notify?.('Đã sao chép câu hỏi!');
                  }}
                  title="Sao chép câu hỏi"
                >
                  <Copy size={13} />
                  <span>Sao chép</span>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="mock-body-layout">
          <aside className="mock-question-list-sidebar">
            <span className="sidebar-label">Danh sách câu hỏi ({categoryQuestions.length})</span>
            <div className="mock-q-buttons">
              {categoryQuestions.map((q, idx) => (
                <button
                  key={q.id}
                  type="button"
                  className={`mock-q-select-btn ${idx === selectedQuestionIndex ? 'active' : ''}`}
                  onClick={() => handleQuestionChange(idx)}
                >
                  <span className="mock-q-idx">{idx + 1}</span>
                  <span className="mock-q-text-truncate">{q.question}</span>
                </button>
              ))}
            </div>

            <div className="mock-tips-box">
              <span className="tips-title">💡 Mẹo phỏng vấn AI:</span>
              <p>{prepData?.tips[selectedQuestionIndex % (prepData.tips.length || 1)] || 'Áp dụng khung STAR để câu trả lời luôn có bằng chứng thuyết phục.'}</p>
            </div>
          </aside>

          <main className="mock-workspace-panel">
            {currentQuestion ? (
              <>
                <article className="mock-question-display">
                  <div className="mock-question-meta">
                    <span className="mock-intent-badge">Mục tiêu kiểm tra</span>
                    <span className="mock-intent-text">{currentQuestion.intent}</span>
                  </div>
                  <h3 className="mock-question-title">{currentQuestion.question}</h3>
                </article>

                <div className="star-guidelines-card">
                  <div className="star-header">
                    <BookOpen size={16} />
                    <span>Hướng dẫn khung trả lời chuẩn STAR</span>
                  </div>
                  <div className="star-grid">
                    <div className="star-col">
                      <strong>S · Tình huống</strong>
                      <span>{currentQuestion.starGuidelines.situation}</span>
                    </div>
                    <div className="star-col">
                      <strong>T · Nhiệm vụ</strong>
                      <span>{currentQuestion.starGuidelines.task}</span>
                    </div>
                    <div className="star-col">
                      <strong>A · Hành động</strong>
                      <span>{currentQuestion.starGuidelines.action}</span>
                    </div>
                    <div className="star-col">
                      <strong>R · Kết quả</strong>
                      <span>{currentQuestion.starGuidelines.result}</span>
                    </div>
                  </div>
                </div>

                <div className="mock-answer-sandbox">
                  <div className="sandbox-header">
                    <label htmlFor="candidate-answer-input">
                      <strong>Thực hành trả lời của bạn:</strong>
                    </label>
                    <span className="word-count-badge">
                      {wordCount} từ {wordCount >= 40 ? '✓ Đủ ý' : '(Nên trên 40 từ)'}
                    </span>
                  </div>

                  <textarea
                    id="candidate-answer-input"
                    rows={6}
                    className="mock-answer-textarea"
                    placeholder="Nhập hoặc dán câu trả lời thử nghiệm của bạn theo khung STAR (Bối cảnh dự án, Nhiệm vụ, Hành động kỹ thuật đã làm, Kết quả đo lường được)..."
                    value={candidateAnswer}
                    onChange={e => setCandidateAnswer(e.target.value)}
                  />

                  <div className="sandbox-actions-bar">
                    <Button
                      kind="primary"
                      disabled={evaluating || !candidateAnswer.trim()}
                      onClick={() => void handleEvaluate()}
                      className="evaluate-btn"
                    >
                      {evaluating ? (
                        <>
                          <LoaderCircle size={15} className="spin" />
                          <span>Đang chấm điểm STAR…</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={15} />
                          <span>Chấm điểm & Nhận xét AI</span>
                        </>
                      )}
                    </Button>

                    <Button
                      kind="ghost"
                      onClick={() => setShowSample(!showSample)}
                      className="sample-toggle-btn"
                    >
                      <span>{showSample ? 'Ẩn câu trả lời mẫu' : 'Xem câu trả lời chuẩn mực'}</span>
                    </Button>

                    {onSaveToPrep && (
                      <Button
                        kind="secondary"
                        disabled={savingPrep}
                        onClick={() => void handleSavePreparation()}
                        className="save-prep-btn"
                        title="Thêm câu hỏi và gợi ý vào checklist vòng phỏng vấn"
                      >
                        <PlusCircle size={15} />
                        <span>Lưu vào nội dung chuẩn bị</span>
                      </Button>
                    )}
                  </div>

                  {showSample && (
                    <div className="sample-answer-reveal">
                      <strong>Câu trả lời tham khảo chuẩn STAR:</strong>
                      <p>{currentQuestion.sampleAnswer}</p>
                    </div>
                  )}
                </div>

                {evaluation && (
                  <section className="mock-evaluation-report" aria-label="Kết quả đánh giá câu trả lời">
                    <div className="evaluation-score-row">
                      <div className="score-circle">
                        <span className="score-number">{evaluation.overallScore}</span>
                        <span className="score-max">/10</span>
                      </div>
                      <div className="score-verdict-box">
                        <span className={`verdict-pill verdict-${evaluation.verdict === 'Xuất sắc' ? 'good' : evaluation.verdict === 'Đạt yêu cầu' ? 'fair' : 'warn'}`}>
                          {evaluation.verdict}
                        </span>
                        <p className="verdict-summary">
                          {evaluation.overallScore >= 8.0
                            ? 'Câu trả lời mạch lạc, thể hiện kinh nghiệm thực chiến và có kết quả định lượng rõ ràng.'
                            : evaluation.overallScore >= 6.0
                            ? 'Câu trả lời đạt chuẩn nhưng cần thêm chiều sâu về giải pháp kỹ thuật hoặc số liệu.'
                            : 'Câu trả lời còn sơ sài. Hãy bổ sung tình huống cụ thể và các hành động cá nhân.'}
                        </p>
                      </div>
                    </div>

                    <div className="rubric-meters-grid">
                      <div className="rubric-item">
                        <span>Tình huống (S)</span>
                        <div className="rubric-bar">
                          <div className="rubric-fill" style={{ width: `${evaluation.rubric.situationScore * 10}%` }} />
                        </div>
                        <small>{evaluation.rubric.situationScore}/10</small>
                      </div>
                      <div className="rubric-item">
                        <span>Nhiệm vụ (T)</span>
                        <div className="rubric-bar">
                          <div className="rubric-fill" style={{ width: `${evaluation.rubric.taskScore * 10}%` }} />
                        </div>
                        <small>{evaluation.rubric.taskScore}/10</small>
                      </div>
                      <div className="rubric-item">
                        <span>Hành động (A)</span>
                        <div className="rubric-bar">
                          <div className="rubric-fill" style={{ width: `${evaluation.rubric.actionScore * 10}%` }} />
                        </div>
                        <small>{evaluation.rubric.actionScore}/10</small>
                      </div>
                      <div className="rubric-item">
                        <span>Kết quả (R)</span>
                        <div className="rubric-bar">
                          <div className="rubric-fill" style={{ width: `${evaluation.rubric.resultScore * 10}%` }} />
                        </div>
                        <small>{evaluation.rubric.resultScore}/10</small>
                      </div>
                      <div className="rubric-item">
                        <span>Mạch lạc</span>
                        <div className="rubric-bar">
                          <div className="rubric-fill" style={{ width: `${evaluation.rubric.clarityScore * 10}%` }} />
                        </div>
                        <small>{evaluation.rubric.clarityScore}/10</small>
                      </div>
                    </div>

                    <div className="feedback-columns">
                      <div className="feedback-col strengths-col">
                        <h4>
                          <CheckCircle2 size={16} />
                          Điểm mạnh nổi bật
                        </h4>
                        <ul>
                          {evaluation.strengths.map((str, idx) => (
                            <li key={idx}>{str}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="feedback-col improvements-col">
                        <h4>
                          <AlertCircle size={16} />
                          Điểm cần cải thiện
                        </h4>
                        <ul>
                          {evaluation.improvements.map((imp, idx) => (
                            <li key={idx}>{imp}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="improved-answer-box">
                      <div className="improved-header">
                        <h4>Phiên bản tinh chỉnh tối ưu (AI STAR Refined Version)</h4>
                        <Button kind="secondary" onClick={() => void handleCopyImproved()}>
                          {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                          <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
                        </Button>
                      </div>
                      <pre className="improved-text">{evaluation.improvedAnswer}</pre>
                    </div>
                  </section>
                )}
              </>
            ) : (
              <div className="empty-mock-state">
                <p>Không có câu hỏi trong danh mục này.</p>
              </div>
            )}
          </main>
        </div>
      )}
      </div>

      <div className="dialog-actions">
        <Button kind="secondary" onClick={onClose}>
          Đóng
        </Button>
      </div>
    </Dialog>
  );
}
