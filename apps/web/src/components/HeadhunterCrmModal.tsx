import { useState, useEffect } from 'react';
import {
  UserCheck,
  Building2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  X,
  Copy,
  Check,
  Search,
  Plus,
  Trash2,
  Send,
  Shield,
  Star,
  DollarSign,
  Briefcase,
  AlertOctagon
} from 'lucide-react';
import type { Application } from '../domain';
import {
  type RecruiterLeadDTO,
  type HeadhunterMandateDTO,
  type InboundPitchParseResultDTO,
  type RecruiterResponseDraftDTO,
  type RecruiterRelationshipTier,
  type RecruiterReplyIntent,
  type HeadhunterAgencyTier,
  type MandateExclusivity,
  type MandateStatus,
  headhunterCrmRepository
} from '../data';

interface HeadhunterCrmModalProps {
  applications?: Application[];
  onClose: () => void;
  onApplicationCreated?: () => void;
  notify?: (message: string, error?: boolean) => void;
}

const SAMPLE_PITCH_PRESETS: Record<string, string> = {
  robert_walters_retained: `Chào bạn, tôi là Mai Hoàng từ Robert Walters Vietnam.
Hiện tại tôi đang phụ trách độc quyền (retained mandate) vị trí Vice President of Engineering cho một khách hàng bảo mật thuộc nhóm fintech unicorn tại TP. Hồ Chí Minh.
Dải ngân sách dự kiến là $5,000 - $7,000 USD gross / month.
Yêu cầu ứng viên có thế mạnh về Golang, Kubernetes, Microservices và năng lực lãnh đạo đội ngũ trên 30 kỹ sư.
Bạn vui lòng xem xét và phản hồi nhé!`,
  michael_page_head: `Chào bạn, mình là Alexandre Nguyen từ Michael Page Vietnam.
Hiện bên mình đang có cơ hội Head of Engineering cho một tập đoàn đa quốc gia ngành bán lẻ công nghệ.
Ngân sách từ 90 - 130 triệu VND gross.
Nếu bạn quan tâm, hãy gửi lại CV để mình kết nối trực tiếp với Hiring Manager nhé!`,
  navigos_contingency: `Chào ứng viên, bên mình từ Navigos Search đang tìm gấp Tech Lead cho một ngân hàng lớn tại Hà Nội.
Chưa công khai mức lương, bạn gửi CV qua Zalo hoặc điện thoại để trao đổi chi tiết nhé.`
};

const RELATIONSHIP_LABELS: Record<RecruiterRelationshipTier, { label: string; color: string; bg: string }> = {
  trusted_advisor: { label: 'Đối tác chiến lược (Trusted)', color: '#b45309', bg: '#fef3c7' },
  preferred_partner: { label: 'Ưu tiên hợp tác (Preferred)', color: '#15803d', bg: '#dcfce7' },
  situational_contingency: { label: 'Tùy cơ hội (Contingency)', color: '#475569', bg: '#f1f5f9' },
  dormant: { label: 'Đóng băng (Dormant)', color: '#64748b', bg: '#e2e8f0' },
  blacklisted: { label: 'Cảnh báo rủi ro (Blacklist)', color: '#b91c1c', bg: '#fee2e2' }
};

const AGENCY_TIER_LABELS: Record<HeadhunterAgencyTier, string> = {
  tier1_global: 'Tier-1 Toàn cầu',
  tier2_regional: 'Tier-2 Khu vực',
  boutique_executive: 'Boutique Executive',
  internal_corporate: 'In-House Talent Partner',
  independent: 'Headhunter Độc lập'
};

const EXCLUSIVITY_LABELS: Record<MandateExclusivity, { label: string; color: string }> = {
  exclusive_retained: { label: 'Độc quyền Retained', color: '#15803d' },
  contingency_shared: { label: 'Contingency Cạnh tranh', color: '#b45309' },
  internal_direct: { label: 'Tuyển dụng Trực tiếp', color: '#4338ca' },
  unconfirmed: { label: 'Chưa xác nhận độc quyền', color: '#64748b' }
};

export function HeadhunterCrmModal({
  applications = [],
  onClose,
  onApplicationCreated,
  notify
}: HeadhunterCrmModalProps) {
  const [activeTab, setActiveTab] = useState<'directory' | 'ingest' | 'mandates'>('directory');
  const [leads, setLeads] = useState<RecruiterLeadDTO[]>([]);
  const [mandates, setMandates] = useState<HeadhunterMandateDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');

  const [pitchText, setPitchText] = useState(SAMPLE_PITCH_PRESETS.robert_walters_retained);
  const [pitchChannel, setPitchChannel] = useState<'linkedin_inmail' | 'email' | 'zalo' | 'telegram'>('linkedin_inmail');
  const [parsing, setParsing] = useState(false);
  const [parsedPitch, setParsedPitch] = useState<InboundPitchParseResultDTO | null>(null);

  const [replyIntent, setReplyIntent] = useState<RecruiterReplyIntent>('explore_with_criteria');
  const [replyDraft, setReplyDraft] = useState<RecruiterResponseDraftDTO | null>(null);
  const [copiedReply, setCopiedReply] = useState(false);

  const [showAddLead, setShowAddLead] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadAgency, setNewLeadAgency] = useState('Robert Walters');
  const [newLeadRole, setNewLeadRole] = useState('Executive Recruiter');
  const [newLeadEmail, setNewLeadEmail] = useState('');
  const [newLeadTier, setNewLeadTier] = useState<RecruiterRelationshipTier>('preferred_partner');

  const loadData = async () => {
    try {
      setLoading(true);
      const [leadsData, mandatesData] = await Promise.all([
        headhunterCrmRepository.listLeads(),
        headhunterCrmRepository.listMandates()
      ]);
      setLeads(leadsData);
      setMandates(mandatesData);
    } catch {
      try {
        const demoLeads = await headhunterCrmRepository.listLeads();
        const demoMandates = await headhunterCrmRepository.listMandates();
        setLeads(demoLeads);
        setMandates(demoMandates);
      } catch {
        setLeads([]);
        setMandates([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleParsePitch = async () => {
    if (!pitchText.trim()) {
      notify?.('Vui lòng nhập nội dung tin nhắn của recruiter.', true);
      return;
    }
    try {
      setParsing(true);
      const result = await headhunterCrmRepository.parsePitch({
        rawText: pitchText.trim(),
        channel: pitchChannel
      });
      setParsedPitch(result);
      const reply = await headhunterCrmRepository.generateReply({
        pitch: result,
        intent: replyIntent
      });
      setReplyDraft(reply);
      notify?.('Đã bóc tách thông tin mandate và gợi ý phản hồi!');
    } catch {
      notify?.('Lỗi trong quá trình phân tích pitch.', true);
    } finally {
      setParsing(false);
    }
  };

  const handleIntentChange = async (intent: RecruiterReplyIntent) => {
    setReplyIntent(intent);
    if (parsedPitch) {
      try {
        const reply = await headhunterCrmRepository.generateReply({
          pitch: parsedPitch,
          intent
        });
        setReplyDraft(reply);
      } catch {
        notify?.('Không thể tạo phản hồi mới.', true);
      }
    }
  };

  const handleCopyReply = () => {
    if (!replyDraft) return;
    const textToCopy = `Tiêu đề: ${replyDraft.subject}\n\n${replyDraft.body}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedReply(true);
    notify?.('Đã sao chép nội dung thư phản hồi!');
    setTimeout(() => setCopiedReply(false), 2000);
  };

  const handleSaveParsedLeadAndMandate = async () => {
    if (!parsedPitch) return;
    try {
      const lead = await headhunterCrmRepository.upsertLead({
        name: parsedPitch.recruiterName || 'Chuyên viên Tư vấn',
        agency: parsedPitch.agencyName || 'Search Partner',
        agencyTier: parsedPitch.agencyTier,
        role: parsedPitch.recruiterTitle || 'Executive Recruiter',
        tier: parsedPitch.mandateExclusivity === 'exclusive_retained' ? 'trusted_advisor' : 'preferred_partner',
        rating: parsedPitch.agencyTier === 'tier1_global' ? 5 : 4,
        specialties: parsedPitch.keyRequirements,
        lastContactedAt: new Date().toISOString()
      });

      await headhunterCrmRepository.createMandate({
        leadId: lead.id,
        roleTitle: parsedPitch.targetRole || 'Senior Tech Leader',
        clientCompany: parsedPitch.targetCompany || 'Doanh nghiệp Công nghệ',
        isConfidential: parsedPitch.isConfidentialCompany,
        exclusivity: parsedPitch.mandateExclusivity,
        salaryRange: parsedPitch.salaryClue,
        status: 'pitched'
      });

      await loadData();
      setActiveTab('directory');
      notify?.('Đã lưu recruiter và mandate mới vào CRM thành công!');
    } catch {
      notify?.('Không thể lưu thông tin vào CRM.', true);
    }
  };

  const handleCreateLead = async () => {
    if (!newLeadName.trim() || !newLeadAgency.trim()) {
      notify?.('Vui lòng nhập tên và công ty săn đầu người.', true);
      return;
    }
    try {
      await headhunterCrmRepository.upsertLead({
        name: newLeadName.trim(),
        agency: newLeadAgency.trim(),
        role: newLeadRole.trim(),
        email: newLeadEmail.trim() || undefined,
        tier: newLeadTier,
        rating: 4,
        lastContactedAt: new Date().toISOString()
      });
      setShowAddLead(false);
      setNewLeadName('');
      setNewLeadEmail('');
      await loadData();
      notify?.('Đã thêm headhunter vào danh bạ!');
    } catch {
      notify?.('Không thể tạo hồ sơ headhunter.', true);
    }
  };

  const handleDeleteLead = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa headhunter ${name} và các mandate liên quan?`)) return;
    try {
      await headhunterCrmRepository.deleteLead(id);
      await loadData();
      notify?.(`Đã xóa hồ sơ ${name}.`);
    } catch {
      notify?.('Không thể xóa hồ sơ.', true);
    }
  };

  const handleUpdateMandateStatus = async (id: string, status: MandateStatus) => {
    try {
      await headhunterCrmRepository.updateMandateStatus(id, status);
      await loadData();
      notify?.('Đã cập nhật trạng thái mandate.');
    } catch {
      notify?.('Không thể cập nhật mandate.', true);
    }
  };

  const filteredLeads = leads.filter(l => {
    const matchesTier = tierFilter === 'all' || l.tier === tierFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      l.name.toLowerCase().includes(q) ||
      l.agency.toLowerCase().includes(q) ||
      l.role.toLowerCase().includes(q) ||
      (l.specialties || []).some(s => s.toLowerCase().includes(q));
    return matchesTier && matchesSearch;
  });

  const duplicateMandates = mandates.filter((m, idx, arr) =>
    arr.some((other, oIdx) => oIdx !== idx && other.clientCompany.toLowerCase() === m.clientCompany.toLowerCase())
  );

  return (
    <div className="hh-modal-overlay headhunter-crm-modal-overlay">
      <div className="hh-modal headhunter-crm-modal">
        <div className="hh-header">
          <div className="hh-header-left">
            <div className="hh-icon-box">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="hh-title-row">
                <h2 className="hh-title">
                  Executive Headhunter CRM & Quản lý Mandate
                </h2>
                <span className="hh-title-badge">
                  Recruiter Intelligence & Anti-Lockout
                </span>
              </div>
              <p className="hh-subtitle">
                Quản lý đối tác săn đầu người, bóc tách InMail tự động, phòng ngừa Double-Submission và phản hồi chiến lược
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hh-close-btn headhunter-modal-close-btn"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="hh-nav-tabs">
          <button
            onClick={() => setActiveTab('directory')}
            className={`hh-tab-btn ${activeTab === 'directory' ? 'active' : ''}`}
          >
            <UserCheck className="w-4 h-4" />
            Danh bạ Headhunter
            <span className="hh-tab-badge">
              {leads.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('ingest')}
            className={`hh-tab-btn ${activeTab === 'ingest' ? 'active' : ''}`}
          >
            <Sparkles className="w-4 h-4" />
            Bóc tách Pitch & Soạn thư (Inbound Studio)
          </button>
          <button
            onClick={() => setActiveTab('mandates')}
            className={`hh-tab-btn ${activeTab === 'mandates' ? 'active' : ''}`}
          >
            <Briefcase className="w-4 h-4" />
            Mandate Guard & Chống Xung Đột
            <span className="hh-tab-badge">
              {mandates.length}
            </span>
            {duplicateMandates.length > 0 && (
              <span className="hh-tab-badge-conflict">
                <AlertTriangle className="w-3 h-3" />
                Xung đột
              </span>
            )}
          </button>
        </div>

        <div className="hh-body">
          {activeTab === 'directory' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="hh-toolbar">
                <div className="hh-search-box">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Tìm headhunter theo tên, agency, chuyên môn..."
                    className="hh-search-input headhunter-search-input"
                  />
                </div>

                <div className="hh-actions-row">
                  <select
                    value={tierFilter}
                    onChange={e => setTierFilter(e.target.value)}
                    className="hh-select"
                  >
                    <option value="all">Tất cả mối quan hệ</option>
                    <option value="trusted_advisor">Đối tác chiến lược (Trusted)</option>
                    <option value="preferred_partner">Ưu tiên hợp tác (Preferred)</option>
                    <option value="situational_contingency">Tùy cơ hội (Contingency)</option>
                    <option value="dormant">Đóng băng (Dormant)</option>
                    <option value="blacklisted">Cảnh báo rủi ro (Blacklist)</option>
                  </select>

                  <button
                    onClick={() => setShowAddLead(!showAddLead)}
                    className="hh-btn-primary"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm Headhunter
                  </button>
                </div>
              </div>

              {showAddLead && (
                <div className="hh-add-form">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserCheck className="w-4 h-4 text-amber-600" />
                      Thêm Chuyên Viên Săn Đầu Người (Recruiter) Mới
                    </h4>
                    <button onClick={() => setShowAddLead(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="hh-form-grid">
                    <div className="hh-form-field">
                      <label className="hh-form-label">Họ và tên</label>
                      <input
                        type="text"
                        value={newLeadName}
                        onChange={e => setNewLeadName(e.target.value)}
                        placeholder="VD: Mai Hoàng"
                        className="hh-input"
                      />
                    </div>
                    <div className="hh-form-field">
                      <label className="hh-form-label">Agency / Công ty</label>
                      <input
                        type="text"
                        value={newLeadAgency}
                        onChange={e => setNewLeadAgency(e.target.value)}
                        placeholder="VD: Robert Walters"
                        className="hh-input"
                      />
                    </div>
                    <div className="hh-form-field">
                      <label className="hh-form-label">Chức danh</label>
                      <input
                        type="text"
                        value={newLeadRole}
                        onChange={e => setNewLeadRole(e.target.value)}
                        placeholder="VD: Director of Tech Practice"
                        className="hh-input"
                      />
                    </div>
                    <div className="hh-form-field">
                      <label className="hh-form-label">Email liên hệ</label>
                      <input
                        type="email"
                        value={newLeadEmail}
                        onChange={e => setNewLeadEmail(e.target.value)}
                        placeholder="VD: recruiter@agency.com"
                        className="hh-input"
                      />
                    </div>
                    <div className="hh-form-field">
                      <label className="hh-form-label">Mức độ tin cậy</label>
                      <select
                        value={newLeadTier}
                        onChange={e => setNewLeadTier(e.target.value as RecruiterRelationshipTier)}
                        className="hh-select"
                      >
                        <option value="trusted_advisor">Đối tác chiến lược (Trusted)</option>
                        <option value="preferred_partner">Ưu tiên hợp tác (Preferred)</option>
                        <option value="situational_contingency">Tùy cơ hội (Contingency)</option>
                        <option value="dormant">Đóng băng (Dormant)</option>
                        <option value="blacklisted">Cảnh báo rủi ro (Blacklist)</option>
                      </select>
                    </div>
                    <div className="hh-form-field" style={{ justifyContent: 'flex-end' }}>
                      <button
                        onClick={handleCreateLead}
                        className="hh-btn-primary"
                        style={{ width: '100%', justifyContent: 'center' }}
                      >
                        Lưu vào Danh bạ
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {loading ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>Đang tải danh bạ...</div>
              ) : filteredLeads.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>
                  Không tìm thấy headhunter nào phù hợp với bộ lọc.
                </div>
              ) : (
                <div className="hh-grid">
                  {filteredLeads.map(lead => {
                    const tierInfo = RELATIONSHIP_LABELS[lead.tier];
                    return (
                      <div
                        key={lead.id}
                        className="hh-card recruiter-card"
                      >
                        <div>
                          <div className="hh-card-header">
                            <div className="hh-card-title-group">
                              <div className="hh-card-name-row">
                                <h4 className="hh-card-name">{lead.name}</h4>
                                <span className="hh-card-agency">
                                  {lead.agency}
                                </span>
                              </div>
                              <p className="hh-card-role">{lead.role}</p>
                            </div>
                            <span
                              className="hh-tier-badge"
                              style={{ color: tierInfo.color, backgroundColor: tierInfo.bg, borderColor: tierInfo.color + '40' }}
                            >
                              {tierInfo.label}
                            </span>
                          </div>

                          <div className="hh-health-box">
                            <div className="hh-health-desc">
                              <span className="hh-health-label">Chỉ số Quan hệ & Tương tác</span>
                              <span className="hh-health-sug">
                                {lead.nextActionSuggestion}
                              </span>
                            </div>
                            <div className="hh-health-score-group">
                              <span className="hh-health-score">{lead.healthScore}</span>
                              <span className="hh-health-max">/100</span>
                            </div>
                          </div>

                          {lead.specialties && lead.specialties.length > 0 && (
                            <div className="hh-specialties-row">
                              {lead.specialties.map((s, idx) => (
                                <span key={idx} className="hh-specialty-tag">
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}

                          {lead.notes && (
                            <p className="hh-card-notes">
                              "{lead.notes}"
                            </p>
                          )}
                        </div>

                        <div className="hh-card-footer">
                          <div className="hh-footer-left">
                            <span>Mandates: <strong style={{ color: '#0f172a' }}>{lead.mandatesCount}</strong></span>
                            <div className="hh-stars">
                              {[...Array(lead.rating || 4)].map((_, i) => (
                                <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                              ))}
                            </div>
                          </div>
                          <div className="hh-footer-right">
                            <button
                              onClick={() => {
                                setPitchText(`Chào bạn, tôi là ${lead.name} từ ${lead.agency}. Bên mình đang có cơ hội Tech Leader...`);
                                setActiveTab('ingest');
                              }}
                              className="hh-btn-ghost"
                            >
                              Soạn thư
                            </button>
                            <button
                              onClick={() => handleDeleteLead(lead.id, lead.name)}
                              className="hh-btn-icon-del"
                              title="Xóa headhunter"
                            >
                              <Trash2 className="w-4 h-4" />
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

          {activeTab === 'ingest' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="hh-inbound-card">
                <div className="hh-inbound-top">
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      Bóc Tách Tin Nhắn Săn Đầu Người (Inbound Pitch Ingestion)
                    </h3>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                      Dán tin nhắn từ LinkedIn InMail, Email hoặc Zalo để AI nhận diện mức lương, độc quyền và tín hiệu cảnh báo
                    </p>
                  </div>

                  <div className="hh-presets-row">
                    <span style={{ fontSize: '11.5px', color: '#64748b' }}>Gợi ý mẫu:</span>
                    <button
                      onClick={() => setPitchText(SAMPLE_PITCH_PRESETS.robert_walters_retained)}
                      className="hh-chip-btn"
                    >
                      Robert Walters Retained
                    </button>
                    <button
                      onClick={() => setPitchText(SAMPLE_PITCH_PRESETS.michael_page_head)}
                      className="hh-chip-btn"
                    >
                      Michael Page VN
                    </button>
                    <button
                      onClick={() => setPitchText(SAMPLE_PITCH_PRESETS.navigos_contingency)}
                      className="hh-chip-btn"
                    >
                      Navigos Contingency
                    </button>
                  </div>
                </div>

                <div className="hh-channel-row">
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Kênh tiếp cận:</span>
                  {(['linkedin_inmail', 'email', 'zalo', 'telegram'] as const).map(ch => (
                    <button
                      key={ch}
                      onClick={() => setPitchChannel(ch)}
                      className={`hh-channel-btn ${pitchChannel === ch ? 'active' : ''}`}
                    >
                      {ch.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={5}
                  value={pitchText}
                  onChange={e => setPitchText(e.target.value)}
                  placeholder="Dán toàn bộ nội dung tin nhắn hoặc email của headhunter vào đây..."
                  className="hh-textarea pitch-textarea"
                />

                <div className="hh-inbound-action-row">
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Hệ thống tự động phát hiện dải lương, công ty stealth và rủi ro tranh chấp hồ sơ
                  </span>
                  <button
                    onClick={handleParsePitch}
                    disabled={parsing}
                    className="hh-btn-primary headhunter-parse-btn"
                  >
                    <Sparkles className="w-4 h-4" />
                    {parsing ? 'Đang phân tích...' : 'Phân tích Pitch bằng AI'}
                  </button>
                </div>
              </div>

              {parsedPitch && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div className="hh-parsed-card">
                    <div className="hh-parsed-header">
                      <div>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                          Kết Quả Trích Xuất Thông Minh
                        </span>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '2px 0 0' }}>
                          {parsedPitch.targetRole} @ {parsedPitch.targetCompany}
                        </h3>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', background: '#fef3c7', color: '#92400e' }}>
                          Độ tin cậy: {parsedPitch.confidenceScore}%
                        </span>
                        <span
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '12px',
                            border: `1px solid ${EXCLUSIVITY_LABELS[parsedPitch.mandateExclusivity].color}40`,
                            color: EXCLUSIVITY_LABELS[parsedPitch.mandateExclusivity].color,
                            backgroundColor: `${EXCLUSIVITY_LABELS[parsedPitch.mandateExclusivity].color}15`
                          }}
                        >
                          {EXCLUSIVITY_LABELS[parsedPitch.mandateExclusivity].label}
                        </span>
                      </div>
                    </div>

                    <div className="hh-parsed-grid">
                      <div className="hh-parsed-stat-box">
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Recruiter & Agency:</span>
                        <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>
                          {parsedPitch.recruiterName || 'Chưa rõ tên'}
                        </strong>
                        <span style={{ fontSize: '11.5px', color: '#b45309', fontWeight: 600 }}>
                          {parsedPitch.agencyName} ({AGENCY_TIER_LABELS[parsedPitch.agencyTier]})
                        </span>
                      </div>

                      <div className="hh-parsed-stat-box">
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Dải Đãi Ngộ Dự Kiến:</span>
                        <strong style={{ fontSize: '13.5px', color: '#047857', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <DollarSign className="w-4 h-4" />
                          {parsedPitch.salaryClue || 'Không công khai (Cần hỏi sàn)'}
                        </strong>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          {parsedPitch.currency ? `Đơn vị: ${parsedPitch.currency}` : 'Chưa rõ đơn vị'}
                        </span>
                      </div>

                      <div className="hh-parsed-stat-box">
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Địa điểm & Chế độ:</span>
                        <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>
                          {parsedPitch.location || 'TP. Hồ Chí Minh / Hybrid'}
                        </strong>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          {parsedPitch.isConfidentialCompany ? 'Doanh nghiệp bảo mật' : 'Doanh nghiệp công khai'}
                        </span>
                      </div>
                    </div>

                    <div className="hh-flags-grid">
                      {parsedPitch.greenFlags.length > 0 && (
                        <div className="hh-flags-box-green">
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#14532d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Điểm sáng & Tín hiệu tích cực (Green Flags):
                          </div>
                          <ul className="hh-flags-list">
                            {parsedPitch.greenFlags.map((flag, idx) => (
                              <li key={idx} className="hh-flags-item-green">
                                {flag}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {parsedPitch.redFlags.length > 0 && (
                        <div className="hh-flags-box-red">
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#881337', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <AlertTriangle className="w-4 h-4 text-rose-600" />
                            Dấu hiệu cảnh báo nguy cơ (Red Flags):
                          </div>
                          <ul className="hh-flags-list">
                            {parsedPitch.redFlags.map((flag, idx) => (
                              <li key={idx} className="hh-flags-item-red">
                                {flag}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {replyDraft && (
                    <div className="hh-reply-card">
                      <div className="hh-reply-header">
                        <div>
                          <h4 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Send className="w-4 h-4 text-amber-600" />
                            Soạn Thảo Phản Hồi Chiến Lược (1-Click Strategic Reply)
                          </h4>
                          <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                            {replyDraft.strategyNotes}
                          </p>
                        </div>

                        <div className="hh-intents-row">
                          {(['explore_with_criteria', 'salary_first', 'exclusive_mandate_check', 'polite_pass'] as RecruiterReplyIntent[]).map(intent => (
                            <button
                              key={intent}
                              onClick={() => handleIntentChange(intent)}
                              className={`hh-intent-btn intent-btn ${replyIntent === intent ? 'active' : ''}`}
                            >
                              {intent === 'explore_with_criteria' && 'Khảo sát kèm tiêu chí'}
                              {intent === 'salary_first' && 'Hỏi sàn lương'}
                              {intent === 'exclusive_mandate_check' && 'Kiểm tra độc quyền'}
                              {intent === 'polite_pass' && 'Từ chối lịch sự'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div>
                          <label className="hh-form-label">Tiêu đề thư:</label>
                          <input
                            type="text"
                            value={replyDraft.subject}
                            onChange={e => setReplyDraft({ ...replyDraft, subject: e.target.value })}
                            className="hh-input"
                            style={{ width: '100%', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label className="hh-form-label">Nội dung phản hồi:</label>
                          <textarea
                            rows={8}
                            value={replyDraft.body}
                            onChange={e => setReplyDraft({ ...replyDraft, body: e.target.value })}
                            className="hh-textarea"
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px' }}>
                        <button
                          onClick={handleSaveParsedLeadAndMandate}
                          className="hh-btn-primary save-lead-btn"
                          style={{ background: '#0f172a' }}
                        >
                          <Plus className="w-4 h-4" />
                          Lưu vào Danh bạ & Tạo Mandate
                        </button>

                        <button
                          onClick={handleCopyReply}
                          className="hh-btn-primary copy-reply-btn"
                        >
                          {copiedReply ? (
                            <>
                              <Check className="w-4 h-4" />
                              Đã chép nội dung
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Sao chép thư phản hồi
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'mandates' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {duplicateMandates.length > 0 && (
                <div className="hh-conflict-banner">
                  <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" style={{ marginTop: '2px' }} />
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#881337', margin: 0 }}>
                      Cảnh Báo Xung Đột Quyền Đại Diện (Double-Submission Risk)!
                    </h4>
                    <p style={{ fontSize: '12px', color: '#9f1239', margin: '4px 0 0', lineHeight: 1.5 }}>
                      Phát hiện nhiều hơn một headhunter cùng tiếp cận cho vị trí tại cùng một khách hàng doanh nghiệp ({duplicateMandates.map(m => m.clientCompany).join(', ')}). 
                      Vui lòng yêu cầu văn bản xác nhận quyền đại diện độc quyền trước khi cho phép nộp CV để tránh bị hệ thống ATS của doanh nghiệp khóa hồ sơ 6-12 tháng.
                    </p>
                  </div>
                </div>
              )}

              <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Briefcase className="w-4 h-4 text-indigo-600" />
                      Danh Sách Mandate Tuyển Dụng Đang Theo Dõi
                    </h3>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                      Theo dõi nguồn tiếp cận, hợp đồng độc quyền và phòng tránh nộp trùng hồ sơ
                    </p>
                  </div>
                </div>

                {mandates.length === 0 ? (
                  <div style={{ padding: '32px 0', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                    Chưa có mandate nào được ghi nhận. Hãy bóc tách InMail tại tab Inbound Studio để tạo mandate mới.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {mandates.map(m => (
                      <div
                        key={m.id}
                        className="hh-mandate-card mandate-card"
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{m.roleTitle}</h4>
                            <span style={{ fontSize: '11.5px', padding: '2px 7px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontWeight: 600, color: '#334155' }}>
                              {m.clientCompany}
                            </span>
                            <span
                              style={{
                                fontSize: '11px',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontWeight: 700,
                                color: EXCLUSIVITY_LABELS[m.exclusivity].color,
                                backgroundColor: EXCLUSIVITY_LABELS[m.exclusivity].color + '15'
                              }}
                            >
                              {EXCLUSIVITY_LABELS[m.exclusivity].label}
                            </span>
                          </div>
                          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                            Đại diện bởi: <strong style={{ color: '#1e293b' }}>{m.recruiterName}</strong> ({m.agencyName}) · Tiếp cận: {new Date(m.pitchedAt).toLocaleDateString('vi-VN')}
                          </p>
                          {m.salaryRange && (
                            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#047857' }}>
                              Ngân sách: {m.salaryRange}
                            </span>
                          )}
                        </div>

                        <div>
                          <select
                            value={m.status}
                            onChange={e => handleUpdateMandateStatus(m.id, e.target.value as MandateStatus)}
                            className="hh-select"
                          >
                            <option value="pitched">Mới tiếp cận (Pitched)</option>
                            <option value="screening">Đang khảo sát (Screening)</option>
                            <option value="submitted">Đã nộp hồ sơ (Submitted)</option>
                            <option value="client_interview">Phỏng vấn công ty (Interview)</option>
                            <option value="offer">Nhận đề nghị (Offer)</option>
                            <option value="declined">Đã từ chối (Declined)</option>
                            <option value="conflict_cancelled">Hủy do xung đột</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="hh-modal-footer">
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Hệ thống CRM cá nhân bảo vệ quyền lợi và vị thế thương lượng của ứng viên cấp cao
          </div>
          <button
            onClick={onClose}
            className="hh-btn-secondary"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
