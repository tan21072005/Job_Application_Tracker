import { useMemo, useState, type FormEvent } from 'react';
import { Check, ChevronDown, CircleAlert, Clock3, LoaderCircle } from 'lucide-react';
import { deviceTimezone, duplicate, emptyDraft, formatTime, instantToLocal, labels, normalizedUrl, resolveLocalTime, statuses, validateDraft, type Application, type Draft, type Interview, type Status } from '../domain';
import { repository } from '../data';
import { ApiError } from '../transport';
import { Button, Dialog, Field } from './ui';
import { useUnsaved } from './useUnsaved';

export const interviewLabels = { Scheduled: 'Đã lên lịch', Completed: 'Hoàn tất', Cancelled: 'Đã hủy' };

export function ApplicationForm({ app, apps, onClose, onSaved, onOpenExisting, onReload }: { app?: Application; apps: Application[]; onClose: () => void; onSaved: (id: string) => void; onOpenExisting?: (id: string) => void; onReload: () => void }) {
  const [draft, setDraft] = useState<Draft>(() => app ? { ...app, deadline: instantToLocal(app.deadline) } : { ...emptyDraft });
  const [deadlineInstant, setDeadlineInstant] = useState(app?.deadline ? new Date(app.deadline).toISOString() : '');
  const [baselineVersion, setBaselineVersion] = useState(app?.version);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [firstSentAt, setFirstSentAt] = useState<number | null>(null);
  const [unresolvedTimeout, setUnresolvedTimeout] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [remote, setRemote] = useState<Application | null>(null);
  const [conflict, setConflict] = useState<Application | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const initialLocalDeadline = useMemo(() => app?.deadline ? instantToLocal(app.deadline) : '', [app?.deadline]);
  const [initial] = useState(() => JSON.stringify([draft, deadlineInstant]));
  const guard = useUnsaved(JSON.stringify([draft, deadlineInstant]) !== initial, onClose, busy);
  function set(key: keyof Draft, value: string) {
    setDraft(current => ({ ...current, [key]: value, ...(key === 'nextAction' && !value.trim() ? { deadline: '' } : {}) }));
    if (key === 'deadline') setDeadlineInstant('');
    setErrors(current => { if (!current[key]) return current; const next = { ...current }; delete next[key]; return next; });
    setKey(crypto.randomUUID()); setFirstSentAt(null); setUnresolvedTimeout(false); setConfirmed(false); setConflict(null);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (firstSentAt && Date.now() - firstSentAt > 23 * 3600 * 1000) {
      setUnresolvedTimeout(true);
      setMessage('Yêu cầu trước đó chưa rõ kết quả và đã quá thời hạn 24 giờ của máy chủ. Vui lòng kiểm tra lại danh sách hồ sơ trước khi gửi lại.');
      return;
    }
    const invalid = validateDraft(draft);
    setErrors(invalid);
    if (Object.keys(invalid).length) { requestAnimationFrame(() => document.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('.field-error input, .field-error select, .field-error textarea')?.focus()); return; }
    
    let shouldCheckDuplicate = !app;
    if (app) {
      const identity = (v: string) => v.trim().normalize('NFKC').toLocaleLowerCase('und');
      const urlChanged = normalizedUrl(draft.url) !== normalizedUrl(app.url);
      const sourceCodeChanged =
        (draft.source.trim() && draft.jobCode.trim()
          ? identity(draft.source) !== identity(app.source) || identity(draft.jobCode) !== identity(app.jobCode)
          : Boolean(app.source.trim() && app.jobCode.trim()));
      const identityChanged = urlChanged || sourceCodeChanged;
      const reactivated = ['Rejected', 'Withdrawn'].includes(app.status) && !['Rejected', 'Withdrawn'].includes(draft.status);
      shouldCheckDuplicate = identityChanged || reactivated;
    }
    if (shouldCheckDuplicate) {
      const existing = duplicate(apps, draft, app?.id);
      if (existing && (!confirmed || !['Rejected', 'Withdrawn'].includes(existing.status))) { setConflict(existing); return; }
    }
    const times = draft.deadline ? resolveLocalTime(draft.deadline, deviceTimezone) : [];
    if (draft.deadline && (!times.length || (times.length > 1 && !times.includes(deadlineInstant)))) { setMessage(times.length ? 'Giờ deadline xuất hiện hai lần. Chọn đúng thời điểm.' : 'Giờ deadline không tồn tại trong múi giờ thiết bị.'); return; }
    
    const deadlineChanged = draft.deadline !== initialLocalDeadline || (deadlineInstant !== '' && deadlineInstant !== app?.deadline);
    const targetDeadlineInstant = !draft.deadline ? undefined : (!deadlineChanged && app?.deadline) ? app.deadline : (times.length === 1 ? times[0] : deadlineInstant);

    setBusy(true); setMessage('');
    if (!firstSentAt) setFirstSentAt(Date.now());
    try { const result = await repository.save({ ...draft, company: draft.company.trim(), position: draft.position.trim() }, app?.id, { version: baselineVersion, confirmReapply: confirmed, key, deadlineInstant: targetDeadlineInstant }); onSaved(result.id); }
    catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          if (error.code === 'reapply_confirmation_required' || error.code === 'duplicate') {
            const isReapply = error.code === 'reapply_confirmation_required';
            const target = (error.existing && apps.find(a => a.id === error.existing!.id)) || {
              id: error.existing?.id || '',
              company: draft.company,
              position: draft.position,
              status: (error.existing?.status as Status) || (isReapply ? 'Rejected' : 'Applied'),
              url: draft.url,
              source: draft.source,
              jobCode: draft.jobCode,
              location: '',
              workMode: '',
              appliedAt: '',
              salary: '',
              notes: '',
              nextAction: '',
              deadline: '',
              createdAt: '',
              interviews: []
            };
            setConflict(target);
            return;
          }
        }
        if (error.status === 422) {
          if (error.fields && Object.keys(error.fields).length > 0) {
            setErrors(error.fields);
            requestAnimationFrame(() => document.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('.field-error input, .field-error select, .field-error textarea')?.focus());
          }
          setMessage(error.message || 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại các trường báo lỗi.');
          return;
        }
      }
      setMessage(error instanceof ApiError && error.status === 401 ? 'Phiên đã hết hạn. Đăng nhập lại cùng tài khoản ở tab khác, rồi thử lưu để giữ bản nháp.' : (error as Error).message);
      if (app && error instanceof ApiError && error.status === 412) { try { setRemote((await repository.list()).find(record => record.id === app.id) || null); } catch { /* Keep the draft and the conflict message. */ } }
    }
    finally { setBusy(false); }
  }
  function input(key: keyof Draft, label: string, type = 'text', required = false, placeholder?: string) {
    const max = key === 'url' ? 2000 : (key === 'source' || key === 'jobCode') ? 128 : 250;
    return <Field label={label} error={errors[key]}><input name={key} type={type} autoFocus={key === 'company'} required={required} value={draft[key]} placeholder={placeholder} maxLength={max} onChange={event => set(key, event.target.value)} /></Field>;
  }
  return <Dialog title={app ? 'Sửa hồ sơ' : 'Thêm cơ hội mới'} onClose={guard.close} wide busy={busy}><form onSubmit={save} noValidate>
    <div className="dialog-body">{guard.warning}<p className="form-intro">Bắt đầu với công ty và vị trí. Bổ sung chi tiết khi bạn sẵn sàng.</p>
      {message && <div className="notice notice-error" role="alert"><CircleAlert size={18} />{message}</div>}
      {unresolvedTimeout && (
        <div className="notice notice-conflict" role="alert">
          <div>
            <h3>Yêu cầu quá hạn xác nhận</h3>
            <p>Yêu cầu tạo hồ sơ trước đó có thể đã quá thời hạn lưu khóa của máy chủ (24 giờ). Vui lòng kiểm tra danh sách hoặc chọn tạo lại với khóa mới.</p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <Button type="button" kind="secondary" onClick={onReload}>Về danh sách kiểm tra</Button>
              <Button type="button" kind="secondary" onClick={() => { setKey(crypto.randomUUID()); setFirstSentAt(null); setUnresolvedTimeout(false); setMessage(''); }}>Tạo lại với khóa mới</Button>
            </div>
          </div>
        </div>
      )}
      {remote && <div className="notice notice-conflict" role="status"><div><h3>Bản mới nhất trên máy chủ</h3><p>{remote.company} · {remote.position} · {labels[remote.status]}</p><p>Ghi chú: {remote.notes || 'Chưa có'} · Bước tiếp theo: {remote.nextAction || 'Chưa có'}</p><div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}><Button type="button" kind="secondary" onClick={onReload}>Bỏ bản nháp và tải bản mới</Button><Button type="button" kind="secondary" onClick={() => { setBaselineVersion(remote.version); setRemote(null); setMessage('Đã cập nhật phiên bản cơ sở. Bấm Lưu thay đổi để áp lại.'); }}>Áp lại thay đổi</Button></div></div></div>}
      {conflict && <div className="notice notice-conflict" role="alert"><div><h3>{['Rejected', 'Withdrawn'].includes(conflict.status) ? 'Bạn muốn ứng tuyển lại?' : 'Tin này đã có trong hồ sơ'}</h3><p>{conflict.company} · {conflict.position} · {labels[conflict.status]}</p>{['Rejected', 'Withdrawn'].includes(conflict.status) ? <Button type="button" kind="secondary" onClick={() => { setConfirmed(true); setConflict(null); }}>Xác nhận ứng tuyển lại</Button> : <Button type="button" kind="secondary" onClick={() => onOpenExisting ? onOpenExisting(conflict.id) : onSaved(conflict.id)}>Mở hồ sơ đã có</Button>}</div></div>}
      {confirmed && <p className="confirmation-note" role="status">Đã xác nhận ứng tuyển lại. Bấm Tạo hồ sơ để lưu lần ứng tuyển mới.</p>}
      <fieldset disabled={busy}><legend>Thông tin cơ hội</legend><div className="form-grid">{input('company', 'Tên công ty *', 'text', true, 'Ví dụ: FPT Software')}{input('position', 'Tên vị trí *', 'text', true, 'Ví dụ: Frontend Developer')}<div className="full-width">{input('url', 'URL tin tuyển dụng', 'url', false, 'https://…')}</div>{input('source', 'Nguồn tuyển dụng', 'text', false, 'Ví dụ: FPT Careers')}{input('jobCode', 'Mã tin tuyển dụng', 'text', false, 'Nếu có')}</div></fieldset>
      <details className="additional-fields" open={Boolean(app)}><summary>Thông tin bổ sung<ChevronDown size={18} /></summary><fieldset disabled={busy}><legend className="sr-only">Thông tin bổ sung</legend><div className="form-grid">{input('location', 'Địa điểm')}<Field label="Hình thức làm việc" error={errors.workMode}><select value={draft.workMode} onChange={event => set('workMode', event.target.value)}><option value="">Chưa bổ sung</option>{['On-site', 'Hybrid', 'Remote'].map(value => <option key={value}>{value}</option>)}</select></Field>{input('appliedAt', 'Ngày nộp', 'date')}{input('salary', 'Lương tham khảo', 'text', false, 'Ví dụ: 20–25 triệu/tháng')}</div></fieldset></details>
      <fieldset disabled={busy}><legend>Trạng thái hồ sơ</legend><Field label="Trạng thái hiện tại" error={errors.status}><select value={draft.status} onChange={event => set('status', event.target.value)}>{statuses.map(status => <option key={status} value={status}>{labels[status]}</option>)}</select></Field></fieldset>
      <fieldset disabled={busy}><legend>Ghi chú & bước tiếp theo</legend><Field label="Ghi chú" error={errors.notes}><textarea rows={3} maxLength={5000} value={draft.notes} placeholder="Điều bạn muốn ghi nhớ về cơ hội này…" onChange={event => set('notes', event.target.value)} /></Field><div className="form-grid">{input('nextAction', 'Hành động tiếp theo', 'text', false, 'Một việc cần làm tiếp theo')}{input('deadline', 'Deadline', 'datetime-local')}</div>{draft.deadline && resolveLocalTime(draft.deadline,deviceTimezone).length>1 && <Field label="Giờ xuất hiện hai lần — chọn đúng offset"><select value={deadlineInstant} onChange={event=>setDeadlineInstant(event.target.value)}><option value="">Chọn đúng thời điểm</option>{resolveLocalTime(draft.deadline,deviceTimezone).map(time=><option key={time} value={time}>{time}</option>)}</select></Field>}<p className="field-help">Một hành động hiện tại. Xóa hành động sẽ xóa cả deadline. Giờ thiết bị: {deviceTimezone}.</p></fieldset>
    </div><footer className="dialog-actions"><Button type="button" kind="secondary" disabled={busy} onClick={guard.close}>Hủy</Button><Button type="submit" disabled={busy || Boolean(conflict && !['Rejected', 'Withdrawn'].includes(conflict.status))}>{busy ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}{busy ? 'Đang lưu…' : app ? 'Lưu thay đổi' : 'Tạo hồ sơ'}</Button></footer>
  </form></Dialog>;
}

export function InterviewForm({ app, interview, onClose, onSaved }: { app: Application; interview?: Interview; onClose: () => void; onSaved: () => void }) {
  const initialLocal = useMemo(() => interview ? new Intl.DateTimeFormat('sv-SE', { timeZone: interview.timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(interview.at)).replace(' ', 'T').slice(0, 16) : '', [interview]);
  const [local, setLocal] = useState(() => initialLocal);
  const [draft, setDraft] = useState<Interview>(() => interview || { id: `new-${crypto.randomUUID()}`, title: '', at: '', timezone: deviceTimezone, format: 'Online', location: '', preparation: '', notes: '', status: 'Scheduled' });
  const [baselineVersion, setBaselineVersion] = useState(app.version);
  const [selected, setSelected] = useState(interview?.at || '');
  const [key] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initial] = useState(() => JSON.stringify([draft, local, selected]));
  const guard = useUnsaved(JSON.stringify([draft, local, selected]) !== initial, onClose, busy);
  const matches = useMemo(() => resolveLocalTime(local, draft.timezone), [local, draft.timezone]);
  const actual = matches.length === 1 ? matches[0] : matches.includes(selected) ? selected : '';
  const timezones = [...new Set([deviceTimezone, 'Asia/Ho_Chi_Minh', 'America/New_York', 'Europe/London', 'Asia/Singapore', 'UTC'])];
  const set = (key: keyof Interview, value: string) => {
    setDraft(current => ({ ...current, [key]: value }));
    setErrors(current => { if (!current[key]) return current; const next = { ...current }; delete next[key]; return next; });
  };
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const scheduleChanged = local !== initialLocal || draft.timezone !== (interview?.timezone ?? '') || (selected !== '' && selected !== interview?.at);
    const targetAt = (!scheduleChanged && interview) ? interview.at : actual;
    if (!targetAt) { setError('Chọn thời gian tồn tại và múi giờ IANA hợp lệ. Nếu giờ lặp, hãy chọn đúng offset.'); return; }
    setBusy(true); setError('');
    try { await repository.interview(app.id, { ...draft, title: draft.title.trim() || 'Phỏng vấn', at: targetAt }, baselineVersion, key); onSaved(); }
    catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 422) {
          if (err.fields && Object.keys(err.fields).length > 0) {
            setErrors(err.fields);
            requestAnimationFrame(() => document.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('.field-error input, .field-error select, .field-error textarea')?.focus());
          }
          setError(err.message || 'Thông tin phỏng vấn chưa hợp lệ. Vui lòng kiểm tra lại.');
          return;
        }
        if (err.status === 412) {
          try {
            const list = await repository.list();
            const latestParent = list.find(a => a.id === app.id);
            if (latestParent) {
              setBaselineVersion(latestParent.version);
              setError(`Hồ sơ cha đã được cập nhật phiên bản mới (v${latestParent.version}). Bấm Lưu để áp lại.`);
              return;
            }
          } catch { /* fallback */ }
        }
      }
      setError(err instanceof ApiError && err.status === 401 ? 'Phiên đã hết hạn. Đăng nhập lại cùng tài khoản ở tab khác, rồi thử lưu để giữ lịch đang nhập.' : (err as Error).message);
    }
    finally { setBusy(false); }
  }
  return <Dialog title={interview ? 'Sửa lịch phỏng vấn' : 'Thêm vòng phỏng vấn'} busy={busy} onClose={guard.close}><form onSubmit={save}>
    <div className="dialog-body">{guard.warning}<p className="form-intro">{app.company} · {app.position}</p>{error && <div className="notice notice-error" role="alert">{error}</div>}
      <fieldset disabled={busy}><legend>Lịch theo thư mời</legend><Field label="Tên vòng phỏng vấn" error={errors.title}><input autoFocus value={draft.title} maxLength={200} placeholder="Ví dụ: Vòng kỹ thuật" onChange={event => set('title', event.target.value)} /></Field>
        <Field label="Ngày và giờ theo thư mời *" error={errors.at}><input type="datetime-local" required value={local} onChange={event => { setLocal(event.target.value); setSelected(''); setErrors(c => { const n = { ...c }; delete n.at; return n; }); }} /></Field>
        <Field label="Múi giờ thư mời *" error={errors.timezone} help="Nhập mã IANA, ví dụ America/New_York."><input list="interview-timezones" required value={draft.timezone} onChange={event => { set('timezone', event.target.value); setSelected(''); }} /></Field><datalist id="interview-timezones">{timezones.map(zone => <option key={zone} value={zone} />)}</datalist>
        {local && !matches.length && <p className="inline-error" role="alert">Giờ này không tồn tại hoặc múi giờ chưa hợp lệ. Kiểm tra lại giờ trong thư mời.</p>}
        {matches.length > 1 && <Field label="Giờ xuất hiện hai lần — chọn theo thư mời"><select required value={selected} onChange={event => setSelected(event.target.value)}><option value="">Chọn đúng thời điểm</option>{matches.map(time => <option key={time} value={time}>{new Intl.DateTimeFormat('vi-VN', { timeZone: draft.timezone, hour: '2-digit', minute: '2-digit', timeZoneName: 'longOffset' }).format(new Date(time))} · {time}</option>)}</select></Field>}
        {actual && <div className="time-preview"><Clock3 size={20} /><div><strong>{formatTime(actual)} · giờ của bạn</strong><span>{deviceTimezone}</span><small>{formatTime(actual, draft.timezone)} · {draft.timezone}</small></div></div>}
      </fieldset>
      <fieldset disabled={busy}><legend>Thông tin buổi phỏng vấn</legend><Field label="Hình thức *" error={errors.format}><select value={draft.format} onChange={event => set('format', event.target.value)}>{['Online', 'Phone', 'On-site', 'Other'].map(format => <option key={format}>{format}</option>)}</select></Field><Field label="Địa điểm hoặc link" error={errors.location}><input value={draft.location} maxLength={2000} onChange={event => set('location', event.target.value)} /></Field><Field label="Chuẩn bị" error={errors.preparation}><textarea rows={3} value={draft.preparation} maxLength={5000} placeholder="Những điều cần chuẩn bị…" onChange={event => set('preparation', event.target.value)} /></Field><Field label="Ghi chú" error={errors.notes}><textarea rows={2} value={draft.notes} maxLength={5000} onChange={event => set('notes', event.target.value)} /></Field><Field label="Trạng thái" error={errors.status}><select value={draft.status} onChange={event => set('status', event.target.value)}>{Object.entries(interviewLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><p className="field-help">Dời lịch vẫn giữ trạng thái Đã lên lịch. Hoàn tất và Đã hủy là lựa chọn riêng.</p></fieldset>
    </div><footer className="dialog-actions"><Button type="button" kind="secondary" disabled={busy} onClick={guard.close}>Hủy</Button><Button type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}{busy ? 'Đang lưu…' : interview ? 'Lưu thay đổi' : 'Tạo phỏng vấn'}</Button></footer>
  </form></Dialog>;
}
