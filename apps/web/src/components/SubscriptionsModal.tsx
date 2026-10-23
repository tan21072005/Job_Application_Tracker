import { useState, useEffect } from 'react';
import {
  Radar,
  X,
  Play,
  Pause,
  Trash2,
  Plus,
  LoaderCircle,
  Briefcase,
  MapPin,
  DollarSign,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { subscriptionRepository } from '../data';
import type { JobSubscriptionDTO, CrawlRunResultDTO } from '@jobtrack/contract';
import { Button, Field } from './ui';

interface SubscriptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanCompleted?: () => void;
}

export function SubscriptionsModal({ isOpen, onClose, onScanCompleted }: SubscriptionsModalProps) {
  const [subscriptions, setSubscriptions] = useState<JobSubscriptionDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<CrawlRunResultDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [keywordsText, setKeywordsText] = useState('');
  const [location, setLocation] = useState('');
  const [minSalary, setMinSalary] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadSubscriptions();
    } else {
      setScanResult(null);
      setError(null);
    }
  }, [isOpen]);

  async function loadSubscriptions() {
    setLoading(true);
    setError(null);
    try {
      const items = await subscriptionRepository.list();
      setSubscriptions(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách đăng ký.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const kw = keywordsText
        .split(',')
        .map(k => k.trim())
        .filter(Boolean);

      await subscriptionRepository.create({
        title: title.trim(),
        keywords: kw,
        location: location.trim() || null,
        minSalary: minSalary ? Number(minSalary.replace(/\D/g, '')) : null,
        sources: ['TopCV', 'ITViec', 'VietnamWorks'],
        isActive: true
      });

      setTitle('');
      setKeywordsText('');
      setLocation('');
      setMinSalary('');
      setIsAdding(false);
      await loadSubscriptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo rada mới.');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(sub: JobSubscriptionDTO) {
    setActionBusyId(sub.id);
    setError(null);
    try {
      const updated = await subscriptionRepository.toggle(sub.id, !sub.isActive);
      setSubscriptions(prev => prev.map(s => s.id === sub.id ? updated : s));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái.');
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bạn có chắc muốn xóa bộ lọc rada này?')) return;
    setActionBusyId(id);
    setError(null);
    try {
      await subscriptionRepository.remove(id);
      setSubscriptions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xóa bộ lọc.');
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleRunScan(sub: JobSubscriptionDTO) {
    setActionBusyId(sub.id);
    setError(null);
    setScanResult(null);
    try {
      const result = await subscriptionRepository.runScan(sub.id);
      setScanResult(result);
      if (onScanCompleted) {
        onScanCompleted();
      }
      await loadSubscriptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quét việc làm thất bại.');
    } finally {
      setActionBusyId(null);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card modal-radar" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <span className="modal-icon-badge radar-icon-badge">
              <Radar size={20} />
            </span>
            <div>
              <h3>Rada việc làm & Đăng ký tìm việc</h3>
              <p>Tự động quét các nguồn việc làm và lưu vị trí phù hợp vào bảng ứng tuyển của bạn.</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="notice notice-error" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {scanResult && (
          <div className="notice notice-success" role="status">
            <CheckCircle2 size={16} />
            <div>
              <strong>Quét hoàn tất cho &quot;{scanResult.subscriptionTitle}&quot;!</strong>
              <p>
                Tìm thấy {scanResult.found} tin, khớp {scanResult.matched} tin, đã tự động thêm{' '}
                <strong>{scanResult.saved} hồ sơ mới</strong> vào cột &quot;Đã lưu&quot;.
              </p>
            </div>
          </div>
        )}

        <div className="radar-actions-bar">
          {!isAdding ? (
            <Button kind="primary" onClick={() => setIsAdding(true)}>
              <Plus size={16} />
              Thêm bộ lọc rada mới
            </Button>
          ) : (
            <button className="btn-text-cancel" onClick={() => setIsAdding(false)}>
              Đóng biểu mẫu
            </button>
          )}
        </div>

        {isAdding && (
          <form className="radar-create-form" onSubmit={handleCreate}>
            <h4>Thiết lập tiêu chí rada tìm việc</h4>
            <div className="radar-form-grid">
              <Field label="Tiêu đề rada / vị trí mong muốn">
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Senior React / Node.js Developer"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </Field>

              <Field label="Từ khóa kỹ năng (cách nhau bởi dấu phẩy)">
                <input
                  type="text"
                  placeholder="React, TypeScript, Node.js, Next.js"
                  value={keywordsText}
                  onChange={e => setKeywordsText(e.target.value)}
                />
              </Field>

              <div className="form-row-two">
                <Field label="Địa điểm làm việc">
                  <input
                    type="text"
                    placeholder="Hà Nội / TP.HCM / Remote"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                  />
                </Field>
                <Field label="Mức lương tối thiểu (VND/tháng)">
                  <input
                    type="text"
                    placeholder="30000000"
                    value={minSalary}
                    onChange={e => setMinSalary(e.target.value)}
                  />
                </Field>
              </div>
            </div>

            <div className="form-actions-right">
              <Button kind="secondary" type="button" onClick={() => setIsAdding(false)}>
                Hủy
              </Button>
              <Button kind="primary" type="submit" disabled={loading}>
                {loading ? <LoaderCircle size={16} className="spin" /> : <Radar size={16} />}
                Kích hoạt Rada
              </Button>
            </div>
          </form>
        )}

        <div className="radar-subscriptions-list">
          {loading && !subscriptions.length ? (
            <div className="radar-loading">
              <LoaderCircle size={24} className="spin" />
              <span>Đang tải các bộ lọc rada...</span>
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="radar-empty">
              <Briefcase size={32} />
              <p>Chưa có bộ lọc rada nào được tạo.</p>
              <small>
                Tạo bộ lọc để JobTrack tự động quét và thu thập các cơ hội nghề nghiệp phù hợp nhất cho bạn.
              </small>
            </div>
          ) : (
            subscriptions.map(sub => {
              const isBusy = actionBusyId === sub.id;
              return (
                <div key={sub.id} className={`radar-card ${!sub.isActive ? 'radar-card-paused' : ''}`}>
                  <div className="radar-card-main">
                    <div className="radar-card-title-row">
                      <h4>{sub.title}</h4>
                      <span className={`radar-status-badge ${sub.isActive ? 'active' : 'paused'}`}>
                        {sub.isActive ? 'Đang hoạt động' : 'Tạm dừng'}
                      </span>
                    </div>

                    <div className="radar-card-meta">
                      {sub.location && (
                        <span className="radar-meta-item">
                          <MapPin size={14} />
                          {sub.location}
                        </span>
                      )}
                      {sub.minSalary && (
                        <span className="radar-meta-item">
                          <DollarSign size={14} />
                          Từ {sub.minSalary.toLocaleString('vi-VN')} VND
                        </span>
                      )}
                      <span className="radar-meta-item">
                        Nguồn: {sub.sources.join(', ')}
                      </span>
                    </div>

                    {sub.keywords.length > 0 && (
                      <div className="radar-keywords-chips">
                        {sub.keywords.map((kw, i) => (
                          <span key={i} className="radar-kw-chip">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="radar-last-checked">
                      {sub.lastCheckedAt
                        ? `Quét gần nhất: ${new Date(sub.lastCheckedAt).toLocaleString('vi-VN')}`
                        : 'Chưa thực hiện quét'}
                    </div>
                  </div>

                  <div className="radar-card-actions">
                    <button
                      className="radar-btn-scan"
                      disabled={!sub.isActive || isBusy}
                      onClick={() => handleRunScan(sub)}
                      title={sub.isActive ? 'Quét ngay việc làm phù hợp' : 'Kích hoạt lại để quét'}
                    >
                      {isBusy ? <LoaderCircle size={15} className="spin" /> : <Play size={15} />}
                      Quét ngay
                    </button>

                    <button
                      className="radar-btn-toggle"
                      disabled={isBusy}
                      onClick={() => handleToggle(sub)}
                      title={sub.isActive ? 'Tạm dừng bộ lọc' : 'Kích hoạt bộ lọc'}
                    >
                      {sub.isActive ? <Pause size={15} /> : <Play size={15} />}
                      {sub.isActive ? 'Tạm dừng' : 'Kích hoạt'}
                    </button>

                    <button
                      className="radar-btn-delete"
                      disabled={isBusy}
                      onClick={() => handleDelete(sub.id)}
                      title="Xóa bộ lọc rada"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
