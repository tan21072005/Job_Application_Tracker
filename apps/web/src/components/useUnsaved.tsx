import { useEffect, useRef, useState } from 'react';
import { Button } from './ui';

// Keep drafts in component memory; never put application notes in URLs or extra storage.
export function useUnsaved(dirty: boolean, onClose: () => void, busy = false) {
  const [confirm, setConfirm] = useState(false);
  const warningRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (confirm) { warningRef.current?.scrollIntoView({ block: 'center' }); warningRef.current?.focus({ preventScroll: true }); }
  }, [confirm]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  return {
    close: () => { if (!busy) { if (dirty) setConfirm(true); else onClose(); } },
    warning: confirm ? <div ref={warningRef} tabIndex={-1} className="unsaved-warning" role="alert"><strong>Bạn có thay đổi chưa lưu.</strong><p>Tiếp tục chỉnh sửa hoặc bỏ thay đổi để đóng form.</p><div><Button type="button" kind="secondary" disabled={busy} onClick={() => { if (!busy) setConfirm(false); }}>Tiếp tục sửa</Button><Button type="button" kind="danger" disabled={busy} onClick={() => { if (!busy) onClose(); }}>Bỏ thay đổi</Button></div></div> : null,
  };
}
