import { Database, Settings, TrendingUp, Compass, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { featureGroups, type FeatureKey } from '../features';

const pages = [
  { href: '#analytics', label: 'Phân tích', icon: TrendingUp },
  { href: '#roadmap', label: 'Lộ trình AI', icon: Compass },
  { href: '#datasets', label: 'Dữ liệu Web', icon: Database },
  { href: '#settings', label: 'Cài đặt', icon: Settings }
];

export default function MobileDrawer({
  open, onClose, onFeature, onSettings, enterpriseEnabled
}: {
  open: boolean;
  onClose: () => void;
  onFeature: (key: FeatureKey) => void;
  onSettings: () => void;
  enterpriseEnabled: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="mobile-drawer"
      aria-label="Tất cả tính năng"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="mobile-drawer-panel">
        <header className="mobile-drawer-head">
          <h2>Tất cả tính năng</h2>
          <button className="icon-button" aria-label="Đóng" onClick={onClose}><X size={20} /></button>
        </header>
        <div className="mobile-drawer-body">
          <section>
            <h3>Điều hướng</h3>
            <div className="mobile-drawer-grid mobile-drawer-grid-pages">
              {pages.map(page => (
                <a key={page.href} href={page.href} onClick={onClose}>
                  <page.icon size={20} />
                  <span>{page.label}</span>
                </a>
              ))}
            </div>
          </section>
          {featureGroups.map(group => {
            if (group.id === 'enterprise' && !enterpriseEnabled) return null;
            return (
              <section key={group.id}>
                <h3>{group.label}</h3>
                <div className="mobile-drawer-grid">
                  {group.items.map(item => (
                    <button key={item.key} onClick={() => { onFeature(item.key); onClose(); }}>
                      <item.icon size={20} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
          <button className="mobile-drawer-settings" onClick={() => { onSettings(); onClose(); }}>Tài khoản & cài đặt</button>
        </div>
      </div>
    </dialog>
  );
}
