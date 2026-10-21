import { useState, type FormEvent } from 'react';
import { Check, LoaderCircle } from 'lucide-react';
import { deviceTimezone, instantToLocal, resolveLocalTime, type Application } from '../domain';
import { repository } from '../data';
import { ApiError } from '../transport';
import { Button, Dialog, Field } from './ui';
import { useUnsaved } from './useUnsaved';

export default function QuickAction({ app, onClose, onSaved }: { app: Application; onClose: () => void; onSaved: () => void }) {
  const [action, setAction] = useState(app.nextAction);
  const [deadline, setDeadline] = useState(instantToLocal(app.deadline));
  const [deadlineInstant, setDeadlineInstant] = useState(app.deadline ? new Date(app.deadline).toISOString() : '');
  const [baselineVersion, setBaselineVersion] = useState(app.version);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [remote, setRemote] = useState<Application | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const initialLocal = app.deadline ? instantToLocal(app.deadline) : '';
  const [initial] = useState(() => JSON.stringify([action, deadline, deadlineInstant]));
  const guard = useUnsaved(JSON.stringify([action, deadline, deadlineInstant]) !== initial, onClose, busy);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const matches = deadline ? resolveLocalTime(deadline, deviceTimezone) : [];
    if (deadline && (!matches.length || (matches.length > 1 && !matches.includes(deadlineInstant)))) {
      setError(matches.length ? 'Giờ deadline xuất hiện hai lần. Chọn đúng thời điểm.' : 'Giờ deadline không tồn tại trong múi giờ thiết bị.');
      return;
    }
    const deadlineChanged = deadline !== initialLocal || (deadlineInstant !== '' && deadlineInstant !== app.deadline);
    const targetDeadlineInstant = !action.trim() || !deadline ? undefined : (!deadlineChanged && app.deadline) ? app.deadline : (matches.length === 1 ? matches[0] : deadlineInstant);

    setBusy(true); setError('');
    try {
      await repository.save({ ...app, nextAction: action.trim(), deadline: action.trim() ? deadline : '' }, app.id, { version: baselineVersion, deadlineInstant: targetDeadlineInstant });
      onSaved();
    }
    catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 422) {
          if (err.fields && Object.keys(err.fields).length > 0) {
            setErrors(err.fields);
            requestAnimationFrame(() => document.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('.field-error input, .field-error select, .field-error textarea')?.focus());
          }
          setError(err.message || 'Thông tin hành động chưa hợp lệ. Vui lòng kiểm tra lại.');
          return;
        }
        if (err.status === 412) {
          try {
            const list = await repository.list();
            const latest = list.find(a => a.id === app.id);
            if (latest) {
              setRemote(latest);
              setError('Hồ sơ đã được cập nhật ở nơi khác. Xem khác biệt bên dưới.');
              return;
            }
          } catch { /* fallback */ }
        }
      }
      setError(err instanceof ApiError && err.status === 401 ? 'Phiên đã hết hạn. Đăng nhập lại cùng tài khoản ở tab khác, rồi thử lưu để giữ nội dung đang nhập.' : (err as Error).message);
    }
    finally { setBusy(false); }
  }
  return <Dialog title="Cập nhật bước tiếp theo" onClose={guard.close} busy={busy}><form onSubmit={save}><div className="dialog-body"><p className="form-intro">{app.company} · {app.position}</p>{guard.warning}{error && <div className="notice notice-error" role="alert">{error}</div>}
    {remote && (
      <div className="notice notice-conflict" role="status">
        <div>
          <h3>Bản mới nhất trên máy chủ (v{remote.version})</h3>
          <p>Bước tiếp theo hiện tại: {remote.nextAction || 'Chưa có'}</p>
          <p>Deadline hiện tại: {remote.deadline ? instantToLocal(remote.deadline) : 'Chưa có'}</p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <Button type="button" kind="secondary" onClick={() => { setAction(remote.nextAction); setDeadline(instantToLocal(remote.deadline)); setBaselineVersion(remote.version); setRemote(null); setError(''); }}>
              Tải bản mới
            </Button>
            <Button type="button" kind="secondary" onClick={() => { setBaselineVersion(remote.version); setRemote(null); setError('Đã cập nhật phiên bản cơ sở. Bấm Lưu bước tiếp theo để áp lại.'); }}>
              Áp lại thay đổi
            </Button>
          </div>
        </div>
      </div>
    )}
    <fieldset disabled={busy}><legend className="sr-only">Việc cần làm</legend><Field label="Hành động tiếp theo" error={errors.nextAction}><input autoFocus maxLength={250} value={action} onChange={event => { setAction(event.target.value); setErrors(c => { const n = { ...c }; delete n.nextAction; return n; }); if (!event.target.value.trim()) setDeadline(''); }} placeholder="Ví dụ: Gửi portfolio cho nhà tuyển dụng" /></Field><Field label="Deadline" error={errors.deadline} help={`Giờ thiết bị: ${deviceTimezone}. Xóa hành động sẽ xóa cả deadline.`}><input type="datetime-local" disabled={!action.trim()} value={deadline} onChange={event => {setDeadline(event.target.value);setDeadlineInstant(''); setErrors(c => { const n = { ...c }; delete n.deadline; return n; }); }} /></Field>{deadline&&resolveLocalTime(deadline,deviceTimezone).length>1&&<Field label="Giờ xuất hiện hai lần — chọn đúng offset"><select value={deadlineInstant} onChange={event=>setDeadlineInstant(event.target.value)}><option value="">Chọn đúng thời điểm</option>{resolveLocalTime(deadline,deviceTimezone).map(time=><option key={time} value={time}>{time}</option>)}</select></Field>}{app.nextAction && <Button kind="ghost" type="button" onClick={() => { setAction(''); setDeadline(''); }}>Xóa hành động và deadline</Button>}</fieldset></div><footer className="dialog-actions"><Button kind="secondary" type="button" disabled={busy} onClick={guard.close}>Hủy</Button><Button disabled={busy} type="submit">{busy ? <LoaderCircle size={17} className="spin" /> : <Check size={17} />}{busy ? 'Đang lưu…' : 'Lưu bước tiếp theo'}</Button></footer></form></Dialog>;
}
