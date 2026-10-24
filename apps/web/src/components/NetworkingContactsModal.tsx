import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Clock,
  AlertCircle,
  CheckCircle2,
  Mail,
  Phone,
  ExternalLink,
  MessageSquare,
  Calendar,
  X,
  Plus,
  Trash2,
  Edit2,
  History,
  Building,
  Briefcase,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import {
  contactRepository,
  type ContactDTO,
  type ContactInteractionDTO,
  type ContactMutationInput,
  type InteractionMutationInput,
  type RelationshipHealthDTO,
  type ContactType,
  type RelationshipStrength,
  type InteractionChannel
} from '../data';
import type { Application } from '../domain';

interface NetworkingContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  applications?: Application[];
  initialApplicationId?: string;
  notify?: (message: string, isError?: boolean) => void;
}

const TYPE_CONFIG: Record<ContactType, { label: string; bg: string; text: string }> = {
  recruiter: { label: 'HR / Recruiter', bg: 'rgba(59, 130, 246, 0.12)', text: '#3b82f6' },
  headhunter: { label: 'Headhunter', bg: 'rgba(168, 85, 247, 0.12)', text: '#a855f7' },
  hiring_manager: { label: 'Hiring Manager', bg: 'rgba(236, 72, 153, 0.12)', text: '#ec4899' },
  referrer: { label: 'Người giới thiệu', bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981' },
  mentor: { label: 'Cố vấn (Mentor)', bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b' },
  peer: { label: 'Đồng nghiệp', bg: 'rgba(107, 114, 128, 0.12)', text: '#6b7280' }
};

const STRENGTH_CONFIG: Record<RelationshipStrength, { label: string; badge: string }> = {
  lead: { label: 'Mới biết', badge: 'strength-lead' },
  connected: { label: 'Đã kết nối', badge: 'strength-connected' },
  in_touch: { label: 'Thường trò chuyện', badge: 'strength-in-touch' },
  advocate: { label: 'Người ủng hộ', badge: 'strength-advocate' },
  dormant: { label: 'Nguội lạnh', badge: 'strength-dormant' }
};

const CHANNEL_LABELS: Record<InteractionChannel, string> = {
  linkedin: 'Tin nhắn LinkedIn',
  email: 'Email',
  phone: 'Điện thoại',
  coffee: 'Gặp gỡ / Cafe',
  interview: 'Phỏng vấn',
  other: 'Khác'
};

export function NetworkingContactsModal({
  isOpen,
  onClose,
  applications = [],
  initialApplicationId,
  notify
}: NetworkingContactsModalProps) {
  const [contacts, setContacts] = useState<(ContactDTO & { health: RelationshipHealthDTO })[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'due' | 'recruiter' | 'referrer' | 'mentor'>('all');

  const [selectedContact, setSelectedContact] = useState<ContactDTO | null>(null);
  const [interactions, setInteractions] = useState<ContactInteractionDTO[]>([]);
  const [loadingInteractions, setLoadingInteractions] = useState(false);

  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactFormData, setContactFormData] = useState<ContactMutationInput>({
    name: '',
    company: '',
    role: '',
    type: 'recruiter',
    email: '',
    phone: '',
    linkedinUrl: '',
    relationshipStrength: 'connected',
    applicationId: initialApplicationId || '',
    notes: ''
  });

  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [interactionFormData, setInteractionFormData] = useState<InteractionMutationInput>({
    channel: 'linkedin',
    summary: '',
    details: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (showContactForm) setShowContactForm(false);
        else if (showInteractionForm) setShowInteractionForm(false);
        else onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showContactForm, showInteractionForm, onClose]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const data = await contactRepository.list();
      setContacts(data);
    } catch (err: any) {
      notify?.(err.message || 'Không thể tải danh bạ kết nối.', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadContacts();
    }
  }, [isOpen]);

  const loadContactDetails = async (c: ContactDTO) => {
    setSelectedContact(c);
    setLoadingInteractions(true);
    try {
      const res = await contactRepository.get(c.id);
      setInteractions(res.interactions);
    } catch (err: any) {
      notify?.(err.message || 'Không thể tải lịch sử tương tác.', true);
    } finally {
      setLoadingInteractions(false);
    }
  };

  const handleOpenAddContact = () => {
    setEditingContactId(null);
    setContactFormData({
      name: '',
      company: '',
      role: '',
      type: 'recruiter',
      email: '',
      phone: '',
      linkedinUrl: '',
      relationshipStrength: 'connected',
      applicationId: initialApplicationId || '',
      notes: ''
    });
    setShowContactForm(true);
  };

  const handleOpenEditContact = (c: ContactDTO) => {
    setEditingContactId(c.id);
    setContactFormData({
      name: c.name,
      company: c.company,
      role: c.role || '',
      type: c.type,
      email: c.email || '',
      phone: c.phone || '',
      linkedinUrl: c.linkedinUrl || '',
      relationshipStrength: c.relationshipStrength,
      applicationId: c.applicationId || '',
      notes: c.notes || ''
    });
    setShowContactForm(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactFormData.name.trim() || !contactFormData.company.trim()) {
      notify?.('Vui lòng nhập họ tên và tên công ty.', true);
      return;
    }

    try {
      if (editingContactId) {
        await contactRepository.update(editingContactId, contactFormData);
        notify?.('Đã cập nhật thông tin người liên hệ thành công!');
      } else {
        await contactRepository.create(contactFormData);
        notify?.('Đã thêm người liên hệ mới vào mạng lưới!');
      }
      setShowContactForm(false);
      await loadContacts();
      if (selectedContact && selectedContact.id === editingContactId) {
        const refreshed = await contactRepository.get(editingContactId);
        setSelectedContact(refreshed.contact);
      }
    } catch (err: any) {
      notify?.(err.message || 'Thao tác lưu người liên hệ thất bại.', true);
    }
  };

  const handleDeleteContact = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa liên hệ "${name}" khỏi danh bạ?`)) return;
    try {
      await contactRepository.delete(id);
      notify?.(`Đã xóa liên hệ "${name}".`);
      if (selectedContact?.id === id) {
        setSelectedContact(null);
        setInteractions([]);
      }
      await loadContacts();
    } catch (err: any) {
      notify?.(err.message || 'Xóa người liên hệ thất bại.', true);
    }
  };

  const handleOpenAddInteraction = (c: ContactDTO) => {
    setSelectedContact(c);
    setInteractionFormData({
      channel: 'linkedin',
      summary: '',
      details: '',
      date: new Date().toISOString().split('T')[0],
      followUpDate: ''
    });
    setShowInteractionForm(true);
  };

  const handleSaveInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact) return;
    if (!interactionFormData.summary.trim()) {
      notify?.('Vui lòng nhập tóm tắt cuộc trao đổi.', true);
      return;
    }

    try {
      await contactRepository.addInteraction(selectedContact.id, interactionFormData);
      notify?.('Đã ghi nhận tương tác thành công!');
      setShowInteractionForm(false);
      await loadContacts();
      const refreshed = await contactRepository.get(selectedContact.id);
      setSelectedContact(refreshed.contact);
      setInteractions(refreshed.interactions);
    } catch (err: any) {
      notify?.(err.message || 'Không thể lưu tương tác.', true);
    }
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      if (selectedFilter === 'due' && !c.health.isReconnectDue && !c.health.isDormant) {
        return false;
      }
      if (selectedFilter === 'recruiter' && c.type !== 'recruiter' && c.type !== 'headhunter') {
        return false;
      }
      if (selectedFilter === 'referrer' && c.type !== 'referrer') {
        return false;
      }
      if (selectedFilter === 'mentor' && c.type !== 'mentor') {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesCompany = c.company.toLowerCase().includes(q);
        const matchesRole = (c.role || '').toLowerCase().includes(q);
        return matchesName || matchesCompany || matchesRole;
      }
      return true;
    });
  }, [contacts, selectedFilter, searchQuery]);

  const dueCount = useMemo(() => {
    return contacts.filter(c => c.health.isReconnectDue || c.health.isDormant).length;
  }, [contacts]);

  if (!isOpen) return null;

  return (
    <div className="crm-modal-backdrop" onClick={onClose}>
      <div className="crm-modal-container" onClick={e => e.stopPropagation()}>
        <div className="crm-modal-header">
          <div className="crm-modal-header-info">
            <div className="crm-header-icon-box">
              <Users size={22} className="crm-header-icon" />
            </div>
            <div>
              <h2 className="crm-modal-title">Mạng Lưới Kết Nối & CRM Tuyển Dụng</h2>
              <p className="crm-modal-subtitle">
                Quản lý liên hệ HR, Headhunter, Người giới thiệu & Theo dõi nhịp độ hâm nóng quan hệ
              </p>
            </div>
          </div>
          <button className="crm-close-btn" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        <div className="crm-quick-stats">
          <div className="crm-stat-chip">
            <Users size={16} className="crm-stat-icon" />
            <span>Tổng cộng: <strong>{contacts.length}</strong> liên hệ</span>
          </div>
          <div className={`crm-stat-chip ${dueCount > 0 ? 'crm-stat-warning' : 'crm-stat-success'}`}>
            <Clock size={16} className="crm-stat-icon" />
            <span>Cần hâm nóng: <strong>{dueCount}</strong></span>
          </div>
          <button className="crm-add-contact-btn" onClick={handleOpenAddContact}>
            <UserPlus size={16} />
            <span>Thêm liên hệ mới</span>
          </button>
        </div>

        <div className="crm-controls-bar">
          <div className="crm-search-box">
            <Search size={16} className="crm-search-icon" />
            <input
              type="text"
              placeholder="Tìm theo tên, công ty, vị trí..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="crm-search-input"
            />
          </div>

          <div className="crm-filter-chips">
            <button
              className={`crm-chip ${selectedFilter === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedFilter('all')}
            >
              Tất cả ({contacts.length})
            </button>
            <button
              className={`crm-chip ${selectedFilter === 'due' ? 'active' : ''}`}
              onClick={() => setSelectedFilter('due')}
            >
              Cần hâm nóng ({dueCount})
            </button>
            <button
              className={`crm-chip ${selectedFilter === 'recruiter' ? 'active' : ''}`}
              onClick={() => setSelectedFilter('recruiter')}
            >
              HR / Headhunter
            </button>
            <button
              className={`crm-chip ${selectedFilter === 'referrer' ? 'active' : ''}`}
              onClick={() => setSelectedFilter('referrer')}
            >
              Người giới thiệu
            </button>
            <button
              className={`crm-chip ${selectedFilter === 'mentor' ? 'active' : ''}`}
              onClick={() => setSelectedFilter('mentor')}
            >
              Cố vấn (Mentor)
            </button>
          </div>
        </div>

        <div className="crm-main-content">
          <div className="crm-contacts-column">
            {loading ? (
              <div className="crm-empty-state">
                <p>Đang tải danh bạ mạng lưới kết nối...</p>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="crm-empty-state">
                <Users size={40} className="crm-empty-icon" />
                <p className="crm-empty-title">Chưa có người liên hệ nào phù hợp</p>
                <p className="crm-empty-desc">
                  Thêm người liên hệ tuyển dụng hoặc đối tác chuyên môn để duy trì mạng lưới.
                </p>
                <button className="crm-add-contact-btn" onClick={handleOpenAddContact}>
                  <Plus size={16} /> Thêm liên hệ đầu tiên
                </button>
              </div>
            ) : (
              <div className="crm-contacts-grid">
                {filteredContacts.map(c => {
                  const typeCfg = TYPE_CONFIG[c.type] || TYPE_CONFIG.recruiter;
                  const strengthCfg = STRENGTH_CONFIG[c.relationshipStrength] || STRENGTH_CONFIG.connected;
                  const isSelected = selectedContact?.id === c.id;

                  return (
                    <div
                      key={c.id}
                      className={`crm-contact-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => loadContactDetails(c)}
                    >
                      <div className="crm-card-header">
                        <div className="crm-avatar-circle">
                          {c.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="crm-card-title-group">
                          <h3 className="crm-contact-name">{c.name}</h3>
                          <div className="crm-contact-role">
                            <Briefcase size={12} />
                            <span>{c.role || 'Chuyên viên'}</span>
                            <span className="crm-dot">•</span>
                            <Building size={12} />
                            <span>{c.company}</span>
                          </div>
                        </div>
                      </div>

                      <div className="crm-badges-row">
                        <span
                          className="crm-type-badge"
                          style={{ backgroundColor: typeCfg.bg, color: typeCfg.text }}
                        >
                          {typeCfg.label}
                        </span>
                        <span className={`crm-strength-badge ${strengthCfg.badge}`}>
                          {strengthCfg.label}
                        </span>
                      </div>

                      <div className="crm-health-bar">
                        {c.health.healthStatus === 'dormant' ? (
                          <div className="crm-health-dormant">
                            <AlertCircle size={14} />
                            <span>Đã {c.health.daysSinceLastContact} ngày chưa tương tác (Nguội lạnh)</span>
                          </div>
                        ) : c.health.healthStatus === 'due' ? (
                          <div className="crm-health-due">
                            <Clock size={14} />
                            <span>Cần hâm nóng ({c.health.daysSinceLastContact} ngày trước)</span>
                          </div>
                        ) : (
                          <div className="crm-health-healthy">
                            <CheckCircle2 size={14} />
                            <span>Duy trì tốt ({c.health.daysSinceLastContact} ngày trước)</span>
                          </div>
                        )}
                      </div>

                      {c.health.suggestedAction && (
                        <div className="crm-suggested-action">
                          <Sparkles size={13} className="crm-sparkle-icon" />
                          <span>{c.health.suggestedAction}</span>
                        </div>
                      )}

                      <div className="crm-card-actions">
                        <button
                          className="crm-action-btn crm-btn-interaction"
                          onClick={e => {
                            e.stopPropagation();
                            handleOpenAddInteraction(c);
                          }}
                          title="Ghi nhật ký trao đổi"
                        >
                          <MessageSquare size={14} />
                          <span>Ghi trao đổi</span>
                        </button>
                        <button
                          className="crm-action-btn"
                          onClick={e => {
                            e.stopPropagation();
                            handleOpenEditContact(c);
                          }}
                          title="Chỉnh sửa liên hệ"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="crm-action-btn crm-btn-delete"
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteContact(c.id, c.name);
                          }}
                          title="Xóa liên hệ"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {selectedContact && (
            <div className="crm-details-drawer">
              <div className="crm-drawer-header">
                <div className="crm-drawer-title-group">
                  <h3 className="crm-drawer-title">{selectedContact.name}</h3>
                  <p className="crm-drawer-subtitle">{selectedContact.role} tại {selectedContact.company}</p>
                </div>
                <button
                  className="crm-drawer-close"
                  onClick={() => setSelectedContact(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="crm-drawer-contact-info">
                {selectedContact.email && (
                  <div className="crm-info-item">
                    <Mail size={14} />
                    <a href={`mailto:${selectedContact.email}`}>{selectedContact.email}</a>
                  </div>
                )}
                {selectedContact.phone && (
                  <div className="crm-info-item">
                    <Phone size={14} />
                    <span>{selectedContact.phone}</span>
                  </div>
                )}
                {selectedContact.linkedinUrl && (
                  <div className="crm-info-item">
                    <ExternalLink size={14} />
                    <a href={selectedContact.linkedinUrl} target="_blank" rel="noreferrer">
                      Hồ sơ LinkedIn
                    </a>
                  </div>
                )}
                {selectedContact.notes && (
                  <div className="crm-info-notes">
                    <strong>Ghi chú:</strong> {selectedContact.notes}
                  </div>
                )}
              </div>

              <div className="crm-drawer-timeline-header">
                <div className="crm-timeline-title">
                  <History size={16} />
                  <span>Lịch sử tương tác ({interactions.length})</span>
                </div>
                <button
                  className="crm-btn-add-interaction-sm"
                  onClick={() => handleOpenAddInteraction(selectedContact)}
                >
                  <Plus size={14} /> Ghi trao đổi
                </button>
              </div>

              <div className="crm-timeline-body">
                {loadingInteractions ? (
                  <p className="crm-timeline-empty">Đang tải lịch sử tương tác...</p>
                ) : interactions.length === 0 ? (
                  <div className="crm-timeline-empty">
                    <MessageSquare size={32} />
                    <p>Chưa có lịch sử tương tác nào.</p>
                    <button
                      className="crm-btn-add-interaction-sm"
                      onClick={() => handleOpenAddInteraction(selectedContact)}
                    >
                      Ghi nhật ký tương tác đầu tiên
                    </button>
                  </div>
                ) : (
                  <div className="crm-timeline-list">
                    {interactions.map(item => (
                      <div key={item.id} className="crm-timeline-item">
                        <div className="crm-timeline-meta">
                          <span className="crm-channel-tag">
                            {CHANNEL_LABELS[item.channel] || item.channel}
                          </span>
                          <span className="crm-date-tag">
                            {new Date(item.date).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        <h4 className="crm-timeline-summary">{item.summary}</h4>
                        {item.details && (
                          <p className="crm-timeline-details">{item.details}</p>
                        )}
                        {item.followUpDate && (
                          <div className="crm-timeline-followup">
                            <Calendar size={13} />
                            <span>Lịch hẹn tiếp theo: {new Date(item.followUpDate).toLocaleDateString('vi-VN')}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {showContactForm && (
          <div className="crm-nested-modal-backdrop" onClick={() => setShowContactForm(false)}>
            <div className="crm-nested-modal" onClick={e => e.stopPropagation()}>
              <div className="crm-nested-modal-header">
                <h3>{editingContactId ? 'Cập nhật người liên hệ' : 'Thêm người liên hệ mới'}</h3>
                <button className="crm-close-btn" onClick={() => setShowContactForm(false)}>
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSaveContact} className="crm-form">
                <div className="crm-form-row">
                  <div className="crm-form-group">
                    <label>Họ và tên *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      value={contactFormData.name}
                      onChange={e => setContactFormData({ ...contactFormData, name: e.target.value })}
                    />
                  </div>
                  <div className="crm-form-group">
                    <label>Công ty / Tổ chức *</label>
                    <input
                      type="text"
                      required
                      placeholder="Shopee, VNG, FPT..."
                      value={contactFormData.company}
                      onChange={e => setContactFormData({ ...contactFormData, company: e.target.value })}
                    />
                  </div>
                </div>

                <div className="crm-form-row">
                  <div className="crm-form-group">
                    <label>Chức vụ / Vị trí</label>
                    <input
                      type="text"
                      placeholder="Senior Technical Recruiter, Engineering Manager..."
                      value={contactFormData.role || ''}
                      onChange={e => setContactFormData({ ...contactFormData, role: e.target.value })}
                    />
                  </div>
                  <div className="crm-form-group">
                    <label>Phân loại vai trò</label>
                    <select
                      value={contactFormData.type}
                      onChange={e => setContactFormData({ ...contactFormData, type: e.target.value as ContactType })}
                    >
                      <option value="recruiter">HR / Tuyển dụng nội bộ</option>
                      <option value="headhunter">Headhunter / Săn đầu người</option>
                      <option value="hiring_manager">Hiring Manager (Quản lý trực tiếp)</option>
                      <option value="referrer">Người giới thiệu (Referral)</option>
                      <option value="mentor">Cố vấn chuyên môn (Mentor)</option>
                      <option value="peer">Đồng nghiệp / Bạn bè ngành IT</option>
                    </select>
                  </div>
                </div>

                <div className="crm-form-row">
                  <div className="crm-form-group">
                    <label>Mức độ thân thiết</label>
                    <select
                      value={contactFormData.relationshipStrength}
                      onChange={e => setContactFormData({ ...contactFormData, relationshipStrength: e.target.value as RelationshipStrength })}
                    >
                      <option value="lead">Mới biết / Chưa trao đổi nhiều</option>
                      <option value="connected">Đã kết nối</option>
                      <option value="in_touch">Thường xuyên trao đổi</option>
                      <option value="advocate">Người ủng hộ mạnh mẽ (Advocate)</option>
                      <option value="dormant">Nguội lạnh / Cần hâm nóng</option>
                    </select>
                  </div>
                  <div className="crm-form-group">
                    <label>Liên kết hồ sơ ứng tuyển (tùy chọn)</label>
                    <select
                      value={contactFormData.applicationId || ''}
                      onChange={e => setContactFormData({ ...contactFormData, applicationId: e.target.value })}
                    >
                      <option value="">-- Không gắn hồ sơ --</option>
                      {applications.map(app => (
                        <option key={app.id} value={app.id}>
                          {app.company} - {app.position}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="crm-form-row">
                  <div className="crm-form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      placeholder="recruiter@example.com"
                      value={contactFormData.email || ''}
                      onChange={e => setContactFormData({ ...contactFormData, email: e.target.value })}
                    />
                  </div>
                  <div className="crm-form-group">
                    <label>Số điện thoại</label>
                    <input
                      type="tel"
                      placeholder="0901234567"
                      value={contactFormData.phone || ''}
                      onChange={e => setContactFormData({ ...contactFormData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="crm-form-group">
                  <label>URL LinkedIn</label>
                  <input
                    type="url"
                    placeholder="https://linkedin.com/in/username"
                    value={contactFormData.linkedinUrl || ''}
                    onChange={e => setContactFormData({ ...contactFormData, linkedinUrl: e.target.value })}
                  />
                </div>

                <div className="crm-form-group">
                  <label>Ghi chú ngữ cảnh kết nối</label>
                  <textarea
                    rows={3}
                    placeholder="Quen biết qua sự kiện Tech Talk, phong cách trao đổi nhiệt tình..."
                    value={contactFormData.notes || ''}
                    onChange={e => setContactFormData({ ...contactFormData, notes: e.target.value })}
                  />
                </div>

                <div className="crm-form-footer">
                  <button type="button" className="crm-btn-cancel" onClick={() => setShowContactForm(false)}>
                    Hủy bỏ
                  </button>
                  <button type="submit" className="crm-btn-submit">
                    {editingContactId ? 'Lưu thay đổi' : 'Tạo người liên hệ'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showInteractionForm && selectedContact && (
          <div className="crm-nested-modal-backdrop" onClick={() => setShowInteractionForm(false)}>
            <div className="crm-nested-modal" onClick={e => e.stopPropagation()}>
              <div className="crm-nested-modal-header">
                <h3>Ghi nhật ký tương tác với {selectedContact.name}</h3>
                <button className="crm-close-btn" onClick={() => setShowInteractionForm(false)}>
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSaveInteraction} className="crm-form">
                <div className="crm-form-row">
                  <div className="crm-form-group">
                    <label>Kênh tương tác *</label>
                    <select
                      value={interactionFormData.channel}
                      onChange={e => setInteractionFormData({ ...interactionFormData, channel: e.target.value as InteractionChannel })}
                    >
                      <option value="linkedin">Tin nhắn LinkedIn</option>
                      <option value="email">Email</option>
                      <option value="phone">Điện thoại</option>
                      <option value="coffee">Gặp gỡ / Uống Cafe</option>
                      <option value="interview">Vòng phỏng vấn</option>
                      <option value="other">Kênh khác</option>
                    </select>
                  </div>
                  <div className="crm-form-group">
                    <label>Ngày diễn ra *</label>
                    <input
                      type="date"
                      required
                      value={interactionFormData.date ? interactionFormData.date.split('T')[0] : ''}
                      onChange={e => setInteractionFormData({ ...interactionFormData, date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="crm-form-group">
                  <label>Tóm tắt nội dung trao đổi *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Trao đổi về mức lương đãi ngộ và lộ trình phỏng vấn"
                    value={interactionFormData.summary}
                    onChange={e => setInteractionFormData({ ...interactionFormData, summary: e.target.value })}
                  />
                </div>

                <div className="crm-form-group">
                  <label>Chi tiết thảo luận & Nhận xét</label>
                  <textarea
                    rows={4}
                    placeholder="Ghi nhận điểm nhấn, phản hồi của HR, các câu hỏi chuyên môn đáng chú ý..."
                    value={interactionFormData.details || ''}
                    onChange={e => setInteractionFormData({ ...interactionFormData, details: e.target.value })}
                  />
                </div>

                <div className="crm-form-group">
                  <label>Ngày hẹn liên hệ lại tiếp theo (Tùy chọn)</label>
                  <input
                    type="date"
                    value={interactionFormData.followUpDate || ''}
                    onChange={e => setInteractionFormData({ ...interactionFormData, followUpDate: e.target.value })}
                  />
                </div>

                <div className="crm-form-footer">
                  <button type="button" className="crm-btn-cancel" onClick={() => setShowInteractionForm(false)}>
                    Hủy bỏ
                  </button>
                  <button type="submit" className="crm-btn-submit">
                    Lưu tương tác
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
