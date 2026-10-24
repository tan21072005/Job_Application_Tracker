import { useState, useEffect } from 'react';
import {
  Scale,
  SlidersHorizontal,
  Trophy,
  Award,
  Sparkles,
  Check,
  Copy,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  ChevronRight,
  Info
} from 'lucide-react';
import { Button, Dialog } from './ui';
import { decisionRepository } from '../data';
import type { Application } from '../domain';
import {
  DECISION_DIMENSIONS,
  type DecisionDimensionKey,
  DIMENSION_METADATA,
  DEFAULT_WEIGHT_PROFILE,
  type DecisionMatrixComparison,
  normalizeWeights
} from '@jobtrack/contract';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  applications: Application[];
  onRefreshApps?: () => void;
  notify?: (msg: string, isErr?: boolean) => void;
}

export function DecisionMatrixModal({
  isOpen,
  onClose,
  applications,
  onRefreshApps,
  notify
}: Props) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'matrix' | 'weights' | 'scorecard'>('matrix');
  const [weights, setWeights] = useState<Record<DecisionDimensionKey, number>>({ ...DEFAULT_WEIGHT_PROFILE });
  const [matrix, setMatrix] = useState<DecisionMatrixComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingWeights, setSavingWeights] = useState(false);
  const [savingScores, setSavingScores] = useState(false);
  const [copied, setCopied] = useState(false);

  const [filterStage, setFilterStage] = useState<'all' | 'interview_offer'>('interview_offer');
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [editingAppId, setEditingAppId] = useState<string>('');
  const [editingScores, setEditingScores] = useState<Record<DecisionDimensionKey, number>>({
    compensation: 5,
    work_life_balance: 5,
    career_growth: 5,
    company_culture: 5,
    commute_flexibility: 5,
    leadership_team: 5,
    tech_stack: 5
  });
  const [editingNotes, setEditingNotes] = useState('');

  const activeApps = applications.filter((a) => !a.deletedAt);
  const candidateApps = filterStage === 'interview_offer'
    ? activeApps.filter((a) => a.status === 'Interview' || a.status === 'Offer')
    : activeApps;

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const loadedWeights = await decisionRepository.getWeights();
        setWeights(loadedWeights);

        const initialSelected = (
          candidateApps.length > 0 ? candidateApps : activeApps
        ).slice(0, 4).map((a) => a.id);

        setSelectedAppIds(initialSelected);
        if (initialSelected.length > 0) {
          setEditingAppId(initialSelected[0]);
        }

        const initialMatrix = await decisionRepository.getMatrix(
          initialSelected.length > 0 ? initialSelected : undefined
        );
        setMatrix(initialMatrix);
      } catch (err) {
        notify?.((err as Error).message || 'Không thể tải ma trận đánh giá.', true);
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, [isOpen]);

  useEffect(() => {
    if (!editingAppId) return;
    const target = applications.find((a) => a.id === editingAppId);
    if (!target) return;

    const safe: Record<DecisionDimensionKey, number> = {
      compensation: 5,
      work_life_balance: 5,
      career_growth: 5,
      company_culture: 5,
      commute_flexibility: 5,
      leadership_team: 5,
      tech_stack: 5
    };

    if (target.scorecard) {
      for (const k of DECISION_DIMENSIONS) {
        if (typeof target.scorecard[k] === 'number') {
          safe[k] = target.scorecard[k];
        }
      }
    }
    setEditingScores(safe);
  }, [editingAppId, applications]);

  async function handleReloadMatrix(ids = selectedAppIds) {
    try {
      const data = await decisionRepository.getMatrix(ids.length > 0 ? ids : undefined);
      setMatrix(data);
    } catch (err) {
      notify?.((err as Error).message || 'Lỗi tính toán ma trận.', true);
    }
  }

  function toggleAppSelection(id: string) {
    let next: string[];
    if (selectedAppIds.includes(id)) {
      next = selectedAppIds.filter((item) => item !== id);
    } else {
      if (selectedAppIds.length >= 5) {
        notify?.('Bạn có thể chọn tối đa 5 cơ hội để so sánh trực diện.', true);
        return;
      }
      next = [...selectedAppIds, id];
    }
    setSelectedAppIds(next);
    void handleReloadMatrix(next);
  }

  async function handleSaveWeights() {
    setSavingWeights(true);
    try {
      const saved = await decisionRepository.saveWeights(weights);
      setWeights(saved);
      notify?.('Đã lưu cấu hình trọng số quyết định.');
      await handleReloadMatrix();
      setActiveTab('matrix');
    } catch (err) {
      notify?.((err as Error).message || 'Không thể lưu trọng số.', true);
    } finally {
      setSavingWeights(false);
    }
  }

  function handleResetWeights() {
    setWeights({ ...DEFAULT_WEIGHT_PROFILE });
  }

  async function handleSaveScorecard() {
    if (!editingAppId) return;
    setSavingScores(true);
    try {
      await decisionRepository.updateScorecard(editingAppId, {
        scores: editingScores,
        notes: editingNotes.trim() || undefined
      });
      notify?.('Đã cập nhật phiếu điểm cho cơ hội.');
      onRefreshApps?.();
      await handleReloadMatrix();
      setActiveTab('matrix');
    } catch (err) {
      notify?.((err as Error).message || 'Không thể lưu phiếu điểm.', true);
    } finally {
      setSavingScores(false);
    }
  }

  function handleCopySummary() {
    if (!matrix || matrix.opportunities.length === 0) return;
    const lines = [
      '# KẾT QUẢ ĐÁNH GIÁ MA TRẬN QUYẾT ĐỊNH NGHỀ NGHIỆP',
      `Ngày phân tích: ${new Date(matrix.analyzedAt).toLocaleDateString('vi-VN')}`,
      '',
      `Top cơ hội dẫn đầu: ${matrix.opportunities[0].company} - ${matrix.opportunities[0].position} (${matrix.opportunities[0].compositeScore}/100)`,
      '',
      '## Bảng xếp hạng cơ hội:'
    ];

    matrix.opportunities.forEach((op) => {
      lines.push(`${op.rank}. ${op.company} (${op.position}) — ${op.compositeScore}/100 [Trạng thái: ${op.status}]`);
      if (op.strengths.length > 0) {
        lines.push(`   - Điểm mạnh: ${op.strengths.map((s) => DIMENSION_METADATA[s].label).join(', ')}`);
      }
      if (op.weaknesses.length > 0) {
        lines.push(`   - Điểm cần cân nhắc: ${op.weaknesses.map((w) => DIMENSION_METADATA[w].label).join(', ')}`);
      }
    });

    lines.push('');
    lines.push('## Dẫn đầu từng tiêu chí:');
    matrix.categoryWinners.forEach((w) => {
      lines.push(`- ${w.dimensionLabel}: ${w.company} (${w.score}/10)`);
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    notify?.('Đã sao chép tóm tắt đánh giá vào bộ nhớ tạm.');
  }

  const topPick = matrix && matrix.opportunities.length > 0 ? matrix.opportunities[0] : null;

  return (
    <Dialog title="Ma trận Quyết định & So sánh Cơ hội" onClose={onClose} wide>
      <div className="decision-matrix-modal">
        <header className="decision-matrix-header">
          <div className="decision-matrix-tabs">
            <button
              className={`dm-tab-btn ${activeTab === 'matrix' ? 'active' : ''}`}
              onClick={() => setActiveTab('matrix')}
            >
              <Scale size={16} />
              <span>Bảng so sánh cơ hội</span>
            </button>
            <button
              className={`dm-tab-btn ${activeTab === 'weights' ? 'active' : ''}`}
              onClick={() => setActiveTab('weights')}
            >
              <SlidersHorizontal size={16} />
              <span>Trọng số ưu tiên cá nhân</span>
            </button>
            <button
              className={`dm-tab-btn ${activeTab === 'scorecard' ? 'active' : ''}`}
              onClick={() => setActiveTab('scorecard')}
            >
              <Award size={16} />
              <span>Chấm điểm cơ hội</span>
            </button>
          </div>
        </header>

        {loading ? (
          <div className="decision-loading">
            <p>Đang tính toán ma trận quyết định…</p>
          </div>
        ) : (
          <div className="decision-matrix-content">
            {activeTab === 'matrix' && (
              <div className="dm-view-matrix">
                <div className="dm-filter-bar">
                  <div className="dm-stage-toggle">
                    <button
                      className={`dm-stage-btn ${filterStage === 'interview_offer' ? 'active' : ''}`}
                      onClick={() => setFilterStage('interview_offer')}
                    >
                      Chỉ Phỏng vấn & Offer
                    </button>
                    <button
                      className={`dm-stage-btn ${filterStage === 'all' ? 'active' : ''}`}
                      onClick={() => setFilterStage('all')}
                    >
                      Tất cả hồ sơ ({activeApps.length})
                    </button>
                  </div>

                  <div className="dm-app-selector-chips">
                    <span className="dm-selector-label">Chọn cơ hội so sánh:</span>
                    <div className="dm-chips-list">
                      {candidateApps.map((a) => {
                        const isSelected = selectedAppIds.includes(a.id);
                        return (
                          <button
                            key={a.id}
                            className={`dm-chip ${isSelected ? 'selected' : ''}`}
                            onClick={() => toggleAppSelection(a.id)}
                          >
                            {isSelected && <Check size={13} />}
                            <span>{a.company}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {topPick && (
                  <div className="dm-winner-banner">
                    <div className="dm-winner-icon">
                      <Trophy size={28} />
                    </div>
                    <div className="dm-winner-details">
                      <div className="dm-winner-badge">LỰA CHỌN TỐI ƯU NHẤT (#1)</div>
                      <h3 className="dm-winner-title">
                        {topPick.company} — <span className="dm-winner-pos">{topPick.position}</span>
                      </h3>
                      <p className="dm-winner-desc">
                        Đạt <strong>{topPick.compositeScore}/100 điểm</strong> tổng hợp dựa trên phân bổ trọng số ưu tiên của bạn.
                      </p>
                      {topPick.strengths.length > 0 && (
                        <div className="dm-winner-strengths">
                          <span>Điểm vượt trội:</span>
                          {topPick.strengths.map((str) => (
                            <span key={str} className="dm-strength-pill">
                              {DIMENSION_METADATA[str].label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="dm-winner-scorebox">
                      <div className="dm-score-num">{topPick.compositeScore}</div>
                      <div className="dm-score-denom">/ 100</div>
                    </div>
                  </div>
                )}

                {matrix && matrix.categoryWinners.length > 0 && (
                  <div className="dm-category-champions">
                    <h4 className="dm-section-subtitle">
                      <Sparkles size={16} /> Dẫn đầu theo từng tiêu chí
                    </h4>
                    <div className="dm-champions-grid">
                      {matrix.categoryWinners.map((w) => (
                        <div key={w.dimension} className="dm-champ-card">
                          <span className="dm-champ-dim">{w.dimensionLabel}</span>
                          <strong className="dm-champ-company">{w.company}</strong>
                          <span className="dm-champ-score">{w.score}/10</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {matrix && matrix.opportunities.length > 0 ? (
                  <div className="dm-matrix-table-wrapper">
                    <table className="dm-table">
                      <thead>
                        <tr>
                          <th className="dm-col-criteria">Tiêu chí đánh giá</th>
                          <th className="dm-col-weight">Trọng số</th>
                          {matrix.opportunities.map((op) => (
                            <th key={op.id} className="dm-col-op">
                              <div className="dm-th-company">
                                <span className={`dm-rank-pill ${op.rank === 1 ? 'rank-1' : ''}`}>
                                  #{op.rank}
                                </span>
                                <strong>{op.company}</strong>
                              </div>
                              <div className="dm-th-position">{op.position}</div>
                              <div className="dm-th-score">{op.compositeScore} điểm</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {DECISION_DIMENSIONS.map((dim) => {
                          const meta = DIMENSION_METADATA[dim];
                          const weightVal = matrix.appliedWeights[dim];
                          const winner = matrix.categoryWinners.find((w) => w.dimension === dim);

                          return (
                            <tr key={dim}>
                              <td className="dm-td-criteria">
                                <strong>{meta.label}</strong>
                                <small>{meta.description}</small>
                              </td>
                              <td className="dm-td-weight">
                                <span className="dm-weight-badge">{weightVal}%</span>
                              </td>
                              {matrix.opportunities.map((op) => {
                                const score = op.scores[dim];
                                const isWinner = winner?.winningOpportunityId === op.id;

                                return (
                                  <td
                                    key={op.id}
                                    className={`dm-td-score ${isWinner ? 'is-champ' : ''}`}
                                  >
                                    <div className="dm-cell-score">
                                      <span className="dm-score-val">{score}/10</span>
                                      {isWinner && <Award size={14} className="dm-champ-icon" />}
                                    </div>
                                    <div className="dm-meter-bar">
                                      <div
                                        className={`dm-meter-fill ${
                                          score >= 8 ? 'high' : score >= 5 ? 'med' : 'low'
                                        }`}
                                        style={{ width: `${score * 10}%` }}
                                      />
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={2} className="dm-td-total-label">
                            <strong>ĐIỂM TỔNG HỢP (COMPOSITE)</strong>
                          </td>
                          {matrix.opportunities.map((op) => (
                            <td key={op.id} className="dm-td-total-score">
                              <span className="dm-final-score">{op.compositeScore}</span>
                              <span className="dm-final-denom">/ 100</span>
                              <button
                                className="dm-edit-card-link"
                                onClick={() => {
                                  setEditingAppId(op.id);
                                  setActiveTab('scorecard');
                                }}
                              >
                                Chỉnh điểm
                              </button>
                            </td>
                          ))}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="dm-empty-state">
                    <AlertCircle size={28} />
                    <p>Chưa có cơ hội nào được chọn để so sánh.</p>
                    <p className="dm-empty-sub">Hãy chọn ít nhất 1 cơ hội từ danh sách phía trên.</p>
                  </div>
                )}

                <div className="dm-footer-actions">
                  <Button kind="secondary" onClick={handleCopySummary}>
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    <span>{copied ? 'Đã sao chép!' : 'Sao chép tóm tắt đánh giá'}</span>
                  </Button>
                  <Button
                    kind="secondary"
                    onClick={() => setActiveTab('weights')}
                  >
                    <SlidersHorizontal size={16} />
                    <span>Tùy chỉnh trọng số</span>
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'weights' && (
              <div className="dm-view-weights">
                <div className="dm-weights-intro">
                  <Info size={20} />
                  <div>
                    <h4>Trọng số Ưu tiên Cá nhân</h4>
                    <p>
                      Mỗi người có tiêu chí lựa chọn khác nhau. Kéo thanh trượt để thể hiện mức độ quan trọng
                      của từng tiêu chí. Hệ thống sẽ tự động chuẩn hóa để tổng bằng 100%.
                    </p>
                  </div>
                </div>

                <div className="dm-weights-list">
                  {DECISION_DIMENSIONS.map((dim) => {
                    const meta = DIMENSION_METADATA[dim];
                    const val = weights[dim];

                    return (
                      <div key={dim} className="dm-weight-item">
                        <div className="dm-weight-info">
                          <label className="dm-weight-label">{meta.label}</label>
                          <span className="dm-weight-desc">{meta.description}</span>
                        </div>
                        <div className="dm-weight-control">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={val}
                            onChange={(e) =>
                              setWeights({
                                ...weights,
                                [dim]: Number(e.target.value)
                              })
                            }
                            className="dm-slider"
                          />
                          <span className="dm-weight-pct">{val}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="dm-weights-actions">
                  <Button kind="ghost" onClick={handleResetWeights}>
                    <RotateCcw size={15} />
                    <span>Đặt lại mặc định</span>
                  </Button>
                  <Button
                    onClick={handleSaveWeights}
                    disabled={savingWeights}
                  >
                    <CheckCircle2 size={16} />
                    <span>{savingWeights ? 'Đang lưu…' : 'Lưu và Áp dụng'}</span>
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'scorecard' && (
              <div className="dm-view-scorecard">
                <div className="dm-scorecard-selector">
                  <label htmlFor="app-select">Chọn cơ hội để chấm điểm:</label>
                  <select
                    id="app-select"
                    value={editingAppId}
                    onChange={(e) => setEditingAppId(e.target.value)}
                    className="dm-select"
                  >
                    {activeApps.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.company} — {a.position} ({a.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="dm-scores-list">
                  {DECISION_DIMENSIONS.map((dim) => {
                    const meta = DIMENSION_METADATA[dim];
                    const score = editingScores[dim] || 5;

                    return (
                      <div key={dim} className="dm-score-item">
                        <div className="dm-score-info">
                          <strong className="dm-score-title">{meta.label}</strong>
                          <span className="dm-score-desc">{meta.description}</span>
                        </div>
                        <div className="dm-score-control">
                          <input
                            type="range"
                            min="1"
                            max="10"
                            step="1"
                            value={score}
                            onChange={(e) =>
                              setEditingScores({
                                ...editingScores,
                                [dim]: Number(e.target.value)
                              })
                            }
                            className="dm-slider"
                          />
                          <div className="dm-score-box">
                            <span className="dm-score-digital">{score}</span>
                            <span className="dm-score-ten">/10</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="dm-score-notes">
                  <label htmlFor="dm-notes">Ghi chú & Cảm nhận cá nhân:</label>
                  <textarea
                    id="dm-notes"
                    rows={2}
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    placeholder="Ấn tượng về phỏng vấn, trao đổi với đồng nghiệp tương lai..."
                    className="dm-textarea"
                  />
                </div>

                <div className="dm-scorecard-actions">
                  <Button
                    onClick={handleSaveScorecard}
                    disabled={savingScores}
                  >
                    <CheckCircle2 size={16} />
                    <span>{savingScores ? 'Đang lưu…' : 'Lưu phiếu điểm'}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
