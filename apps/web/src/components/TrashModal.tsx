import { useEffect, useState } from 'react';
import { RotateCcw, Trash2, LoaderCircle, CalendarDays, AlertTriangle } from 'lucide-react';
import type { Application } from '../domain';
import { formatDate } from '../domain';
import { repository } from '../data';
import { Button, Dialog, Empty, Monogram } from './ui';

export default function TrashModal({
  onClose,
  onRestored,
  notify
}: {
  onClose: () => void;
  onRestored?: () => void;
  notify: (message: string, isError?: boolean) => void;
}) {
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadTrash() {
    setLoading(true);
    try {
      const list = await repository.listTrash();
      setItems(list);
    } catch (err) {
      notify((err as Error).message || 'Không thể tải danh sách thùng rác.', true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTrash();
  }, []);

  async function handleRestore(app: Application) {
    setBusyId(app.id);
    try {
      await repository.restore(app.id);
      notify(`Đã khôi phục hồ sơ "${app.position}" tại ${app.company}.`);
      await loadTrash();
      onRestored?.();
    } catch (err) {
      notify((err as Error).message || 'Không thể khôi phục hồ sơ.', true);
    } finally {
      setBusyId(null);
    }
  }

  async function handlePurge(app: Application) {
    if (!confirm(`Bạn có chắc muốn xóa vĩnh viễn hồ sơ "${app.position}" tại ${app.company}? Hành động này không thể hoàn tác.`)) {
      return;
    }
    setBusyId(app.id);
    try {
      await repository.purge(app.id, app.version);
      notify('Đã xóa vĩnh viễn hồ sơ.');
      await loadTrash();
      onRestored?.();
    } catch (err) {
      notify((err as Error).message || 'Không thể xóa vĩnh viễn.', true);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Dialog title="Thùng rác hồ sơ ứng tuyển" onClose={onClose} wide busy={loading || !!busyId}>
      <div className="trash-modal-container">
        <div className="trash-modal-header-note">
          <AlertTriangle size={16} />
          <span>Hồ sơ trong thùng rác sẽ được giữ an toàn. Bạn có thể khôi phục lại bất cứ lúc nào.</span>
        </div>

        {loading ? (
          <div className="trash-loading-state">
            <LoaderCircle size={28} className="spin" />
            <p>Đang tải danh sách hồ sơ trong thùng rác...</p>
          </div>
        ) : items.length === 0 ? (
          <Empty title="Thùng rác trống">
            Không có hồ sơ nào trong thùng rác. Khi bạn xóa một hồ sơ ứng tuyển, hồ sơ sẽ được chuyển vào đây để dễ dàng hoàn tác.
          </Empty>
        ) : (
          <div className="trash-items-list">
            {items.map(app => (
              <article key={app.id} className="trash-item-card">
                <div className="trash-item-identity">
                  <Monogram company={app.company} />
                  <div>
                    <h4>{app.position}</h4>
                    <p className="trash-item-company">
                      {app.company}
                      {app.location ? ` · ${app.location}` : ''}
                      {app.workMode ? ` · ${app.workMode}` : ''}
                    </p>
                    <div className="trash-item-meta">
                      <span>
                        <CalendarDays size={13} />
                        {app.deletedAt ? `Đã xóa ${formatDate(app.deletedAt)}` : `Tạo ngày ${formatDate(app.createdAt)}`}
                      </span>
                      {app.interviews.length > 0 && (
                        <span>· {app.interviews.length} vòng phỏng vấn</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="trash-item-actions">
                  <Button
                    kind="secondary"
                    disabled={busyId === app.id}
                    onClick={() => void handleRestore(app)}
                  >
                    <RotateCcw size={14} className={busyId === app.id ? 'spin' : ''} />
                    Khôi phục
                  </Button>
                  <Button
                    kind="danger"
                    disabled={busyId === app.id}
                    onClick={() => void handlePurge(app)}
                  >
                    <Trash2 size={14} />
                    Xóa vĩnh viễn
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}

        <footer className="trash-modal-footer">
          <Button kind="secondary" onClick={onClose}>
            Đóng
          </Button>
        </footer>
      </div>
    </Dialog>
  );
}
