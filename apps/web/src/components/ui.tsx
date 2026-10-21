import { cloneElement, isValidElement, useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactElement, type ReactNode } from 'react';
import { ArrowUpRight, BriefcaseBusiness, X } from 'lucide-react';
import { labels, type Status } from '../domain';

export function Button({ kind = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { kind?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  return <button {...props} className={`button button-${kind} ${className}`} />;
}

export function Logo() {
  return <a href="#dashboard" className="brand" aria-label="JobTrack — Tổng quan"><span className="brand-mark">J</span><span>JobTrack</span></a>;
}

export function Monogram({ company }: { company: string }) {
  const letters = company.trim().split(/\s+/).map(word => word[0]).slice(0, 2).join('').toUpperCase();
  return <span className="monogram" aria-hidden="true">{letters}</span>;
}

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`status status-${status}`}><span aria-hidden="true" />{labels[status]}</span>;
}

export function Empty({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <section className="empty-state"><span className="empty-icon"><BriefcaseBusiness size={28} strokeWidth={1.5} /></span><h2>{title}</h2><p>{children}</p>{action}</section>;
}

export function Field({ label, error, help, children }: { label: string; error?: string; help?: string; children: ReactNode }) {
  const id = useId();
  const control = isValidElement(children) ? cloneElement(children as ReactElement<Record<string, unknown>>, {
    id, 'aria-invalid': error ? true : undefined,
    'aria-describedby': error || help ? `${id}-help` : undefined,
  }) : children;
  return <div className={`field ${error ? 'field-error' : ''}`}><label htmlFor={id}>{label}</label>{control}{(error || help) && <small id={`${id}-help`} role={error ? 'alert' : undefined}>{error || help}</small>}</div>;
}

export function Dialog({ title, children, onClose, wide = false, busy = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean; busy?: boolean }) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => { dialog?.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <dialog ref={ref} className={`dialog ${wide ? 'dialog-wide' : ''}`} aria-labelledby={id}
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    onClick={event => {
      if (event.target !== event.currentTarget || busy) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    }}>
    <header className="dialog-header"><h2 id={id}>{title}</h2><button className="icon-button" aria-label="Đóng" disabled={busy} onClick={onClose}><X size={20} /></button></header>
    {children}
  </dialog>;
}

export function TextLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button className="text-link" onClick={onClick}>{children}<ArrowUpRight size={16} /></button>;
}
