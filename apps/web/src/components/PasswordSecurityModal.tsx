import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, Download, Eye, EyeOff, KeyRound, LoaderCircle, LogOut, ShieldCheck, Trash2 } from 'lucide-react';
import { demoMode, repository } from '../data';
import { ApiError } from '../transport';
import { Button, Dialog, Field } from './ui';

export default function PasswordSecurityModal({
  onClose,
  notify,
  onAccountDeleted
}: {
  onClose: () => void;
  notify?: (message: string, isError?: boolean) => void;
  onAccountDeleted?: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [providers, setProviders] = useState<string[]>([]);

  useEffect(() => {
    if (demoMode) { setHasPassword(true); return; }
    let active = true;
    fetch('/api/auth/account-method', { credentials: 'include' })
      .then(response => (response.ok ? response.json() : null))
      .then((body: { hasPassword?: boolean; providers?: string[] } | null) => {
        if (!active || !body) return;
        setHasPassword(body.hasPassword === true);
        setProviders(Array.isArray(body.providers) ? body.providers : []);
      })
      .catch(() => { if (active) setHasPassword(true); });
    return () => { active = false; };
  }, []);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');

    const invalid: Record<string, string> = {};
    if (hasPassword !== false && !currentPassword) invalid.currentPassword = 'Nhập mật khẩu hiện tại.';
    if (!newPassword) invalid.newPassword = 'Nhập mật khẩu mới.';
    else if (newPassword.length < 15 || newPassword.length > 64) invalid.newPassword = 'Mật khẩu cần từ 15–64 ký tự.';
    if (confirm !== newPassword) invalid.confirm = 'Mật khẩu nhập lại chưa khớp.';
    if (currentPassword && currentPassword === newPassword) invalid.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại.';
    setErrors(invalid);
    if (Object.keys(invalid).length) return;

    setBusy(true);
    try {
      await repository.changePassword(hasPassword === false ? '' : currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      if (hasPassword === false) {
        setHasPassword(true);
        notify?.('Đã đặt mật khẩu cho tài khoản. Giờ bạn có thể đăng nhập bằng email và mật khẩu.');
      } else {
        notify?.('Đã đổi mật khẩu. Các thiết bị khác đã đăng xuất.');
      }
    } catch (err) {
      if (err instanceof ApiError && err.fields && Object.keys(err.fields).length > 0) setErrors(err.fields);
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function revokeOthers() {
    if (revoking) return;
    setError('');
    setRevoking(true);
    try {
      const result = await repository.revokeOtherSessions();
      notify?.(result.revoked > 0 ? `Đã đăng xuất ${result.revoked} thiết bị khác.` : 'Không có thiết bị nào khác đang đăng nhập.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRevoking(false);
    }
  }

  async function exportData() {
    if (exporting) return;
    setExportError('');
    setExporting(true);
    try {
      const blob = await repository.exportAllData();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `jobtrack-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      notify?.('Đã tải bản xuất dữ liệu.');
    } catch (err) {
      setExportError((err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount(event: FormEvent) {
    event.preventDefault();
    if (deleting) return;
    setDeleteError('');

    const invalid: Record<string, string> = {};
    if (!deletePassword) invalid.password = 'Nhập mật khẩu để xác nhận.';
    if (deleteConfirm.trim() !== 'XOA TAI KHOAN') invalid.confirmation = 'Gõ chính xác "XOA TAI KHOAN".';
    setDeleteErrors(invalid);
    if (Object.keys(invalid).length) return;

    setDeleting(true);
    try {
      await repository.deleteAccount(deletePassword, deleteConfirm.trim());
      onAccountDeleted?.();
      notify?.('Tài khoản và toàn bộ dữ liệu đã được xoá vĩnh viễn.');
    } catch (err) {
      if (err instanceof ApiError && err.fields && Object.keys(err.fields).length > 0) setDeleteErrors(err.fields);
      setDeleteError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog title="Mật khẩu & phiên đăng nhập" onClose={onClose} busy={busy || revoking}>
      <div className="dialog-body">
        {error && <div className="notice notice-error" role="alert">{error}</div>}
        {demoMode && <div className="notice notice-conflict">Bản dùng thử không đổi được mật khẩu.</div>}

        <form onSubmit={changePassword} noValidate>
          <fieldset>
            <legend>{hasPassword === false ? 'Đặt mật khẩu cho tài khoản' : 'Đổi mật khẩu'}</legend>
            {hasPassword === false && (
              <p className="field-help" style={{ marginBottom: 16 }}>
                Tài khoản này đăng nhập bằng {providers.includes('google') ? 'Google' : 'nhà cung cấp ngoài'} và chưa có mật khẩu.
                Đặt mật khẩu để vẫn đăng nhập được bằng email khi không dùng Google.
              </p>
            )}
            {hasPassword !== false && (
              <Field label="Mật khẩu hiện tại" error={errors.currentPassword}>
                <input
                  disabled={busy}
                  required
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={event => setCurrentPassword(event.target.value)}
                />
              </Field>
            )}
            <Field label="Mật khẩu mới" error={errors.newPassword} help="15–64 ký tự. Cho phép khoảng trắng.">
              <input
                disabled={busy}
                required
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={15}
                maxLength={64}
                value={newPassword}
                onChange={event => setNewPassword(event.target.value)}
              />
            </Field>
            <Field label="Nhập lại mật khẩu mới" error={errors.confirm}>
              <input
                disabled={busy}
                required
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={15}
                maxLength={64}
                value={confirm}
                onChange={event => setConfirm(event.target.value)}
              />
            </Field>
            <button
              type="button"
              disabled={busy}
              className="password-toggle"
              aria-pressed={show}
              onClick={() => setShow(current => !current)}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
              {show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            </button>
          </fieldset>

          <Button disabled={busy || demoMode} type="submit">
            {busy ? <LoaderCircle size={17} className="spin" /> : <KeyRound size={17} />}
            {busy ? 'Đang lưu…' : hasPassword === false ? 'Đặt mật khẩu' : 'Đổi mật khẩu'}
          </Button>
        </form>

        <hr style={{ margin: '26px 0 22px', border: 0, borderTop: '1px solid var(--line)' }} />

        <div>
          <h3 style={{ fontSize: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={17} />Phiên đăng nhập khác
          </h3>
          <p className="field-help" style={{ marginBottom: 14 }}>
            Đăng xuất mọi thiết bị khác, giữ lại phiên hiện tại. Dùng khi nghi tài khoản bị truy cập trái phép.
          </p>
          <Button kind="secondary" disabled={revoking || demoMode} onClick={() => void revokeOthers()}>
            {revoking ? <LoaderCircle size={17} className="spin" /> : <LogOut size={17} />}
            {revoking ? 'Đang xử lý…' : 'Đăng xuất thiết bị khác'}
          </Button>
        </div>

        <hr style={{ margin: '26px 0 22px', border: 0, borderTop: '1px solid var(--line)' }} />

        <div>
          <h3 style={{ fontSize: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Download size={17} />Xuất dữ liệu của bạn
          </h3>
          <p className="field-help" style={{ marginBottom: 14 }}>
            Tải toàn bộ hồ sơ, lịch phỏng vấn, ghi chú, CV, liên hệ và các bản ghi khác dưới dạng JSON.
            Dùng để sao lưu hoặc chuyển sang dịch vụ khác.
          </p>
          {exportError && <div className="notice notice-error" role="alert">{exportError}</div>}
          <Button kind="secondary" disabled={exporting} onClick={() => void exportData()}>
            {exporting ? <LoaderCircle size={17} className="spin" /> : <Download size={17} />}
            {exporting ? 'Đang chuẩn bị…' : 'Tải bản xuất JSON'}
          </Button>
        </div>

        <hr style={{ margin: '26px 0 22px', border: 0, borderTop: '1px solid var(--line)' }} />

        <div>
          <h3 style={{ fontSize: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger)' }}>
            <AlertTriangle size={17} />Xoá tài khoản
          </h3>
          <p className="field-help" style={{ marginBottom: 14 }}>
            Xoá vĩnh viễn tài khoản cùng toàn bộ hồ sơ ứng tuyển, lịch phỏng vấn, ghi chú, CV và liên hệ.
            Không thể khôi phục. Hãy xuất dữ liệu trước nếu cần giữ lại.
          </p>
          {!deleteOpen ? (
            <Button kind="danger" disabled={demoMode} onClick={() => setDeleteOpen(true)}>
              <Trash2 size={17} />Xoá tài khoản vĩnh viễn
            </Button>
          ) : (
            <form onSubmit={deleteAccount} noValidate>
              {deleteError && <div className="notice notice-error" role="alert">{deleteError}</div>}
              <Field label="Mật khẩu" error={deleteErrors.password}>
                <input
                  disabled={deleting}
                  required
                  type="password"
                  autoComplete="current-password"
                  value={deletePassword}
                  onChange={event => setDeletePassword(event.target.value)}
                />
              </Field>
              <Field
                label='Gõ "XOA TAI KHOAN" để xác nhận'
                error={deleteErrors.confirmation}
                help="Không phân biệt hoa thường ở khoảng trắng, nhưng phải đúng chữ."
              >
                <input
                  disabled={deleting}
                  required
                  type="text"
                  autoComplete="off"
                  value={deleteConfirm}
                  onChange={event => setDeleteConfirm(event.target.value)}
                />
              </Field>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Button kind="secondary" type="button" disabled={deleting} onClick={() => { setDeleteOpen(false); setDeletePassword(''); setDeleteConfirm(''); setDeleteError(''); setDeleteErrors({}); }}>
                  Hủy
                </Button>
                <Button kind="danger" type="submit" disabled={deleting}>
                  {deleting ? <LoaderCircle size={17} className="spin" /> : <Trash2 size={17} />}
                  {deleting ? 'Đang xoá…' : 'Xoá vĩnh viễn'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
      <footer className="dialog-actions">
        <Button kind="secondary" disabled={busy || revoking} onClick={onClose}>Đóng</Button>
      </footer>
    </Dialog>
  );
}
