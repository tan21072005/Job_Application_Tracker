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
      notify?.('Không thể tải danh bạ headhunter.', true);
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
      l.specialties.some(s => s.toLowerCase().includes(q));
    return matchesTier && matchesSearch;
  });

  const duplicateMandates = mandates.filter((m, idx, arr) =>
    arr.some((other, oIdx) => oIdx !== idx && other.clientCompany.toLowerCase() === m.clientCompany.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto headhunter-crm-modal-overlay">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden headhunter-crm-modal">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-amber-50 via-orange-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-600 text-white rounded-xl shadow-md">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">
                  Executive Headhunter CRM & Quản lý Mandate
                </h2>
                <span className="text-xs px-2.5 py-0.5 font-semibold bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                  Recruiter Intelligence & Anti-Lockout
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Quản lý đối tác săn đầu người, bóc tách InMail tự động, phòng ngừa Double-Submission và phản hồi chiến lược
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors headhunter-modal-close-btn"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-200 px-6 bg-white">
          <button
            onClick={() => setActiveTab('directory')}
            className={`py-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 transition ${
              activeTab === 'directory'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Danh bạ Headhunter
            <span className="ml-1.5 px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full font-bold">
              {leads.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('ingest')}
            className={`py-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 transition ${
              activeTab === 'ingest'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Bóc tách Pitch & Soạn thư (Inbound Studio)
          </button>
          <button
            onClick={() => setActiveTab('mandates')}
            className={`py-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 transition ${
              activeTab === 'mandates'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Mandate Guard & Chống Xung Đột
            <span className="ml-1.5 px-2 py-0.5 text-xs bg-indigo-100 text-indigo-800 rounded-full font-bold">
              {mandates.length}
            </span>
            {duplicateMandates.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-rose-100 text-rose-800 rounded-full font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Xung đột
              </span>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {activeTab === 'directory' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Tìm headhunter theo tên, agency, chuyên môn..."
                    className="w-full text-sm bg-transparent outline-none text-gray-800 font-medium headhunter-search-input"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={tierFilter}
                    onChange={e => setTierFilter(e.target.value)}
                    className="text-xs px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-medium outline-none"
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
                    className="px-3.5 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition shadow-sm flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm Headhunter
                  </button>
                </div>
              </div>

              {showAddLead && (
                <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-md space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-amber-600" />
                      Thêm Chuyên Viên Săn Đầu Người (Recruiter) Mới
                    </h4>
                    <button onClick={() => setShowAddLead(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Họ và tên</label>
                      <input
                        type="text"
                        value={newLeadName}
                        onChange={e => setNewLeadName(e.target.value)}
                        placeholder="VD: Mai Hoàng"
                        className="w-full text-xs p-2 border border-gray-300 rounded-lg outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Agency / Công ty</label>
                      <input
                        type="text"
                        value={newLeadAgency}
                        onChange={e => setNewLeadAgency(e.target.value)}
                        placeholder="VD: Robert Walters"
                        className="w-full text-xs p-2 border border-gray-300 rounded-lg outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Chức danh</label>
                      <input
                        type="text"
                        value={newLeadRole}
                        onChange={e => setNewLeadRole(e.target.value)}
                        placeholder="VD: Director of Tech Practice"
                        className="w-full text-xs p-2 border border-gray-300 rounded-lg outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Email liên hệ</label>
                      <input
                        type="email"
                        value={newLeadEmail}
                        onChange={e => setNewLeadEmail(e.target.value)}
                        placeholder="VD: recruiter@agency.com"
                        className="w-full text-xs p-2 border border-gray-300 rounded-lg outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Mức độ tin cậy</label>
                      <select
                        value={newLeadTier}
                        onChange={e => setNewLeadTier(e.target.value as RecruiterRelationshipTier)}
                        className="w-full text-xs p-2 border border-gray-300 rounded-lg outline-none bg-white"
                      >
                        <option value="trusted_advisor">Đối tác chiến lược (Trusted)</option>
                        <option value="preferred_partner">Ưu tiên hợp tác (Preferred)</option>
                        <option value="situational_contingency">Tùy cơ hội (Contingency)</option>
                        <option value="dormant">Đóng băng (Dormant)</option>
                        <option value="blacklisted">Cảnh báo rủi ro (Blacklist)</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleCreateLead}
                        className="w-full py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition shadow-sm"
                      >
                        Lưu vào Danh bạ
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="py-12 text-center text-gray-500 font-medium">Đang tải danh bạ...</div>
              ) : filteredLeads.length === 0 ? (
                <div className="py-12 text-center text-gray-500 font-medium">
                  Không tìm thấy headhunter nào phù hợp với bộ lọc.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredLeads.map(lead => {
                    const tierInfo = RELATIONSHIP_LABELS[lead.tier];
                    return (
                      <div
                        key={lead.id}
                        className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between recruiter-card"
                      >
                        <div>
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-base font-bold text-gray-900">{lead.name}</h4>
                                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-gray-100 text-gray-700">
                                  {lead.agency}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{lead.role}</p>
                            </div>
                            <span
                              className="text-xs px-2.5 py-0.5 rounded-full font-bold border"
                              style={{ color: tierInfo.color, backgroundColor: tierInfo.bg, borderColor: tierInfo.color + '40' }}
                            >
                              {tierInfo.label}
                            </span>
                          </div>

                          <div className="my-3 p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                            <div>
                              <span className="text-xs text-gray-500 block">Chỉ số Quan hệ & Tương tác</span>
                              <span className="text-xs font-bold text-gray-800">
                                {lead.nextActionSuggestion}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-black text-amber-700">{lead.healthScore}</span>
                              <span className="text-xs text-gray-400">/100</span>
                            </div>
                          </div>

                          {lead.specialties && lead.specialties.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {lead.specialties.map((s, idx) => (
                                <span key={idx} className="text-xs px-2 py-0.5 bg-amber-50 text-amber-800 rounded font-medium">
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}

                          {lead.notes && (
                            <p className="text-xs text-gray-600 line-clamp-2 italic mb-3">
                              "{lead.notes}"
                            </p>
                          )}
                        </div>

                        <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-3">
                            <span>Mandates: <strong className="text-gray-800">{lead.mandatesCount}</strong></span>
                            <div className="flex items-center gap-0.5 text-amber-500">
                              {[...Array(lead.rating || 4)].map((_, i) => (
                                <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setPitchText(`Chào bạn, tôi là ${lead.name} từ ${lead.agency}. Bên mình đang có cơ hội Tech Lead...`);
                                setActiveTab('ingest');
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 rounded transition"
                            >
                              Soạn thư
                            </button>
                            <button
                              onClick={() => handleDeleteLead(lead.id, lead.name)}
                              className="p-1 text-gray-400 hover:text-rose-600 rounded transition"
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
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      Bóc Tách Tin Nhắn Săn Đầu Người (Inbound Pitch Ingestion)
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Dán tin nhắn từ LinkedIn InMail, Email hoặc Zalo để AI nhận diện mức lương, độc quyền và tín hiệu cảnh báo
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Gợi ý mẫu:</span>
                    <button
                      onClick={() => setPitchText(SAMPLE_PITCH_PRESETS.robert_walters_retained)}
                      className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium transition"
                    >
                      Robert Walters Retained
                    </button>
                    <button
                      onClick={() => setPitchText(SAMPLE_PITCH_PRESETS.michael_page_head)}
                      className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium transition"
                    >
                      Michael Page VN
                    </button>
                    <button
                      onClick={() => setPitchText(SAMPLE_PITCH_PRESETS.navigos_contingency)}
                      className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium transition"
                    >
                      Navigos Contingency
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pb-1">
                  <span className="text-xs font-semibold text-gray-700">Kênh tiếp cận:</span>
                  {(['linkedin_inmail', 'email', 'zalo', 'telegram'] as const).map(ch => (
                    <button
                      key={ch}
                      onClick={() => setPitchChannel(ch)}
                      className={`text-xs px-2.5 py-1 rounded-md font-medium capitalize transition ${
                        pitchChannel === ch
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
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
                  className="w-full p-3.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-mono text-gray-800 leading-relaxed pitch-textarea"
                />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Hệ thống tự động phát hiện dải lương, công ty stealth và rủi ro tranh chấp hồ sơ
                  </span>
                  <button
                    onClick={handleParsePitch}
                    disabled={parsing}
                    className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm transition flex items-center gap-2 headhunter-parse-btn disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    {parsing ? 'Đang phân tích...' : 'Phân tích Pitch bằng AI'}
                  </button>
                </div>
              </div>

              {parsedPitch && (
                <div className="space-y-6">
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <div>
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                          Kết Quả Trích Xuất Thông Minh
                        </span>
                        <h3 className="text-base font-extrabold text-gray-900 mt-0.5">
                          {parsedPitch.targetRole} @ {parsedPitch.targetCompany}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-800 rounded-full">
                          Độ tin cậy: {parsedPitch.confidenceScore}%
                        </span>
                        <span
                          className="text-xs font-bold px-3 py-1 rounded-full border"
                          style={{
                            color: EXCLUSIVITY_LABELS[parsedPitch.mandateExclusivity].color,
                            borderColor: EXCLUSIVITY_LABELS[parsedPitch.mandateExclusivity].color + '40',
                            backgroundColor: EXCLUSIVITY_LABELS[parsedPitch.mandateExclusivity].color + '10'
                          }}
                        >
                          {EXCLUSIVITY_LABELS[parsedPitch.mandateExclusivity].label}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <span className="text-xs text-gray-500 block mb-1">Recruiter & Agency:</span>
                        <strong className="text-sm text-gray-900 block">
                          {parsedPitch.recruiterName || 'Chưa rõ tên'}
                        </strong>
                        <span className="text-xs text-amber-700 font-semibold">
                          {parsedPitch.agencyName} ({AGENCY_TIER_LABELS[parsedPitch.agencyTier]})
                        </span>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <span className="text-xs text-gray-500 block mb-1">Dải Đãi Ngộ Dự Kiến:</span>
                        <strong className="text-sm text-emerald-700 block flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {parsedPitch.salaryClue || 'Không công khai (Cần hỏi sàn)'}
                        </strong>
                        <span className="text-xs text-gray-500">
                          {parsedPitch.currency ? `Đơn vị: ${parsedPitch.currency}` : 'Chưa rõ đơn vị'}
                        </span>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <span className="text-xs text-gray-500 block mb-1">Địa điểm & Chế độ:</span>
                        <strong className="text-sm text-gray-900 block">
                          {parsedPitch.location || 'TP. Hồ Chí Minh / Hybrid'}
                        </strong>
                        <span className="text-xs text-gray-500">
                          {parsedPitch.isConfidentialCompany ? 'Doanh nghiệp bảo mật' : 'Doanh nghiệp công khai'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      {parsedPitch.greenFlags.length > 0 && (
                        <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-100">
                          <div className="text-xs font-bold text-emerald-900 mb-1.5 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Điểm sáng & Tín hiệu tích cực (Green Flags):
                          </div>
                          <ul className="space-y-1 pl-4">
                            {parsedPitch.greenFlags.map((flag, idx) => (
                              <li key={idx} className="text-xs text-emerald-800 list-disc font-medium">
                                {flag}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {parsedPitch.redFlags.length > 0 && (
                        <div className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-100">
                          <div className="text-xs font-bold text-rose-900 mb-1.5 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-rose-600" />
                            Dấu hiệu cảnh báo nguy cơ (Red Flags):
                          </div>
                          <ul className="space-y-1 pl-4">
                            {parsedPitch.redFlags.map((flag, idx) => (
                              <li key={idx} className="text-xs text-rose-800 list-disc font-medium">
                                {flag}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {replyDraft && (
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                            <Send className="w-4 h-4 text-amber-600" />
                            Soạn Thảo Phản Hồi Chiến Lược (1-Click Strategic Reply)
                          </h4>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {replyDraft.strategyNotes}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {(['explore_with_criteria', 'salary_first', 'exclusive_mandate_check', 'polite_pass'] as RecruiterReplyIntent[]).map(intent => (
                            <button
                              key={intent}
                              onClick={() => handleIntentChange(intent)}
                              className={`text-xs px-3 py-1.5 rounded-lg font-bold transition intent-btn ${
                                replyIntent === intent
                                  ? 'bg-amber-600 text-white shadow-sm'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {intent === 'explore_with_criteria' && 'Khảo sát kèm tiêu chí'}
                              {intent === 'salary_first' && 'Hỏi sàn lương'}
                              {intent === 'exclusive_mandate_check' && 'Kiểm tra độc quyền'}
                              {intent === 'polite_pass' && 'Từ chối lịch sự'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Tiêu đề thư:</label>
                          <input
                            type="text"
                            value={replyDraft.subject}
                            onChange={e => setReplyDraft({ ...replyDraft, subject: e.target.value })}
                            className="w-full p-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg outline-none text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Nội dung phản hồi:</label>
                          <textarea
                            rows={8}
                            value={replyDraft.body}
                            onChange={e => setReplyDraft({ ...replyDraft, body: e.target.value })}
                            className="w-full p-3 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none font-sans text-gray-800 leading-relaxed"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <button
                          onClick={handleSaveParsedLeadAndMandate}
                          className="px-4 py-2 text-xs font-bold bg-gray-900 hover:bg-black text-white rounded-xl shadow-sm transition flex items-center gap-1.5 save-lead-btn"
                        >
                          <Plus className="w-4 h-4" />
                          Lưu vào Danh bạ & Tạo Mandate
                        </button>

                        <button
                          onClick={handleCopyReply}
                          className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm transition flex items-center gap-1.5 copy-reply-btn"
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
            <div className="space-y-5">
              {duplicateMandates.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-start gap-3">
                  <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-rose-900">
                      Cảnh Báo Xung Đột Quyền Đại Diện (Double-Submission Risk)!
                    </h4>
                    <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                      Phát hiện nhiều hơn một headhunter cùng tiếp cận cho vị trí tại cùng một khách hàng doanh nghiệp ({duplicateMandates.map(m => m.clientCompany).join(', ')}). 
                      Vui lòng yêu cầu văn bản xác nhận quyền đại diện độc quyền trước khi cho phép nộp CV để tránh bị hệ thống ATS của doanh nghiệp khóa hồ sơ 6-12 tháng.
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-indigo-600" />
                      Danh Sách Mandate Tuyển Dụng Đang Theo Dõi
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Theo dõi nguồn tiếp cận, hợp đồng độc quyền và phòng tránh nộp trùng hồ sơ
                    </p>
                  </div>
                </div>

                {mandates.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 text-xs">
                    Chưa có mandate nào được ghi nhận. Hãy bóc tách InMail tại tab Inbound Studio để tạo mandate mới.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mandates.map(m => (
                      <div
                        key={m.id}
                        className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between gap-4 mandate-card"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-gray-900">{m.roleTitle}</h4>
                            <span className="text-xs px-2 py-0.5 bg-white border border-gray-200 rounded font-semibold text-gray-700">
                              {m.clientCompany}
                            </span>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-bold"
                              style={{
                                color: EXCLUSIVITY_LABELS[m.exclusivity].color,
                                backgroundColor: EXCLUSIVITY_LABELS[m.exclusivity].color + '15'
                              }}
                            >
                              {EXCLUSIVITY_LABELS[m.exclusivity].label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Đại diện bởi: <strong className="text-gray-800">{m.recruiterName}</strong> ({m.agencyName}) · Tiếp cận: {new Date(m.pitchedAt).toLocaleDateString('vi-VN')}
                          </p>
                          {m.salaryRange && (
                            <span className="text-xs font-semibold text-emerald-700">
                              Ngân sách: {m.salaryRange}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={m.status}
                            onChange={e => handleUpdateMandateStatus(m.id, e.target.value as MandateStatus)}
                            className="text-xs px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-800 font-semibold outline-none"
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

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
          <div className="text-xs text-gray-500">
            Hệ thống CRM cá nhân bảo vệ quyền lợi và vị thế thương lượng của ứng viên cấp cao
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
