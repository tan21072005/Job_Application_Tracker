import { Columns3, List, Plus, Search, X, ArrowUpRight, Globe } from 'lucide-react';
import { filtered, labels, statuses, type Application } from '../domain';
import { Button, Empty, Monogram, StatusBadge } from '../components/ui';
import { ApplicationRow, Deadline } from './Dashboard';

export type Filters = { query: string; status: string; sort: string; view: 'list' | 'pipeline' };
export const initialFilters: Filters = { query: '', status: 'all', sort: 'created-desc', view: 'list' };

export default function Applications({
  apps,
  filters,
  onFilters,
  onOpen,
  onAdd,
  onImport
}: {
  apps: Application[];
  filters: Filters;
  onFilters: (value: Filters) => void;
  onOpen: (app: Application) => void;
  onAdd: () => void;
  onImport?: () => void;
}) {
  const visible = filtered(apps, filters.query, filters.status, filters.sort);
  const set = (key: keyof Filters, value: string) => onFilters({ ...filters, [key]: value });
  return <>
    <div className="page-heading">
      <div>
        <h1>Hồ sơ ứng tuyển</h1>
        <p>{apps.length} cơ hội · mỗi hồ sơ một bước tiếp theo.</p>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
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
    <div className="filter-bar"><label className="search-field"><Search size={19} /><input aria-label="Tìm công ty hoặc vị trí" type="search" placeholder="Tìm công ty hoặc vị trí…" value={filters.query} onChange={event => set('query', event.target.value)} />{filters.query && <button className="icon-button" onClick={() => set('query', '')} aria-label="Xóa tìm kiếm"><X size={16} /></button>}</label><label className="select-field"><span className="sr-only">Trạng thái hồ sơ</span><select aria-label="Trạng thái hồ sơ" value={filters.status} onChange={event => set('status', event.target.value)}><option value="all">Tất cả trạng thái</option>{statuses.map(status => <option key={status} value={status}>{labels[status]}</option>)}</select></label><label className="select-field"><span className="sr-only">Sắp xếp</span><select aria-label="Sắp xếp" value={filters.sort} onChange={event => set('sort', event.target.value)}><option value="created-desc">Mới tạo nhất</option><option value="created-asc">Cũ nhất</option><option value="applied-desc">Ngày nộp mới nhất</option><option value="applied-asc">Ngày nộp cũ nhất</option></select></label></div>
    <div className="list-toolbar"><div className="view-switch" aria-label="Kiểu hiển thị"><button aria-pressed={filters.view === 'list'} onClick={() => set('view', 'list')}><List size={17} />Danh sách</button><button aria-pressed={filters.view === 'pipeline'} onClick={() => set('view', 'pipeline')}><Columns3 size={17} />Pipeline</button></div><span role="status">{visible.length} hồ sơ{visible.length !== apps.length ? ` / ${apps.length}` : ''}</span></div>
    {!visible.length ? <Empty title={apps.length ? 'Chưa có kết quả phù hợp' : 'Cơ hội đầu tiên đang chờ bạn'} action={<Button onClick={() => apps.length ? onFilters({ ...filters, query: '', status: 'all' }) : onAdd()}>{apps.length ? 'Xóa bộ lọc' : 'Thêm hồ sơ đầu tiên'}</Button>}>{apps.length ? 'Thử tìm với tên công ty hoặc vị trí khác, hoặc bỏ bộ lọc trạng thái.' : 'Lưu một vị trí bạn quan tâm để bắt đầu theo dõi hành trình ứng tuyển.'}</Empty> : filters.view === 'list' ? <section className="application-list" aria-label="Danh sách hồ sơ"><div className="table-heading"><span>Vị trí / công ty</span><span>Trạng thái</span><span>Bước tiếp theo</span><span>Ngày nộp</span><span /></div>{visible.map(app => <ApplicationRow key={app.id} app={app} onOpen={onOpen} />)}</section> : <div className="pipeline" role="region" aria-label="Pipeline bảy trạng thái, có thể cuộn ngang" tabIndex={0}>{statuses.filter(status => filters.status === 'all' || filters.status === status).map(status => { const entries = visible.filter(app => app.status === status); return <section className="pipeline-lane" key={status}><div className="lane-heading"><StatusBadge status={status} /><span className="count">{entries.length}</span></div>{entries.map(app => <button key={app.id} className="pipeline-card" onClick={() => onOpen(app)}><Monogram company={app.company} /><strong>{app.position}</strong><span>{app.company}</span>{app.nextAction && <p>{app.nextAction}</p>}<Deadline value={app.deadline} /><span className="pipeline-open">Mở hồ sơ<ArrowUpRight size={15} /></span></button>)}{!entries.length && <p className="lane-empty">Chưa có hồ sơ</p>}</section>; })}</div>}
  </>;
}
