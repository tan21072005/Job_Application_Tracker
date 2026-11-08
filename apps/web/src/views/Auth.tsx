import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, CalendarDays, Check, Eye, EyeOff, KeyRound, LoaderCircle } from 'lucide-react';
import { demoMode, repository } from '../data';
import { ApiError } from '../transport';
import { Button, Field, Logo } from '../components/ui';

export default function Auth({ onEnter, onForgot, errorCode = '' }: { onEnter: (user?: { id: string; email: string }) => void; onForgot?: () => void; errorCode?: string }) {
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [googleAvailable, setGoogleAvailable] = useState(false);

  useEffect(() => {
    if (demoMode) return;
    let active = true;
    fetch('/api/auth/providers', { credentials: 'include' })
      .then(response => (response.ok ? response.json() : { google: false }))
      .then((body: { google?: boolean }) => { if (active) setGoogleAvailable(body.google === true); })
      .catch(() => { if (active) setGoogleAvailable(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!errorCode) return;
    const messages: Record<string, string> = {
      access_denied: 'Bạn đã huỷ đăng nhập Google. Có thể đăng nhập bằng email và mật khẩu.',
      google_not_configured: 'Đăng nhập Google chưa được cấu hình trên máy chủ này.',
      google_state_mismatch: 'Phiên đăng nhập Google không hợp lệ. Hãy thử lại từ đầu.',
      google_state_expired: 'Phiên đăng nhập Google đã hết hạn. Hãy thử lại.',
      google_missing_code: 'Google không trả về mã đăng nhập. Hãy thử lại.',
      google_email_unverified: 'Email Google của bạn chưa được xác minh nên không thể đăng nhập.',
      google_failed: 'Đăng nhập Google không thành công. Hãy thử lại hoặc dùng email và mật khẩu.',
      rate_limited: 'Bạn thử quá nhiều lần. Hãy đợi vài phút rồi thử lại.'
    };
    setError(messages[errorCode] || 'Đăng nhập Google không thành công. Hãy thử lại.');
  }, [errorCode]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');
    const invalid: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) invalid.email = 'Nhập địa chỉ email hợp lệ.';
    if (!password) invalid.password = 'Nhập mật khẩu.';
    else if (register && (password.length < 15 || password.length > 64)) invalid.password = 'Mật khẩu cần từ 15–64 ký tự.';
    setErrors(invalid);
    if (Object.keys(invalid).length) {
      requestAnimationFrame(() => document.querySelector<HTMLInputElement>('.field-error input')?.focus());
      return;
    }
    if (demoMode) {
      setError('Đây là bản dùng thử. Chọn “Khám phá giao diện” để dùng dữ liệu mẫu.');
      return;
    }
    if (register && (password.length < 15 || password.length > 64)) {
      setError('Mật khẩu cần từ 15–64 ký tự.');
      return;
    }
    setBusy(true);
    try {
      const user = await repository.login(email.trim(), password, register);
      onEnter(user);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.fields && Object.keys(err.fields).length > 0) {
        setErrors(err.fields);
        requestAnimationFrame(() => document.querySelector<HTMLInputElement>('.field-error input')?.focus());
      }
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-story">
        <Logo />
        <div className="auth-story-content">
          <h1>Mỗi cơ hội.<br />Một bước tiến.</h1>
          <p>Để hành trình tìm việc rõ ràng hơn, từ cơ hội đầu tiên đến buổi phỏng vấn tiếp theo.</p>
          <div className="auth-example">
            <div>
              <span className="auth-example-icon"><CalendarDays size={23} /></span>
              <span>Vòng kỹ thuật<small>Frontend Developer · FPT Software</small></span>
              <Check size={19} />
            </div>
            <p>Một nơi cho hồ sơ, lịch phỏng vấn và bước tiếp theo.</p>
          </div>
        </div>
        <span className="auth-story-footer">JobTrack · Không gian ứng tuyển của bạn</span>
      </section>

      <section className="auth-form">
        <div>
          <h2>{register ? 'Bắt đầu hành trình mới' : 'Chào mừng trở lại'}</h2>
          <p>{register ? 'Tạo tài khoản để theo dõi những cơ hội của bạn.' : 'Đăng nhập để tiếp tục hành trình ứng tuyển.'}</p>
          
          <form onSubmit={submit} noValidate>
            {error && <div className="notice notice-error" role="alert">{error}</div>}

            {googleAvailable && (
              <>
                <a className="auth-google" href="/api/auth/google/start">
                  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  Tiếp tục với Google
                </a>
                <div className="auth-divider" aria-hidden="true"><span>hoặc tiếp tục bằng email</span></div>
              </>
            )}

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

            <Field label="Mật khẩu" error={errors.password} help={register ? '15–64 ký tự. Cho phép khoảng trắng.' : undefined}>
              <input
                disabled={busy}
                required
                type={show ? 'text' : 'password'}
                autoComplete={register ? 'new-password' : 'current-password'}
                minLength={register ? 15 : undefined}
                maxLength={64}
                value={password}
                onChange={event => setPassword(event.target.value)}
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

            {!register && (
              <button
                type="button"
                disabled={busy}
                className="password-toggle"
                onClick={() => onForgot?.()}
              >
                <KeyRound size={16} />
                Quên mật khẩu?
              </button>
            )}

            <Button disabled={busy} type="submit">
              {busy ? <LoaderCircle size={17} className="spin" /> : null}
              {busy ? 'Đang xử lý…' : register ? 'Tạo tài khoản' : 'Đăng nhập'}
              <ArrowRight size={17} />
            </Button>
          </form>

          <button
            disabled={busy}
            className="auth-switch"
            onClick={() => {
              setRegister(current => !current);
              setError('');
              setErrors({});
            }}
          >
            {register ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
          </button>

          {demoMode && (
            <div className="demo-entry">
              <span>Muốn xem trước?</span>
              <Button kind="secondary" onClick={() => onEnter()}>
                Khám phá giao diện<ArrowRight size={17} />
              </Button>
              <small>Dữ liệu mẫu được lưu trong trình duyệt này.</small>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
