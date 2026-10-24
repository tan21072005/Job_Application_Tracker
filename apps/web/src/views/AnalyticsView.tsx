import { useEffect, useState, useTransition } from 'react';
import {
  TrendingUp,
  Target,
  Clock,
  Briefcase,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Award,
  Layers,
  ChevronRight,
  Zap,
  Edit3,
  BarChart3,
  ExternalLink
} from 'lucide-react';
import type {
  AnalyticsSummaryDTO,
  AnalyticsTimeframe,
  ApplicationGoalDTO,
  ApplicationGoalInput
} from '@jobtrack/contract';
import type { Application } from '../domain';
import { analyticsRepository } from '../data';
import { Button, Dialog } from '../components/ui';

interface Props {
  apps: Application[];
  onOpen: (app: Application) => void;
  notify: (msg: string, error?: boolean) => void;
}

export function AnalyticsView({ apps, onOpen, notify }: Props) {
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>('all');
  const [summary, setSummary] = useState<AnalyticsSummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalWeekly, setGoalWeekly] = useState('5');
  const [goalMonthly, setGoalMonthly] = useState('2');
  const [goalOffers, setGoalOffers] = useState('1');
  const [savingGoals, setSavingGoals] = useState(false);

  async function loadAnalytics(tf = timeframe) {
    setLoading(true);
    try {
      const data = await analyticsRepository.getSummary(tf);
      setSummary(data);
      if (data.goals) {
        setGoalWeekly(String(data.goals.weeklyApplicationsTarget));
        setGoalMonthly(String(data.goals.monthlyInterviewsTarget));
        setGoalOffers(String(data.goals.targetOffers));
      }
    } catch (err) {
      notify((err as Error).message || 'Không thể tải dữ liệu phân tích.', true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAnalytics(timeframe);
  }, [timeframe, apps.length]);

  function handleTimeframeChange(tf: AnalyticsTimeframe) {
    setTimeframe(tf);
    startTransition(() => {
      void loadAnalytics(tf);
    });
  }

  async function handleSaveGoals(e: React.FormEvent) {
    e.preventDefault();
    setSavingGoals(true);
    try {
      const weekly = parseInt(goalWeekly, 10);
      const monthly = parseInt(goalMonthly, 10);
      const offers = parseInt(goalOffers, 10);

      const updated = await analyticsRepository.updateGoals({
        weeklyApplicationsTarget: isNaN(weekly) ? 5 : weekly,
        monthlyInterviewsTarget: isNaN(monthly) ? 2 : monthly,
        targetOffers: isNaN(offers) ? 1 : offers
      });

      if (summary) {
        setSummary({
          ...summary,
          goals: updated
        });
      }
      setGoalModalOpen(false);
      notify('Đã cập nhật mục tiêu ứng tuyển.');
    } catch (err) {
      notify((err as Error).message || 'Không thể lưu mục tiêu.', true);
    } finally {
      setSavingGoals(false);
    }
  }

  function handleOpenApp(id: string) {
    const target = apps.find(a => a.id === id);
    if (target) {
      onOpen(target);
    } else {
      notify('Không tìm thấy thông tin hồ sơ này.', true);
    }
  }

  const timeframeLabels: Record<AnalyticsTimeframe, string> = {
    all: 'Toàn bộ thời gian',
    '30d': '30 ngày gần nhất',
    '90d': '90 ngày',
    year: '1 năm'
  };

  return (
    <div className="analytics-view">
      <div className="view-header">
        <div className="view-title-group">
          <div className="analytics-header-icon">
            <TrendingUp size={24} />
          </div>
          <div>
            <h1>Phân tích & Hiệu suất Ứng tuyển</h1>
            <p className="analytics-subtitle">
              Đo lường phễu chuyển đổi, vận tốc tuyển dụng và tiến độ mục tiêu sự nghiệp
            </p>
          </div>
        </div>

        <div className="analytics-controls">
          <div className="timeframe-switch" role="group" aria-label="Khoảng thời gian phân tích">
            {(['all', '30d', '90d', 'year'] as AnalyticsTimeframe[]).map(tf => (
              <button
                key={tf}
                type="button"
                className={`timeframe-btn ${timeframe === tf ? 'active' : ''}`}
                onClick={() => handleTimeframeChange(tf)}
                disabled={loading || isPending}
              >
                {timeframeLabels[tf]}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="icon-button analytics-refresh-btn"
            title="Làm mới phân tích"
            onClick={() => void loadAnalytics()}
            disabled={loading}
          >
            <RefreshCw size={17} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {loading && !summary ? (
        <div className="analytics-loading-box">
          <RefreshCw size={24} className="spin text-brand" />
          <p>Đang tổng hợp dữ liệu chuyển đổi và hiệu suất...</p>
        </div>
      ) : summary ? (
        <div className="analytics-content-grid">
          <section className="analytics-card goals-card">
            <div className="card-header">
              <div className="card-title-wrap">
                <Target size={18} className="card-icon" />
                <h2>Mục tiêu Tuyển dụng</h2>
              </div>
              <Button kind="secondary" onClick={() => setGoalModalOpen(true)}>
                <Edit3 size={14} /> Chỉnh sửa mục tiêu
              </Button>
            </div>

            <div className="goals-grid">
              <div className="goal-item">
                <div className="goal-item-header">
                  <span className="goal-label">Nộp hồ sơ hàng tuần (7 ngày)</span>
                  <span className="goal-stat">
                    <strong>{summary.goals.weeklyApplicationsCurrent}</strong> / {summary.goals.weeklyApplicationsTarget}
                  </span>
                </div>
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill goal-fill-apps"
                    style={{ width: `${Math.min(100, summary.goals.weeklyApplicationsProgressPercent)}%` }}
                  />
                </div>
                <div className="goal-footer">
                  <small>Đạt {summary.goals.weeklyApplicationsProgressPercent}% chỉ tiêu tuần</small>
                </div>
              </div>

              <div className="goal-item">
                <div className="goal-item-header">
                  <span className="goal-label">Phỏng vấn hàng tháng (30 ngày)</span>
                  <span className="goal-stat">
                    <strong>{summary.goals.monthlyInterviewsCurrent}</strong> / {summary.goals.monthlyInterviewsTarget}
                  </span>
                </div>
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill goal-fill-interviews"
                    style={{ width: `${Math.min(100, summary.goals.monthlyInterviewsProgressPercent)}%` }}
                  />
                </div>
                <div className="goal-footer">
                  <small>Đạt {summary.goals.monthlyInterviewsProgressPercent}% chỉ tiêu tháng</small>
                </div>
              </div>

              <div className="goal-item">
                <div className="goal-item-header">
                  <span className="goal-label">Chỉ tiêu Offer việc làm</span>
                  <span className="goal-stat">
                    <strong>{summary.goals.currentOffers}</strong> / {summary.goals.targetOffers}
                  </span>
                </div>
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill goal-fill-offers"
                    style={{
                      width: `${Math.min(100, Math.round((summary.goals.currentOffers / Math.max(1, summary.goals.targetOffers)) * 100))}%`
                    }}
                  />
                </div>
                <div className="goal-footer">
                  <small>
                    {summary.goals.currentOffers >= summary.goals.targetOffers ? 'Đã hoàn thành mục tiêu!' : 'Đang nỗ lực đàm phán'}
                  </small>
                </div>
              </div>
            </div>
          </section>

          <section className="analytics-card velocity-card">
            <div className="card-header">
              <div className="card-title-wrap">
                <Zap size={18} className="card-icon text-amber-500" />
                <h2>Vận tốc Tuyển dụng (Career Velocity)</h2>
              </div>
              <div className="velocity-badge-group">
                <span className="stat-pill pill-active">
                  {summary.velocity.activeCount} hồ sơ đang mở
                </span>
                <span className="stat-pill pill-terminal">
                  {summary.velocity.terminalCount} đã hoàn tất
                </span>
              </div>
            </div>

            <div className="velocity-metric-tiles">
              <div className="velocity-tile">
                <span className="tile-title">Phản hồi đầu tiên</span>
                <div className="tile-value-row">
                  <strong className="tile-val">
                    {summary.velocity.timeToFirstResponseDays !== null
                      ? summary.velocity.timeToFirstResponseDays
                      : '--'}
                  </strong>
                  {summary.velocity.timeToFirstResponseDays !== null && <span className="tile-unit">ngày</span>}
                </div>
                <small className="tile-desc">Nộp hồ sơ đến khi có phản hồi/chuyển trạng thái</small>
              </div>

              <div className="velocity-tile">
                <span className="tile-title">Đến Phỏng vấn</span>
                <div className="tile-value-row">
                  <strong className="tile-val">
                    {summary.velocity.timeToInterviewDays !== null
                      ? summary.velocity.timeToInterviewDays
                      : '--'}
                  </strong>
                  {summary.velocity.timeToInterviewDays !== null && <span className="tile-unit">ngày</span>}
                </div>
                <small className="tile-desc">Từ ngày nộp đơn tới buổi phỏng vấn đầu tiên</small>
              </div>

              <div className="velocity-tile">
                <span className="tile-title">Đến khi có Offer</span>
                <div className="tile-value-row">
                  <strong className="tile-val highlight-offer">
                    {summary.velocity.timeToOfferDays !== null
                      ? summary.velocity.timeToOfferDays
                      : '--'}
                  </strong>
                  {summary.velocity.timeToOfferDays !== null && <span className="tile-unit">ngày</span>}
                </div>
                <small className="tile-desc">Tổng số ngày hoàn tất quy trình nhận việc</small>
              </div>

              <div className="velocity-tile">
                <span className="tile-title">Toàn chu kỳ tuyển dụng</span>
                <div className="tile-value-row">
                  <strong className="tile-val">
                    {summary.velocity.overallCycleDays !== null
                      ? summary.velocity.overallCycleDays
                      : '--'}
                  </strong>
                  {summary.velocity.overallCycleDays !== null && <span className="tile-unit">ngày</span>}
                </div>
                <small className="tile-desc">Thời gian trung bình của hồ sơ đã đóng</small>
              </div>
            </div>
          </section>

          <section className="analytics-card funnel-card">
            <div className="card-header">
              <div className="card-title-wrap">
                <Layers size={18} className="card-icon text-indigo-500" />
                <h2>Phễu Chuyển đổi Ứng tuyển</h2>
              </div>
              <span className="funnel-rate-tag">
                Tỷ lệ Offer tổng thể:{' '}
                <strong>
                  {summary.funnel.find(f => f.stage === 'Offer')?.overallConversionRate || 0}%
                </strong>
              </span>
            </div>

            <div className="funnel-waterfall">
              {summary.funnel.map((item, idx) => (
                <div key={item.stage} className="funnel-row">
                  <div className="funnel-stage-meta">
                    <span className="stage-index">{idx + 1}</span>
                    <span className="stage-name">{item.label}</span>
                    <span className="stage-count">
                      <strong>{item.count}</strong> hồ sơ
                    </span>
                  </div>

                  <div className="funnel-bar-container">
                    <div
                      className={`funnel-bar funnel-bar-${item.stage.toLowerCase()}`}
                      style={{
                        width: `${Math.max(6, item.overallConversionRate)}%`
                      }}
                    >
                      <span className="funnel-bar-text">{item.overallConversionRate}%</span>
                    </div>
                  </div>

                  <div className="funnel-conversion-meta">
                    {idx > 0 ? (
                      <span className="step-conversion">
                        Chuyển tiếp từ bước trước:{' '}
                        <strong>{item.conversionFromPreviousRate}%</strong>
                        {item.dropoffCount > 0 && (
                          <small className="dropoff-note">(-{item.dropoffCount} hồ sơ)</small>
                        )}
                      </span>
                    ) : (
                      <span className="step-conversion muted">Bước khởi đầu</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="analytics-card sources-card">
            <div className="card-header">
              <div className="card-title-wrap">
                <BarChart3 size={18} className="card-icon text-blue-500" />
                <h2>Hiệu quả Kênh Tuyển dụng (Source ROI)</h2>
              </div>
            </div>

            {summary.sources.length === 0 ? (
              <div className="empty-section-message">
                <p>Chưa có dữ liệu nguồn ứng tuyển để phân loại.</p>
              </div>
            ) : (
              <div className="sources-table-container">
                <table className="sources-table">
                  <thead>
                    <tr>
                      <th>Nguồn ứng tuyển</th>
                      <th>Tổng hồ sơ</th>
                      <th>Phỏng vấn</th>
                      <th>Tỷ lệ Phỏng vấn</th>
                      <th>Offer</th>
                      <th>Tỷ lệ Offer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.sources.map(src => (
                      <tr key={src.source}>
                        <td>
                          <strong>{src.source}</strong>
                        </td>
                        <td>{src.totalApplications}</td>
                        <td>{src.interviewCount}</td>
                        <td>
                          <span className="rate-badge rate-interview">{src.interviewRate}%</span>
                        </td>
                        <td>{src.offerCount}</td>
                        <td>
                          <span
                            className={`rate-badge ${src.offerRate > 0 ? 'rate-offer' : 'rate-zero'}`}
                          >
                            {src.offerRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="analytics-card stale-card">
            <div className="card-header">
              <div className="card-title-wrap">
                <AlertTriangle size={18} className="card-icon text-rose-500" />
                <h2>Hồ sơ Cần Hành động (Stale Applications)</h2>
              </div>
              <span className="stale-count-badge">
                {summary.stale.length} hồ sơ chưa có phản hồi &gt; 7 ngày
              </span>
            </div>

            {summary.stale.length === 0 ? (
              <div className="empty-section-message clean-status">
                <CheckCircle2 size={20} className="text-emerald-500" />
                <p>Tuyệt vời! Toàn bộ hồ sơ đang hoạt động đều được cập nhật thường xuyên.</p>
              </div>
            ) : (
              <div className="stale-list">
                {summary.stale.map(item => (
                  <div key={item.id} className="stale-item">
                    <div className="stale-item-main">
                      <div className="stale-role-line">
                        <strong>{item.position}</strong>
                        <span className="stale-company">@ {item.company}</span>
                      </div>
                      <div className="stale-tags">
                        <span className="status-tag">{item.status}</span>
                        <span
                          className={`inactive-tag ${item.daysInactive >= 14 ? 'inactive-critical' : 'inactive-warning'}`}
                        >
                          {item.daysInactive} ngày không tương tác
                        </span>
                      </div>
                      <p className="stale-recommendation">
                        <strong>Gợi ý:</strong> {item.recommendedAction}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="stale-action-btn"
                      onClick={() => handleOpenApp(item.id)}
                    >
                      Xem chi tiết <ChevronRight size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}

      {goalModalOpen && (
        <Dialog title="Thiết lập Mục tiêu Ứng tuyển" onClose={() => setGoalModalOpen(false)}>
          <form onSubmit={handleSaveGoals} className="goals-form">
            <div className="form-group">
              <label htmlFor="goalWeeklyInput">Mục tiêu nộp hồ sơ hàng tuần</label>
              <input
                id="goalWeeklyInput"
                type="number"
                min="1"
                max="100"
                required
                value={goalWeekly}
                onChange={e => setGoalWeekly(e.target.value)}
                className="form-input"
              />
              <small className="form-help">Số lượng hồ sơ bạn dự kiến nộp trong vòng 7 ngày (1 - 100)</small>
            </div>

            <div className="form-group">
              <label htmlFor="goalMonthlyInput">Mục tiêu vòng phỏng vấn hàng tháng</label>
              <input
                id="goalMonthlyInput"
                type="number"
                min="0"
                max="50"
                required
                value={goalMonthly}
                onChange={e => setGoalMonthly(e.target.value)}
                className="form-input"
              />
              <small className="form-help">Số vòng phỏng vấn mục tiêu tham gia trong 30 ngày (0 - 50)</small>
            </div>

            <div className="form-group">
              <label htmlFor="goalOffersInput">Chỉ tiêu Offer mong muốn</label>
              <input
                id="goalOffersInput"
                type="number"
                min="1"
                max="20"
                required
                value={goalOffers}
                onChange={e => setGoalOffers(e.target.value)}
                className="form-input"
              />
              <small className="form-help">Số lượng offer bạn muốn nhận được để lựa chọn (1 - 20)</small>
            </div>

            <footer className="dialog-actions">
              <Button kind="secondary" type="button" onClick={() => setGoalModalOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={savingGoals}>
                {savingGoals ? 'Đang lưu...' : 'Lưu mục tiêu'}
              </Button>
            </footer>
          </form>
        </Dialog>
      )}
    </div>
  );
}
