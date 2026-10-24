import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  Award,
  Sparkles,
  ChevronRight,
  RotateCcw,
  Trash2,
  Plus,
  Cpu,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Flame,
  FileCheck
} from 'lucide-react';
import {
  simulationRepository,
  type SimulationSessionDTO,
  type TurnEvaluationDTO,
  type SimulationTrack,
  type SimulationDifficulty,
  type SimulationPacingMode
} from '../data';
import { getPacingDurationSeconds } from '../domain';

interface InterviewSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESETS = [
  {
    role: 'Senior Backend Engineer',
    company: 'Shopee',
    track: 'system_design' as SimulationTrack,
    difficulty: 'senior' as SimulationDifficulty,
    pacingMode: 'standard_2min' as SimulationPacingMode
  },
  {
    role: 'Frontend Lead Architect',
    company: 'Tiki',
    track: 'technical_deepdive' as SimulationTrack,
    difficulty: 'lead' as SimulationDifficulty,
    pacingMode: 'standard_2min' as SimulationPacingMode
  },
  {
    role: 'Engineering Manager',
    company: 'Grab',
    track: 'culture_leadership' as SimulationTrack,
    difficulty: 'senior' as SimulationDifficulty,
    pacingMode: 'relaxed_5min' as SimulationPacingMode
  },
  {
    role: 'Product Engineer (Fullstack)',
    company: 'VNG Corporation',
    track: 'behavioral_star' as SimulationTrack,
    difficulty: 'mid' as SimulationDifficulty,
    pacingMode: 'rapid_fire_1min' as SimulationPacingMode
  }
];

export const InterviewSimulationModal: React.FC<InterviewSimulationModalProps> = ({ isOpen, onClose }) => {
  const [sessions, setSessions] = useState<SimulationSessionDTO[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'setup' | 'arena' | 'report'>('setup');

  const [targetRole, setTargetRole] = useState('Senior Backend Engineer');
  const [targetCompany, setTargetCompany] = useState('Shopee');
  const [track, setTrack] = useState<SimulationTrack>('system_design');
  const [difficulty, setDifficulty] = useState<SimulationDifficulty>('senior');
  const [pacingMode, setPacingMode] = useState<SimulationPacingMode>('standard_2min');

  const [answerText, setAnswerText] = useState('');
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(120);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [lastTurnEvaluation, setLastTurnEvaluation] = useState<TurnEvaluationDTO | null>(null);
  const [showExemplar, setShowExemplar] = useState(false);

  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    } else {
      stopTimer();
    }
  }, [isOpen]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  useEffect(() => {
    if (!activeSession) return;
    if (activeSession.status === 'completed') {
      setViewMode('report');
      stopTimer();
    } else if (activeSession.status === 'in_progress') {
      setViewMode('arena');
      resetTurnState(activeSession);
    }
  }, [activeSessionId]);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setSecondsElapsed(prev => prev + 1);
        setSecondsRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  function stopTimer() {
    setIsTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function resetTurnState(session: SimulationSessionDTO) {
    const totalPacing = getPacingDurationSeconds(session.pacingMode);
    setSecondsRemaining(totalPacing);
    setSecondsElapsed(0);
    setAnswerText('');
    setLastTurnEvaluation(null);
    setShowExemplar(false);
    setIsTimerRunning(true);
  }

  async function loadSessions() {
    setLoading(true);
    setError(null);
    try {
      const data = await simulationRepository.listSessions();
      setSessions(data);
      if (data.length > 0 && !activeSessionId) {
        setActiveSessionId(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách phiên phỏng vấn.');
    } finally {
      setLoading(false);
    }
  }

  async function handleStartSession(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!targetRole.trim() || !targetCompany.trim()) {
      setError('Vui lòng nhập vị trí và công ty mục tiêu.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const created = await simulationRepository.startSession({
        targetRole: targetRole.trim(),
        targetCompany: targetCompany.trim(),
        track,
        difficulty,
        pacingMode
      });
      setSessions(prev => [created, ...prev]);
      setActiveSessionId(created.id);
      setViewMode('arena');
      resetTurnState(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể khởi tạo phiên phỏng vấn.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitTurn() {
    if (!activeSession) return;
    if (!answerText.trim()) {
      setError('Vui lòng nhập câu trả lời trước khi nộp.');
      return;
    }

    setEvaluating(true);
    setError(null);
    stopTimer();

    try {
      const { session: updatedSession, evaluation } = await simulationRepository.submitTurn(activeSession.id, {
        answer: answerText.trim(),
        timeTakenSeconds: secondsElapsed
      });

      setSessions(prev => prev.map(s => (s.id === updatedSession.id ? updatedSession : s)));
      setLastTurnEvaluation(evaluation);

      if (updatedSession.status === 'completed') {
        setTimeout(() => {
          setViewMode('report');
        }, 1800);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể chấm điểm câu trả lời.');
      setIsTimerRunning(true);
    } finally {
      setEvaluating(false);
    }
  }

  function handleNextQuestion() {
    if (!activeSession) return;
    resetTurnState(activeSession);
  }

  async function handleDeleteSession(id: string) {
    if (!confirm('Bạn có chắc chắn muốn xóa phiên phỏng vấn này?')) return;
    try {
      await simulationRepository.deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      if (activeSessionId === id) {
        const remaining = sessions.filter(s => s.id !== id);
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id);
        } else {
          setActiveSessionId(null);
          setViewMode('setup');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xóa phiên phỏng vấn.');
    }
  }

  function formatTime(totalSeconds: number): string {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  const wordCount = answerText.trim() ? answerText.trim().split(/\s+/).length : 0;
  const currentQuestion = activeSession?.questions[activeSession.currentQuestionIndex] || '';

  if (!isOpen) return null;

  return (
    <div className="simulation-modal-backdrop" onClick={onClose}>
      <div className="simulation-modal-container" onClick={e => e.stopPropagation()}>
        <div className="simulation-modal-header">
          <div className="simulation-header-title-box">
            <div className="simulation-header-icon-wrap">
              <Cpu className="simulation-icon" size={24} />
            </div>
            <div>
              <div className="simulation-title-row">
                <h2 className="simulation-modal-title">Phòng Giả Lập Phỏng Vấn AI</h2>
                <span className="simulation-studio-badge">Studio Live</span>
              </div>
              <p className="simulation-modal-sub">
                Luyện phản xạ thời gian thực, đánh giá câu trả lời chuẩn STAR & kiến trúc kỹ thuật cao cấp
              </p>
            </div>
          </div>

          <div className="simulation-header-actions">
            <button
              type="button"
              className="simulation-new-btn"
              onClick={() => {
                setViewMode('setup');
                setActiveSessionId(null);
              }}
            >
              <Plus size={16} /> Phiên Mới
            </button>
            <button type="button" className="simulation-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {sessions.length > 0 && (
          <div className="simulation-session-selector-bar">
            <span className="simulation-session-label">Phiên gần đây:</span>
            <div className="simulation-session-pill-list">
              {sessions.map(s => {
                const isSelected = s.id === activeSessionId && viewMode !== 'setup';
                return (
                  <div
                    key={s.id}
                    className={`simulation-session-pill ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      setActiveSessionId(s.id);
                      if (s.status === 'completed') {
                        setViewMode('report');
                      } else {
                        setViewMode('arena');
                      }
                    }}
                  >
                    <span className="pill-company">{s.targetCompany}</span>
                    <span className="pill-role">{s.targetRole}</span>
                    <span className={`pill-status-dot ${s.status}`} />
                    <button
                      type="button"
                      className="pill-del-btn"
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteSession(s.id);
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="simulation-error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="simulation-modal-body">
          {viewMode === 'setup' && (
            <div className="simulation-setup-view">
              <div className="simulation-preset-section">
                <div className="simulation-section-title">
                  <Flame size={16} /> Chọn Nhanh Kịch Bản Thực Chiến
                </div>
                <div className="simulation-preset-grid">
                  {PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="simulation-preset-card"
                      onClick={() => {
                        setTargetRole(p.role);
                        setTargetCompany(p.company);
                        setTrack(p.track);
                        setDifficulty(p.difficulty);
                        setPacingMode(p.pacingMode);
                      }}
                    >
                      <div className="preset-top">
                        <span className="preset-company">{p.company}</span>
                        <span className="preset-track-tag">{p.track.replace('_', ' ')}</span>
                      </div>
                      <div className="preset-role">{p.role}</div>
                      <div className="preset-footer">
                        <span>{p.difficulty.toUpperCase()}</span>
                        <span>{p.pacingMode.includes('1min') ? '60s' : p.pacingMode.includes('5min') ? '300s' : '120s'}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleStartSession} className="simulation-config-form">
                <div className="simulation-form-grid">
                  <div className="form-group">
                    <label className="form-label">Vị trí ứng tuyển (Target Role)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={targetRole}
                      onChange={e => setTargetRole(e.target.value)}
                      placeholder="VD: Senior Backend Engineer"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Công ty mục tiêu (Target Company)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={targetCompany}
                      onChange={e => setTargetCompany(e.target.value)}
                      placeholder="VD: Shopee, Grab, Tiki..."
                      required
                    />
                  </div>
                </div>

                <div className="form-group mt-3">
                  <label className="form-label">Nhóm nội dung phỏng vấn (Interview Track)</label>
                  <div className="simulation-radio-chips">
                    {[
                      { id: 'behavioral_star', label: 'STAR Behavioral', desc: 'Tình huống thực tế, xung đột & giải pháp' },
                      { id: 'system_design', label: 'System Design', desc: 'Kiến trúc phân tán, tải cao & dữ liệu lớn' },
                      { id: 'technical_deepdive', label: 'Tech Deep-Dive', desc: 'Đào sâu core language, memory & concurrency' },
                      { id: 'culture_leadership', label: 'Culture & Leadership', desc: 'Định hướng văn hóa, ra quyết định & mentor' }
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        className={`radio-chip ${track === t.id ? 'selected' : ''}`}
                        onClick={() => setTrack(t.id as SimulationTrack)}
                      >
                        <div className="chip-title">{t.label}</div>
                        <div className="chip-desc">{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="simulation-form-grid mt-3">
                  <div className="form-group">
                    <label className="form-label">Cấp bậc chuyên môn (Difficulty)</label>
                    <div className="simulation-segmented-control">
                      {[
                        { id: 'junior', label: 'Junior' },
                        { id: 'mid', label: 'Mid-Level' },
                        { id: 'senior', label: 'Senior' },
                        { id: 'lead', label: 'Lead / Staff' }
                      ].map(d => (
                        <button
                          key={d.id}
                          type="button"
                          className={`segmented-item ${difficulty === d.id ? 'active' : ''}`}
                          onClick={() => setDifficulty(d.id as SimulationDifficulty)}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Áp lực thời gian (Pacing Mode)</label>
                    <div className="simulation-segmented-control">
                      {[
                        { id: 'rapid_fire_1min', label: '60s (Chớp nhoáng)' },
                        { id: 'standard_2min', label: '120s (Chuẩn mực)' },
                        { id: 'relaxed_5min', label: '300s (Thư thả)' }
                      ].map(p => (
                        <button
                          key={p.id}
                          type="button"
                          className={`segmented-item ${pacingMode === p.id ? 'active' : ''}`}
                          onClick={() => setPacingMode(p.id as SimulationPacingMode)}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="simulation-submit-row mt-4">
                  <button type="submit" className="simulation-start-submit-btn" disabled={loading}>
                    {loading ? (
                      <RotateCcw className="spin-icon" size={18} />
                    ) : (
                      <>
                        <Play size={18} /> Khởi Động Phiên Giả Lập Live
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {viewMode === 'arena' && activeSession && (
            <div className="simulation-arena-view">
              <div className="arena-top-banner">
                <div className="arena-meta-col">
                  <div className="arena-role-company">
                    <span className="arena-company">{activeSession.targetCompany}</span>
                    <span className="arena-divider">/</span>
                    <span className="arena-role">{activeSession.targetRole}</span>
                  </div>
                  <div className="arena-tags">
                    <span className="arena-tag track">{activeSession.track}</span>
                    <span className="arena-tag difficulty">{activeSession.difficulty}</span>
                    <span className="arena-tag pacing">{activeSession.pacingMode}</span>
                  </div>
                </div>

                <div className="arena-timer-box">
                  <div className="arena-timer-controls">
                    <button
                      type="button"
                      className="timer-toggle-btn"
                      onClick={() => setIsTimerRunning(prev => !prev)}
                      title={isTimerRunning ? 'Tạm dừng' : 'Tiếp tục'}
                    >
                      {isTimerRunning ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                  </div>
                  <div
                    className={`arena-timer-digits ${
                      secondsRemaining <= 10 ? 'critical' : secondsRemaining <= 30 ? 'warning' : 'healthy'
                    }`}
                  >
                    <Clock size={16} />
                    <span>{formatTime(secondsRemaining)}</span>
                  </div>
                </div>
              </div>

              <div className="arena-progress-bar-container">
                <div className="arena-progress-info">
                  <span>
                    Câu hỏi {activeSession.currentQuestionIndex + 1} / {activeSession.questions.length}
                  </span>
                  <span>Đã ghi nhận: {activeSession.turns.length} lượt trả lời</span>
                </div>
                <div className="arena-progress-track">
                  <div
                    className="arena-progress-fill"
                    style={{
                      width: `${Math.round(
                        ((activeSession.currentQuestionIndex + 1) / activeSession.questions.length) * 100
                      )}%`
                    }}
                  />
                </div>
              </div>

              <div className="arena-question-card">
                <div className="arena-question-header">
                  <HelpCircle size={18} className="arena-q-icon" />
                  <span className="arena-q-title">Câu hỏi phỏng vấn từ AI Interviewer:</span>
                </div>
                <div className="arena-q-text">{currentQuestion}</div>
              </div>

              {lastTurnEvaluation ? (
                <div className="arena-feedback-card">
                  <div className="feedback-header">
                    <div className="feedback-score-badge">
                      <Award size={20} />
                      <span className="score-num">{lastTurnEvaluation.compositeScore}</span>
                      <span className="score-max">/100</span>
                    </div>
                    <div>
                      <h4 className="feedback-title">Đánh giá tức thì từ AI Mentor</h4>
                      <p className="feedback-sub">Phản hồi dựa trên chuẩn mực tuyển dụng cấp cao</p>
                    </div>
                  </div>

                  <div className="feedback-rubric-row">
                    <div className="rubric-pill">
                      <span className="rubric-name">Cấu trúc STAR</span>
                      <span className="rubric-val">{lastTurnEvaluation.structureScore}/100</span>
                    </div>
                    <div className="rubric-pill">
                      <span className="rubric-name">Độ sâu kỹ thuật</span>
                      <span className="rubric-val">{lastTurnEvaluation.technicalDepthScore}/100</span>
                    </div>
                    <div className="rubric-pill">
                      <span className="rubric-name">Số liệu định lượng</span>
                      <span className="rubric-val">{lastTurnEvaluation.metricImpactScore}/100</span>
                    </div>
                  </div>

                  <div className="feedback-lists-grid">
                    <div className="feedback-list-col strengths">
                      <div className="list-title">
                        <CheckCircle2 size={16} /> Điểm sáng ghi nhận
                      </div>
                      <ul>
                        {lastTurnEvaluation.strengths.map((str, idx) => (
                          <li key={idx}>{str}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="feedback-list-col gaps">
                      <div className="list-title">
                        <AlertCircle size={16} /> Điểm cần bứt phá
                      </div>
                      <ul>
                        {lastTurnEvaluation.improvements.map((imp, idx) => (
                          <li key={idx}>{imp}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="exemplar-section">
                    <button
                      type="button"
                      className="exemplar-toggle-btn"
                      onClick={() => setShowExemplar(prev => !prev)}
                    >
                      <Sparkles size={16} />
                      {showExemplar ? 'Ẩn câu trả lời mẫu chuẩn mực' : 'Xem câu trả lời mẫu đạt 95+ điểm'}
                    </button>
                    {showExemplar && (
                      <div className="exemplar-box">
                        <div className="exemplar-content">{lastTurnEvaluation.exemplarAnswer}</div>
                      </div>
                    )}
                  </div>

                  <div className="feedback-actions">
                    {activeSession.currentQuestionIndex < activeSession.questions.length ? (
                      <button type="button" className="arena-next-btn" onClick={handleNextQuestion}>
                        Tiếp Tục Câu Tiếp Theo <ChevronRight size={16} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="arena-next-btn report"
                        onClick={() => setViewMode('report')}
                      >
                        <FileCheck size={16} /> Xem Báo Cáo Sẵn Sàng (Final Report)
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="arena-answer-section">
                  <div className="answer-header">
                    <label className="answer-label">Câu trả lời của bạn:</label>
                    <div className="answer-counters">
                      <span>{wordCount} từ</span>
                      <span className="counter-divider">•</span>
                      <span>{answerText.length} ký tự</span>
                    </div>
                  </div>
                  <textarea
                    className="arena-textarea"
                    value={answerText}
                    onChange={e => setAnswerText(e.target.value)}
                    placeholder="Trình bày theo cấu trúc STAR: Bối cảnh (Situation), Nhiệm vụ (Task), Hành động kỹ thuật cụ thể (Action), Kết quả định lượng bằng % hoặc latency/throughput (Result)..."
                    rows={8}
                    autoFocus
                  />

                  <div className="arena-action-bar">
                    <button
                      type="button"
                      className="arena-abandon-btn"
                      onClick={() => setViewMode('setup')}
                    >
                      Thoát phiên
                    </button>

                    <button
                      type="button"
                      className="arena-submit-btn"
                      onClick={handleSubmitTurn}
                      disabled={evaluating || !answerText.trim()}
                    >
                      {evaluating ? (
                        <>
                          <RotateCcw className="spin-icon" size={16} /> AI đang chấm điểm đa tiêu chí...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} /> Nộp Bài & Chấm Điểm Tức Thì
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {viewMode === 'report' && activeSession && (
            <div className="simulation-report-view">
              {activeSession.report ? (
                <>
                  <div className="report-hero-card">
                    <div className="report-score-gauge">
                      <div className="gauge-val">{activeSession.report.overallScore}</div>
                      <div className="gauge-label">Điểm Trung Bình</div>
                    </div>
                    <div className="report-hero-details">
                      <div className="report-grade-badge">
                        Xếp loại: <strong>{activeSession.report.readinessGrade}</strong>
                      </div>
                      <h3 className="report-role-title">
                        {activeSession.targetRole} @ {activeSession.targetCompany}
                      </h3>
                      <p className="report-summary-text">{activeSession.report.summary}</p>
                    </div>
                  </div>

                  <div className="report-focus-callout">
                    <div className="focus-header">
                      <Sparkles size={18} /> Khuyến Nghị Hành Động Trọng Tâm:
                    </div>
                    <div className="focus-body">{activeSession.report.recommendedFocus}</div>
                  </div>

                  <div className="report-columns-grid">
                    <div className="report-col strengths">
                      <h4 className="col-title">
                        <CheckCircle2 size={16} /> Điểm Mạnh Tiêu Biểu
                      </h4>
                      <ul>
                        {activeSession.report.topStrengths.map((str, idx) => (
                          <li key={idx}>{str}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="report-col gaps">
                      <h4 className="col-title">
                        <AlertCircle size={16} /> Lỗ Hổng Cần Khắc Phục
                      </h4>
                      <ul>
                        {activeSession.report.keyGaps.map((gap, idx) => (
                          <li key={idx}>{gap}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="report-turn-history-section">
                    <h4 className="turn-history-title">Chi Tiết Từng Lượt Trả Lời ({activeSession.turns.length})</h4>
                    <div className="turn-history-list">
                      {activeSession.turns.map((t, idx) => (
                        <div key={idx} className="turn-history-card">
                          <div className="turn-card-header">
                            <span className="turn-index">Câu {t.turnNumber || idx + 1}</span>
                            <span className="turn-score">{t.compositeScore}/100</span>
                          </div>
                          <div className="turn-q">{t.question}</div>
                          <div className="turn-a">
                            <strong>Bạn:</strong> {t.answer}
                          </div>
                          <div className="turn-metrics">
                            <span>STAR: {t.structureScore}</span>
                            <span>Kỹ thuật: {t.technicalDepthScore}</span>
                            <span>Số liệu: {t.metricImpactScore}</span>
                            <span>Thời gian: {t.timeTakenSeconds}s</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="report-footer-actions">
                    <button
                      type="button"
                      className="report-new-btn"
                      onClick={() => {
                        setViewMode('setup');
                        setActiveSessionId(null);
                      }}
                    >
                      <Plus size={16} /> Bắt Đầu Phiên Mới
                    </button>
                    <button
                      type="button"
                      className="report-delete-btn"
                      onClick={() => handleDeleteSession(activeSession.id)}
                    >
                      <Trash2 size={16} /> Xóa Kết Quả Phiên Này
                    </button>
                  </div>
                </>
              ) : (
                <div className="report-empty">
                  <p>Phiên phỏng vấn chưa có báo cáo tổng kết.</p>
                  <button type="button" className="simulation-new-btn" onClick={() => setViewMode('arena')}>
                    Quay lại phòng phỏng vấn
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
