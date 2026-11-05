import { useState, type FormEvent } from 'react';
import { ArrowRight, CalendarDays, Check, Eye, EyeOff, KeyRound, LoaderCircle } from 'lucide-react';
import { demoMode, repository } from '../data';
import { ApiError } from '../transport';
import { Button, Field, Logo } from '../components/ui';

export default function Auth({ onEnter, onForgot }: { onEnter: (user?: { id: string; email: string }) => void; onForgot?: () => void }) {
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

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
