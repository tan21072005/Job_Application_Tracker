import { useEffect, useState } from 'react';
import {
  BellRing, Check, Crown, Database, Download, FileSpreadsheet, FileText, KeyRound, LoaderCircle,
  Mail, Monitor, Moon, ShieldCheck, Sparkles, Sun, Trash2, UserCheck, Wand2
} from 'lucide-react';
import { demoMode, downloadApplicationsCsv, repository } from '../data';
import type { ProStatusDTO } from '@jobtrack/contract';
import type { Application } from '../domain';
import { Button } from '../components/ui';
import { applyPreferences, readPreferences, savePreferences, type Preferences } from '../preferences';

type TabId = 'profile' | 'security' | 'notifications' | 'appearance' | 'data';

const tabs: Array<{ id: TabId; label: string; icon: typeof UserCheck }> = [
  { id: 'profile', label: 'Hồ sơ', icon: UserCheck },
  { id: 'security', label: 'Bảo mật', icon: ShieldCheck },
  { id: 'notifications', label: 'Thông báo', icon: BellRing },
  { id: 'appearance', label: 'Giao diện', icon: Monitor },
  { id: 'data', label: 'Dữ liệu', icon: Database }
];

type Notifications = {
  deadlineEmail: boolean;
  interviewEmail: boolean;
  weeklyDigest: boolean;
  productNews: boolean;
};

const notificationKey = 'jobtrack.notifications.v1';

const defaultNotifications: Notifications = {
  deadlineEmail: true,
  interviewEmail: true,
  weeklyDigest: false,
  productNews: false
};

function readNotifications(): Notifications {
  try {
    if (typeof localStorage === 'undefined') return defaultNotifications;
    const raw = localStorage.getItem(notificationKey);
    if (!raw) return defaultNotifications;
    return { ...defaultNotifications, ...(JSON.parse(raw) as Partial<Notifications>) };
  } catch {
    return defaultNotifications;
  }
}

function Toggle({ checked, onChange, label, help, disabled }: { checked: boolean; onChange: (next: boolean) => void; label: string; help: string; disabled?: boolean }) {
  return (
    <label className={`settings-toggle ${disabled ? 'is-disabled' : ''}`}>
      <span>
        <strong>{label}</strong>
        <small>{help}</small>
      </span>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} />
    </label>
  );
}

export default function SettingsView({
  apps, accountEmail, proStatus, notify, onProfile, onSecurity, onGrants, onTrash, onUpgrade, onResumes
}: {
  apps: Application[];
  accountEmail: string;
  proStatus: ProStatusDTO | null;
  notify: (message: string, isError?: boolean) => void;
  onProfile: () => void;
  onSecurity: () => void;
  onGrants: () => void;
  onTrash: () => void;
  onUpgrade: () => void;
  onResumes: () => void;
}) {
  const [tab, setTab] = useState<TabId>('profile');
  const [preferences, setPreferences] = useState<Preferences>(readPreferences);
  const [notifications, setNotifications] = useState<Notifications>(readNotifications);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    applyPreferences(preferences);
  }, [preferences]);

  function updatePreference<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPreferences(current => {
      const next = { ...current, [key]: value };
      savePreferences(next);
      return next;
    });
  }

  function updateNotification<K extends keyof Notifications>(key: K, value: Notifications[K]) {
    setNotifications(current => {
      const next = { ...current, [key]: value };
      try {
        localStorage.setItem(notificationKey, JSON.stringify(next));
      } catch {
        notify('Không lưu được tuỳ chọn thông báo trên trình duyệt này.', true);
      }
      return next;
    });
  }

  async function exportJson() {
    if (exporting) return;
    setExporting(true);
    try {
      const blob = await repository.exportAllData();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `jobtrack-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      notify('Đã tải bản xuất dữ liệu JSON.');
    } catch (error) {
      notify((error as Error).message, true);
    } finally {
      setExporting(false);
    }
  }

  function exportCsv() {
    if (apps.length === 0) {
      notify('Chưa có hồ sơ nào để xuất CSV.', true);
      return;
    }
    downloadApplicationsCsv(apps, `jobtrack-applications-${new Date().toISOString().slice(0, 10)}.csv`);
    notify(`Đã xuất ${apps.length} hồ sơ ra CSV.`);
  }

  return (
    <section className="settings-view" aria-labelledby="settings-title">
      <div className="page-heading">
        <div>
          <h1 id="settings-title">Cài đặt</h1>
          <p>Hồ sơ, bảo mật và dữ liệu của bạn ở một nơi.</p>
        </div>
      </div>

      <nav className="settings-tabs" aria-label="Nhóm cài đặt">
        {tabs.map(item => (
          <button
            key={item.id}
            className={tab === item.id ? 'active' : ''}
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={() => setTab(item.id)}
          >
            <item.icon size={16} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {tab === 'profile' && (
        <div className="settings-stack">
          <section className="settings-card">
            <header>
              <h2>Tài khoản</h2>
              <p>Email dùng để đăng nhập và nhận nhắc việc.</p>
            </header>
            <dl className="settings-rows">
              <div>
                <dt>Email</dt>
                <dd>{accountEmail || 'Chưa đăng nhập'}</dd>
              </div>
              <div>
                <dt>Gói dịch vụ</dt>
                <dd>{proStatus?.isPro ? `Pro${proStatus.expiresAt ? ` · hết hạn ${new Date(proStatus.expiresAt).toLocaleDateString('vi-VN')}` : ''}` : 'Miễn phí'}</dd>
              </div>
              <div>
                <dt>Hồ sơ ứng tuyển</dt>
                <dd>{apps.length} hồ sơ đang theo dõi</dd>
              </div>
            </dl>
            <div className="settings-actions">
              <Button kind="secondary" onClick={onProfile}><UserCheck size={16} />Hồ sơ ứng viên</Button>
              <Button kind="secondary" onClick={onResumes}><FileText size={16} />Kho CV</Button>
              <Button kind="secondary" onClick={onUpgrade}><Crown size={16} className="text-amber-500" />{proStatus?.isPro ? 'Quản lý gói Pro' : 'Nâng cấp Pro'}</Button>
            </div>
          </section>

          <section className="settings-card">
            <header>
              <h2>Tích hợp AI</h2>
              <p>Kết nối trợ lý AI bên ngoài với JobTrack qua Model Context Protocol.</p>
            </header>
            <div className="settings-actions">
              <Button kind="secondary" onClick={onGrants}><KeyRound size={16} />Quản lý kết nối AI & MCP</Button>
            </div>
          </section>
        </div>
      )}

      {tab === 'security' && (
        <div className="settings-stack">
          <section className="settings-card">
            <header>
              <h2>Đăng nhập & mật khẩu</h2>
              <p>Đổi mật khẩu, đăng xuất mọi thiết bị khác hoặc xoá tài khoản vĩnh viễn.</p>
            </header>
            <div className="settings-actions">
              <Button kind="secondary" onClick={onSecurity}><KeyRound size={16} />Mật khẩu & phiên đăng nhập</Button>
            </div>
            {demoMode && <p className="settings-note">Bạn đang ở chế độ dữ liệu mẫu nên thao tác bảo mật bị tắt.</p>}
          </section>
          <section className="settings-card">
            <header>
              <h2>Nguyên tắc an toàn</h2>
            </header>
            <ul className="settings-list">
              <li><Check size={15} />Mật khẩu 15–64 ký tự, không tái sử dụng với dịch vụ khác.</li>
              <li><Check size={15} />Phiên đăng nhập dùng cookie HttpOnly, không lưu token trong trình duyệt.</li>
              <li><Check size={15} />Đăng xuất thiết bị khác ngay khi nghi ngờ bị truy cập trái phép.</li>
            </ul>
          </section>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="settings-stack">
          <section className="settings-card">
            <header>
              <h2>Nhắc việc qua email</h2>
              <p>JobTrack nhắc trước hạn chót 7, 3 và 1 ngày, kèm nhắc đúng ngày.</p>
            </header>
            <div className="settings-toggles">
              <Toggle
                label="Hạn chót hồ sơ"
                help="Gửi email khi hồ sơ có deadline sắp tới."
                checked={notifications.deadlineEmail}
                onChange={next => updateNotification('deadlineEmail', next)}
              />
              <Toggle
                label="Lịch phỏng vấn"
                help="Nhắc trước buổi phỏng vấn đã lên lịch."
                checked={notifications.interviewEmail}
                onChange={next => updateNotification('interviewEmail', next)}
              />
            </div>
            <p className="settings-note"><Mail size={14} />Nhắc việc gửi tới {accountEmail || 'email đăng nhập'} qua máy chủ JobTrack.</p>
          </section>
          <section className="settings-card">
            <header>
              <h2>Bản tin</h2>
              <p>Tuỳ chọn, có thể tắt bất cứ lúc nào.</p>
            </header>
            <div className="settings-toggles">
              <Toggle
                label="Tóm tắt tuần"
                help="Báo cáo tiến độ pipeline mỗi thứ Hai."
                checked={notifications.weeklyDigest}
                onChange={next => updateNotification('weeklyDigest', next)}
              />
              <Toggle
                label="Tính năng mới"
                help="Thông báo khi có công cụ hoặc mẫu CV mới."
                checked={notifications.productNews}
                onChange={next => updateNotification('productNews', next)}
              />
            </div>
          </section>
        </div>
      )}

      {tab === 'appearance' && (
        <div className="settings-stack">
          <section className="settings-card">
            <header>
              <h2>Mật độ hiển thị</h2>
              <p>Ảnh hưởng tới khoảng cách dòng trong bảng và danh sách hồ sơ.</p>
            </header>
            <div className="settings-choice" role="radiogroup" aria-label="Mật độ hiển thị">
              <button role="radio" aria-checked={preferences.density === 'comfortable'} className={preferences.density === 'comfortable' ? 'active' : ''} onClick={() => updatePreference('density', 'comfortable')}>
                <Sun size={18} />
                <strong>Thoáng</strong>
                <small>Dễ đọc, phù hợp màn hình lớn.</small>
              </button>
              <button role="radio" aria-checked={preferences.density === 'compact'} className={preferences.density === 'compact' ? 'active' : ''} onClick={() => updatePreference('density', 'compact')}>
                <Moon size={18} />
                <strong>Gọn</strong>
                <small>Hiển thị nhiều hồ sơ hơn trên một màn hình.</small>
              </button>
            </div>
          </section>
          <section className="settings-card">
            <header>
              <h2>Khả năng tiếp cận</h2>
            </header>
            <div className="settings-toggles">
              <Toggle
                label="Tăng độ tương phản"
                help="Viền và chữ đậm hơn cho người nhìn kém."
                checked={preferences.highContrast}
                onChange={next => updatePreference('highContrast', next)}
              />
              <Toggle
                label="Giảm chuyển động"
                help="Tắt hiệu ứng chuyển trang và hoạt ảnh."
                checked={preferences.reduceMotion}
                onChange={next => updatePreference('reduceMotion', next)}
              />
            </div>
          </section>
          <section className="settings-card">
            <header>
              <h2>Thanh điều hướng</h2>
              <p>Thu gọn sidebar thành dải biểu tượng 64px, rê chuột để xem tên tính năng.</p>
            </header>
            <p className="settings-note"><Wand2 size={14} />Dùng nút mũi tên ở đầu sidebar để chuyển đổi. Lựa chọn được ghi nhớ trên trình duyệt này.</p>
          </section>
        </div>
      )}

      {tab === 'data' && (
        <div className="settings-stack">
          <section className="settings-card">
            <header>
              <h2>Xuất dữ liệu</h2>
              <p>Tải toàn bộ hồ sơ, lịch phỏng vấn, ghi chú, CV và liên hệ.</p>
            </header>
            <div className="settings-actions">
              <Button kind="secondary" disabled={exporting} onClick={() => void exportJson()}>
                {exporting ? <LoaderCircle size={16} className="spin" /> : <Download size={16} />}
                {exporting ? 'Đang chuẩn bị…' : 'Xuất JSON đầy đủ'}
              </Button>
              <Button kind="secondary" onClick={exportCsv}><FileSpreadsheet size={16} />Xuất CSV hồ sơ</Button>
            </div>
            <p className="settings-note">{apps.length} hồ sơ sẽ được đưa vào bản xuất.</p>
          </section>
          <section className="settings-card">
            <header>
              <h2>Thùng rác</h2>
              <p>Hồ sơ đã xoá được giữ lại để khôi phục hoặc xoá vĩnh viễn.</p>
            </header>
            <div className="settings-actions">
              <Button kind="secondary" onClick={onTrash}><Trash2 size={16} />Mở thùng rác</Button>
            </div>
          </section>
          <section className="settings-card settings-danger">
            <header>
              <h2>Xoá tài khoản</h2>
              <p>Xoá vĩnh viễn tài khoản và mọi dữ liệu liên quan. Không thể hoàn tác.</p>
            </header>
            <div className="settings-actions">
              <Button kind="danger" onClick={onSecurity}><Trash2 size={16} />Xoá tài khoản vĩnh viễn</Button>
            </div>
          </section>
          <section className="settings-card">
            <header>
              <h2>Về JobTrack</h2>
            </header>
            <ul className="settings-list">
              <li><Sparkles size={15} />Dữ liệu mẫu lưu trên trình duyệt này; dữ liệu thật lưu trên máy chủ JobTrack.</li>
              <li><Database size={15} />Mọi thao tác đều kiểm tra phiên bản để tránh ghi đè khi mở nhiều thiết bị.</li>
            </ul>
          </section>
        </div>
      )}
    </section>
  );
}
