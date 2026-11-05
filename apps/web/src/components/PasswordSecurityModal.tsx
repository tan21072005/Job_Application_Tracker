import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, KeyRound, LoaderCircle, LogOut, ShieldCheck } from 'lucide-react';
import { demoMode, repository } from '../data';
import { ApiError } from '../transport';
import { Button, Dialog, Field } from './ui';

export default function PasswordSecurityModal({
  onClose,
  notify
}: {
  onClose: () => void;
  notify?: (message: string, isError?: boolean) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');

    const invalid: Record<string, string> = {};
    if (!currentPassword) invalid.currentPassword = 'Nhập mật khẩu hiện tại.';
    if (!newPassword) invalid.newPassword = 'Nhập mật khẩu mới.';
    else if (newPassword.length < 15 || newPassword.length > 64) invalid.newPassword = 'Mật khẩu cần từ 15–64 ký tự.';
    if (confirm !== newPassword) invalid.confirm = 'Mật khẩu nhập lại chưa khớp.';
    if (currentPassword && currentPassword === newPassword) invalid.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại.';
    setErrors(invalid);
    if (Object.keys(invalid).length) return;

    setBusy(true);
    try {
      await repository.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      notify?.('Đã đổi mật khẩu. Các thiết bị khác đã đăng xuất.');
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

  return (
    <Dialog title="Mật khẩu & phiên đăng nhập" onClose={onClose} busy={busy || revoking}>
      <div className="dialog-body">
        {error && <div className="notice notice-error" role="alert">{error}</div>}
        {demoMode && <div className="notice notice-conflict">Bản dùng thử không đổi được mật khẩu.</div>}

        <form onSubmit={changePassword} noValidate>
          <fieldset>
            <legend>Đổi mật khẩu</legend>
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
            {busy ? 'Đang lưu…' : 'Đổi mật khẩu'}
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
      </div>
      <footer className="dialog-actions">
        <Button kind="secondary" disabled={busy || revoking} onClick={onClose}>Đóng</Button>
      </footer>
    </Dialog>
  );
}
