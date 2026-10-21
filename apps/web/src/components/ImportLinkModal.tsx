import { useState } from 'react';
import { Globe, LoaderCircle, CheckCircle2, AlertTriangle, ArrowRight, ExternalLink } from 'lucide-react';
import { repository } from '../data';
import { duplicate, emptyDraft, instantToLocal, type Application, type Draft } from '../domain';
import { Button, Dialog } from './ui';
import type { UrlImportExtractResult, WorkMode } from '@jobtrack/contract';

interface ImportLinkModalProps {
  apps: Application[];
  onClose: () => void;
  onSaved: (id: string) => void;
  onOpenExisting?: (id: string) => void;
}

export default function ImportLinkModal({ apps, onClose, onSaved, onOpenExisting }: ImportLinkModalProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [extracted, setExtracted] = useState<UrlImportExtractResult | null>(null);
  const [form, setForm] = useState<Draft>({
    ...emptyDraft,
    status: 'Saved' // AI10.3: Default status is 'Saved' (Đã lưu)
  });

  async function handleAnalyze() {
    const trimmed = url.trim();
    if (!trimmed) {
      setError('Vui lòng nhập đường dẫn liên kết tuyển dụng.');
      return;
    }
    try {
      new URL(trimmed);
    } catch {
      setError('Đường dẫn không hợp lệ. Hãy bắt đầu bằng https://');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await repository.importUrl(trimmed);
      setExtracted(result);
      let initialWorkMode: WorkMode = 'On-site';
      if (result.workMode === 'Hybrid') initialWorkMode = 'Hybrid';
      else if (result.workMode === 'Remote') initialWorkMode = 'Remote';

      const initialDeadline = result.deadline ? instantToLocal(result.deadline) : '';
      const initialNextAction = result.deadline ? 'Nộp hồ sơ trước hạn chót' : '';

      setForm({
        company: result.company || '',
        position: result.position || '',
        url: result.url || trimmed,
        source: '',
        jobCode: '',
        location: result.location || '',
        workMode: initialWorkMode,
        appliedAt: '',
        salary: result.salary || '',
        notes: result.notes || '',
        nextAction: initialNextAction,
        deadline: initialDeadline,
        status: 'Saved'
      });
    } catch (err) {
      setError((err as Error).message || 'Không thể trích xuất thông tin từ liên kết này.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!form.company.trim()) {
      setError('Vui lòng nhập tên công ty.');
      return;
    }
    if (!form.position.trim()) {
      setError('Vui lòng nhập vị trí tuyển dụng.');
      return;
    }

    let finalWorkMode: WorkMode = 'On-site';
    if (form.workMode === 'Hybrid' || form.workMode === 'Remote' || form.workMode === 'On-site') {
      finalWorkMode = form.workMode as WorkMode;
    }
    let finalNextAction = form.nextAction.trim();
    if (form.deadline && !finalNextAction) {
      finalNextAction = 'Nộp hồ sơ trước hạn chót';
    }

    const payload: Draft = {
      ...form,
      company: form.company.trim(),
      position: form.position.trim(),
      workMode: finalWorkMode,
      nextAction: finalNextAction
    };

    const dup = duplicate(apps, payload);
    if (dup && !['Rejected', 'Withdrawn'].includes(dup.status)) {
      setError(`Hồ sơ cho vị trí này tại ${payload.company} đã tồn tại ở trạng thái "${dup.status}".`);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const created = await repository.save(payload);
      onSaved(created.id);
    } catch (err) {
      setError((err as Error).message || 'Không thể lưu hồ sơ.');
    } finally {
      setSaving(false);
    }
  }

  const existingConflict = extracted ? duplicate(apps, form) : null;
  const isConflictActive = existingConflict && !['Rejected', 'Withdrawn'].includes(existingConflict.status);

  return (
    <Dialog title="Nhập tin tuyển dụng từ link" onClose={onClose} busy={loading || saving} wide>
      <div className="dialog-body">
        {!extracted ? (
          <div>
            <p className="form-intro">
              Dán liên kết bài đăng tuyển dụng (LinkedIn, TopCV, VietnamWorks, ITviec, hoặc website công ty).
              Hệ thống sẽ tự động bóc tách tên công ty, vị trí, địa điểm, mức lương và mô tả.
            </p>
            <div className="field">
              <label htmlFor="import-url-input">Đường dẫn tin tuyển dụng (URL)</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  id="import-url-input"
                  type="url"
                  placeholder="https://example.com/job/senior-developer"
                  value={url}
                  onChange={e => {
                    setUrl(e.target.value);
                    if (error) setError('');
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleAnalyze();
                    }
                  }}
                  disabled={loading}
                  autoFocus
                />
                <Button onClick={() => void handleAnalyze()} disabled={loading || !url.trim()}>
                  {loading ? (
                    <>
                      <LoaderCircle className="spin" size={17} />
                      <span>Đang phân tích…</span>
                    </>
                  ) : (
                    <>
                      <Globe size={17} />
                      <span>Phân tích</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <div className="notice notice-error" role="alert">
                <p>{error}</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)' }}>
                <CheckCircle2 size={18} />
                <span style={{ fontWeight: 600, fontSize: '13px' }}>Đã trích xuất thông tin từ liên kết</span>
              </div>
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setExtracted(null);
                  setError('');
                }}
              >
                Nhập link khác
              </button>
            </div>

            {isConflictActive && (
              <div className="notice notice-conflict" role="alert">
                <AlertTriangle size={18} />
                <div>
                  <h3>Trùng lặp với hồ sơ hiện có</h3>
                  <p>
                    Bạn đã có một hồ sơ đang theo dõi cho <strong>{existingConflict.position}</strong> tại{' '}
                    <strong>{existingConflict.company}</strong> ({existingConflict.status}).
                  </p>
                  {onOpenExisting && (
                    <Button
                      kind="secondary"
                      onClick={() => onOpenExisting(existingConflict.id)}
                      style={{ marginTop: '8px' }}
                    >
                      <span>Mở hồ sơ hiện có</span>
                      <ExternalLink size={15} />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="notice notice-error" role="alert">
                <p>{error}</p>
              </div>
            )}

            <div className="form-grid">
              <div className="field">
                <label htmlFor="import-company">Công ty *</label>
                <input
                  id="import-company"
                  type="text"
                  value={form.company}
                  onChange={e => setForm({ ...form, company: e.target.value })}
                  disabled={saving}
                />
              </div>

              <div className="field">
                <label htmlFor="import-position">Vị trí ứng tuyển *</label>
                <input
                  id="import-position"
                  type="text"
                  value={form.position}
                  onChange={e => setForm({ ...form, position: e.target.value })}
                  disabled={saving}
                />
              </div>

              <div className="field">
                <label htmlFor="import-location">Địa điểm làm việc</label>
                <input
                  id="import-location"
                  type="text"
                  placeholder="VD: Hà Nội, TP.HCM"
                  value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })}
                  disabled={saving}
                />
              </div>

              <div className="field">
                <label htmlFor="import-workmode">Hình thức</label>
                <select
                  id="import-workmode"
                  value={form.workMode}
                  onChange={e => setForm({ ...form, workMode: e.target.value as WorkMode })}
                  disabled={saving}
                >
                  <option value="On-site">Tại văn phòng (On-site)</option>
                  <option value="Hybrid">Linh hoạt (Hybrid)</option>
                  <option value="Remote">Từ xa (Remote)</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="import-salary">Mức lương</label>
                <input
                  id="import-salary"
                  type="text"
                  placeholder="VD: 30 - 45 triệu"
                  value={form.salary}
                  onChange={e => setForm({ ...form, salary: e.target.value })}
                  disabled={saving}
                />
              </div>

              <div className="field">
                <label htmlFor="import-status">Trạng thái lưu</label>
                <select
                  id="import-status"
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value as Draft['status'] })}
                  disabled={saving}
                >
                  <option value="Saved">Đã lưu (Saved)</option>
                  <option value="Applied">Đã nộp (Applied)</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="import-next-action">Hành động tiếp theo</label>
                <input
                  id="import-next-action"
                  type="text"
                  placeholder="VD: Nộp hồ sơ trước hạn chót"
                  value={form.nextAction}
                  onChange={e => setForm({ ...form, nextAction: e.target.value })}
                  disabled={saving}
                />
              </div>

              <div className="field">
                <label htmlFor="import-deadline">Hạn chót</label>
                <input
                  id="import-deadline"
                  type="datetime-local"
                  value={form.deadline}
                  onChange={e => setForm({ ...form, deadline: e.target.value })}
                  disabled={saving}
                />
              </div>

              <div className="field full-width">
                <label htmlFor="import-notes">Tóm tắt yêu cầu & Mô tả công việc</label>
                <textarea
                  id="import-notes"
                  rows={4}
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  disabled={saving}
                />
              </div>

              <div className="field full-width">
                <label htmlFor="import-url-preview">Đường dẫn gốc</label>
                <input id="import-url-preview" type="text" value={form.url} readOnly disabled />
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="dialog-actions">
        <Button kind="secondary" disabled={loading || saving} onClick={onClose}>
          Hủy
        </Button>
        {extracted && (
          <Button disabled={saving || !form.company.trim() || !form.position.trim()} onClick={() => void handleSave()}>
            {saving ? (
              <>
                <LoaderCircle className="spin" size={17} />
                <span>Đang lưu…</span>
              </>
            ) : (
              <>
                <span>Lưu vào danh sách</span>
                <ArrowRight size={17} />
              </>
            )}
          </Button>
        )}
      </footer>
    </Dialog>
  );
}
