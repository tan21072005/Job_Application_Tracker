import { useState, useEffect } from 'react';
import {
  Send,
  Plus,
  Users,
  CheckCircle,
  Copy,
  ChevronRight,
  TrendingUp,
  MessageSquare,
  ExternalLink,
  Mail,
  Trash2,
  Sparkles,
  ArrowRight,
  UserPlus
} from 'lucide-react';
import type {
  OutreachCampaignDTO,
  OutreachRecipientDTO,
  CampaignObjective,
  OutreachTargetType,
  OutreachChannel,
  RecipientStatus,
  CreateCampaignInputDTO,
  AddRecipientInputDTO
} from '@jobtrack/contract';
import { personalizeMessage, computeCampaignMetrics } from '@jobtrack/contract';
import { outreachRepository } from '../data';
import { Button, Dialog } from './ui';

const CAMPAIGN_PRESETS = [
  {
    name: 'Chiến dịch Referral Shopee Q4',
    objective: 'referral_request' as CampaignObjective,
    targetType: 'engineer' as OutreachTargetType,
    company: 'Shopee Vietnam',
    role: 'Senior Backend Engineer'
  },
  {
    name: 'Mời Coffee Chat Grab Alumni',
    objective: 'coffee_chat' as CampaignObjective,
    targetType: 'alumni' as OutreachTargetType,
    company: 'Grab Vietnam',
    role: 'Staff Platform Engineer'
  },
  {
    name: 'Tiếp cận Recruiter Tiki Tech',
    objective: 'recruiter_intro' as CampaignObjective,
    targetType: 'recruiter' as OutreachTargetType,
    company: 'Tiki Corporation',
    role: 'Lead Solutions Architect'
  }
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  notify: (msg: string, error?: boolean) => void;
}

export function OutreachCampaignModal({ isOpen, onClose, notify }: Props) {
  const [campaigns, setCampaigns] = useState<OutreachCampaignDTO[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [addingRecipient, setAddingRecipient] = useState(false);

  const [formName, setFormName] = useState('');
  const [formObjective, setFormObjective] = useState<CampaignObjective>('referral_request');
  const [formTargetType, setFormTargetType] = useState<OutreachTargetType>('engineer');
  const [formCompany, setFormCompany] = useState('');
  const [formRole, setFormRole] = useState('');

  const [recName, setRecName] = useState('');
  const [recTitle, setRecTitle] = useState('');
  const [recCompany, setRecCompany] = useState('');
  const [recChannel, setRecChannel] = useState<OutreachChannel>('linkedin');
  const [recEmail, setRecEmail] = useState('');
  const [recLinkedin, setRecLinkedin] = useState('');
  const [recNotes, setRecNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      void loadCampaigns();
    }
  }, [isOpen]);

  async function loadCampaigns() {
    setLoading(true);
    try {
      const list = await outreachRepository.listCampaigns();
      setCampaigns(list);
      if (list.length > 0) {
        setSelectedId(list[0].id);
        if (list[0].recipients.length > 0) {
          setSelectedRecipientId(list[0].recipients[0].id);
        }
      } else {
        setCreating(true);
        applyPreset(CAMPAIGN_PRESETS[0]);
      }
    } catch (err) {
      notify((err as Error).message || 'Không thể tải danh sách chiến dịch.', true);
    } finally {
      setLoading(false);
    }
  }

  function applyPreset(p: typeof CAMPAIGN_PRESETS[number]) {
    setFormName(p.name);
    setFormObjective(p.objective);
    setFormTargetType(p.targetType);
    setFormCompany(p.company);
    setFormRole(p.role);
  }

  const activeCampaign = campaigns.find(c => c.id === selectedId) || null;
  const activeRecipient = activeCampaign?.recipients.find(r => r.id === selectedRecipientId) || null;

  async function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formCompany.trim() || !formRole.trim()) {
      notify('Vui lòng điền đủ tên chiến dịch, công ty và vị trí.', true);
      return;
    }

    try {
      const input: CreateCampaignInputDTO = {
        name: formName.trim(),
        objective: formObjective,
        targetType: formTargetType,
        targetCompany: formCompany.trim(),
        targetRole: formRole.trim()
      };
      const created = await outreachRepository.createCampaign(input);
      let initialRecipient: OutreachRecipientDTO | null = null;
      try {
        initialRecipient = await outreachRepository.addRecipient(created.id, {
          name: 'Nguyễn Văn Minh',
          title: 'Senior Tech Lead',
          company: input.targetCompany,
          channel: 'linkedin',
          notes: 'Alumni Bách Khoa'
        });
        created.recipients = [initialRecipient];
        created.analytics = computeCampaignMetrics(created.recipients);
      } catch {}
      setCampaigns(prev => [created, ...prev]);
      setSelectedId(created.id);
      setSelectedRecipientId(initialRecipient ? initialRecipient.id : null);
      setCreating(false);
      setFormName('');
      setFormCompany('');
      setFormRole('');
      notify(`Đã khởi tạo chiến dịch "${created.name}" thành công.`);
    } catch (err) {
      notify((err as Error).message || 'Không thể tạo chiến dịch.', true);
    }
  }

  async function handleAddRecipient(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCampaign) return;
    if (!recName.trim()) {
      notify('Vui lòng nhập tên người nhận.', true);
      return;
    }

    try {
      const input: AddRecipientInputDTO = {
        name: recName.trim(),
        title: recTitle.trim() || activeCampaign.targetRole,
        company: recCompany.trim() || activeCampaign.targetCompany,
        channel: recChannel,
        email: recEmail.trim() || null,
        linkedinUrl: recLinkedin.trim() || null,
        notes: recNotes.trim()
      };
      const added = await outreachRepository.addRecipient(activeCampaign.id, input);
      setCampaigns(prev => prev.map(c => {
        if (c.id !== activeCampaign.id) return c;
        const nextRecipients = [added, ...c.recipients];
        return {
          ...c,
          recipients: nextRecipients,
          analytics: {
            ...c.analytics!,
            totalRecipients: nextRecipients.length
          }
        };
      }));
      setSelectedRecipientId(added.id);
      setAddingRecipient(false);
      setRecName('');
      setRecTitle('');
      setRecEmail('');
      setRecLinkedin('');
      setRecNotes('');
      notify(`Đã thêm ${added.name} vào chiến dịch.`);
    } catch (err) {
      notify((err as Error).message || 'Không thể thêm người nhận.', true);
    }
  }

  async function handleUpdateRecipientStatus(recipientId: string, status: RecipientStatus, advanceStep = false) {
    if (!activeCampaign) return;
    const r = activeCampaign.recipients.find(item => item.id === recipientId);
    if (!r) return;

    const nextStep = advanceStep ? Math.min(r.currentStepIndex + 1, activeCampaign.steps.length) : r.currentStepIndex;

    try {
      const updated = await outreachRepository.updateRecipientStep(recipientId, {
        currentStepIndex: nextStep,
        status
      });

      setCampaigns(prev => prev.map(c => {
        if (c.id !== activeCampaign.id) return c;
        const nextRecs = c.recipients.map(item => item.id === recipientId ? updated : item);
        let sent = 0;
        let replied = 0;
        let referred = 0;
        for (const item of nextRecs) {
          if (['sent', 'replied', 'referred', 'declined'].includes(item.status)) sent++;
          if (['replied', 'referred'].includes(item.status)) replied++;
          if (item.status === 'referred') referred++;
        }
        return {
          ...c,
          recipients: nextRecs,
          analytics: {
            totalRecipients: nextRecs.length,
            totalSent: sent,
            totalReplied: replied,
            totalReferred: referred,
            replyRate: sent > 0 ? Number(((replied / sent) * 100).toFixed(1)) : 0,
            referralRate: sent > 0 ? Number(((referred / sent) * 100).toFixed(1)) : 0
          }
        };
      }));
      notify(`Đã cập nhật trạng thái của ${updated.name} thành "${getStatusLabel(status)}".`);
    } catch (err) {
      notify((err as Error).message || 'Không thể cập nhật trạng thái.', true);
    }
  }

  async function handleDeleteCampaign(id: string) {
    if (!window.confirm('Bạn có chắc chắn muốn xóa chiến dịch này không?')) return;
    try {
      await outreachRepository.deleteCampaign(id);
      const remaining = campaigns.filter(c => c.id !== id);
      setCampaigns(remaining);
      setSelectedId(remaining.length > 0 ? remaining[0].id : null);
      setSelectedRecipientId(remaining.length > 0 && remaining[0].recipients.length > 0 ? remaining[0].recipients[0].id : null);
      notify('Đã xóa chiến dịch thành công.');
    } catch (err) {
      notify((err as Error).message || 'Không thể xóa chiến dịch.', true);
    }
  }

  function copyToClipboard(text: string) {
    void navigator.clipboard.writeText(text);
    notify('Đã sao chép nội dung tin nhắn vào bộ nhớ tạm.');
  }

  function getObjectiveLabel(obj: CampaignObjective): string {
    switch (obj) {
      case 'referral_request':
        return 'Xin Referral nội bộ';
      case 'coffee_chat':
        return 'Mời Coffee Chat & Tư vấn';
      case 'recruiter_intro':
        return 'Kết nối Nhà tuyển dụng';
      case 'cold_pitch':
      default:
        return 'Tiếp cận giá trị cao';
    }
  }

  function getStatusLabel(s: RecipientStatus): string {
    switch (s) {
      case 'pending':
        return 'Chờ liên hệ';
      case 'sent':
        return 'Đã gửi tin';
      case 'replied':
        return 'Đã phản hồi';
      case 'referred':
        return 'Đã nhận Referral';
      case 'declined':
        return 'Từ chối';
      default:
        return s;
    }
  }

  if (!isOpen) return null;

  return (
    <Dialog title="Chiến dịch kết nối & Referral (Outreach Sequencer)" onClose={onClose}>
      <div className="outreach-campaign-container">
        <div className="outreach-top-bar">
          <div className="campaign-picker-group">
            <label htmlFor="outreach-campaign-select">Chiến dịch:</label>
            <select
              id="outreach-campaign-select"
              className="input campaign-select"
              value={selectedId || ''}
              onChange={e => {
                setSelectedId(e.target.value);
                const target = campaigns.find(c => c.id === e.target.value);
                setSelectedRecipientId(target?.recipients[0]?.id || null);
                setCreating(false);
                setAddingRecipient(false);
              }}
              disabled={creating}
            >
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.targetCompany})
                </option>
              ))}
            </select>
          </div>

          <div className="top-action-buttons">
            <button
              type="button"
              className="outreach-btn-new-campaign"
              onClick={() => {
                setCreating(true);
                setAddingRecipient(false);
              }}
            >
              <Plus size={15} />
              <span>Tạo chiến dịch mới</span>
            </button>
            {activeCampaign && (
              <button
                type="button"
                className="outreach-btn-delete"
                onClick={() => handleDeleteCampaign(activeCampaign.id)}
                title="Xóa chiến dịch này"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>

        {creating ? (
          <form className="outreach-form-card" onSubmit={handleCreateCampaign}>
            <h4>Khởi tạo chiến dịch Outreach & Kịch bản tự động</h4>
            <div className="preset-selector-row">
              <span className="preset-label">Mẫu chiến dịch gợi ý:</span>
              <div className="preset-buttons">
                {CAMPAIGN_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="preset-btn"
                    onClick={() => applyPreset(p)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Tên chiến dịch:</label>
                <input
                  type="text"
                  className="input"
                  placeholder="VD: Chiến dịch Referral Shopee Backend Q4"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Mục tiêu chiến dịch:</label>
                <select
                  className="input"
                  value={formObjective}
                  onChange={e => setFormObjective(e.target.value as CampaignObjective)}
                >
                  <option value="referral_request">Xin Referral nội bộ (Tỷ lệ chuyển đổi cao)</option>
                  <option value="coffee_chat">Mời Coffee Chat / Trao đổi văn hóa & Tech stack</option>
                  <option value="recruiter_intro">Kết nối Nhà tuyển dụng / HR phụ trách</option>
                  <option value="cold_pitch">Tiếp cận ý tưởng giá trị cao</option>
                </select>
              </div>

              <div className="form-group">
                <label>Nhóm đối tượng tiếp cận:</label>
                <select
                  className="input"
                  value={formTargetType}
                  onChange={e => setFormTargetType(e.target.value as OutreachTargetType)}
                >
                  <option value="engineer">Kỹ sư / Tech Lead trong đội ngũ</option>
                  <option value="alumni">Cựu sinh viên / Đồng nghiệp cũ (Alumni)</option>
                  <option value="recruiter">Recruiter / Talent Acquisition Specialist</option>
                  <option value="hiring_manager">Hiring Manager / Director of Engineering</option>
                </select>
              </div>

              <div className="form-group">
                <label>Công ty mục tiêu:</label>
                <input
                  type="text"
                  className="input"
                  placeholder="VD: Shopee Vietnam"
                  value={formCompany}
                  onChange={e => setFormCompany(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Vị trí ứng tuyển mục tiêu:</label>
                <input
                  type="text"
                  className="input"
                  placeholder="VD: Senior Backend Engineer"
                  value={formRole}
                  onChange={e => setFormRole(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-actions-row">
              <Button kind="secondary" type="button" onClick={() => setCreating(false)}>
                Hủy bỏ
              </Button>
              <Button kind="primary" type="submit">
                <Sparkles size={16} />
                <span>Khởi tạo kịch bản 3 bước</span>
              </Button>
            </div>
          </form>
        ) : activeCampaign ? (
          <div className="outreach-dashboard-body">
            <div className="campaign-summary-banner">
              <div className="summary-left">
                <h3>{activeCampaign.name}</h3>
                <div className="badge-row">
                  <span className="objective-badge">{getObjectiveLabel(activeCampaign.objective)}</span>
                  <span className="company-badge">{activeCampaign.targetCompany}</span>
                  <span className="role-badge">{activeCampaign.targetRole}</span>
                </div>
              </div>

              <div className="kpi-metrics-grid">
                <div className="kpi-card">
                  <span className="kpi-value">{activeCampaign.analytics?.totalRecipients || 0}</span>
                  <span className="kpi-label">Tổng liên hệ</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-value">{activeCampaign.analytics?.totalSent || 0}</span>
                  <span className="kpi-label">Đã gửi tin</span>
                </div>
                <div className="kpi-card highlight-blue">
                  <span className="kpi-value">{activeCampaign.analytics?.replyRate || 0}%</span>
                  <span className="kpi-label">Tỷ lệ phản hồi</span>
                </div>
                <div className="kpi-card highlight-green">
                  <span className="kpi-value">{activeCampaign.analytics?.referralRate || 0}%</span>
                  <span className="kpi-label">Tỷ lệ Referral</span>
                </div>
              </div>
            </div>

            <div className="outreach-sequence-strip">
              <div className="strip-title">
                <MessageSquare size={16} />
                <span>Kịch bản chuỗi liên hệ 3 bước (Sequence Cadence)</span>
              </div>
              <div className="sequence-cards-grid">
                {activeCampaign.steps.map(step => (
                  <div key={step.id} className="sequence-step-card">
                    <div className="step-card-header">
                      <span className="step-order-badge">Bước {step.stepOrder}</span>
                      <span className="step-delay-badge">
                        {step.delayDays === 0 ? 'Gửi ngay (Ngày 0)' : `Sau +${step.delayDays} ngày`}
                      </span>
                    </div>
                    <strong className="step-card-title">{step.title}</strong>
                    <div className="step-card-subject">
                      <small>Tiêu đề:</small> {step.subjectTemplate}
                    </div>
                    <div className="step-card-body-preview">
                      {step.bodyTemplate.slice(0, 120)}...
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="outreach-work-split">
              <div className="recipients-column">
                <div className="column-header">
                  <div className="header-title">
                    <Users size={16} />
                    <span>Danh sách người nhận ({activeCampaign.recipients.length})</span>
                  </div>
                  <button
                    type="button"
                    className="add-rec-btn"
                    onClick={() => setAddingRecipient(!addingRecipient)}
                  >
                    <UserPlus size={14} />
                    <span>Thêm người nhận</span>
                  </button>
                </div>

                {addingRecipient && (
                  <form className="add-recipient-mini-form" onSubmit={handleAddRecipient}>
                    <input
                      type="text"
                      className="input"
                      placeholder="Họ tên người nhận *"
                      value={recName}
                      onChange={e => setRecName(e.target.value)}
                      required
                    />
                    <input
                      type="text"
                      className="input"
                      placeholder={`Chức danh (Mặc định: ${activeCampaign.targetRole})`}
                      value={recTitle}
                      onChange={e => setRecTitle(e.target.value)}
                    />
                    <input
                      type="text"
                      className="input"
                      placeholder="Email hoặc URL LinkedIn..."
                      value={recLinkedin || recEmail}
                      onChange={e => {
                        if (e.target.value.includes('@')) {
                          setRecEmail(e.target.value);
                          setRecChannel('email');
                        } else {
                          setRecLinkedin(e.target.value);
                          setRecChannel('linkedin');
                        }
                      }}
                    />
                    <input
                      type="text"
                      className="input"
                      placeholder="Ghi chú (VD: Đồng hương, cùng group Telegram)"
                      value={recNotes}
                      onChange={e => setRecNotes(e.target.value)}
                    />
                    <div className="mini-form-actions">
                      <Button kind="secondary" type="button" onClick={() => setAddingRecipient(false)}>
                        Hủy
                      </Button>
                      <Button kind="primary" type="submit">
                        Lưu vào chiến dịch
                      </Button>
                    </div>
                  </form>
                )}

                <div className="recipients-list-box">
                  {activeCampaign.recipients.length === 0 ? (
                    <div className="empty-recipients">
                      <p>Chưa có người nhận nào trong chiến dịch này. Nhấn "Thêm người nhận" để bắt đầu.</p>
                    </div>
                  ) : (
                    activeCampaign.recipients.map(rec => {
                      const isSelected = rec.id === selectedRecipientId;
                      return (
                        <div
                          key={rec.id}
                          className={`recipient-item-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedRecipientId(rec.id)}
                        >
                          <div className="rec-info-left">
                            <div className="rec-avatar">
                              {rec.channel === 'linkedin' ? <ExternalLink size={14} /> : <Mail size={14} />}
                            </div>
                            <div>
                              <strong>{rec.name}</strong>
                              <small>{rec.title} tại {rec.company}</small>
                            </div>
                          </div>
                          <div className="rec-info-right">
                            <span className="step-pill">Bước {rec.currentStepIndex}/3</span>
                            <span className={`status-pill ${rec.status}`}>
                              {getStatusLabel(rec.status)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="composer-column">
                {activeRecipient ? (
                  <div className="personalized-message-card">
                    <div className="composer-header">
                      <div>
                        <h4>Tin nhắn cá nhân hóa cho {activeRecipient.name}</h4>
                        <span className="composer-sub">
                          Áp dụng mẫu Bước {activeRecipient.currentStepIndex} ({activeCampaign.steps[activeRecipient.currentStepIndex - 1]?.title || 'Bước 1'})
                        </span>
                      </div>
                      <span className={`status-pill ${activeRecipient.status}`}>
                        {getStatusLabel(activeRecipient.status)}
                      </span>
                    </div>

                    {(() => {
                      const currentStep = activeCampaign.steps[activeRecipient.currentStepIndex - 1] || activeCampaign.steps[0];
                      const subject = personalizeMessage(currentStep.subjectTemplate, {
                        name: activeRecipient.name,
                        company: activeRecipient.company,
                        role: activeCampaign.targetRole,
                        recipient_title: activeRecipient.title,
                        my_name: 'Nhật Tân',
                        my_strength: 'React, TypeScript, Node.js & Clean Architecture'
                      });
                      const body = personalizeMessage(currentStep.bodyTemplate, {
                        name: activeRecipient.name,
                        company: activeRecipient.company,
                        role: activeCampaign.targetRole,
                        recipient_title: activeRecipient.title,
                        my_name: 'Nhật Tân',
                        my_strength: 'React, TypeScript, Node.js & Clean Architecture',
                        portfolio_url: 'https://jobtrack.dev/portfolio/nhattan',
                        highlight: 'Tối ưu hiệu năng tải trang web giảm 45% LCP'
                      });

                      return (
                        <div className="message-content-wrapper">
                          <div className="message-field">
                            <label>Tiêu đề gửi (Subject):</label>
                            <div className="subject-box">
                              <span>{subject}</span>
                              <button
                                type="button"
                                className="copy-btn"
                                onClick={() => copyToClipboard(subject)}
                                title="Sao chép tiêu đề"
                              >
                                <Copy size={13} />
                              </button>
                            </div>
                          </div>

                          <div className="message-field">
                            <label>Nội dung tin nhắn (Body):</label>
                            <div className="body-box">
                              <pre>{body}</pre>
                              <button
                                type="button"
                                className="copy-btn copy-body-btn"
                                onClick={() => copyToClipboard(body)}
                                title="Sao chép toàn bộ tin nhắn"
                              >
                                <Copy size={15} />
                                <span>Sao chép tin nhắn</span>
                              </button>
                            </div>
                          </div>

                          <div className="outreach-actions-toolbar">
                            <Button
                              kind="primary"
                              onClick={() => handleUpdateRecipientStatus(activeRecipient.id, 'sent', true)}
                            >
                              <CheckCircle size={16} />
                              <span>Đã gửi - Chuyển sang Bước tiếp</span>
                            </Button>

                            <div className="quick-status-buttons">
                              <button
                                type="button"
                                className="quick-btn replied"
                                onClick={() => handleUpdateRecipientStatus(activeRecipient.id, 'replied')}
                              >
                                Đã phản hồi
                              </button>
                              <button
                                type="button"
                                className="quick-btn referred"
                                onClick={() => handleUpdateRecipientStatus(activeRecipient.id, 'referred')}
                              >
                                Đã nhận Referral!
                              </button>
                              <button
                                type="button"
                                className="quick-btn declined"
                                onClick={() => handleUpdateRecipientStatus(activeRecipient.id, 'declined')}
                              >
                                Từ chối
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="no-recipient-selected">
                    <Users size={32} />
                    <p>Chọn một người nhận ở cột bên trái để xem nội dung tin nhắn được AI cá nhân hóa và quản lý tiến độ liên hệ.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state-outreach">
            <p>Chưa có chiến dịch nào được chọn. Vui lòng bấm "Tạo chiến dịch mới" để bắt đầu.</p>
          </div>
        )}
      </div>
    </Dialog>
  );
}
