import { useState, useRef, type ChangeEvent, type DragEvent } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, FileText, AlertCircle } from 'lucide-react';
import { Button, Dialog } from './ui';
import { repository } from '../data';
import {
  parseApplicationsFromCsv,
  type CsvImportPreviewDTO,
  type CsvImportResultDTO
} from '@jobtrack/contract';

interface Props {
  onClose: () => void;
  onSuccess: (result: CsvImportResultDTO) => void;
  existingApps?: Array<{ company: string; position: string; url?: string | null }>;
}

export default function ImportCsvModal({ onClose, onSuccess, existingApps = [] }: Props) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<CsvImportPreviewDTO | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function processCsvText(text: string, name: string) {
    setErrorMsg(null);
    try {
      const parsed = parseApplicationsFromCsv(text, { existingApps });
      setPreview(parsed);
      setFileName(name);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể đọc tệp CSV.');
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const content = evt.target?.result;
      if (typeof content === 'string') {
        processCsvText(content, file.name);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Lỗi khi đọc tệp tin.');
    };
    reader.readAsText(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setErrorMsg('Vui lòng chỉ tải lên tệp có định dạng .csv.');
      return;
    }
    const reader = new FileReader();
    reader.onload = evt => {
      const content = evt.target?.result;
      if (typeof content === 'string') {
        processCsvText(content, file.name);
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!preview || preview.validRowsCount === 0) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const rowsToImport = preview.rows
        .filter(r => r.isValid && !r.isDuplicate)
        .map(r => ({
          company: r.company,
          position: r.position,
          status: r.status,
          appliedAt: r.appliedAt,
          salary: r.salary,
          location: r.location,
          workMode: r.workMode,
          nextAction: r.nextAction,
          deadline: r.deadline,
          source: r.source,
          jobCode: r.jobCode,
          url: r.url,
          notes: r.notes
        }));
      const res = await repository.importCsv(rowsToImport, skipDuplicates);
      onSuccess(res);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Nhập dữ liệu thất bại.');
    } finally {
      setBusy(false);
    }
  }

  const validCount = preview?.validRowsCount || 0;
  const duplicateCount = preview?.duplicateRowsCount || 0;
  const errorCount = preview?.errorRowsCount || 0;
  const totalCount = preview?.totalRows || 0;

  return (
    <Dialog
      onClose={onClose}
      title="Nhập hồ sơ hàng loạt từ file CSV"
      wide
      busy={busy}
    >
      <div className="csv-import-modal-body">
        {errorMsg && (
          <div className="csv-import-error-banner" role="alert">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {!preview ? (
          <div
            className={`csv-dropzone ${isDragging ? 'is-dragging' : ''}`}
            onDragOver={e => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <div className="csv-dropzone-icon">
              <UploadCloud size={40} />
            </div>
            <h4 className="csv-dropzone-title">Kéo thả tệp CSV vào đây hoặc bấm để chọn tệp</h4>
            <p className="csv-dropzone-hint">
              Hỗ trợ mã hóa UTF-8, định dạng RFC 4180 tiêu chuẩn, xuất từ Excel hoặc Google Sheets.
            </p>
            <div className="csv-template-guide">
              <span className="csv-guide-label">Các cột tiêu chuẩn hỗ trợ:</span>
              <div className="csv-tags">
                <span className="csv-col-tag">Công ty (Bắt buộc)</span>
                <span className="csv-col-tag">Vị trí (Bắt buộc)</span>
                <span className="csv-col-tag">Trạng thái</span>
                <span className="csv-col-tag">Mức lương</span>
                <span className="csv-col-tag">Địa điểm</span>
                <span className="csv-col-tag">Ngày nộp</span>
                <span className="csv-col-tag">Link bài đăng</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="csv-preview-container">
            <div className="csv-file-header">
              <div className="csv-file-meta">
                <FileSpreadsheet size={20} className="csv-file-icon" />
                <span className="csv-filename">{fileName}</span>
                <span className="csv-total-pill">{totalCount} dòng dữ liệu</span>
              </div>
              <Button
                kind="ghost"
                onClick={() => {
                  setPreview(null);
                  setFileName(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                Chọn tệp khác
              </Button>
            </div>

            <div className="csv-stats-grid">
              <div className="csv-stat-card stat-valid">
                <CheckCircle2 size={18} className="stat-icon" />
                <div className="stat-text">
                  <span className="stat-num">{validCount}</span>
                  <span className="stat-desc">Hợp lệ để nhập</span>
                </div>
              </div>
              <div className="csv-stat-card stat-duplicate">
                <AlertTriangle size={18} className="stat-icon" />
                <div className="stat-text">
                  <span className="stat-num">{duplicateCount}</span>
                  <span className="stat-desc">Bị trùng lặp</span>
                </div>
              </div>
              <div className="csv-stat-card stat-error">
                <XCircle size={18} className="stat-icon" />
                <div className="stat-text">
                  <span className="stat-num">{errorCount}</span>
                  <span className="stat-desc">Lỗi định dạng</span>
                </div>
              </div>
            </div>

            <div className="csv-table-wrapper">
              <table className="csv-preview-table">
                <thead>
                  <tr>
                    <th style={{ width: '45px' }}>#</th>
                    <th>Công ty</th>
                    <th>Vị trí</th>
                    <th>Trạng thái</th>
                    <th>Mức lương</th>
                    <th>Ngày nộp</th>
                    <th>Kiểm tra</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map(row => {
                    const rowType = !row.isValid ? 'error' : row.isDuplicate ? 'duplicate' : 'valid';
                    return (
                      <tr key={`row-${row.rowNumber}`} className={`row-${rowType}`}>
                        <td className="cell-num">{row.rowNumber}</td>
                        <td className="cell-company">
                          <strong>{row.company || '(Thiếu tên)'}</strong>
                          {row.url && (
                            <div className="cell-url-hint">{row.url}</div>
                          )}
                        </td>
                        <td className="cell-position">{row.position || '(Thiếu vị trí)'}</td>
                        <td>
                          <span className="csv-badge-status">{row.status || 'Saved'}</span>
                        </td>
                        <td>{row.salary || '—'}</td>
                        <td>{row.appliedAt || '—'}</td>
                        <td>
                          {rowType === 'valid' && (
                            <span className="csv-check-badge badge-valid">
                              <CheckCircle2 size={12} /> Hợp lệ
                            </span>
                          )}
                          {rowType === 'duplicate' && (
                            <span className="csv-check-badge badge-dup">
                              <AlertTriangle size={12} /> Trùng lặp
                            </span>
                          )}
                          {rowType === 'error' && (
                            <span className="csv-check-badge badge-err" title={row.errors.join(', ')}>
                              <XCircle size={12} /> {row.errors[0] || 'Lỗi'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="csv-options-bar">
              <label className="csv-checkbox-label">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={e => setSkipDuplicates(e.target.checked)}
                />
                <span>Tự động bỏ qua các hồ sơ đã tồn tại trong hệ thống</span>
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="dialog-actions">
        <Button kind="secondary" onClick={onClose} disabled={busy}>
          Hủy bỏ
        </Button>
        {preview && (
          <Button
            kind="primary"
            onClick={handleImport}
            disabled={validCount === 0 || busy}
          >
            <FileText size={16} />
            <span>
              {busy ? 'Đang nhập...' : `Nhập ${validCount} hồ sơ hợp lệ`}
            </span>
          </Button>
        )}
      </div>
    </Dialog>
  );
}
