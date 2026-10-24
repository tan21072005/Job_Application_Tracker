import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Award,
  Layers,
  Sparkles,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Briefcase,
  Sliders,
  SendHorizontal
} from 'lucide-react';
import { Button, Dialog } from './ui';
import { aiRepository } from '../data';
import type { Application } from '../domain';
import {
  parseVietnameseCurrency,
  type OfferEvaluationDTO,
  type OfferComparisonMatrixDTO,
  type CounterOfferScriptDTO,
  type NegotiationTone,
  type OfferEvaluationInput
} from '@jobtrack/contract';

interface Props {
  application: Application;
  allOffers?: Application[];
  onClose: () => void;
  notify?: (msg: string, isErr?: boolean) => void;
}

export default function OfferEvaluationModal({
  application,
  allOffers = [],
  onClose,
  notify
}: Props) {
  const [activeTab, setActiveTab] = useState<'breakdown' | 'factors' | 'compare' | 'negotiate'>('breakdown');
  const [busy, setBusy] = useState(false);

  const parsedSalary = parseVietnameseCurrency(application.salary || '');
  const initialBase = parsedSalary.amount && parsedSalary.amount > 1000000 ? parsedSalary.amount : 45000000;
  const initialCurrency = parsedSalary.currency === 'USD' ? 'USD' : 'VND';

  const [baseSalary, setBaseSalary] = useState<number>(initialBase);
  const [currency, setCurrency] = useState<'VND' | 'USD'>(initialCurrency);
  const [bonusMonths, setBonusMonths] = useState<number>(1);
  const [annualBonusCash, setAnnualBonusCash] = useState<number>(0);
  const [equityAnnual, setEquityAnnual] = useState<number>(0);
  const [allowanceMonthly, setAllowanceMonthly] = useState<number>(2000000);

  const [workLifeBalance, setWorkLifeBalance] = useState<number>(8);
  const [careerGrowth, setCareerGrowth] = useState<number>(8);
  const [teamAndCulture, setTeamAndCulture] = useState<number>(8);
  const [remoteFlexibility, setRemoteFlexibility] = useState<number>(8);
  const [companyStability, setCompanyStability] = useState<number>(8);
  const [healthAndBenefits, setHealthAndBenefits] = useState<number>(8);

  const [evaluation, setEvaluation] = useState<OfferEvaluationDTO | null>(null);
  const [comparisonMatrix, setComparisonMatrix] = useState<OfferComparisonMatrixDTO | null>(null);

  const [targetSalary, setTargetSalary] = useState<number>(Math.round(initialBase * 1.15));
  const [tone, setTone] = useState<NegotiationTone>('polite_confident');
  const [counterScript, setCounterScript] = useState<CounterOfferScriptDTO | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    recalculateEvaluation();
  }, [
    baseSalary,
    currency,
    bonusMonths,
    annualBonusCash,
    equityAnnual,
    allowanceMonthly,
    workLifeBalance,
    careerGrowth,
    teamAndCulture,
    remoteFlexibility,
    companyStability,
    healthAndBenefits
  ]);

  async function recalculateEvaluation() {
    try {
      const ev = await aiRepository.evaluateOffer({
        applicationId: application.id,
        company: application.company,
        position: application.position,
        compensation: {
          baseSalaryMonthly: baseSalary,
          currency,
          bonusMonthsPerYear: bonusMonths,
          annualBonusCash,
          stockOptionsOrEquityAnnual: equityAnnual,
          allowanceMonthly
        },
        workplaceFactors: {
          workLifeBalance,
          careerGrowth,
          teamAndCulture,
          remoteFlexibility,
          companyReputationAndStability: companyStability,
          healthAndBenefits
        }
      });
      setEvaluation(ev);
    } catch {}
  }

  async function handleLoadComparison() {
    setBusy(true);
    try {
      const candidates = allOffers.filter(a => a.id !== application.id && a.status === 'Offer');
      const offerInputs: OfferEvaluationInput[] = [
        {
          applicationId: application.id,
          company: application.company,
          position: application.position,
          compensation: {
            baseSalaryMonthly: baseSalary,
            currency,
            bonusMonthsPerYear: bonusMonths,
            annualBonusCash,
            stockOptionsOrEquityAnnual: equityAnnual,
            allowanceMonthly
          },
          workplaceFactors: {
            workLifeBalance,
            careerGrowth,
            teamAndCulture,
            remoteFlexibility,
            companyReputationAndStability: companyStability,
            healthAndBenefits
          }
        }
      ];

      for (const other of candidates) {
        const p = parseVietnameseCurrency(other.salary || '');
        const otherBase = p.amount && p.amount > 1000000 ? p.amount : 40000000;
        offerInputs.push({
          applicationId: other.id,
          company: other.company,
          position: other.position,
          compensation: {
            baseSalaryMonthly: otherBase,
            currency: p.currency === 'USD' ? 'USD' : 'VND',
            bonusMonthsPerYear: 1,
            allowanceMonthly: 1500000
          },
          workplaceFactors: {
            workLifeBalance: 7,
            careerGrowth: 7
          }
        });
      }

      if (offerInputs.length < 2) {
        offerInputs.push({
          applicationId: 'mock-competitive-offer',
          company: 'Thị trường tham chiếu (Benchmark Corp)',
          position: application.position,
          compensation: {
            baseSalaryMonthly: Math.round(baseSalary * 1.08),
            currency,
            bonusMonthsPerYear: 1,
            allowanceMonthly: 2000000
          },
          workplaceFactors: {
            workLifeBalance: 7,
            careerGrowth: 8
          }
        });
      }

      const res = await aiRepository.compareOffers({ offers: offerInputs });
      setComparisonMatrix(res);
      setActiveTab('compare');
    } catch {
      notify?.('Không thể phân tích so sánh lúc này.', true);
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateCounterOffer() {
    if (!evaluation) return;
    setBusy(true);
    try {
      const script = await aiRepository.generateCounterOffer({
        offer: evaluation,
        targetSalary,
        tone
      });
      setCounterScript(script);
      setActiveTab('negotiate');
    } catch {
      notify?.('Không thể tạo kịch bản đàm phán.', true);
    } finally {
      setBusy(false);
    }
  }

  function handleCopyScript(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    notify?.('Đã sao chép thư đàm phán vào clipboard!');
    setTimeout(() => setCopied(false), 2000);
  }

  function formatMoney(amount: number) {
    if (currency === 'USD') return `$${amount.toLocaleString('en-US')}`;
    return `${amount.toLocaleString('vi-VN')} VND`;
  }

  return (
    <Dialog
      onClose={onClose}
      title="Đánh giá Offer & Đàm phán Thù lao (TC Calculator & Decision Matrix)"
      wide
      busy={busy}
    >
      <div className="offer-eval-modal-body">
        <div className="offer-header-card">
          <div className="offer-header-info">
            <span className="offer-badge-pill">Offer Thư mời</span>
            <h3 className="offer-job-title">{application.position}</h3>
            <span className="offer-company-name">{application.company}</span>
          </div>

          {evaluation && (
            <div className="offer-score-header-box">
              <div className="offer-score-circle">
                <span className="offer-score-num">{evaluation.weightedScore}</span>
                <span className="offer-score-max">/100</span>
              </div>
              <div className="offer-grade-tag grade-good">
                {evaluation.grade}
              </div>
            </div>
          )}
        </div>

        <div className="offer-tabs-nav">
          <button
            type="button"
            className={`offer-tab-btn ${activeTab === 'breakdown' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('breakdown')}
          >
            <DollarSign size={16} />
            <span>Bóc tách Total Compensation (TC)</span>
          </button>
          <button
            type="button"
            className={`offer-tab-btn ${activeTab === 'factors' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('factors')}
          >
            <Sliders size={16} />
            <span>Chỉ số & Điểm Trọng số</span>
          </button>
          <button
            type="button"
            className={`offer-tab-btn ${activeTab === 'compare' ? 'is-active' : ''}`}
            onClick={() => {
              if (!comparisonMatrix) handleLoadComparison();
              else setActiveTab('compare');
            }}
          >
            <Scale size={16} />
            <span>So sánh Đa Offer</span>
          </button>
          <button
            type="button"
            className={`offer-tab-btn ${activeTab === 'negotiate' ? 'is-active' : ''}`}
            onClick={() => {
              if (!counterScript) handleGenerateCounterOffer();
              else setActiveTab('negotiate');
            }}
          >
            <Sparkles size={16} />
            <span>AI Đàm phán Thù lao</span>
          </button>
        </div>

        {activeTab === 'breakdown' && (
          <div className="offer-tab-content">
            <div className="tc-hero-card">
              <div className="tc-hero-label">TỔNG THU NHẬP NIÊN ĐỘ (ANNUAL TOTAL COMPENSATION)</div>
              <div className="tc-hero-amount">
                {evaluation ? formatMoney(evaluation.compensation.annualTotalCompensation) : '—'}
                <span className="tc-hero-period">/ năm</span>
              </div>
              {evaluation && (
                <div className="tc-hero-sub">
                  Thu nhập hàng tháng (Gross): <strong>{formatMoney(evaluation.breakdownSummary.monthlyGross)}</strong> · 
                  Bảo đảm cố định: <strong>{formatMoney(evaluation.breakdownSummary.annualGuaranteed)}</strong>
                </div>
              )}
            </div>

            <div className="offer-inputs-grid">
              <div className="offer-field-card">
                <label className="offer-field-label">Lương cơ bản hàng tháng</label>
                <div className="offer-input-with-unit">
                  <input
                    type="number"
                    value={baseSalary}
                    onChange={e => setBaseSalary(Number(e.target.value))}
                    step={1000000}
                    className="offer-number-input"
                  />
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value as 'VND' | 'USD')}
                    className="offer-currency-select"
                  >
                    <option value="VND">VND</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              <div className="offer-field-card">
                <label className="offer-field-label">Tháng lương thưởng (Tháng 13 / KPI)</label>
                <div className="offer-input-with-unit">
                  <input
                    type="number"
                    value={bonusMonths}
                    onChange={e => setBonusMonths(Number(e.target.value))}
                    step={0.5}
                    min={0}
                    max={12}
                    className="offer-number-input"
                  />
                  <span className="offer-unit-tag">tháng</span>
                </div>
              </div>

              <div className="offer-field-card">
                <label className="offer-field-label">Phụ cấp hàng tháng (Ăn trưa, xăng xe, máy tính)</label>
                <div className="offer-input-with-unit">
                  <input
                    type="number"
                    value={allowanceMonthly}
                    onChange={e => setAllowanceMonthly(Number(e.target.value))}
                    step={500000}
                    className="offer-number-input"
                  />
                  <span className="offer-unit-tag">{currency}</span>
                </div>
              </div>

              <div className="offer-field-card">
                <label className="offer-field-label">Thưởng tiền mặt hàng năm (Cash Bonus)</label>
                <div className="offer-input-with-unit">
                  <input
                    type="number"
                    value={annualBonusCash}
                    onChange={e => setAnnualBonusCash(Number(e.target.value))}
                    step={5000000}
                    className="offer-number-input"
                  />
                  <span className="offer-unit-tag">{currency}</span>
                </div>
              </div>

              <div className="offer-field-card">
                <label className="offer-field-label">Cổ phiếu / ESOP quy đổi hàng năm</label>
                <div className="offer-input-with-unit">
                  <input
                    type="number"
                    value={equityAnnual}
                    onChange={e => setEquityAnnual(Number(e.target.value))}
                    step={10000000}
                    className="offer-number-input"
                  />
                  <span className="offer-unit-tag">{currency}</span>
                </div>
              </div>
            </div>

            {evaluation && (
              <div className="tc-bar-section">
                <div className="tc-bar-header">
                  <span>Cơ cấu thu nhập hàng năm</span>
                  <span>
                    Bảo đảm {Math.round((evaluation.breakdownSummary.annualGuaranteed / evaluation.breakdownSummary.annualTotal) * 100)}% · 
                    Biến đổi {Math.round((evaluation.breakdownSummary.annualVariable / evaluation.breakdownSummary.annualTotal) * 100)}%
                  </span>
                </div>
                <div className="tc-progress-bar">
                  <div
                    className="tc-bar-guaranteed"
                    style={{
                      width: `${(evaluation.breakdownSummary.annualGuaranteed / evaluation.breakdownSummary.annualTotal) * 100}%`
                    }}
                  />
                  <div
                    className="tc-bar-variable"
                    style={{
                      width: `${(evaluation.breakdownSummary.annualVariable / evaluation.breakdownSummary.annualTotal) * 100}%`
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'factors' && (
          <div className="offer-tab-content">
            <p className="factors-intro">
              Đánh giá các khía cạnh phi tài chính (thang điểm 1 - 10) để tính điểm số trọng số cá nhân hóa.
            </p>

            <div className="factors-grid">
              <div className="factor-slider-row">
                <div className="factor-label-box">
                  <span className="factor-title">Cân bằng cuộc sống (Work-Life Balance)</span>
                  <span className="factor-desc">Thời gian làm việc, mức độ tăng ca, sự linh hoạt giờ giấc</span>
                </div>
                <div className="factor-control-box">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={workLifeBalance}
                    onChange={e => setWorkLifeBalance(Number(e.target.value))}
                    className="factor-slider"
                  />
                  <span className="factor-val-badge">{workLifeBalance}/10</span>
                </div>
              </div>

              <div className="factor-slider-row">
                <div className="factor-label-box">
                  <span className="factor-title">Cơ hội thăng tiến (Career Growth)</span>
                  <span className="factor-desc">Dự án lớn, công nghệ mới, lộ trình lên Senior/Lead/Manager</span>
                </div>
                <div className="factor-control-box">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={careerGrowth}
                    onChange={e => setCareerGrowth(Number(e.target.value))}
                    className="factor-slider"
                  />
                  <span className="factor-val-badge">{careerGrowth}/10</span>
                </div>
              </div>

              <div className="factor-slider-row">
                <div className="factor-label-box">
                  <span className="factor-title">Văn hóa & Đội ngũ (Team & Culture)</span>
                  <span className="factor-desc">Đồng nghiệp tài năng, môi trường minh bạch, gắn kết</span>
                </div>
                <div className="factor-control-box">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={teamAndCulture}
                    onChange={e => setTeamAndCulture(Number(e.target.value))}
                    className="factor-slider"
                  />
                  <span className="factor-val-badge">{teamAndCulture}/10</span>
                </div>
              </div>

              <div className="factor-slider-row">
                <div className="factor-label-box">
                  <span className="factor-title">Linh hoạt làm việc từ xa (Remote / Hybrid)</span>
                  <span className="factor-desc">Số ngày làm việc tại nhà, hỗ trợ thiết bị, tiết kiệm di chuyển</span>
                </div>
                <div className="factor-control-box">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={remoteFlexibility}
                    onChange={e => setRemoteFlexibility(Number(e.target.value))}
                    className="factor-slider"
                  />
                  <span className="factor-val-badge">{remoteFlexibility}/10</span>
                </div>
              </div>

              <div className="factor-slider-row">
                <div className="factor-label-box">
                  <span className="factor-title">Uy tín & Sự ổn định của Công ty</span>
                  <span className="factor-desc">Vị thế tài chính vững chắc, thương hiệu tốt trên thị trường</span>
                </div>
                <div className="factor-control-box">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={companyStability}
                    onChange={e => setCompanyStability(Number(e.target.value))}
                    className="factor-slider"
                  />
                  <span className="factor-val-badge">{companyStability}/10</span>
                </div>
              </div>

              <div className="factor-slider-row">
                <div className="factor-label-box">
                  <span className="factor-title">Phúc lợi y tế & Bảo hiểm (Health & Benefits)</span>
                  <span className="factor-desc">Bảo hiểm sức khỏe cao cấp, khám sức khỏe, trợ cấp học tập</span>
                </div>
                <div className="factor-control-box">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={healthAndBenefits}
                    onChange={e => setHealthAndBenefits(Number(e.target.value))}
                    className="factor-slider"
                  />
                  <span className="factor-val-badge">{healthAndBenefits}/10</span>
                </div>
              </div>
            </div>

            {evaluation && (
              <div className="evaluation-pros-cons-grid">
                <div className="pros-column">
                  <h4 className="pros-title">
                    <CheckCircle2 size={16} /> Điểm mạnh nổi bật (Pros)
                  </h4>
                  <ul>
                    {evaluation.pros.map((p, idx) => (
                      <li key={`pro-${idx}`}>{p}</li>
                    ))}
                  </ul>
                </div>
                <div className="cons-column">
                  <h4 className="cons-title">
                    <AlertTriangle size={16} /> Điểm cần cân nhắc (Cons)
                  </h4>
                  <ul>
                    {evaluation.cons.map((c, idx) => (
                      <li key={`con-${idx}`}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'compare' && (
          <div className="offer-tab-content">
            {comparisonMatrix ? (
              <div className="comparison-container">
                <div className="comparison-summary-banner">
                  <Scale size={20} className="summary-icon" />
                  <p className="summary-text">{comparisonMatrix.recommendationSummary}</p>
                </div>

                <div className="matrix-table-wrapper">
                  <table className="matrix-table">
                    <thead>
                      <tr>
                        <th>Tiêu chí</th>
                        {comparisonMatrix.rankedOffers.map(({ offer, rank }) => (
                          <th key={`head-${offer.company}`} className={rank === 1 ? 'matrix-winner-col' : ''}>
                            <div className="col-header-rank">
                              {rank === 1 ? '🏆 Quán quân' : `Hạng ${rank}`}
                            </div>
                            <div className="col-header-company">{offer.company}</div>
                            <div className="col-header-pos">{offer.position}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="metric-label">Điểm tổng thể</td>
                        {comparisonMatrix.rankedOffers.map(({ offer }) => (
                          <td key={`score-${offer.company}`} className="metric-value">
                            <span className="matrix-score-pill">{offer.weightedScore}/100</span>
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="metric-label">Tổng thu nhập (TC)</td>
                        {comparisonMatrix.rankedOffers.map(({ offer }) => (
                          <td key={`tc-${offer.company}`} className="metric-value">
                            <strong>{formatMoney(offer.compensation.annualTotalCompensation)}</strong>
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="metric-label">Lương cơ bản / tháng</td>
                        {comparisonMatrix.rankedOffers.map(({ offer }) => (
                          <td key={`base-${offer.company}`} className="metric-value">
                            {formatMoney(offer.compensation.baseSalaryMonthly)}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="metric-label">Cân bằng cuộc sống (WLB)</td>
                        {comparisonMatrix.rankedOffers.map(({ offer }) => (
                          <td key={`wlb-${offer.company}`} className="metric-value">
                            {offer.workplaceFactors.workLifeBalance}/10
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="metric-label">Cơ hội thăng tiến</td>
                        {comparisonMatrix.rankedOffers.map(({ offer }) => (
                          <td key={`growth-${offer.company}`} className="metric-value">
                            {offer.workplaceFactors.careerGrowth}/10
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="metric-label">Làm việc từ xa (Remote)</td>
                        {comparisonMatrix.rankedOffers.map(({ offer }) => (
                          <td key={`rem-${offer.company}`} className="metric-value">
                            {offer.workplaceFactors.remoteFlexibility}/10
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="comparison-loading-box">
                <Button kind="primary" onClick={handleLoadComparison} disabled={busy}>
                  <Scale size={16} />
                  <span>Kích hoạt Ma trận so sánh đa Offer</span>
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'negotiate' && (
          <div className="offer-tab-content">
            <div className="negotiate-controls-card">
              <div className="negotiate-inputs-row">
                <div className="negotiate-field">
                  <label className="negotiate-label">Mức lương cơ bản kỳ vọng đàm phán</label>
                  <div className="offer-input-with-unit">
                    <input
                      type="number"
                      value={targetSalary}
                      onChange={e => setTargetSalary(Number(e.target.value))}
                      step={1000000}
                      className="offer-number-input"
                    />
                    <span className="offer-unit-tag">{currency}</span>
                  </div>
                </div>

                <div className="negotiate-field">
                  <label className="negotiate-label">Phong cách đàm phán</label>
                  <select
                    value={tone}
                    onChange={e => setTone(e.target.value as NegotiationTone)}
                    className="negotiate-select"
                  >
                    <option value="polite_confident">Lịch thiệp & Tự tin (Khuyên dùng)</option>
                    <option value="collaborative">Hợp tác & Cởi mở</option>
                    <option value="firm_competitive">Cạnh tranh có đòn bẩy</option>
                  </select>
                </div>

                <div className="negotiate-btn-box">
                  <Button kind="primary" onClick={handleGenerateCounterOffer} disabled={busy}>
                    <Sparkles size={16} />
                    <span>Tạo kịch bản mới</span>
                  </Button>
                </div>
              </div>
            </div>

            {counterScript && (
              <div className="negotiate-results-container">
                <div className="script-box">
                  <div className="script-header">
                    <h4>
                      <SendHorizontal size={16} /> Thư đàm phán gửi qua Email
                    </h4>
                    <Button
                      kind="ghost"
                      onClick={() => handleCopyScript(counterScript.emailBody)}
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      <span>{copied ? 'Đã sao chép' : 'Sao chép thư'}</span>
                    </Button>
                  </div>
                  <div className="email-subject-line">
                    <strong>Tiêu đề:</strong> {counterScript.emailSubject}
                  </div>
                  <pre className="script-body-text">{counterScript.emailBody}</pre>
                </div>

                <div className="script-box call-script-box">
                  <div className="script-header">
                    <h4>
                      <Briefcase size={16} /> Kịch bản gọi điện thoại trao đổi nhanh (60 giây)
                    </h4>
                  </div>
                  <p className="call-script-text">{counterScript.shortScriptForCall}</p>
                </div>

                <div className="negotiate-guidance-grid">
                  <div className="guidance-card">
                    <h4>Luận điểm thuyết phục (Talking Points)</h4>
                    <ul>
                      {counterScript.talkingPoints.map((pt, i) => (
                        <li key={`tp-${i}`}>{pt}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="guidance-card">
                    <h4>Điểm dừng an toàn (Walk-away advice)</h4>
                    <p className="walk-away-text">{counterScript.walkAwayAdvice}</p>
                  </div>
                </div>
              </div>
            )}
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
