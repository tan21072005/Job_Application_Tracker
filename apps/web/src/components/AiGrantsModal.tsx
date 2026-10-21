import { useState, useEffect } from 'react';
import { KeyRound, Plus, Trash2, Copy, Check, ShieldCheck, Terminal, AlertCircle } from 'lucide-react';
import { repository } from '../data';
import { Button, Dialog } from './ui';

interface Grant {
  id: string;
  client: string;
  scopes: string[];
  createdAt: string;
  expiresAt: string;
}

interface AiGrantsModalProps {
  onClose: () => void;
}

export default function AiGrantsModal({ onClose }: AiGrantsModalProps) {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newClient, setNewClient] = useState('claude-desktop');
  const [customClient, setCustomClient] = useState('');
  const [createdToken, setCreatedToken] = useState<{ token: string; client: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function loadGrants() {
    setLoading(true);
    setError('');
    try {
      const list = await repository.listGrants();
      setGrants(list as Grant[]);
    } catch (err) {
      setError((err as Error).message || 'Không thể tải danh sách kết nối AI.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadGrants();
  }, []);

  async function handleCreateGrant() {
    const clientName = newClient === 'other' ? customClient.trim() || 'custom-agent' : newClient;
    setBusy(true);
    setError('');
    try {
      const res = await repository.createGrant(clientName);
      setCreatedToken({ token: res.token, client: res.client });
      await loadGrants();
    } catch (err) {
      setError((err as Error).message || 'Không thể tạo kết nối AI.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRevokeGrant(id: string) {
    if (!confirm('Bạn có chắc chắn muốn ngắt kết nối client này? Token hiện tại sẽ mất hiệu lực ngay lập tức.')) return;
    setBusy(true);
    try {
      await repository.revokeGrant(id);
      await loadGrants();
    } catch (err) {
      setError((err as Error).message || 'Không thể thu hồi quyền.');
    } finally {
      setBusy(false);
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  const sampleConfig = createdToken
    ? JSON.stringify(
        {
          mcpServers: {
            jobtrack: {
              url: 'http://127.0.0.1:64366/api/mcp',
              headers: {
                Authorization: `Bearer ${createdToken.token}`
              }
            }
          }
        },
        null,
        2
      )
    : '';

  return (
    <Dialog title="Quản lý kết nối AI & MCP" onClose={onClose} busy={busy || loading} wide>
      <div className="dialog-body">
        <p className="form-intro">
          Cấp quyền cho các trợ lý AI bên ngoài (Claude Desktop, Antigravity, ChatGPT, Codex) điều khiển trực tiếp
          JobTrack với quyền <strong>Full Control</strong> qua giao thức Model Context Protocol (MCP).
        </p>

        {error && (
          <div className="notice notice-error" role="alert">
            <AlertCircle size={17} />
            <p>{error}</p>
          </div>
        )}

        {createdToken && (
          <div className="notice" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46' }}>
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <ShieldCheck size={20} color="#059669" />
                <h3 style={{ margin: 0, color: '#065f46' }}>Đã tạo token kết nối thành công!</h3>
              </div>
              <p style={{ fontSize: '12px', margin: '4px 0 10px' }}>
                Lưu ý: Token này chỉ hiển thị duy nhất một lần. Hãy sao chép và cấu hình vào trợ lý AI của bạn.
              </p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  readOnly
                  value={createdToken.token}
                  style={{ fontFamily: 'monospace', fontSize: '13px', background: '#ffffff', color: '#111827' }}
                />
                <Button kind="secondary" onClick={() => handleCopy(createdToken.token)}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copied ? 'Đã chép' : 'Chép'}</span>
                </Button>
              </div>

              <div style={{ marginTop: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>Cấu hình mẫu cho Claude Desktop / Antigravity:</span>
                <pre
                  style={{
                    background: '#1e293b',
                    color: '#f8fafc',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    overflowX: 'auto',
                    marginTop: '6px'
                  }}
                >
                  {sampleConfig}
                </pre>
              </div>
            </div>
          </div>
        )}

        <fieldset style={{ marginTop: '16px', marginBottom: '24px' }}>
          <legend>Cấp mới quyền kết nối MCP</legend>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label htmlFor="ai-client-select">Chọn trợ lý AI</label>
              <select
                id="ai-client-select"
                value={newClient}
                onChange={e => setNewClient(e.target.value)}
                disabled={busy}
              >
                <option value="claude-desktop">Claude Desktop (MCP HTTP/Stdio)</option>
                <option value="antigravity">Google Antigravity MCP</option>
                <option value="chatgpt">ChatGPT / OpenAI Actions</option>
                <option value="codex">Codex / Cursor IDE</option>
                <option value="n8n">n8n Workflow Automation</option>
                <option value="other">Trợ lý tùy chỉnh…</option>
              </select>
            </div>

            {newClient === 'other' && (
              <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                <label htmlFor="custom-client-input">Tên client</label>
                <input
                  id="custom-client-input"
                  type="text"
                  placeholder="VD: my-custom-agent"
                  value={customClient}
                  onChange={e => setCustomClient(e.target.value)}
                  disabled={busy}
                />
              </div>
            )}

            <Button onClick={() => void handleCreateGrant()} disabled={busy}>
              <Plus size={16} />
              <span>Tạo Token</span>
            </Button>
          </div>
        </fieldset>

        <section>
          <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>Các kết nối đang hoạt động ({grants.length})</h3>
          {loading ? (
            <p style={{ color: 'var(--muted)', fontSize: '12px' }}>Đang tải danh sách kết nối…</p>
          ) : grants.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '12px' }}>Chưa có token AI nào được cấp.</p>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {grants.map(grant => (
                <div
                  key={grant.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    background: 'var(--surface)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <KeyRound size={18} color="var(--primary)" />
                    <div>
                      <strong style={{ fontSize: '13px', display: 'block' }}>{grant.client}</strong>
                      <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
                        Tạo lúc: {new Date(grant.createdAt).toLocaleDateString('vi-VN')} · Quyền: Full Control
                      </small>
                    </div>
                  </div>
                  <Button kind="danger" onClick={() => void handleRevokeGrant(grant.id)} disabled={busy}>
                    <Trash2 size={15} />
                    <span>Thu hồi</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <footer className="dialog-actions">
        <Button kind="secondary" onClick={onClose}>
          Đóng
        </Button>
      </footer>
    </Dialog>
  );
}
