import { useState, useEffect } from 'react';
import {
  Compass,
  Building2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  Copy,
  Check,
  HelpCircle,
  Shield,
  Sliders,
  Users,
  Target
} from 'lucide-react';
import {
  type Application,
  CULTURE_DIMENSION_LABELS,
  CULTURE_INDUSTRY_BENCHMARKS
} from '../domain';
import { cultureRadarRepository } from '../data';
import { type CultureDimension, type ReverseInterviewTargetRole, type CultureDimensionScoreDTO, type ReverseInterviewQuestionDTO, type CultureCompatibilityReportDTO } from '../domain';

interface CultureRadarModalProps {
  currentApplications?: Application[];
  defaultCompany?: string;
  onClose: () => void;
  notify?: (message: string, error?: boolean) => void;
}

const PRESET_COMPANIES = [
  'FPT Software',
  'VNG Corporation',
  'Shopee',
  'Grab Vietnam',
  'Viettel Solutions',
  'MoMo'
];

const ROLE_LABELS: Record<ReverseInterviewTargetRole, string> = {
  engineering_manager: 'Engineering Manager (Trưởng nhóm kỹ thuật)',
  peer_engineer: 'Peer Engineer (Đồng nghiệp lập trình viên)',
  skip_level: 'Skip-Level / Director (Giám đốc kỹ thuật / VP)'
};

const DIMENSION_ICONS: Record<CultureDimension, string> = {
  engineering_rigor: '⚡',
  oncall_wlb: '⚖️',
  psychological_safety: '🛡️',
  mentorship_growth: '🌱',
  leadership_transparency: '🔭',
  tech_debt_tooling: '🛠️'
};

export function CultureRadarModal({
  currentApplications = [],
  defaultCompany,
  onClose,
  notify
}: CultureRadarModalProps) {
  const initialCompany = defaultCompany || (currentApplications.length > 0 ? currentApplications[0].company : 'FPT Software');
  
  const [company, setCompany] = useState(initialCompany);
  const [targetRole, setTargetRole] = useState<ReverseInterviewTargetRole>('engineering_manager');
  const [activeTab, setActiveTab] = useState<'radar' | 'questions'>('radar');
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [report, setReport] = useState<CultureCompatibilityReportDTO | null>(null);
  
  const [preferences, setPreferences] = useState<Record<CultureDimension, number>>({
    engineering_rigor: 4,
    oncall_wlb: 4,
    psychological_safety: 4,
    mentorship_growth: 3,
    leadership_transparency: 3,
    tech_debt_tooling: 3
  });

  const handleFetchReport = async (compName: string, role: ReverseInterviewTargetRole) => {
    try {
      setAnalyzing(true);
      const res = await cultureRadarRepository.analyzeCulture({
        company: compName,
        targetRole: role,
        candidatePreferences: preferences
      });
      setReport(res);
    } catch {
      notify?.('Không thể tải dữ liệu radar văn hóa.', true);
    } finally {
      setAnalyzing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    handleFetchReport(initialCompany, targetRole);
  }, []);

  const handleAnalyze = () => {
    if (!company.trim()) {
      notify?.('Vui lòng nhập tên công ty.', true);
      return;
    }
    handleFetchReport(company.trim(), targetRole);
    notify?.(`Đã hoàn tất phân tích văn hóa cho ${company.trim()}`);
  };

  const handleRoleChange = async (newRole: ReverseInterviewTargetRole) => {
    setTargetRole(newRole);
    if (report) {
      try {
        const questions = await cultureRadarRepository.generateQuestions({
          dimensionScores: report.dimensionScores,
          targetRole: newRole
        });
        setReport({
          ...report,
          targetRole: newRole,
          reverseInterviewQuestions: questions
        });
      } catch {
        notify?.('Không thể làm mới câu hỏi cho vai trò này.', true);
      }
    }
  };

  const handlePreferenceChange = (dim: CultureDimension, val: number) => {
    setPreferences(prev => ({
      ...prev,
      [dim]: val
    }));
  };

  const handleCopyQuestion = (q: ReverseInterviewQuestionDTO) => {
    const textToCopy = `Câu hỏi phỏng vấn ngược (${ROLE_LABELS[q.targetRole]}):\n"${q.question}"\n\nMục đích lắng nghe: ${q.listeningFor}\nTín hiệu cảnh báo: ${q.redFlagSignal}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(q.id);
    notify?.('Đã sao chép câu hỏi và hướng dẫn phỏng vấn ngược!');
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleSaveRadar = () => {
    notify?.('Đã lưu kết quả phân tích văn hóa vào hồ sơ theo dõi!');
  };

  const dimensionsList: CultureDimension[] = [
    'engineering_rigor',
    'oncall_wlb',
    'psychological_safety',
    'mentorship_growth',
    'leadership_transparency',
    'tech_debt_tooling'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto culture-radar-modal-overlay">
      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden culture-radar-modal">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-md">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">
                  Radar Văn hóa Doanh nghiệp & Phỏng vấn Ngược
                </h2>
                <span className="text-xs px-2.5 py-0.5 font-semibold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                  Culture AI Synthesizer
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Đánh giá 6 trụ cột văn hóa kỹ thuật, phân tích khoảng cách benchmark và bộ câu hỏi Reverse-Interview
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors culture-modal-close-btn"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-[300px]">
            <Building2 className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={company}
              onChange={e => setCompany(e.target.value)}
              placeholder="Nhập tên doanh nghiệp cần phân tích..."
              className="flex-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-gray-800 company-input"
            />
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="px-4 py-1.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-sm flex items-center gap-1.5 culture-analyze-btn disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {analyzing ? 'Đang phân tích...' : 'Phân tích Văn hóa'}
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-xs text-gray-500 font-medium">Gợi ý:</span>
            {PRESET_COMPANIES.map(comp => (
              <button
                key={comp}
                onClick={() => {
                  setCompany(comp);
                  handleFetchReport(comp, targetRole);
                }}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition ${
                  company === comp
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {comp}
              </button>
            ))}
          </div>
        </div>

        <div className="flex border-b border-gray-200 px-6 bg-white">
          <button
            onClick={() => setActiveTab('radar')}
            className={`py-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 transition ${
              activeTab === 'radar'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            6 Trụ cột Văn hóa & So sánh Benchmark
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`py-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 transition ${
              activeTab === 'questions'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            Bộ câu hỏi Phỏng vấn Ngược (Reverse-Interview)
            {report?.reverseInterviewQuestions && (
              <span className="ml-1.5 px-2 py-0.5 text-xs bg-emerald-100 text-emerald-800 rounded-full font-bold">
                {report.reverseInterviewQuestions.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <Compass className="w-10 h-10 animate-spin text-emerald-600 mb-3" />
              <p className="text-sm font-medium">Đang tải và tổng hợp dữ liệu văn hóa doanh nghiệp...</p>
            </div>
          ) : !report ? (
            <div className="p-8 text-center text-gray-500">
              Chưa có dữ liệu phân tích. Hãy chọn một công ty và bấm Phân tích Văn hóa.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-md flex flex-col justify-between culture-overall-badge">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs uppercase tracking-wider font-semibold opacity-90">
                        Chỉ số Tương thích
                      </span>
                      <Shield className="w-4 h-4 opacity-80" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-extrabold tracking-tight">
                        {report.overallCompatibilityScore}
                      </span>
                      <span className="text-lg opacity-80 font-medium">/ 100</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-emerald-500/40 flex items-center justify-between text-xs">
                    <span>Mức độ phù hợp tổng quan</span>
                    <span className="font-bold bg-white/20 px-2 py-0.5 rounded-full">
                      {report.overallCompatibilityScore >= 80 ? 'Rất cao (Strong Fit)' : report.overallCompatibilityScore >= 65 ? 'Phù hợp (Good Fit)' : 'Cần cân nhắc (Caution)'}
                    </span>
                  </div>
                </div>

                <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between culture-synthesis-summary">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-emerald-600" />
                        Bản tổng hợp Đánh giá Môi trường Kỹ thuật
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2.5 py-0.5 bg-rose-50 text-rose-700 rounded-full border border-rose-200 critical-flags-count">
                          {report.criticalRedFlagsCount} Cảnh báo (Red Flags)
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 green-flags-count">
                          {report.standoutGreenFlagsCount} Điểm sáng (Green Flags)
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed font-normal">
                      {report.synthesisSummary}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                    <span>Doanh nghiệp: <strong className="text-gray-800">{report.company}</strong></span>
                    <span>Cập nhật: {new Date(report.calculatedAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
              </div>

              {activeTab === 'radar' && (
                <>
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-emerald-600" />
                          Trọng số Ưu tiên của Bạn (Candidate Priorities)
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Điều chỉnh mức độ quan trọng (1-5) để hệ thống tính toán điểm tương thích cá nhân hóa
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {dimensionsList.map(dim => (
                        <div key={dim} className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex flex-col justify-between">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                              <span>{DIMENSION_ICONS[dim]}</span>
                              {CULTURE_DIMENSION_LABELS[dim]}
                            </span>
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.2 rounded">
                              {preferences[dim]} / 5
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            step="1"
                            value={preferences[dim]}
                            onChange={e => handlePreferenceChange(dim, parseInt(e.target.value, 10))}
                            className="w-full accent-emerald-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {report.dimensionScores.map((scoreCard: CultureDimensionScoreDTO) => {
                      const benchmark = scoreCard.benchmarkAvg || CULTURE_INDUSTRY_BENCHMARKS[scoreCard.dimension] || 65;
                      const delta = scoreCard.score - benchmark;
                      return (
                        <div
                          key={scoreCard.dimension}
                          className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between dimension-card"
                        >
                          <div>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{DIMENSION_ICONS[scoreCard.dimension]}</span>
                                <div>
                                  <h4 className="text-sm font-bold text-gray-900">
                                    {scoreCard.name}
                                  </h4>
                                  <span className="text-xs text-gray-500">
                                    Mức độ tương thích cá nhân
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end">
                                <div className="flex items-baseline gap-1">
                                  <span className="text-2xl font-black text-gray-900">{scoreCard.score}</span>
                                  <span className="text-xs text-gray-400 font-semibold">/100</span>
                                </div>
                                <span
                                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                    delta >= 0
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {delta >= 0 ? `+${delta}` : `${delta}`} so với ngành ({benchmark})
                                </span>
                              </div>
                            </div>

                            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden mb-3 relative">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  scoreCard.score >= 80 ? 'bg-emerald-500' : scoreCard.score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(0, scoreCard.score))}%` }}
                              />
                            </div>

                            <p className="text-xs text-gray-600 mb-4 leading-relaxed font-normal">
                              {scoreCard.summary}
                            </p>

                            <div className="space-y-2">
                              {scoreCard.greenFlags.length > 0 && (
                                <div className="space-y-1">
                                  <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    Điểm sáng kỹ thuật:
                                  </div>
                                  <ul className="space-y-1 pl-4">
                                    {scoreCard.greenFlags.map((flag, idx) => (
                                      <li key={idx} className="text-xs text-gray-700 list-disc font-medium">
                                        {flag}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {scoreCard.redFlags.length > 0 && (
                                <div className="space-y-1 pt-1">
                                  <div className="text-xs font-semibold text-rose-800 flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                    Lỗ hổng & Nguy cơ:
                                  </div>
                                  <ul className="space-y-1 pl-4">
                                    {scoreCard.redFlags.map((flag, idx) => (
                                      <li key={idx} className="text-xs text-rose-700 list-disc font-medium">
                                        {flag}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {activeTab === 'questions' && (
                <div className="space-y-5">
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-600" />
                        Chọn Đối tượng Phỏng vấn (Interviewer Target Role)
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Câu hỏi phỏng vấn ngược được cá nhân hóa tùy theo cấp bậc và góc nhìn của người đối thoại
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {(['engineering_manager', 'peer_engineer', 'skip_level'] as ReverseInterviewTargetRole[]).map(r => (
                        <button
                          key={r}
                          onClick={() => handleRoleChange(r)}
                          className={`text-xs px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 role-tab-btn ${
                            targetRole === r
                              ? 'bg-emerald-600 text-white shadow-md'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {r === 'engineering_manager' && 'EM / Lead'}
                          {r === 'peer_engineer' && 'Peer Engineer'}
                          {r === 'skip_level' && 'Director / VP'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {report.reverseInterviewQuestions.map((q: ReverseInterviewQuestionDTO) => (
                      <div
                        key={q.id}
                        className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-4 reverse-question-card"
                      >
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                              {CULTURE_DIMENSION_LABELS[q.dimension]}
                            </span>
                            <span className="text-xs font-semibold text-gray-500">
                              Mục tiêu: {ROLE_LABELS[q.targetRole]}
                            </span>
                          </div>

                          <p className="text-base font-bold text-gray-900">
                            "{q.question}"
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                            <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100">
                              <span className="text-xs font-bold text-emerald-900 block mb-1 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Lắng nghe điều gì (Positive Signal):
                              </span>
                              <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                                {q.listeningFor}
                              </p>
                            </div>

                            <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-100">
                              <span className="text-xs font-bold text-rose-900 block mb-1 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                Dấu hiệu cảnh báo (Red Flag Alert):
                              </span>
                              <p className="text-xs text-rose-800 leading-relaxed font-medium">
                                {q.redFlagSignal}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="md:self-start pt-1">
                          <button
                            onClick={() => handleCopyQuestion(q)}
                            className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 rounded-lg transition border border-gray-200 hover:border-emerald-300 flex items-center gap-1.5 shadow-sm copy-question-btn"
                            title="Sao chép câu hỏi và gợi ý"
                          >
                            {copiedId === q.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-600">Đã chép</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-gray-500" />
                                <span>Sao chép</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
          <div className="text-xs text-gray-500">
            Dữ liệu hỗ trợ ứng viên đánh giá chân thực môi trường làm việc trước khi nhận Offer
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveRadar}
              className="px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition flex items-center gap-2 save-radar-btn"
            >
              <Check className="w-4 h-4" />
              Lưu Đánh giá
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
