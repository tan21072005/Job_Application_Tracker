import { useState } from 'react';
import { Trash2, FileSpreadsheet, X, CheckSquare, Layers } from 'lucide-react';
import { statuses, labels, type Status } from '../domain';
import { Button } from './ui';

export default function BulkActionBar({
  selectedCount,
  onStatusChange,
  onTrash,
  onExportCsv,
  onClear,
  busy = false
}: {
  selectedCount: number;
  onStatusChange: (status: Status) => void;
  onTrash: () => void;
  onExportCsv: () => void;
  onClear: () => void;
  busy?: boolean;
}) {
  const [selectedStatus, setSelectedStatus] = useState<Status | ''>('');

  if (selectedCount === 0) return null;

  return (
    <aside className="bulk-actions-bar" aria-label="Thao tác hàng loạt" role="toolbar">
      <div className="bulk-count-badge">
        <CheckSquare size={17} />
        <span>Đã chọn <strong>{selectedCount}</strong> hồ sơ</span>
      </div>

      <div className="bulk-controls">
        <label className="bulk-status-selector">
          <Layers size={15} />
          <span className="sr-only">Đổi trạng thái hàng loạt</span>
          <select
            disabled={busy}
            value={selectedStatus}
            onChange={e => {
              const val = e.target.value as Status;
              if (val) {
                onStatusChange(val);
                setSelectedStatus('');
              }
            }}
          >
            <option value="">Đổi trạng thái…</option>
            {statuses.map(st => (
              <option key={st} value={st}>
                {labels[st]}
              </option>
            ))}
          </select>
        </label>

        <Button
          kind="secondary"
          disabled={busy}
          onClick={onExportCsv}
          className="bulk-export-btn"
          aria-label="Xuất CSV các hồ sơ đã chọn"
        >
          <FileSpreadsheet size={15} />
          <span>Xuất CSV</span>
        </Button>

        <Button
          kind="danger"
          disabled={busy}
          onClick={onTrash}
          className="bulk-trash-btn"
          aria-label="Chuyển các hồ sơ đã chọn vào thùng rác"
        >
          <Trash2 size={15} />
          <span>Bỏ thùng rác</span>
        </Button>

        <button
          type="button"
          disabled={busy}
          onClick={onClear}
          className="bulk-clear-btn"
          aria-label="Bỏ chọn tất cả"
          title="Bỏ chọn"
        >
          <X size={17} />
        </button>
      </div>
    </aside>
  );
}
