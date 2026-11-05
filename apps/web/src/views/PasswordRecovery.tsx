import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Check, Eye, EyeOff, KeyRound, LoaderCircle, Mail, ShieldCheck } from 'lucide-react';
import { demoMode, repository } from '../data';
import { ApiError } from '../transport';
import { Button, Field, Logo } from '../components/ui';

type Mode = 'forgot' | 'reset';

const AUTH_STORY = {
  forgot: {
    title: 'Quên mật khẩu?\nKhông mất dữ liệu.',
    body: 'Nhập email đã đăng ký, chúng tôi gửi liên kết đặt lại trong 30 phút. Hồ sơ, lịch phỏng vấn và ghi chú của bạn giữ nguyên.',
    icon: Mail
  },
  reset: {
    title: 'Đặt mật khẩu mới.\nPhiên cũ đăng xuất hết.',
    body: 'Sau khi đổi, mọi thiết bị khác đăng xuất để bảo vệ tài khoản. Bạn đăng nhập lại bằng mật khẩu mới.',
    icon: ShieldCheck
  }
} as const;

export default function PasswordRecovery({ token, onDone }: { token?: string; onDone: () => void }) {
  const [mode, setMode] = useState<Mode>(token ? 'reset' : 'forgot');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (token) setMode('reset');
  }, [token]);

  const story = AUTH_STORY[mode];
  const StoryIcon = story.icon;

  async function submitForgot(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');
    const invalid: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) invalid.email = 'Nhập địa chỉ email hợp lệ.';
    setErrors(invalid);
    if (Object.keys(invalid).length) return;

    setBusy(true);
    try {
      await repository.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitReset(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');
    const invalid: Record<string, string> = {};
    if (!password) invalid.password = 'Nhập mật khẩu mới.';
    else if (password.length < 15 || password.length > 64) invalid.password = 'Mật khẩu cần từ 15–64 ký tự.';
    if (confirm !== password) invalid.confirm = 'Mật khẩu nhập lại chưa khớp.';
    setErrors(invalid);
    if (Object.keys(invalid).length) return;

    setBusy(true);
    try {
      await repository.resetPassword(token ?? '', password);
      setCompleted(true);
    } catch (err) {
      if (err instanceof ApiError && err.fields && Object.keys(err.fields).length > 0) setErrors(err.fields);
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const successState = mode === 'forgot' ? sent : completed;

  return (
    <div className="auth-layout">
      <section className="auth-story">
        <Logo />
        <div className="auth-story-content">
          <h1 style={{ whiteSpace: 'pre-line' }}>{story.title}</h1>
          <p>{story.body}</p>
          <div className="auth-example">
            <div>
              <span className="auth-example-icon"><StoryIcon size={23} /></span>
              <span>{mode === 'forgot' ? 'Liên kết hết hạn sau 30 phút' : 'Chỉ dùng được một lần'}<small>Bảo vệ tài khoản của bạn</small></span>
              <Check size={19} />
            </div>
            <p>Không ai khác đọc được liên kết này. Chỉ email của bạn mới nhận được.</p>
          </div>
        </div>
        <span className="auth-story-footer">JobTrack · Không gian ứng tuyển của bạn</span>
      </section>

      <section className="auth-form">
        <div>
          {successState ? (
            <>
              <h2>{mode === 'forgot' ? 'Kiểm tra hộp thư' : 'Đã đặt lại mật khẩu'}</h2>
              <p>
                {mode === 'forgot'
                  ? `Nếu ${email.trim()} có tài khoản, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu. Kiểm tra cả thư mục spam.`
                  : 'Mọi phiên đăng nhập cũ đã đăng xuất. Đăng nhập lại bằng mật khẩu mới để tiếp tục.'}
              </p>
              <Button onClick={onDone} style={{ width: '100%', marginTop: 17 }}>
                {mode === 'forgot' ? 'Về trang đăng nhập' : 'Đăng nhập lại'}
                <ArrowRight size={17} />
              </Button>
            </>
          ) : (
            <>
              <h2>{mode === 'forgot' ? 'Đặt lại mật khẩu' : 'Chọn mật khẩu mới'}</h2>
              <p>
                {mode === 'forgot'
                  ? 'Nhập email đã đăng ký để nhận liên kết đặt lại.'
                  : 'Mật khẩu mới cần từ 15 đến 64 ký tự.'}
              </p>

              {demoMode && (
                <div className="notice notice-conflict" role="status">
                  Bản dùng thử chưa gửi email. Hãy chạy bản API thật để dùng chức năng này.
                </div>
              )}

              {mode === 'forgot' ? (
                <form onSubmit={submitForgot} noValidate>
                  {error && <div className="notice notice-error" role="alert">{error}</div>}
                  <Field label="Email" error={errors.email}>
                    <input
                      disabled={busy}
                      required
                      type="email"
                      autoComplete="email"
                      placeholder="ban@example.com"
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                    />
                  </Field>
                  <Button disabled={busy || demoMode} type="submit">
                    {busy ? <LoaderCircle size={17} className="spin" /> : <KeyRound size={17} />}
                    {busy ? 'Đang gửi…' : 'Gửi liên kết đặt lại'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={submitReset} noValidate>
                  {error && <div className="notice notice-error" role="alert">{error}</div>}
                  <Field label="Mật khẩu mới" error={errors.password} help="15–64 ký tự. Cho phép khoảng trắng.">
                    <input
                      disabled={busy}
                      required
                      type={show ? 'text' : 'password'}
                      autoComplete="new-password"
                      minLength={15}
                      maxLength={64}
                      value={password}
                      onChange={event => setPassword(event.target.value)}
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
                  <Button disabled={busy || demoMode || !token} type="submit">
                    {busy ? <LoaderCircle size={17} className="spin" /> : <ShieldCheck size={17} />}
                    {busy ? 'Đang lưu…' : 'Đặt lại mật khẩu'}
                  </Button>
                  {!token && (
                    <p className="field-help" style={{ marginTop: 12 }}>
                      Thiếu mã đặt lại. Mở liên kết trong email hoặc{' '}
                      <button type="button" className="text-link" onClick={() => setMode('forgot')}>yêu cầu liên kết mới</button>.
                    </p>
                  )}
                </form>
              )}

              <button disabled={busy} className="auth-switch" onClick={onDone}>
                Quay lại đăng nhập
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
