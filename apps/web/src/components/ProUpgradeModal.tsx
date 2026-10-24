import { useState, useEffect, useRef } from 'react';
import {
  Crown,
  Sparkles,
  Check,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Copy,
  CheckCircle2,
  RefreshCw,
  Zap,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { Button, Dialog } from './ui';
import { proRepository } from '../data';
import type {
  ProPlan,
  ProPlanDTO,
  ProStatusDTO,
  CheckoutResultDTO,
  ProOrderDTO
} from '@jobtrack/contract';

interface Props {
  onClose: () => void;
  onSuccess?: (status: ProStatusDTO) => void;
  notify?: (msg: string, isErr?: boolean) => void;
}

export default function ProUpgradeModal({
  onClose,
  onSuccess,
  notify
}: Props) {
  const [view, setView] = useState<'plans' | 'checkout' | 'success'>('plans');
  const [plans, setPlans] = useState<ProPlanDTO[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<ProPlan>('quarterly');
  const [checkout, setCheckout] = useState<CheckoutResultDTO | null>(null);
  const [order, setOrder] = useState<ProOrderDTO | null>(null);
  const [proStatus, setProStatus] = useState<ProStatusDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(1800);
  const pollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    proRepository.getPlans()
      .then(res => {
        if (active && res && res.length > 0) {
          setPlans(res);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (view !== 'checkout' || !checkout) {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    const poll = async () => {
      try {
        const curOrder = await proRepository.getOrder(checkout.orderId);
        setOrder(curOrder);
        if (curOrder.status === 'paid') {
          const status = await proRepository.getStatus();
          setProStatus(status);
          setView('success');
          if (onSuccess) onSuccess(status);
          if (notify) notify('Nâng cấp gói JobTrack Pro thành công!');
        }
      } catch {}
    };

    pollTimerRef.current = window.setInterval(poll, 3000);

    const timer = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      clearInterval(timer);
    };
  }, [view, checkout, onSuccess, notify]);

  const handleCreateCheckout = async () => {
    setBusy(true);
    try {
      const res = await proRepository.createCheckout(selectedPlan);
      setCheckout(res);
      setCountdown(1800);
      setView('checkout');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể khởi tạo đơn hàng.';
      if (notify) notify(msg, true);
    } finally {
      setBusy(false);
    }
  };

  const handleSimulateWebhook = async () => {
    if (!checkout) return;
    setSimulating(true);
    try {
      const res = await proRepository.simulatePaid(checkout.orderId);
      if (res.success) {
        const status = await proRepository.getStatus();
        setProStatus(status);
        setView('success');
        if (onSuccess) onSuccess(status);
        if (notify) notify('Mô phỏng thanh toán thành công! Gói Pro đã được kích hoạt.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Mô phỏng thanh toán thất bại.';
      if (notify) notify(msg, true);
    } finally {
      setSimulating(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    if (notify) notify(`Đã sao chép ${field} vào bộ nhớ tạm!`);
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog title="Gói Hội Viên JobTrack Pro" wide onClose={onClose} busy={busy || simulating}>
      <div className="dialog-body">
        <div className="pro-modal-container">
          {view === 'plans' && (
            <div className="pro-view-plans">
              <div className="pro-modal-header">
                <div className="pro-header-badge">
                  <Crown className="w-4 h-4 text-amber-500 mr-1.5 inline" />
                  <span className="font-semibold text-amber-600 dark:text-amber-400 text-xs tracking-wider uppercase">
                    JobTrack Premium
                  </span>
                </div>
                <h2 className="pro-modal-title">Nâng Cấp Hội Viên JobTrack Pro</h2>
                <p className="pro-modal-subtitle">
                  Mở khóa toàn bộ trợ lý AI cao cấp: Mock Interview STAR, So sánh đa Offer & Đàm phán lương
                </p>
              </div>

              <div className="pro-pricing-grid">
                {plans.map(p => {
                  const isSelected = selectedPlan === p.plan;
                  return (
                    <div
                      key={p.plan}
                      className={`pro-pricing-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedPlan(p.plan)}
                    >
                      {p.highlightBadge && (
                        <div className="pro-card-badge">{p.highlightBadge}</div>
                      )}
                      <div className="pro-card-header">
                        <div className="pro-plan-name">{p.name || p.plan}</div>
                        <div className="pro-plan-price">
                          <span className="pro-price-amount">
                            {p.amount.toLocaleString('vi-VN')}
                          </span>
                          <span className="pro-price-unit">đ</span>
                        </div>
                        <div className="pro-plan-duration">
                          Thời hạn {p.durationDays} ngày
                          {p.savingsPercent && (
                            <span className="pro-savings-tag">
                              Tiết kiệm {p.savingsPercent}%
                            </span>
                          )}
                        </div>
                      </div>

                      <ul className="pro-feature-list">
                        {(p.features || []).map((feat, idx) => (
                          <li key={idx} className="pro-feature-item">
                            <Check className="w-4 h-4 text-emerald-500 mr-2 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="pro-card-footer">
                        <button
                          type="button"
                          className={`pro-select-btn ${isSelected ? 'active' : ''}`}
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedPlan(p.plan);
                          }}
                        >
                          {isSelected ? 'Đang chọn gói này' : 'Chọn gói'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pro-modal-actions">
                <Button kind="secondary" onClick={onClose} disabled={busy}>
                  Đóng
                </Button>
                <Button
                  kind="primary"
                  onClick={handleCreateCheckout}
                  disabled={busy}
                  className="pro-submit-btn"
                >
                  {busy ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      Tiến hành đăng ký
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {view === 'checkout' && checkout && (
            <div className="pro-view-checkout">
              <div className="pro-checkout-header">
                <button
                  type="button"
                  className="pro-back-link"
                  onClick={() => setView('plans')}
                >
                  <ArrowLeft className="w-4 h-4 mr-1 inline" />
                  Quay lại chọn gói
                </button>
                <h2 className="pro-checkout-title">Hướng Dẫn Chuyển Khoản Đăng Ký</h2>
                <div className="pro-countdown-banner">
                  <Clock className="w-4 h-4 mr-1.5 text-amber-500 inline" />
                  <span>Đơn hàng tự động hết hạn sau: <strong>{formatSeconds(countdown)}</strong></span>
                </div>
              </div>

              <div className="pro-test-mode-notice">
                <AlertCircle className="w-5 h-5 text-blue-500 mr-2 shrink-0" />
                <div>
                  <strong className="block font-semibold text-blue-900 dark:text-blue-200">
                    Chế độ thử nghiệm an toàn (Test Mode)
                  </strong>
                  <span className="text-xs text-blue-800 dark:text-blue-300">
                    {checkout.testNotice}
                  </span>
                </div>
              </div>

              <div className="pro-checkout-details-box">
                <div className="pro-detail-row">
                  <span className="pro-detail-label">Gói đăng ký:</span>
                  <span className="pro-detail-value font-semibold">
                    {checkout.plan === 'monthly' ? 'Gói 1 Tháng' : checkout.plan === 'quarterly' ? 'Gói 3 Tháng' : 'Gói 1 Năm'}
                  </span>
                </div>
                <div className="pro-detail-row">
                  <span className="pro-detail-label">Số tiền cần thanh toán:</span>
                  <div className="pro-detail-value-group">
                    <span className="pro-detail-amount">
                      {checkout.amount.toLocaleString('vi-VN')} {checkout.currency}
                    </span>
                    <button
                      type="button"
                      className="pro-copy-icon-btn"
                      onClick={() => copyToClipboard(String(checkout.amount), 'số tiền')}
                      title="Sao chép số tiền"
                    >
                      {copiedField === 'số tiền' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="pro-detail-row highlight">
                  <span className="pro-detail-label">Mã nội dung chuyển khoản:</span>
                  <div className="pro-detail-value-group">
                    <span className="pro-transfer-code">{checkout.transferCode}</span>
                    <button
                      type="button"
                      className="pro-copy-icon-btn"
                      onClick={() => copyToClipboard(checkout.transferCode, 'mã chuyển khoản')}
                      title="Sao chép mã"
                    >
                      {copiedField === 'mã chuyển khoản' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="pro-detail-row">
                  <span className="pro-detail-label">Mã đơn hàng:</span>
                  <span className="pro-detail-order-id">{checkout.orderId}</span>
                </div>
              </div>

              <div className="pro-polling-status">
                <RefreshCw className="w-4 h-4 text-blue-500 mr-2 animate-spin inline" />
                <span className="text-xs text-muted-foreground">
                  Hệ thống đang tự động lắng nghe và cập nhật trạng thái thanh toán...
                </span>
              </div>

              <div className="pro-dev-simulate-box">
                <div className="pro-dev-simulate-desc">
                  <Zap className="w-4 h-4 text-amber-500 mr-1.5 inline" />
                  <span className="text-xs font-medium">Dành cho Nhà phát triển & Kiểm thử:</span>
                </div>
                <button
                  type="button"
                  className="pro-simulate-webhook-btn"
                  onClick={handleSimulateWebhook}
                  disabled={simulating}
                >
                  {simulating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                      Đang gửi Webhook HMAC-SHA256...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-400" />
                      Mô phỏng thanh toán Webhook thành công
                    </>
                  )}
                </button>
              </div>

              <div className="pro-modal-actions">
                <Button kind="secondary" onClick={onClose}>
                  Đóng
                </Button>
              </div>
            </div>
          )}

          {view === 'success' && (
            <div className="pro-view-success">
              <div className="pro-success-icon-wrap">
                <div className="pro-success-circle">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                </div>
              </div>

              <h2 className="pro-success-title">Nâng Cấp Gói Pro Thành Công!</h2>
              <p className="pro-success-subtitle">
                Tài khoản của bạn đã được nâng cấp lên hạng <strong>JobTrack Pro</strong>.
              </p>

              {proStatus?.expiresAt && (
                <div className="pro-success-expiry">
                  <Clock className="w-4 h-4 mr-1.5 text-primary inline" />
                  Thời hạn sử dụng đến:{' '}
                  <strong>{new Date(proStatus.expiresAt).toLocaleDateString('vi-VN')}</strong>
                </div>
              )}

              <div className="pro-success-perks">
                <div className="pro-perks-title">Đặc quyền Pro đã mở khóa:</div>
                <div className="pro-perks-grid">
                  <div className="pro-perk-item">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
                    <span>Quản lý không giới hạn hồ sơ</span>
                  </div>
                  <div className="pro-perk-item">
                    <Sparkles className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
                    <span>AI Mock Interview STAR chuẩn hóa</span>
                  </div>
                  <div className="pro-perk-item">
                    <Sparkles className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
                    <span>AI Đàm phán thù lao & Decision Matrix</span>
                  </div>
                  <div className="pro-perk-item">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
                    <span>Ưu tiên băng thông và tốc độ xử lý</span>
                  </div>
                </div>
              </div>

              <div className="pro-modal-actions center">
                <Button
                  kind="primary"
                  onClick={onClose}
                  className="pro-explore-btn"
                >
                  Bắt đầu trải nghiệm ngay
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}