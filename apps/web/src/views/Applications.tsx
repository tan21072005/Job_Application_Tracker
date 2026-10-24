import { useState, useMemo } from 'react';
import {
  Columns3,
  List,
  Plus,
  Search,
  X,
  ArrowUpRight,
  Globe,
  FileSpreadsheet,
  UploadCloud,
  AlertTriangle,
  Tag,
  Clock,
  ChevronRight,
  Scale
} from 'lucide-react';
import {
  filtered,
  labels,
  statuses,
  priorityLabels,
  calculateStageSla,
  type Application,
  type Status,
  type ApplicationPriority
} from '../domain';
import { Button, Empty, Monogram, StatusBadge } from '../components/ui';
import { ApplicationRow, Deadline } from './Dashboard';
import BulkActionBar from '../components/BulkActionBar';
import { repository, pipelineRepository, downloadApplicationsCsv } from '../data';
import ImportCsvModal from '../components/ImportCsvModal';
import type { CsvImportResultDTO } from '@jobtrack/contract';

export type Filters = {
  query: string;
  status: string;
  sort: string;
  view: 'list' | 'pipeline';
  priority?: string;
  tag?: string;
  onlyStagnant?: boolean;
};

export const initialFilters: Filters = {
  query: '',
  status: 'all',
  sort: 'created-desc',
  view: 'list',
  priority: 'all',
  tag: '',
  onlyStagnant: false
};

const nextStageMap: Partial<Record<Status, Status>> = {
  Saved: 'Applied',
  Applied: 'Screening',
  Screening: 'Interview',
  Interview: 'Offer'
};

export default function Applications({
  apps,
  filters,
  onFilters,
  onOpen,
  onAdd,
  onImport,
  onDecisionMatrix,
  onRefresh,
  notify
}: {
  apps: Application[];
  filters: Filters;
  onFilters: (value: Filters) => void;
  onOpen: (app: Application) => void;
  onAdd: () => void;
  onImport?: () => void;
  onDecisionMatrix?: () => void;
  onRefresh?: () => Promise<void> | void;
  notify?: (message: string, isError?: boolean) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const a of apps) {
      if (Array.isArray(a.tags)) {
        for (const t of a.tags) {
          if (t) set.add(t);
        }
      }
    }
    return Array.from(set).sort();
  }, [apps]);

  const stagnantApps = useMemo(() => {
    return apps.filter(a => {
      if (a.status === 'Rejected' || a.status === 'Withdrawn' || a.deletedAt) return false;
      const refDate = a.statusUpdatedAt || (a.appliedAt ? `${a.appliedAt}T00:00:00Z` : a.createdAt);
      return calculateStageSla(a.status, refDate).isStagnant;
    });
  }, [apps]);

  const baseVisible = filtered(apps, filters.query, filters.status, filters.sort, filters.priority, filters.tag);
  const visible = useMemo(() => {
    if (!filters.onlyStagnant) return baseVisible;
    return baseVisible.filter(a => {
      if (a.status === 'Rejected' || a.status === 'Withdrawn' || a.deletedAt) return false;
      const refDate = a.statusUpdatedAt || (a.appliedAt ? `${a.appliedAt}T00:00:00Z` : a.createdAt);
      return calculateStageSla(a.status, refDate).isStagnant;
    });
  }, [baseVisible, filters.onlyStagnant]);

  const set = (key: keyof Filters, value: unknown) => onFilters({ ...filters, [key]: value });

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

  async function handleQuickAdvance(app: Application, nextStatus: Status) {
    setBusy(true);
    try {
      await repository.bulkUpdateStatus([app.id], nextStatus);
      notify?.(`Đã chuyển ${app.position} tại ${app.company} sang "${labels[nextStatus]}".`);
      await onRefresh?.();
    } catch (err) {
      notify?.((err as Error).message || 'Lỗi khi cập nhật trạng thái.', true);
    } finally {
      setBusy(false);
    }
  }

  async function handlePriorityChange(app: Application, newPriority: ApplicationPriority) {
    setBusy(true);
    try {
      await pipelineRepository.update(app.id, { priority: newPriority });
      notify?.(`Đã đặt ưu tiên "${priorityLabels[newPriority]}" cho ${app.company}.`);
      await onRefresh?.();
    } catch (err) {
      notify?.((err as Error).message || 'Lỗi khi cập nhật mức ưu tiên.', true);
    } finally {
      setBusy(false);
    }
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
          {onDecisionMatrix && (
            <Button
              kind="secondary"
              className="decision-matrix-btn"
              aria-label="So sánh cơ hội"
              onClick={onDecisionMatrix}
            >
              <Scale size={18} />
              <span>So sánh cơ hội</span>
            </Button>
          )}
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

      {stagnantApps.length > 0 && (
        <div className="pipeline-sla-banner" role="alert">
          <div className="sla-banner-icon">
            <AlertTriangle size={18} />
          </div>
          <div className="sla-banner-text">
            <strong>Cảnh báo tiến độ: Có {stagnantApps.length} hồ sơ đọng lâu hơn thời gian khuyến nghị SLA.</strong>
            <span>Các cơ hội này cần chủ động gửi follow-up hoặc trao đổi với Recruiter để không bỏ lỡ nhịp độ tuyển dụng.</span>
          </div>
          <button
            type="button"
            className={`sla-banner-filter-btn ${filters.onlyStagnant ? 'active' : ''}`}
            onClick={() => set('onlyStagnant', !filters.onlyStagnant)}
          >
            {filters.onlyStagnant ? 'Hiện tất cả hồ sơ' : `Lọc ${stagnantApps.length} hồ sơ cần chú ý`}
          </button>
        </div>
      )}

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
          <span className="sr-only">Mức độ ưu tiên</span>
          <select
            aria-label="Mức độ ưu tiên"
            value={filters.priority || 'all'}
            onChange={event => set('priority', event.target.value)}
          >
            <option value="all">Tất cả mức ưu tiên</option>
            <option value="urgent">🔥 Khẩn cấp (Urgent)</option>
            <option value="target">🎯 Mục tiêu (Target)</option>
            <option value="safety">🛡️ Dự phòng (Safety)</option>
            <option value="backlog">⏳ Xem xét sau (Backlog)</option>
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

      {allTags.length > 0 && (
        <div className="pipeline-tags-bar" aria-label="Lọc theo thẻ tag">
          <span className="pipeline-tags-label"><Tag size={13} /> Thẻ:</span>
          <div className="pipeline-tags-chips">
            {allTags.map(t => (
              <button
                key={t}
                type="button"
                className={`pipeline-tag-chip ${filters.tag === t ? 'active' : ''}`}
                onClick={() => set('tag', filters.tag === t ? '' : t)}
              >
                #{t}
              </button>
            ))}
            {filters.tag && (
              <button
                type="button"
                className="pipeline-tag-clear"
                onClick={() => set('tag', '')}
                title="Xóa bộ lọc thẻ"
              >
                <X size={12} /> Bỏ lọc #{filters.tag}
              </button>
            )}
          </div>
        </div>
      )}

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
            <Button onClick={() => (apps.length ? onFilters({ ...filters, query: '', status: 'all', priority: 'all', tag: '', onlyStagnant: false }) : onAdd())}>
              {apps.length ? 'Xóa bộ lọc' : 'Thêm hồ sơ đầu tiên'}
            </Button>
          }
        >
          {apps.length
            ? 'Thử tìm với tên công ty hoặc vị trí khác, hoặc bỏ bớt các tiêu chí lọc.'
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
                  {entries.map(app => {
                    const refDate = app.statusUpdatedAt || (app.appliedAt ? `${app.appliedAt}T00:00:00Z` : app.createdAt);
                    const sla = calculateStageSla(app.status, refDate);
                    const nextStage = nextStageMap[app.status];

                    return (
                      <div key={app.id} className="pipeline-card-wrapper">
                        <div className="pipeline-card" onClick={() => onOpen(app)} role="button" tabIndex={0}>
                          <div className="card-top-meta" onClick={e => e.stopPropagation()}>
                            <label
                              className="pipeline-card-select"
                              title="Chọn hồ sơ"
                            >
                              <input
                                type="checkbox"
                                checked={selectedIds.has(app.id)}
                                onChange={() => toggleSelect(app.id)}
                                aria-label={`Chọn ${app.position} tại ${app.company}`}
                              />
                            </label>
                            <select
                              className={`priority-select priority-badge priority-${app.priority || 'target'}`}
                              value={app.priority || 'target'}
                              onChange={e => handlePriorityChange(app, e.target.value as ApplicationPriority)}
                              title="Đổi mức độ ưu tiên"
                              aria-label={`Mức ưu tiên của ${app.company}`}
                            >
                              <option value="urgent">🔥 Khẩn cấp</option>
                              <option value="target">🎯 Mục tiêu</option>
                              <option value="safety">🛡️ Dự phòng</option>
                              <option value="backlog">⏳ Chờ sau</option>
                            </select>
                          </div>

                          <div className="card-company-row">
                            <Monogram company={app.company} />
                            <div className="card-company-info">
                              <strong>{app.position}</strong>
                              <span>{app.company}</span>
                            </div>
                          </div>

                          {sla.isStagnant && (
                            <div
                              className={`card-sla-pill card-sla-${sla.slaSeverity}`}
                              title={sla.recommendation}
                            >
                              <Clock size={12} />
                              <span>{sla.daysInStage} ngày ({sla.slaSeverity === 'critical' ? 'Quá hạn SLA' : 'Cần chú ý'})</span>
                            </div>
                          )}

                          {Array.isArray(app.tags) && app.tags.length > 0 && (
                            <div className="card-tags-row" onClick={e => e.stopPropagation()}>
                              {app.tags.map(t => (
                                <button
                                  key={t}
                                  type="button"
                                  className={`card-tag-pill ${filters.tag === t ? 'active' : ''}`}
                                  onClick={() => set('tag', filters.tag === t ? '' : t)}
                                  title={`Lọc theo thẻ #${t}`}
                                >
                                  #{t}
                                </button>
                              ))}
                            </div>
                          )}

                          {app.nextAction && <p className="card-next-action">{app.nextAction}</p>}
                          <Deadline value={app.deadline} />

                          <div className="card-footer-actions" onClick={e => e.stopPropagation()}>
                            {nextStage && (
                              <button
                                type="button"
                                className="quick-advance-btn"
                                title={`Chuyển nhanh sang "${labels[nextStage]}"`}
                                onClick={() => handleQuickAdvance(app, nextStage)}
                              >
                                <span>{labels[nextStage]}</span>
                                <ChevronRight size={13} />
                              </button>
                            )}
                            <span className="pipeline-open" onClick={() => onOpen(app)}>
                              Chi tiết<ArrowUpRight size={14} />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
