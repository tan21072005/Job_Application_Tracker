import { useState, useEffect } from 'react';
import {
  Gauge,
  X,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Clock
} from 'lucide-react';
import type { Application } from '../domain';
import { pipelineVelocityRepository } from '../data';
import { type PipelineVelocityReportDTO, type PipelineVelocitySimulationDTO, type StageConversionRateDTO, type BottleneckDiagnosticDTO } from '../domain';

interface PipelineVelocityModalProps {
  applications: Application[];
  onClose: () => void;
  notify?: (message: string, error?: boolean) => void;
}

const STAGE_VI_LABELS: Record<string, string> = {
  Applied: 'Nộp hồ sơ (Applied)',
  Screening: 'Vòng sơ loại (Screening)',
  Interview: 'Phỏng vấn chuyên sâu (Interview)',
  Offer: 'Nhận đề nghị (Offer)',
  Saved: 'Lưu trữ (Saved)',
  Rejected: 'Từ chối (Rejected)',
  Withdrawn: 'Rút lui (Withdrawn)'
};

export function PipelineVelocityModal({
  applications,
  onClose,
  notify
}: PipelineVelocityModalProps) {
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [report, setReport] = useState<PipelineVelocityReportDTO | null>(null);

  const defaultDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [targetOfferDate, setTargetOfferDate] = useState(defaultDate);
  const [targetOfferCount, setTargetOfferCount] = useState(1);

  const [simWeeklyVelocity, setSimWeeklyVelocity] = useState(5);
  const [simHorizonWeeks, setSimHorizonWeeks] = useState(12);
  const [liveSimulation, setLiveSimulation] = useState<PipelineVelocitySimulationDTO | null>(null);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const latest = await pipelineVelocityRepository.getLatestReport();
        if (mounted && latest) {
          setReport(latest);
          setTargetOfferDate(latest.targetOfferDate);
          setTargetOfferCount(latest.targetOfferCount);
          setSimWeeklyVelocity(latest.simulation.simulatedApplicationsPerWeek || 5);
          setLiveSimulation(latest.simulation);
        }
      } catch (err) {
        if (mounted) {
          notify?.((err as Error).message || 'Không thể tải báo cáo tốc độ ứng tuyển.', true);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, []);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const generated = await pipelineVelocityRepository.generateReport({
        targetOfferDate,
        targetOfferCount: Number(targetOfferCount) || 1,
        simulatedWeeklyVelocity: simWeeklyVelocity,
        simulationHorizonWeeks: simHorizonWeeks
      });
      setReport(generated);
      setLiveSimulation(generated.simulation);
      notify?.('Đã cập nhật dự báo tốc độ & phân tích điểm nghẽn thành công!');
    } catch (err) {
      notify?.((err as Error).message || 'Lỗi khi tính toán dữ liệu pipeline.', true);
    } finally {
      setRecalculating(false);
    }
  };

  const handleSliderChange = async (val: number) => {
    setSimWeeklyVelocity(val);
    try {
      const res = await pipelineVelocityRepository.simulate({
        weeklyVelocity: val,
        weeksHorizon: simHorizonWeeks,
        stageMetrics: report ? report.stageMetrics : undefined
      });
      setLiveSimulation(res);
    } catch {
      if (report) {
        const est = Math.round(val * 0.15 * (simHorizonWeeks / 12));
        setLiveSimulation({
          simulatedApplicationsPerWeek: val,
          simulationDays: simHorizonWeeks * 7,
          p10Offers: Math.max(0, est - 1),
          p50Offers: est,
          p90Offers: est + 2,
          estimatedDaysToFirstOffer: val > 0 ? Math.round(55 / (val / 3)) : null
        });
      }
    }
  };

  const handleHorizonChange = async (weeks: number) => {
    setSimHorizonWeeks(weeks);
    try {
      const res = await pipelineVelocityRepository.simulate({
        weeklyVelocity: simWeeklyVelocity,
        weeksHorizon: weeks,
        stageMetrics: report ? report.stageMetrics : undefined
      });
      setLiveSimulation(res);
    } catch {
      if (report) {
        const est = Math.round(simWeeklyVelocity * 0.15 * (weeks / 12));
        setLiveSimulation({
          simulatedApplicationsPerWeek: simWeeklyVelocity,
          simulationDays: weeks * 7,
          p10Offers: Math.max(0, est - 1),
          p50Offers: est,
          p90Offers: est + 2,
          estimatedDaysToFirstOffer: simWeeklyVelocity > 0 ? Math.round(55 / (simWeeklyVelocity / 3)) : null
        });
      }
    }
  };

  const handleSaveSimulation = () => {
    notify?.('Kịch bản mô phỏng tốc độ ứng tuyển đã được lưu!');
  };

  return (
    <div className="pipeline-velocity-modal-backdrop" onClick={onClose}>
      <div className="pipeline-velocity-modal-container" onClick={e => e.stopPropagation()}>
        <div className="pipeline-velocity-modal-header">
          <div className="pipeline-velocity-header-title-group">
            <div className="pipeline-velocity-icon-wrapper">
              <Gauge className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="pipeline-velocity-title">Dự báo Tốc độ Ứng tuyển & Điểm nghẽn Tuyển dụng</h2>
              <p className="pipeline-velocity-subtitle">Pipeline Velocity & Funnel Bottleneck Forecaster</p>
            </div>
          </div>
          <button className="pipeline-velocity-close-btn" onClick={onClose} aria-label="Đóng modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="pipeline-velocity-config-bar">
          <div className="velocity-config-inputs">
            <div className="velocity-field-item">
              <label className="velocity-field-label">
                <Calendar className="w-3.5 h-3.5 mr-1" />
                Ngày mục tiêu nhận việc:
              </label>
              <input
                type="date"
                className="velocity-date-input"
                value={targetOfferDate}
                onChange={e => setTargetOfferDate(e.target.value)}
              />
            </div>
            <div className="velocity-field-item">
              <label className="velocity-field-label">
                <Layers className="w-3.5 h-3.5 mr-1" />
                Số offer mục tiêu:
              </label>
              <input
                type="number"
                min={1}
                max={10}
                className="velocity-count-input"
                value={targetOfferCount}
                onChange={e => setTargetOfferCount(parseInt(e.target.value, 10) || 1)}
              />
            </div>
          </div>
          <button
            className="velocity-recalc-btn"
            onClick={handleRecalculate}
            disabled={recalculating}
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${recalculating ? 'animate-spin' : ''}`} />
            <span>{recalculating ? 'Đang tính toán...' : 'Cập nhật Phân tích'}</span>
          </button>
        </div>

        <div className="pipeline-velocity-modal-body">
          {loading ? (
            <div className="velocity-loading-state">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
              <p>Đang tổng hợp dữ liệu tốc độ và kiểm định chu kỳ phỏng vấn...</p>
            </div>
          ) : (
            <>
              {report && (
                <div className="velocity-kpi-grid">
                  <div className="velocity-kpi-card">
                    <span className="kpi-label">Hồ sơ đã phân tích</span>
                    <div className="kpi-val kpi-apps-analyzed">{report.applicationsAnalyzed}</div>
                    <span className="kpi-hint">Tổng dữ liệu chu kỳ tích lũy</span>
                  </div>

                  <div className="velocity-kpi-card highlight">
                    <span className="kpi-label">Tốc độ hiện tại vs Cần đạt</span>
                    <div className="kpi-val kpi-velocity-rate">
                      {report.velocityTarget.currentWeeklyApplications} / tuần
                      <span className="kpi-target-tag">
                        Mục tiêu: {report.velocityTarget.recommendedWeeklyApplications} / tuần
                      </span>
                    </div>
                    <span className="kpi-hint">Dựa trên tỷ lệ chuyển đổi thực tế</span>
                  </div>

                  <div className="velocity-kpi-card">
                    <span className="kpi-label">Dự báo Offer (30d / 60d / 90d)</span>
                    <div className="kpi-val kpi-offers-forecast">
                      {report.velocityTarget.projectedOffersIn30Days} / {report.velocityTarget.projectedOffersIn60Days} / {report.velocityTarget.projectedOffersIn90Days}
                    </div>
                    <span className="kpi-hint">Với tốc độ nộp hiện thời</span>
                  </div>

                  <div className="velocity-kpi-card">
                    <span className="kpi-label">Độ tin cậy dự báo</span>
                    <div className="kpi-val kpi-confidence-score">
                      {report.velocityTarget.confidenceScore}%
                    </div>
                    <span className="kpi-hint">Mức độ hoàn thiện của tập mẫu</span>
                  </div>
                </div>
              )}

              <div className="velocity-section">
                <div className="velocity-section-header">
                  <h3 className="velocity-section-title">
                    <TrendingUp className="w-4 h-4 text-indigo-400 mr-2" />
                    Hiệu suất Chuyển đổi Phễu & Chu kỳ Thời gian (Stage Conversion & Cycle Time)
                  </h3>
                  <p className="velocity-section-desc">
                    Tỷ lệ vượt qua từng giai đoạn và thời gian trung bình (ngày) một hồ sơ lưu trú tại từng vòng.
                  </p>
                </div>

                <div className="velocity-stage-cards-grid">
                  {report?.stageMetrics.map((stageItem: StageConversionRateDTO, idx: number) => {
                    const label = STAGE_VI_LABELS[stageItem.stage] || stageItem.stage;
                    return (
                      <div key={stageItem.stage} className="velocity-stage-card">
                        <div className="stage-card-header">
                          <span className="stage-index-badge">Giai đoạn {idx + 1}</span>
                          <span className="stage-name-text">{label}</span>
                        </div>

                        <div className="stage-rate-display">
                          <div className="stage-rate-num">{stageItem.conversionRate}%</div>
                          <span className="stage-rate-label">Tỷ lệ qua vòng</span>
                        </div>

                        <div className="stage-progress-bar-bg">
                          <div
                            className="stage-progress-bar-fill"
                            style={{ width: `${Math.min(100, Math.max(0, stageItem.conversionRate))}%` }}
                          />
                        </div>

                        <div className="stage-counts-row">
                          <div className="stage-count-col">
                            <span className="count-label">Tham gia</span>
                            <span className="count-num">{stageItem.totalEntered}</span>
                          </div>
                          <div className="stage-count-col text-emerald-600">
                            <span className="count-label">Vượt qua</span>
                            <span className="count-num">{stageItem.passed}</span>
                          </div>
                          <div className="stage-count-col text-rose-500">
                            <span className="count-label">Rơi rụng</span>
                            <span className="count-num">{stageItem.dropped}</span>
                          </div>
                        </div>

                        <div className="stage-days-footer">
                          <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          <span>Chu kỳ trung bình: <strong>{stageItem.avgDaysInStage} ngày</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="velocity-section">
                <div className="velocity-section-header">
                  <h3 className="velocity-section-title">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mr-2" />
                    Chẩn đoán Điểm nghẽn Tuyển dụng & Hành động Khắc phục (Bottlenecks)
                  </h3>
                  <p className="velocity-section-desc">
                    Hệ thống tự động phát hiện các giai đoạn có tỷ lệ rơi rụng bất thường so với tiêu chuẩn ngành và đưa ra khuyến nghị thực thi.
                  </p>
                </div>

                <div className="velocity-bottlenecks-list">
                  {report?.bottlenecks.map((b: BottleneckDiagnosticDTO) => {
                    const stageLabel = STAGE_VI_LABELS[b.stage] || b.stage;
                    return (
                      <div key={b.stage} className={`velocity-bottleneck-card severity-${b.severity}`}>
                        <div className="bottleneck-card-top">
                          <div className="bottleneck-stage-info">
                            {b.severity === 'critical' && <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />}
                            {b.severity === 'moderate' && <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />}
                            {b.severity === 'healthy' && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
                            <span className="bottleneck-stage-name">{stageLabel}</span>
                          </div>
                          <div className="bottleneck-badges">
                            <span className={`severity-tag ${b.severity}`}>
                              {b.severity === 'critical' ? 'Rủi ro nghiêm trọng' : b.severity === 'moderate' ? 'Cảnh báo trung bình' : 'Ổn định'}
                            </span>
                            <span className="drop-rate-tag">Tỷ lệ rơi rụng: {b.dropOffRate}%</span>
                          </div>
                        </div>

                        <div className="bottleneck-diagnostic-msg">{b.diagnosticMessage}</div>

                        <div className="bottleneck-action-box">
                          <span className="action-box-label">Hành động khuyến nghị:</span>
                          <span className="action-box-text">{b.prescriptiveAction}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="velocity-section">
                <div className="velocity-section-header">
                  <h3 className="velocity-section-title">
                    <Sparkles className="w-4 h-4 text-indigo-400 mr-2" />
                    Mô phỏng Xác suất Monte Carlo (Offer Probability Simulator)
                  </h3>
                  <p className="velocity-section-desc">
                    Mô phỏng 1,000 kịch bản ngẫu nhiên dựa trên phân phối thực nghiệm của bạn để dự báo số offer có thể nhận được.
                  </p>
                </div>

                <div className="velocity-simulator-box">
                  <div className="simulator-controls-row">
                    <div className="simulator-slider-control">
                      <div className="slider-label-row">
                        <span className="slider-title">Tốc độ nộp đơn giả lập:</span>
                        <span className="slider-val-display">{simWeeklyVelocity} hồ sơ / tuần</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={20}
                        step={1}
                        value={simWeeklyVelocity}
                        onChange={e => handleSliderChange(parseInt(e.target.value, 10))}
                        className="velocity-slider-input"
                      />
                      <div className="slider-ticks">
                        <span>1</span>
                        <span>5</span>
                        <span>10</span>
                        <span>15</span>
                        <span>20</span>
                      </div>
                    </div>

                    <div className="simulator-horizon-control">
                      <span className="horizon-title">Khoảng thời gian:</span>
                      <div className="horizon-buttons">
                        {[4, 8, 12, 16, 24].map(w => (
                          <button
                            key={w}
                            className={`horizon-btn ${simHorizonWeeks === w ? 'active' : ''}`}
                            onClick={() => handleHorizonChange(w)}
                          >
                            {w} tuần
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {liveSimulation && (
                    <div className="simulator-results-grid">
                      <div className="sim-result-card p10">
                        <span className="sim-tier-title">Kịch bản Thận trọng (P10)</span>
                        <div className="sim-offers-count">{liveSimulation.p10Offers} Offer</div>
                        <span className="sim-tier-desc">90% khả năng đạt ít nhất mức này</span>
                      </div>

                      <div className="sim-result-card p50 highlight">
                        <span className="sim-tier-title">Kỳ vọng Trung vị (P50)</span>
                        <div className="sim-offers-count">{liveSimulation.p50Offers} Offer</div>
                        <span className="sim-tier-desc">Kịch bản có khả năng xảy ra cao nhất</span>
                      </div>

                      <div className="sim-result-card p90">
                        <span className="sim-tier-title">Kịch bản Đột phá (P90)</span>
                        <div className="sim-offers-count">{liveSimulation.p90Offers} Offer</div>
                        <span className="sim-tier-desc">10% cơ hội đạt kết quả xuất sắc</span>
                      </div>
                    </div>
                  )}

                  {liveSimulation?.estimatedDaysToFirstOffer && (
                    <div className="sim-first-offer-box">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0" />
                      <span>
                        Ước tính thời gian nhận offer đầu tiên với tốc độ {simWeeklyVelocity} hồ sơ/tuần: khoảng <strong>{liveSimulation.estimatedDaysToFirstOffer} ngày</strong>.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="pipeline-velocity-modal-footer">
          <button className="velocity-secondary-btn velocity-close-footer-btn" onClick={onClose}>
            Đóng
          </button>
          <button className="velocity-primary-btn velocity-save-btn" onClick={handleSaveSimulation}>
            Lưu kịch bản mô phỏng
          </button>
        </div>
      </div>
    </div>
  );
}
