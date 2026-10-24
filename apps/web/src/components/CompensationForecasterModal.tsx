import React, { useState, useEffect, useMemo } from 'react';
import {
  CircleDollarSign,
  TrendingUp,
  Sparkles,
  Copy,
  Check,
  ShieldCheck,
  X,
  Calculator,
  Layers,
  AlertCircle,
  Bookmark
} from 'lucide-react';
import {
  type SeniorityLevel,
  type Currency,
  type EquityType,
  type CompensationPackageDTO,
  type CompensationForecastDTO,
  type NegotiationLeveragePointDTO,
  computeVestingSchedule,
  calculateNetTakeHomeVnd,
  forecastCompensationScenarios,
  evaluateMarketBenchmark,
  deriveNegotiationLeveragePoints
} from '../domain.ts';
import { compensationRepository } from '../data.ts';

interface CompensationForecasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCompany?: string;
  initialRole?: string;
}

export const CompensationForecasterModal: React.FC<CompensationForecasterModalProps> = ({
  isOpen,
  onClose,
  initialCompany,
  initialRole
}) => {
  const [company, setCompany] = useState(initialCompany || 'Shopee Vietnam');
  const [role, setRole] = useState(initialRole || 'Senior Frontend Engineer');
  const [level, setLevel] = useState<SeniorityLevel>('senior');
  const [currency, setCurrency] = useState<Currency>('VND');

  const [baseSalaryMonthly, setBaseSalaryMonthly] = useState<number>(55000000);
  const [hasMonth13, setHasMonth13] = useState<boolean>(true);
  const [performanceBonusAnnual, setPerformanceBonusAnnual] = useState<number>(55000000);
  const [signingBonus, setSigningBonus] = useState<number>(0);

  const [equityType, setEquityType] = useState<EquityType>('esop');
  const [totalShares, setTotalShares] = useState<number>(20000);
  const [strikePrice, setStrikePrice] = useState<number>(20000);
  const [currentFairMarketValue, setCurrentFairMarketValue] = useState<number>(60000);
  const [vestingYears, setVestingYears] = useState<number>(4);
  const [cliffMonths, setCliffMonths] = useState<number>(12);

  const [activeScenario, setActiveScenario] = useState<'conservative' | 'baseline' | 'optimistic'>('baseline');
  const [copiedScriptIndex, setCopiedScriptIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (initialCompany) setCompany(initialCompany);
    if (initialRole) setRole(initialRole);
  }, [initialCompany, initialRole]);

  const currentPackage: CompensationPackageDTO = useMemo(() => {
    return {
      baseSalaryMonthly,
      currency,
      hasMonth13,
      performanceBonusAnnual,
      signingBonus: signingBonus > 0 ? signingBonus : undefined,
      equityGrant: equityType !== 'none' && totalShares > 0 ? {
        type: equityType,
        totalShares,
        strikePrice,
        currentFairMarketValue,
        vestingYears,
        cliffMonths
      } : undefined
    };
  }, [
    baseSalaryMonthly,
    currency,
    hasMonth13,
    performanceBonusAnnual,
    signingBonus,
    equityType,
    totalShares,
    strikePrice,
    currentFairMarketValue,
    vestingYears,
    cliffMonths
  ]);

  const vestingSchedule = useMemo(() => {
    return computeVestingSchedule(currentPackage.equityGrant);
  }, [currentPackage.equityGrant]);

  const scenarios = useMemo(() => {
    return forecastCompensationScenarios(currentPackage);
  }, [currentPackage]);

  const candidateAnnualCash = useMemo(() => {
    const baseAnnual = baseSalaryMonthly * 12;
    const m13 = hasMonth13 ? baseSalaryMonthly : 0;
    return baseAnnual + m13 + performanceBonusAnnual;
  }, [baseSalaryMonthly, hasMonth13, performanceBonusAnnual]);

  const benchmark = useMemo(() => {
    return evaluateMarketBenchmark(role, level, candidateAnnualCash, currency);
  }, [role, level, candidateAnnualCash, currency]);

  const leveragePoints = useMemo(() => {
    return deriveNegotiationLeveragePoints(currentPackage, benchmark, company);
  }, [currentPackage, benchmark, company]);

  const monthlyNetVnd = useMemo(() => {
    if (currency === 'VND') {
      return calculateNetTakeHomeVnd(baseSalaryMonthly);
    }
    return Math.round(baseSalaryMonthly * 0.75);
  }, [currency, baseSalaryMonthly]);

  const scenarioData = scenarios[activeScenario];

  const handleCopyScript = (script: string, index: number) => {
    navigator.clipboard.writeText(script);
    setCopiedScriptIndex(index);
    setTimeout(() => setCopiedScriptIndex(null), 2500);
  };

  const handleSaveForecast = async () => {
    try {
      setIsSaving(true);
      await compensationRepository.create({
        company,
        role,
        level,
        package: currentPackage
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const fmt = (num: number) => num.toLocaleString('en-US');

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content compensation-forecaster-modal">
        <div className="modal-header">
          <div className="modal-header-info">
            <div className="simulation-modal-badge">
              <CircleDollarSign size={14} />
              <span>JobTrack Intelligence · Mô hình tài chính 4 năm</span>
            </div>
            <h2>Dự báo Thu nhập & Cổ phần ESOP / RSU</h2>
            <p className="modal-subtitle">
              Phân rã dòng tiền thu nhập thực tế, lộ trình tích lũy cổ phần theo năm, khấu trừ thuế TNCN và đòn bẩy đàm phán dựa trên đối chuẩn thị trường.
            </p>
          </div>
          <button className="modal-close-btn comp-close-btn" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body compensation-modal-body">
          <div className="compensation-layout-split">
            <div className="compensation-input-panel">
              <h3 className="section-title">
                <Calculator size={16} />
                <span>Thông số gói đãi ngộ</span>
              </h3>

              <div className="form-group-grid">
                <div className="form-group">
                  <label>Công ty tuyển dụng</label>
                  <input
                    type="text"
                    className="comp-input-company"
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                    placeholder="VD: Shopee Vietnam"
                  />
                </div>
                <div className="form-group">
                  <label>Vị trí công việc</label>
                  <input
                    type="text"
                    className="comp-input-role"
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    placeholder="VD: Senior Frontend Engineer"
                  />
                </div>
              </div>

              <div className="form-group-grid">
                <div className="form-group">
                  <label>Cấp bậc (Seniority)</label>
                  <select
                    className="comp-input-level"
                    value={level}
                    onChange={e => setLevel(e.target.value as SeniorityLevel)}
                  >
                    <option value="mid">Mid-level (Kỹ sư 2-4 năm)</option>
                    <option value="senior">Senior (Kỹ sư thâm niên 4-7 năm)</option>
                    <option value="lead">Lead / Staff (Trưởng nhóm / Kiến trúc)</option>
                    <option value="staff">Staff Engineer (Chuyên gia hệ thống)</option>
                    <option value="principal">Principal Engineer (Kiến trúc trưởng)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Đơn vị tiền tệ</label>
                  <select
                    className="comp-input-currency"
                    value={currency}
                    onChange={e => setCurrency(e.target.value as Currency)}
                  >
                    <option value="VND">VND (Việt Nam Đồng)</option>
                    <option value="USD">USD (Đô la Mỹ)</option>
                  </select>
                </div>
              </div>

              <div className="form-group comp-salary-slider-group">
                <div className="label-with-value">
                  <label>Lương cơ bản hàng tháng (Gross)</label>
                  <span className="value-highlight">{fmt(baseSalaryMonthly)} {currency}</span>
                </div>
                <input
                  type="range"
                  className="comp-input-base-salary comp-slider"
                  min={10000000}
                  max={250000000}
                  step={1000000}
                  value={baseSalaryMonthly}
                  onChange={e => setBaseSalaryMonthly(Number(e.target.value))}
                />
              </div>

              <div className="form-group-grid">
                <div className="form-group">
                  <label className="checkbox-label comp-month13-toggle">
                    <input
                      type="checkbox"
                      className="comp-input-month13"
                      checked={hasMonth13}
                      onChange={e => setHasMonth13(e.target.checked)}
                    />
                    <span>Cam kết thưởng tháng 13</span>
                  </label>
                </div>
                <div className="form-group">
                  <label>Thưởng hiệu suất năm (KPI)</label>
                  <input
                    type="number"
                    className="comp-input-perf-bonus"
                    value={performanceBonusAnnual}
                    onChange={e => setPerformanceBonusAnnual(Number(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="equity-config-box">
                <div className="equity-box-header">
                  <Layers size={15} />
                  <h4>Chính sách Cổ phần thưởng & Quyền chọn (ESOP / RSU)</h4>
                </div>

                <div className="form-group-grid">
                  <div className="form-group">
                    <label>Loại cổ phần</label>
                    <select
                      className="comp-input-equity-type"
                      value={equityType}
                      onChange={e => setEquityType(e.target.value as EquityType)}
                    >
                      <option value="esop">ESOP (Quyền chọn mua cổ phần)</option>
                      <option value="rsu">RSU (Cổ phần thưởng trực tiếp)</option>
                      <option value="none">Không có cổ phần thưởng</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Tổng số cổ phần cấp (4 năm)</label>
                    <input
                      type="number"
                      className="comp-input-total-shares"
                      value={totalShares}
                      disabled={equityType === 'none'}
                      onChange={e => setTotalShares(Number(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {equityType !== 'none' && (
                  <div className="form-group-grid">
                    <div className="form-group">
                      <label>Giá thực hiện (Strike Price / CP)</label>
                      <input
                        type="number"
                        className="comp-input-strike-price"
                        value={strikePrice}
                        onChange={e => setStrikePrice(Number(e.target.value) || 0)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Giá thị trường hiện tại (FMV / CP)</label>
                      <input
                        type="number"
                        className="comp-input-fmv"
                        value={currentFairMarketValue}
                        onChange={e => setCurrentFairMarketValue(Number(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="comp-net-takehome-card">
                <div className="net-takehome-header">
                  <ShieldCheck size={16} />
                  <span>Ước tính Thực nhận ròng (Net Take-Home)</span>
                </div>
                <div className="net-takehome-figures">
                  <div className="figure-block">
                    <span className="figure-label">Lương Gross hàng tháng:</span>
                    <span className="figure-val gross-val">{fmt(baseSalaryMonthly)} {currency}</span>
                  </div>
                  <div className="figure-block">
                    <span className="figure-label">Thực nhận hàng tháng (Net):</span>
                    <span className="figure-val net-val">{fmt(monthlyNetVnd)} {currency}</span>
                  </div>
                </div>
                <p className="tax-disclaimer">
                  Đã tính các mức khấu trừ bắt buộc: BHXH (8%), BHYT (1.5%), BHTN (1%), Giảm trừ gia cảnh bản thân 11.000.000đ và biểu thuế thu nhập cá nhân (PIT) lũy tiến 7 bậc.
                </p>
              </div>
            </div>

            <div className="compensation-analytics-panel">
              <div className="comp-benchmark-card">
                <div className="benchmark-header">
                  <div>
                    <h3 className="section-title">
                      <TrendingUp size={16} />
                      <span>Vị thế thị trường & Percentile</span>
                    </h3>
                    <div className="benchmark-subtitle">
                      So sánh mức thu nhập tiền mặt năm ({fmt(candidateAnnualCash)} {currency}) với dữ liệu thị trường ngành
                    </div>
                  </div>
                  <span className={`comp-percentile-badge ${benchmark.marketComparisonStatus}`}>
                    P{benchmark.candidatePercentile} · {benchmark.marketComparisonStatus === 'above_market' ? 'Top thị trường' : benchmark.marketComparisonStatus === 'at_market' ? 'Trung vị chuẩn' : 'Dưới trung vị'}
                  </span>
                </div>

                <div className="percentile-track-container">
                  <div className="percentile-track">
                    <div
                      className="percentile-indicator"
                      style={{ left: `${Math.min(98, Math.max(2, benchmark.candidatePercentile))}%` }}
                    >
                      <div className="indicator-pin" />
                      <span className="indicator-label">Bạn (P{benchmark.candidatePercentile})</span>
                    </div>
                  </div>
                  <div className="percentile-ticks">
                    <span>P25: {fmt(benchmark.p25AnnualCash)}</span>
                    <span className="tick-center">P50 (Median): {fmt(benchmark.p50AnnualCash)}</span>
                    <span>P75: {fmt(benchmark.p75AnnualCash)}</span>
                    <span>P90: {fmt(benchmark.p90AnnualCash)}</span>
                  </div>
                </div>
              </div>

              <div className="comp-scenarios-container">
                <div className="scenarios-bar-header">
                  <h3 className="section-title">
                    <Sparkles size={16} />
                    <span>Dự phóng tài chính 4 năm</span>
                  </h3>
                  <div className="comp-scenario-tabs">
                    <button
                      className={`comp-scenario-tab comp-tab-conservative ${activeScenario === 'conservative' ? 'active' : ''}`}
                      onClick={() => setActiveScenario('conservative')}
                    >
                      Bảo thủ (-5% ESOP)
                    </button>
                    <button
                      className={`comp-scenario-tab comp-tab-baseline ${activeScenario === 'baseline' ? 'active' : ''}`}
                      onClick={() => setActiveScenario('baseline')}
                    >
                      Tiêu chuẩn (+15% ESOP)
                    </button>
                    <button
                      className={`comp-scenario-tab comp-tab-optimistic ${activeScenario === 'optimistic' ? 'active' : ''}`}
                      onClick={() => setActiveScenario('optimistic')}
                    >
                      Tăng trưởng (+35% ESOP)
                    </button>
                  </div>
                </div>

                <div className="comp-4year-summary">
                  <div className="summary-metric">
                    <span className="metric-label">Tổng thu nhập Gross 4 năm</span>
                    <span className="metric-val comp-4year-gross">{fmt(scenarioData.fourYearTotalGross)} {currency}</span>
                  </div>
                  <div className="summary-metric">
                    <span className="metric-label">Ước tính Thực nhận Net 4 năm</span>
                    <span className="metric-val comp-4year-net">{fmt(scenarioData.fourYearTotalNet)} {currency}</span>
                  </div>
                  <div className="summary-metric">
                    <span className="metric-label">Giá trị Cổ phần đã Vest</span>
                    <span className="metric-val comp-4year-equity">{fmt(scenarioData.fourYearEquityTotal)} {currency}</span>
                  </div>
                </div>

                <div className="comp-timeline-grid">
                  {scenarioData.annualBreakdowns.map(row => (
                    <div key={row.year} className="comp-year-column">
                      <div className="year-header">Năm {row.year}</div>
                      <div className="year-body">
                        <div className="year-row">
                          <span className="label">Lương cơ bản:</span>
                          <span className="val">{fmt(row.baseSalaryAnnual)}</span>
                        </div>
                        <div className="year-row">
                          <span className="label">Tháng 13 & KPI:</span>
                          <span className="val">{fmt(row.month13Bonus + row.performanceBonus)}</span>
                        </div>
                        <div className="year-row">
                          <span className="label">Cổ phần Vest:</span>
                          <span className="val text-success">+{fmt(row.equityValue)}</span>
                        </div>
                        <div className="year-divider" />
                        <div className="year-row total-row">
                          <span className="label">Tổng Gross:</span>
                          <span className="val font-bold">{fmt(row.totalGrossCompensation)}</span>
                        </div>
                        <div className="year-row net-row">
                          <span className="label">Thực nhận Net:</span>
                          <span className="val text-net">{fmt(row.estimatedNetTakeHome)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="comp-leverage-section">
                <h3 className="section-title">
                  <Bookmark size={16} />
                  <span>Trợ lý Đàm phán & Kịch bản thương lượng (Negotiation Leverage)</span>
                </h3>

                {leveragePoints.length === 0 ? (
                  <div className="comp-no-leverage">
                    <Check size={18} />
                    <span>Gói đãi ngộ hiện tại đã ở vị thế rất tốt so với chuẩn thị trường P75+.</span>
                  </div>
                ) : (
                  <div className="leverage-cards-list">
                    {leveragePoints.map((point, idx) => (
                      <div key={idx} className="leverage-card">
                        <div className="leverage-card-top">
                          <div className="leverage-dimension-badge">
                            {point.dimension === 'base_salary' ? 'Lương cơ bản' : point.dimension === 'equity' ? 'Cổ phần ESOP' : point.dimension === 'cliff_period' ? 'Điều khoản Cliff' : 'Thưởng gia nhập'}
                          </div>
                          <span className="leverage-rationale">{point.leverageRationale}</span>
                        </div>

                        <div className="leverage-script-box">
                          <div className="script-text">"{point.suggestedScript}"</div>
                          <button
                            className="comp-copy-script-btn"
                            onClick={() => handleCopyScript(point.suggestedScript, idx)}
                            title="Sao chép kịch bản để gửi nhà tuyển dụng"
                          >
                            {copiedScriptIndex === idx ? (
                              <>
                                <Check size={14} />
                                <span>Đã sao chép</span>
                              </>
                            ) : (
                              <>
                                <Copy size={14} />
                                <span>Sao chép kịch bản</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer comp-modal-footer">
          <div className="footer-left">
            {saveSuccess && (
              <span className="save-status-msg text-success">
                <Check size={15} /> Đã lưu bản dự báo thu nhập thành công!
              </span>
            )}
          </div>
          <div className="footer-actions">
            <button className="btn-secondary comp-close-btn" onClick={onClose}>
              Đóng
            </button>
            <button
              className="btn-primary comp-save-forecast-btn"
              onClick={handleSaveForecast}
              disabled={isSaving}
            >
              <Bookmark size={15} />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu bản dự báo này'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
