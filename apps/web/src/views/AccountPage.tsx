import {
  Crown, FileText, KeyRound, LogOut, RotateCcw, Settings, UserCheck
} from 'lucide-react';
import { Button } from '../components/ui';

export default function AccountPage({
  demoMode, accountEmail, isPro, onSettings, onUpgrade, onResume, onProfile, onGrants, onPassword, onResetDemo, onLogout
}: {
  demoMode: boolean;
  accountEmail: string;
  isPro: boolean;
  onSettings: () => void;
  onUpgrade: () => void;
  onResume: () => void;
  onProfile: () => void;
  onGrants: () => void;
  onPassword: () => void;
  onResetDemo: () => void;
  onLogout: () => void;
}) {
  return (
    <section className="account-page">
      <header className="account-page-header">
        <span className="avatar">{demoMode ? 'NT' : accountEmail ? accountEmail.slice(0, 2).toUpperCase() : 'TK'}</span>
        <div>
          <h1>{demoMode ? 'Nhật Tân' : 'Tài khoản'}</h1>
          <p>{demoMode ? 'Đang khám phá với dữ liệu mẫu.' : accountEmail || 'Không gian ứng tuyển cá nhân.'}</p>
        </div>
      </header>

      <div className="account-page-grid">
        <Button kind="secondary" onClick={onSettings}><Settings size={16} />Cài đặt & tuỳ chọn</Button>
        <Button kind="secondary" onClick={onUpgrade}><Crown size={16} className="text-amber-500" />{isPro ? 'Quản lý gói Pro' : 'Nâng cấp JobTrack Pro'}</Button>
        <Button kind="secondary" onClick={onResume}><FileText size={16} />Quản lý phiên bản CV (ATS)</Button>
        <Button kind="secondary" onClick={onProfile}><UserCheck size={16} />Hồ sơ ứng viên cá nhân</Button>
        <Button kind="secondary" onClick={onGrants}><KeyRound size={16} />Kết nối AI & MCP</Button>
        <Button kind="secondary" onClick={onPassword}><KeyRound size={16} />Đổi mật khẩu & phiên</Button>
        {demoMode && <Button kind="secondary" onClick={onResetDemo}><RotateCcw size={16} />Khôi phục dữ liệu mẫu</Button>}
      </div>

      <div className="account-page-foot">
        <Button kind="ghost" onClick={onLogout}><LogOut size={17} />Đăng xuất</Button>
      </div>
    </section>
  );
}
