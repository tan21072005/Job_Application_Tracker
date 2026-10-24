import { useState } from 'react';
import { Columns3, List, Plus, Search, X, ArrowUpRight, Globe, FileSpreadsheet, UploadCloud } from 'lucide-react';
import { filtered, labels, statuses, type Application, type Status } from '../domain';
import { Button, Empty, Monogram, StatusBadge } from '../components/ui';
import { ApplicationRow, Deadline } from './Dashboard';
import BulkActionBar from '../components/BulkActionBar';
import { repository, downloadApplicationsCsv } from '../data';
import ImportCsvModal from '../components/ImportCsvModal';
import type { CsvImportResultDTO } from '@jobtrack/contract';

export type Filters = { query: string; status: string; sort: string; view: 'list' | 'pipeline' };
export const initialFilters: Filters = { query: '', status: 'all', sort: 'created-desc', view: 'list' };

export default function Applications({
  apps,
  filters,
  onFilters,
  onOpen,
  onAdd,
  onImport,
  onRefresh,
  notify
}: {
  apps: Application[];
  filters: Filters;
  onFilters: (value: Filters) => void;
  onOpen: (app: Application) => void;
  onAdd: () => void;
  onImport?: () => void;
  onRefresh?: () => Promise<void> | void;
  notify?: (message: string, isError?: boolean) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);

  const visible = filtered(apps, filters.query, filters.status, filters.sort);
  const set = (key: keyof Filters, value: string) => onFilters({ ...filters, [key]: value });

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (visible.length === 0) return;
    if (selectedIds.size === visible.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visible.map(a => a.id)));
    }
  }

  async function handleBulkStatus(newStatus: Status) {
    if (selectedIds.size === 0) return;
    setBusy(true);
    try {
      const res = await repository.bulkUpdateStatus(Array.from(selectedIds), newStatus);
      notify?.(`Đã cập nhật trạng thái "${labels[newStatus]}" cho ${res.affectedCount} hồ sơ.`);
      setSelectedIds(new Set());
      await onRefresh?.();
    } catch (err) {
      notify?.((err as Error).message || 'Lỗi khi cập nhật trạng thái hàng loạt.', true);
    } finally {
      setBusy(false);
    }
  }

  async function handleBulkTrash() {
    if (selectedIds.size === 0) return;
    setBusy(true);
    try {
      const res = await repository.bulkMoveToTrash(Array.from(selectedIds));
      notify?.(`Đã chuyển ${res.affectedCount} hồ sơ vào thùng rác.`);
      setSelectedIds(new Set());
      await onRefresh?.();
    } catch (err) {
      notify?.((err as Error).message || 'Lỗi khi chuyển hồ sơ vào thùng rác.', true);
    } finally {
      setBusy(false);
    }
  }

  function handleBulkExportSelected() {
    const targetApps = apps.filter(a => selectedIds.has(a.id));
    if (targetApps.length === 0) return;
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadApplicationsCsv(targetApps, `jobtrack-selected-${dateStr}.csv`);
    notify?.(`Đã xuất ${targetApps.length} hồ sơ ra file CSV.`);
  }

  function handleExportAll() {
    if (apps.length === 0) {
      notify?.('Chưa có hồ sơ nào để xuất CSV.', true);
      return;
    }
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadApplicationsCsv(apps, `jobtrack-applications-${dateStr}.csv`);
    notify?.(`Đã xuất toàn bộ ${apps.length} hồ sơ ra file CSV.`);
  }

  function handleCsvSuccess(res: CsvImportResultDTO) {
    const dupText = res.skippedDuplicatesCount > 0 ? ` (đã bỏ qua ${res.skippedDuplicatesCount} hồ sơ trùng)` : '';
    notify?.(`Đã nhập thành công ${res.importedCount} hồ sơ${dupText}.`);
    onRefresh?.();
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Hồ sơ ứng tuyển</h1>
          <p>{apps.length} cơ hội · mỗi hồ sơ một bước tiếp theo.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            kind="secondary"
            aria-label="Nhập từ file CSV"
            onClick={() => setShowCsvModal(true)}
          >
            <UploadCloud size={18} />
            <span>Nhập CSV</span>
          </Button>
          <Button
            kind="secondary"
            aria-label="Xuất file CSV"
            onClick={handleExportAll}
          >
            <FileSpreadsheet size={18} />
            <span>Xuất CSV</span>
          </Button>
          {onImport && (
            <Button kind="secondary" aria-label="Nhập từ link" onClick={onImport}>
              <Globe size={18} />
              <span>Nhập từ link</span>
            </Button>
          )}
          <Button aria-label="Thêm hồ sơ" onClick={onAdd}>
            <Plus size={18} />
            <span>Thêm hồ sơ</span>
          </Button>
        </div>
      </div>

      <div className="filter-bar">
        <label className="search-field">
          <Search size={19} />
          <input
            aria-label="Tìm công ty hoặc vị trí"
            type="search"
            placeholder="Tìm công ty hoặc vị trí…"
            value={filters.query}
            onChange={event => set('query', event.target.value)}
          />
          {filters.query && (
            <button className="icon-button" onClick={() => set('query', '')} aria-label="Xóa tìm kiếm">
              <X size={16} />
            </button>
          )}
        </label>
        <label className="select-field">
          <span className="sr-only">Trạng thái hồ sơ</span>
          <select
            aria-label="Trạng thái hồ sơ"
            value={filters.status}
            onChange={event => set('status', event.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            {statuses.map(status => (
              <option key={status} value={status}>
                {labels[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="select-field">
          <span className="sr-only">Sắp xếp</span>
          <select
            aria-label="Sắp xếp"
            value={filters.sort}
            onChange={event => set('sort', event.target.value)}
          >
            <option value="created-desc">Mới tạo nhất</option>
            <option value="created-asc">Cũ nhất</option>
            <option value="applied-desc">Ngày nộp mới nhất</option>
            <option value="applied-asc">Ngày nộp cũ nhất</option>
          </select>
        </label>
      </div>

      <div className="list-toolbar">
        <div className="view-switch" aria-label="Kiểu hiển thị">
          <button aria-pressed={filters.view === 'list'} onClick={() => set('view', 'list')}>
            <List size={17} />Danh sách
          </button>
          <button aria-pressed={filters.view === 'pipeline'} onClick={() => set('view', 'pipeline')}>
            <Columns3 size={17} />Pipeline
          </button>
        </div>
        <span role="status">
          {visible.length} hồ sơ{visible.length !== apps.length ? ` / ${apps.length}` : ''}
        </span>
      </div>

      {!visible.length ? (
        <Empty
          title={apps.length ? 'Chưa có kết quả phù hợp' : 'Cơ hội đầu tiên đang chờ bạn'}
          action={
            <Button onClick={() => (apps.length ? onFilters({ ...filters, query: '', status: 'all' }) : onAdd())}>
              {apps.length ? 'Xóa bộ lọc' : 'Thêm hồ sơ đầu tiên'}
            </Button>
          }
        >
          {apps.length
            ? 'Thử tìm với tên công ty hoặc vị trí khác, hoặc bỏ bộ lọc trạng thái.'
            : 'Lưu một vị trí bạn quan tâm để bắt đầu theo dõi hành trình ứng tuyển.'}
        </Empty>
      ) : filters.view === 'list' ? (
        <section className="application-list" aria-label="Danh sách hồ sơ">
          <div className="table-heading has-checkbox">
            <label className="table-heading-checkbox" title="Chọn tất cả">
              <input
                type="checkbox"
                checked={visible.length > 0 && selectedIds.size === visible.length}
                onChange={toggleSelectAll}
                aria-label="Chọn tất cả hồ sơ"
              />
            </label>
            <span className="th-monogram" />
            <span>Vị trí / công ty</span>
            <span>Trạng thái</span>
            <span>Bước tiếp theo</span>
            <span>Ngày nộp</span>
            <span />
          </div>
          {visible.map(app => (
            <ApplicationRow
              key={app.id}
              app={app}
              onOpen={onOpen}
              selectable={true}
              selected={selectedIds.has(app.id)}
              onToggleSelect={() => toggleSelect(app.id)}
            />
          ))}
        </section>
      ) : (
        <div className="pipeline" role="region" aria-label="Pipeline bảy trạng thái, có thể cuộn ngang" tabIndex={0}>
          {statuses
            .filter(status => filters.status === 'all' || filters.status === status)
            .map(status => {
              const entries = visible.filter(app => app.status === status);
              return (
                <section className="pipeline-lane" key={status}>
                  <div className="lane-heading">
                    <StatusBadge status={status} />
                    <span className="count">{entries.length}</span>
                  </div>
                  {entries.map(app => (
                    <div key={app.id} className="pipeline-card-wrapper">
                      <button className="pipeline-card" onClick={() => onOpen(app)}>
                        <label
                          className="pipeline-card-select"
                          onClick={e => e.stopPropagation()}
                          title="Chọn hồ sơ"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(app.id)}
                            onChange={() => toggleSelect(app.id)}
                            aria-label={`Chọn ${app.position} tại ${app.company}`}
                          />
                        </label>
                        <Monogram company={app.company} />
                        <strong>{app.position}</strong>
                        <span>{app.company}</span>
                        {app.nextAction && <p>{app.nextAction}</p>}
                        <Deadline value={app.deadline} />
                        <span className="pipeline-open">
                          Mở hồ sơ<ArrowUpRight size={15} />
                        </span>
                      </button>
                    </div>
                  ))}
                  {!entries.length && <p className="lane-empty">Chưa có hồ sơ</p>}
                </section>
              );
            })}
        </div>
      )}

      <BulkActionBar
        selectedCount={selectedIds.size}
        onStatusChange={handleBulkStatus}
        onTrash={handleBulkTrash}
        onExportCsv={handleBulkExportSelected}
        onClear={() => setSelectedIds(new Set())}
        busy={busy}
      />

      {showCsvModal && (
        <ImportCsvModal
          onClose={() => setShowCsvModal(false)}
          onSuccess={handleCsvSuccess}
          existingApps={apps.map(a => ({ company: a.company, position: a.position, url: a.url }))}
        />
      )}
    </>
  );
}
