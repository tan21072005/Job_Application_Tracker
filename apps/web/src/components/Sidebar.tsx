import { ChevronLeft, ChevronRight, Crown, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { featureGroups, type FeatureKey } from '../features';
import { Logo } from './ui';

type Props = {
  collapsed: boolean;
  onToggle: () => void;
  navigation: ReactNode;
  enterpriseEnabled: boolean;
  accountEmail: string;
  isPro: boolean;
  onAccount: () => void;
  onUpgrade: () => void;
  onTrash: () => void;
  onFeature: (key: FeatureKey) => void;
};

export default function Sidebar({
  collapsed, onToggle, navigation, enterpriseEnabled, accountEmail, isPro, onAccount, onUpgrade, onTrash, onFeature
}: Props) {
  return (
    <aside className="sidebar" aria-label="Thanh điều hướng tính năng">
      <div className="sidebar-head">
        <Logo />
        <button
          className="sidebar-toggle"
          onClick={onToggle}
          aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Mở rộng' : 'Thu gọn'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
      <nav aria-label="Điều hướng chính">
        {navigation}
        {featureGroups.map(group => {
          if (group.id === 'enterprise' && !enterpriseEnabled) return null;
          return (
            <div className="sidebar-group" key={group.id}>
              <span className="sidebar-group-label">{group.label}</span>
              {group.items.map(item => (
                <button
                  key={item.key}
                  className={`sidebar-trash-btn ${item.className ?? ''}`.trim()}
                  title={item.label}
                  data-label={item.label}
                  data-feature={item.key}
                  onClick={() => onFeature(item.key)}
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          );
        })}
        <div className="sidebar-group">
          <span className="sidebar-group-label">Hệ thống</span>
          <button className="sidebar-trash-btn" title="Thùng rác" data-label="Thùng rác" onClick={onTrash}>
            <Trash2 size={16} />
            <span>Thùng rác</span>
          </button>
          <button className="sidebar-trash-btn pro-btn" title="Gói Pro" data-label="Gói Pro" onClick={onUpgrade}>
            <Crown size={16} className="text-amber-500" />
            <span>Gói Pro</span>
            {isPro && <span className="pro-pill-badge" style={{ marginLeft: 'auto' }}>PRO</span>}
          </button>
        </div>
      </nav>
      <div className="sidebar-message">
        <span className="sidebar-rule" />
        <strong>Từng bước một.</strong>
        <p>Một nơi cho những cơ hội<br />và bước tiếp theo của bạn.</p>
      </div>
      <button className="sidebar-account" onClick={onAccount} title={accountEmail || 'Không gian cá nhân'} data-label="Tài khoản">
        <span className="avatar">{accountEmail ? accountEmail.slice(0, 2).toUpperCase() : 'TK'}</span>
        <span>
          <strong>{accountEmail ? accountEmail.split('@')[0] : 'Tài khoản'}</strong>
          <small>Không gian cá nhân</small>
        </span>
        <ChevronRight size={16} />
      </button>
    </aside>
  );
}
