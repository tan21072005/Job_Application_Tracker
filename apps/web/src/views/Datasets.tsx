import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Copy,
  Download,
  ExternalLink,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Send,
  Table,
  Trash2,
  X
} from 'lucide-react';
import type { DatasetWireDTO, DatasetRecordWireDTO, DatasetCategory } from '@jobtrack/contract';
import { datasetRepository } from '../data';
import { Button, Dialog, Empty, Field } from '../components/ui';

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  product_research: { label: 'So sánh sản phẩm & Giá', color: 'var(--sky-600)' },
  company_list: { label: 'Doanh nghiệp & B2B Leads', color: 'var(--violet-600)' },
  research_notes: { label: 'Ghi chú & Nghiên cứu', color: 'var(--emerald-600)' },
  jobtrack: { label: 'Tuyển dụng (JobTrack Core)', color: 'var(--custom-315bef)' },
  custom: { label: 'Tùy chỉnh', color: 'var(--slate-500)' }
};

export default function DatasetsView({
  notify
}: {
  notify: (msg: string, isError?: boolean) => void;
}) {
  const [datasets, setDatasets] = useState<DatasetWireDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [records, setRecords] = useState<DatasetRecordWireDTO[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [tableSearch, setTableSearch] = useState('');

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<DatasetCategory>('product_research');
  const [creating, setCreating] = useState(false);

  // Webhook Modal (U12)
  const [webhookModal, setWebhookModal] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [sendingWebhook, setSendingWebhook] = useState(false);

  async function loadDatasets() {
    setLoading(true);
    try {
      const list = await datasetRepository.list();
      setDatasets(list);
    } catch (err) {
      notify((err as Error).message || 'Không thể tải danh sách bộ dữ liệu.', true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDatasets();
  }, []);

  async function openDataset(id: string) {
    setSelectedId(id);
    setLoadingRecords(true);
    setTableSearch('');
    try {
      const recs = await datasetRepository.listRecords(id);
      setRecords(recs);
    } catch (err) {
      notify((err as Error).message || 'Không thể tải bản ghi của bộ dữ liệu.', true);
    } finally {
      setLoadingRecords(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) {
      notify('Vui lòng nhập tên bộ dữ liệu.', true);
      return;
    }
    setCreating(true);
    try {
      const created = await datasetRepository.create({
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        category: newCategory,
        columns: []
      });
      notify(`Đã tạo bộ dữ liệu "${created.name}".`);
      setCreateModal(false);
      setNewName('');
      setNewDesc('');
      await loadDatasets();
      void openDataset(created.id);
    } catch (err) {
      notify((err as Error).message || 'Lỗi khi tạo bộ dữ liệu.', true);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Bạn có chắc chắn muốn xóa bộ dữ liệu "${name}" cùng toàn bộ bản ghi?`)) return;
    try {
      await datasetRepository.delete(id);
      notify(`Đã xóa bộ dữ liệu "${name}".`);
      if (selectedId === id) setSelectedId(null);
      await loadDatasets();
    } catch (err) {
      notify((err as Error).message || 'Không thể xóa bộ dữ liệu.', true);
    }
  }

  async function handleExportCsv(id: string, name: string) {
    try {
      const csvText = await datasetRepository.exportCsv(id);
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${name.toLowerCase().replace(/\s+/g, '_')}_dataset.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      notify('Đã tải xuống file CSV an toàn với mã hóa UTF-8 BOM.');
    } catch (err) {
      notify((err as Error).message || 'Lỗi khi xuất file CSV.', true);
    }
  }

  function handleCopyJson(ds: DatasetWireDTO) {
    const data = {
      dataset: ds,
      records: selectedId === ds.id ? records : []
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    notify('Đã sao chép dữ liệu JSON vào Clipboard.');
  }

  function handleCopyTsv() {
    if (!records.length) return;
    const currentDs = datasets.find(d => d.id === selectedId);
    const keys = currentDs?.columns?.length
      ? currentDs.columns.map(c => c.key)
      : Array.from(new Set(records.flatMap(r => Object.keys(r.data || {}))));

    const header = ['Nguồn (URL)', 'Tiêu đề', ...keys].join('\t');
    const rows = records.map(r => {
      const data = r.data || {};
      const values = keys.map(k => String(data[k] ?? '').replace(/[\t\n\r]/g, ' '));
      return [r.sourceUrl || '', r.sourceTitle || '', ...values].join('\t');
    });

    const tsv = [header, ...rows].join('\n');
    navigator.clipboard.writeText(tsv);
    notify('Đã sao chép bảng (định dạng TSV) — bạn có thể dán trực tiếp vào Google Sheets hoặc Excel!');
  }

  async function handleSendWebhook() {
    if (!webhookUrl.trim() || !webhookUrl.startsWith('http')) {
      notify('Vui lòng nhập địa chỉ Webhook URL hợp lệ (bắt đầu bằng http:// hoặc https://).', true);
      return;
    }
    setSendingWebhook(true);
    try {
      const currentDs = datasets.find(d => d.id === selectedId);
      const payload = {
        event: 'dataset.sync',
        dataset: currentDs,
        recordCount: records.length,
        records: records.map(r => ({
          id: r.id,
          sourceUrl: r.sourceUrl,
          sourceTitle: r.sourceTitle,
          capturedAt: r.capturedAt,
          data: r.data
        })),
        dispatchedAt: new Date().toISOString()
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'no-cors'
      });

      notify(`Đã điều phối và gửi ${records.length} bản ghi đến Webhook thành công!`);
      setWebhookModal(false);
      setWebhookUrl('');
    } catch (err) {
      notify((err as Error).message || 'Lỗi khi gửi dữ liệu sang Webhook.', true);
    } finally {
      setSendingWebhook(false);
    }
  }

  const selectedDataset = datasets.find(d => d.id === selectedId);

  // Filtered datasets for overview
  const filteredDatasets = datasets.filter(d => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      Boolean(d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = categoryFilter === 'all' || d.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  // Filtered records for table view
  const filteredRecords = records.filter(r => {
    if (!tableSearch.trim()) return true;
    const q = tableSearch.toLowerCase();
    const sourceMatch =
      Boolean(r.sourceUrl && r.sourceUrl.toLowerCase().includes(q)) ||
      Boolean(r.sourceTitle && r.sourceTitle.toLowerCase().includes(q));
    const dataMatch = JSON.stringify(r.data || {}).toLowerCase().includes(q);
    return sourceMatch || dataMatch;
  });

  // Total records across all datasets
  const totalRecordsCount = datasets.reduce((acc, d) => acc + (d.recordCount || 0), 0);

  return (
    <div className="datasets-view" style={{ paddingBottom: '40px' }}>
      {/* HEADER SECTION */}
      <div className="page-heading">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1>Bộ dữ liệu Web</h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'var(--custom-edf2ff)',
                color: 'var(--custom-315bef)'
              }}
            >
              PageWeave Pro
            </span>
          </div>
          <p>Thu thập bảng tính, danh mục sản phẩm, đối tác và ghi chú nghiên cứu từ mọi website.</p>
        </div>
        <div className="page-heading-actions">
          <Button kind="secondary" onClick={() => void loadDatasets()} aria-label="Tải lại">
            <RefreshCw size={17} className={loading ? 'spin' : ''} />
            <span>Làm mới</span>
          </Button>
          <Button aria-label="Tạo bộ dữ liệu mới" onClick={() => setCreateModal(true)}>
            <Plus size={18} />
            <span>Tạo bộ dữ liệu</span>
          </Button>
        </div>
      </div>

      {/* METRIC STRIP */}
      <div className="metric-strip" style={{ marginBottom: '24px' }}>
        <div>
          <strong>{datasets.length}</strong>
          <span>Bộ dữ liệu đang lưu</span>
        </div>
        <div>
          <strong>{totalRecordsCount}</strong>
          <span>Tổng số bản ghi đã cào</span>
        </div>
        <div>
          <strong>UTF-8 BOM</strong>
          <span>Xuất CSV không lỗi font</span>
        </div>
        <div>
          <strong style={{ color: 'var(--custom-087354)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--custom-087354)' }} />
            Sẵn sàng
          </strong>
          <span>Side Panel Extension MV3</span>
        </div>
      </div>

      {/* VIEW: DATASET DETAILS & RECORDS TABLE */}
      {selectedId && selectedDataset ? (
        <div className="dataset-detail-container">
          <button
            className="back-link"
            onClick={() => setSelectedId(null)}
            style={{ marginBottom: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={16} />
            <span>Quay lại tất cả bộ dữ liệu</span>
          </button>

          {/* Dataset Detail Card */}
          <div
            style={{
              background: 'white',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius)',
              padding: '24px',
              marginBottom: '20px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{selectedDataset.name}</h2>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      color: CATEGORY_LABELS[selectedDataset.category]?.color || 'var(--custom-315bef)',
                      background: 'var(--slate-100)'
                    }}
                  >
                    {CATEGORY_LABELS[selectedDataset.category]?.label || selectedDataset.category}
                  </span>
                </div>
                <p style={{ color: 'var(--muted)', fontSize: '13px', maxWidth: '750px', marginBottom: '12px' }}>
                  {selectedDataset.description || 'Chưa có mô tả chi tiết cho bộ dữ liệu này.'}
                </p>
                <div style={{ display: 'flex', gap: '16px', color: 'var(--muted)', fontSize: '11px' }}>
                  <span>Số bản ghi: <strong style={{ color: 'var(--ink)' }}>{records.length}</strong></span>
                  <span>Cập nhật: <strong style={{ color: 'var(--ink)' }}>{new Date(selectedDataset.updatedAt).toLocaleDateString('vi-VN')}</strong></span>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                <Button kind="secondary" onClick={() => void handleExportCsv(selectedDataset.id, selectedDataset.name)}>
                  <Download size={16} />
                  <span>Xuất CSV</span>
                </Button>
                <Button kind="secondary" onClick={handleCopyTsv}>
                  <Copy size={16} />
                  <span>Sao chép vào Google Sheets</span>
                </Button>
                <Button kind="secondary" onClick={() => setWebhookModal(true)}>
                  <Send size={16} />
                  <span>Đồng bộ Webhook</span>
                </Button>
                <Button kind="danger" onClick={() => void handleDelete(selectedDataset.id, selectedDataset.name)}>
                  <Trash2 size={16} />
                  <span>Xóa</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Table Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
            <div className="search-field" style={{ maxWidth: '380px' }}>
              <Search size={17} />
              <input
                type="search"
                placeholder="Tìm kiếm trong bảng dữ liệu…"
                value={tableSearch}
                onChange={e => setTableSearch(e.target.value)}
              />
              {tableSearch && (
                <button className="icon-button" onClick={() => setTableSearch('')} aria-label="Xóa tìm kiếm">
                  <X size={15} />
                </button>
              )}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Hiển thị {filteredRecords.length} / {records.length} dòng
            </span>
          </div>

          {/* Data Records Table */}
          {loadingRecords ? (
            <div className="loading-state" role="status">
              <LoaderCircle className="spin" size={24} />
              <p>Đang tải dữ liệu bảng…</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div
              style={{
                background: 'white',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius)',
                padding: '48px 24px',
                textAlign: 'center'
              }}
            >
              <Table size={40} style={{ color: 'var(--muted)', margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Chưa có bản ghi nào</h3>
              <p style={{ color: 'var(--muted)', fontSize: '13px', maxWidth: '480px', margin: '0 auto 20px' }}>
                Mở tiện ích mở rộng <strong>PageWeave</strong> (Chrome/Cốc Cốc Extension) trên bất kỳ trang web nào và bấm{' '}
                <strong>"Lưu vào bộ dữ liệu này"</strong> để thu thập dữ liệu tự động.
              </p>
            </div>
          ) : (
            <div
              style={{
                background: 'white',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius)',
                overflowX: 'auto',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--custom-fafbfe)', borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '14px 18px', width: '40px' }}>#</th>
                    <th style={{ padding: '14px 18px', minWidth: '220px' }}>Nguồn dữ liệu (Provenance)</th>
                    {/* Dynamic Columns */}
                    {Object.keys(filteredRecords[0]?.data || {}).map(key => (
                      <th key={key} style={{ padding: '14px 18px', minWidth: '160px' }}>
                        {key}
                      </th>
                    ))}
                    <th style={{ padding: '14px 18px', width: '130px' }}>Thời điểm cào</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((r, idx) => {
                    const data = r.data || {};
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--line)', transition: 'background .12s' }}>
                        <td style={{ padding: '14px 18px', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <strong style={{ display: 'block', fontSize: '13px', color: 'var(--ink)', marginBottom: '4px' }}>
                            {r.sourceTitle || 'Trang web'}
                          </strong>
                          {r.sourceUrl && (
                            <a
                              href={r.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: 'var(--primary)',
                                fontSize: '11px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                maxWidth: '260px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <span>{r.sourceUrl}</span>
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </td>
                        {Object.entries(data).map(([k, val]) => (
                          <td key={k} style={{ padding: '14px 18px', color: 'var(--ink)' }}>
                            {typeof val === 'number' && (k.toLowerCase().includes('price') || k.toLowerCase().includes('giá'))
                              ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
                              : typeof val === 'object' && val !== null
                              ? JSON.stringify(val)
                              : String(val ?? '')}
                          </td>
                        ))}
                        <td style={{ padding: '14px 18px', color: 'var(--muted)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                          {new Date(r.capturedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{' '}
                          {new Date(r.capturedAt).toLocaleDateString('vi-VN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* VIEW: DATASETS GRID */
        <div>
          {/* Filter Bar */}
          <div className="filter-bar">
            <div className="search-field">
              <Search size={18} />
              <input
                type="search"
                placeholder="Tìm bộ dữ liệu theo tên hoặc mô tả…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="icon-button" onClick={() => setSearchQuery('')} aria-label="Xóa tìm kiếm">
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="select-field">
              <select
                aria-label="Lọc theo ngành nghề"
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
              >
                <option value="all">Tất cả ngành nghề</option>
                <option value="product_research">So sánh sản phẩm & Giá</option>
                <option value="company_list">Doanh nghiệp & B2B Leads</option>
                <option value="research_notes">Ghi chú & Nghiên cứu</option>
                <option value="jobtrack">Tuyển dụng & Tìm việc</option>
                <option value="custom">Tùy chỉnh khác</option>
              </select>
            </div>
          </div>

          {/* Datasets Grid */}
          {loading ? (
            <div className="loading-state" role="status">
              <LoaderCircle className="spin" size={24} />
              <p>Đang tải danh sách bộ dữ liệu…</p>
            </div>
          ) : filteredDatasets.length === 0 ? (
            <Empty
              title={datasets.length ? 'Không tìm thấy bộ dữ liệu phù hợp' : 'Bắt đầu với bộ dữ liệu web đầu tiên'}
              action={
                <Button onClick={() => (datasets.length ? setSearchQuery('') : setCreateModal(true))}>
                  {datasets.length ? 'Xóa bộ lọc tìm kiếm' : 'Tạo bộ dữ liệu mới'}
                </Button>
              }
            >
              {datasets.length
                ? 'Thử thay đổi từ khóa hoặc bộ lọc ngành nghề.'
                : 'Tạo một bảng dữ liệu để lưu trữ sản phẩm, giá cả, danh bạ công ty hoặc tài liệu nghiên cứu thu thập từ web.'}
            </Empty>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                gap: '20px'
              }}
            >
              {filteredDatasets.map(ds => {
                const catInfo = CATEGORY_LABELS[ds.category] || CATEGORY_LABELS.custom;
                return (
                  <div
                    key={ds.id}
                    style={{
                      background: 'white',
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--radius)',
                      padding: '22px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'border-color .15s, box-shadow .15s'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            color: catInfo.color,
                            background: 'var(--slate-50)',
                            border: '1px solid var(--slate-200)'
                          }}
                        >
                          {catInfo.label}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: 'var(--soft)',
                            color: 'var(--primary)'
                          }}
                        >
                          {ds.recordCount || 0} bản ghi
                        </span>
                      </div>

                      <h3
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          marginBottom: '8px',
                          color: 'var(--ink)',
                          cursor: 'pointer'
                        }}
                        onClick={() => void openDataset(ds.id)}
                      >
                        {ds.name}
                      </h3>

                      <p
                        style={{
                          fontSize: '12px',
                          color: 'var(--muted)',
                          lineHeight: '1.6',
                          marginBottom: '16px',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {ds.description || 'Chưa có mô tả cho bộ dữ liệu này.'}
                      </p>

                      {/* Columns preview */}
                      {ds.columns && ds.columns.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '18px' }}>
                          {ds.columns.slice(0, 4).map(c => (
                            <span
                              key={c.key}
                              style={{
                                fontSize: '10px',
                                background: 'var(--custom-f1f4f9)',
                                color: 'var(--muted)',
                                padding: '2px 6px',
                                borderRadius: '4px'
                              }}
                            >
                              {c.label || c.key}
                            </span>
                          ))}
                          {ds.columns.length > 4 && (
                            <span style={{ fontSize: '10px', color: 'var(--muted)', alignSelf: 'center' }}>
                              +{ds.columns.length - 4} cột
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderTop: '1px solid var(--line)',
                        paddingTop: '14px',
                        marginTop: 'auto'
                      }}
                    >
                      <button
                        className="text-link"
                        style={{ fontSize: '13px', fontWeight: 600 }}
                        onClick={() => void openDataset(ds.id)}
                      >
                        <Table size={15} />
                        <span>Mở bảng dữ liệu</span>
                      </button>

                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="icon-button"
                          title="Xuất file CSV"
                          onClick={() => void handleExportCsv(ds.id, ds.name)}
                          aria-label="Xuất file CSV"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          className="icon-button"
                          title="Sao chép JSON"
                          onClick={() => handleCopyJson(ds)}
                          aria-label="Sao chép JSON"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          className="icon-button"
                          title="Xóa bộ dữ liệu"
                          onClick={() => void handleDelete(ds.id, ds.name)}
                          aria-label="Xóa bộ dữ liệu"
                          style={{ color: 'var(--danger)' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CREATE DATASET MODAL */}
      {createModal && (
        <Dialog title="Tạo bộ dữ liệu mới" onClose={() => setCreateModal(false)} busy={creating}>
          <div className="dialog-body">
            <p className="form-intro">
              Tạo bộ dữ liệu mới để bắt đầu thu thập bảng và thông tin có cấu trúc bằng tiện ích PageWeave.
            </p>

            <Field label="Tên bộ dữ liệu *">
              <input
                type="text"
                placeholder="VD: Khảo sát giá đồ gia dụng, Danh bạ đối tác AI..."
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
              />
            </Field>

            <Field label="Ngành nghề / Phân loại">
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value as DatasetCategory)}
              >
                <option value="product_research">So sánh sản phẩm & Giá</option>
                <option value="company_list">Doanh nghiệp & B2B Leads</option>
                <option value="research_notes">Ghi chú & Nghiên cứu học thuật</option>
                <option value="jobtrack">Tuyển dụng & Tìm việc</option>
                <option value="custom">Tùy chỉnh khác</option>
              </select>
            </Field>

            <Field label="Mô tả mục đích (tùy chọn)">
              <textarea
                rows={3}
                placeholder="Ghi chú về nguồn cào, mục đích sử dụng hoặc các trường cần theo dõi…"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
              />
            </Field>
          </div>

          <footer className="dialog-actions">
            <Button kind="secondary" disabled={creating} onClick={() => setCreateModal(false)}>
              Hủy
            </Button>
            <Button disabled={creating} onClick={() => void handleCreate()}>
              {creating ? 'Đang tạo…' : 'Tạo bộ dữ liệu'}
            </Button>
          </footer>
        </Dialog>
      )}

      {/* WEBHOOK DISPATCH MODAL (U12) */}
      {webhookModal && (
        <Dialog title="Đồng bộ Webhook ra ngoài (U12)" onClose={() => setWebhookModal(false)} busy={sendingWebhook}>
          <div className="dialog-body">
            <p className="form-intro">
              Gửi toàn bộ {records.length} bản ghi của <strong>{selectedDataset?.name}</strong> đến bất kỳ hệ thống nào
              (Google Sheets Webhook, Zapier, Make, hoặc Server riêng của bạn).
            </p>

            <Field label="Webhook Endpoint URL *">
              <input
                type="url"
                placeholder="https://hook.eu1.make.com/... hoặc https://script.google.com/..."
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
                autoFocus
              />
            </Field>

            <div
              style={{
                background: 'var(--custom-fafbfe)',
                border: '1px solid var(--line)',
                borderRadius: '8px',
                padding: '14px',
                marginTop: '12px',
                fontSize: '12px',
                color: 'var(--muted)'
              }}
            >
              <strong>Cấu trúc JSON gửi đi:</strong>
              <pre
                style={{
                  marginTop: '8px',
                  background: 'var(--slate-100)',
                  padding: '8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  overflowX: 'auto'
                }}
              >
{`{
  "event": "dataset.sync",
  "dataset": "${selectedDataset?.name}",
  "recordCount": ${records.length},
  "records": [ ... ],
  "dispatchedAt": "2026-10-20T..."
}`}
              </pre>
            </div>
          </div>

          <footer className="dialog-actions">
            <Button kind="secondary" disabled={sendingWebhook} onClick={() => setWebhookModal(false)}>
              Hủy
            </Button>
            <Button disabled={sendingWebhook} onClick={() => void handleSendWebhook()}>
              {sendingWebhook ? 'Đang gửi…' : 'Gửi ngay'}
            </Button>
          </footer>
        </Dialog>
      )}
    </div>
  );
}
