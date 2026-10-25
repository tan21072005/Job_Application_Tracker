import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, BriefcaseBusiness, Check, CircleAlert, LayoutDashboard, LoaderCircle, LogOut, Plus, RotateCcw, Trash2, X, KeyRound, Sparkles, Database, UserCheck, Radar, CalendarDays, Crown, TrendingUp, FileText, Building2, Users, Scale, Compass, Mail, Send, Cpu, ShieldCheck, CircleDollarSign, FileCheck, Gauge, Coins, Network, FileSignature, FileSearch, Workflow, BarChart3 } from 'lucide-react';
import { demoMode, repository, proRepository } from './data';
import type { ProStatusDTO } from '@jobtrack/contract';
import { ApiError } from './transport';
import { duplicate, type Application, type Interview, type Status } from './domain';
import { Button, Dialog, Empty, Logo } from './components/ui';
import { ApplicationForm, InterviewForm } from './components/forms';
import Dashboard from './views/Dashboard';
import Applications, { initialFilters } from './views/Applications';
import Detail from './views/Detail';
import Auth from './views/Auth';
import DatasetsView from './views/Datasets';
import InterviewsView from './views/InterviewsView';
import { AnalyticsView } from './views/AnalyticsView';
import { CareerRoadmapView } from './views/CareerRoadmapView';
import QuickAction from './components/QuickAction';
import ImportLinkModal from './components/ImportLinkModal';
import ChatWidget from './components/ChatWidget';
import AiGrantsModal from './components/AiGrantsModal';
import CandidateProfileModal from './components/CandidateProfileModal';
import TrashModal from './components/TrashModal';
import { SubscriptionsModal } from './components/SubscriptionsModal';
import ProUpgradeModal from './components/ProUpgradeModal';
import { ResumeManagerModal } from './components/ResumeManagerModal';
import { CompanyIntelligenceModal } from './components/CompanyIntelligenceModal';
import { NetworkingContactsModal } from './components/NetworkingContactsModal';
import { DecisionMatrixModal } from './components/DecisionMatrixModal';
import { EmailIngestModal } from './components/EmailIngestModal';
import { OutreachCampaignModal } from './components/OutreachCampaignModal';
import { InterviewSimulationModal } from './components/InterviewSimulationModal';
import { DossierConfigModal } from './components/DossierConfigModal';
import { CompensationForecasterModal } from './components/CompensationForecasterModal';
import { CareerTrajectoryModal } from './components/CareerTrajectoryModal';
import { ResumeOptimizerModal } from './components/ResumeOptimizerModal';
import { PipelineVelocityModal } from './components/PipelineVelocityModal';
import { CultureRadarModal } from './components/CultureRadarModal';
import { HeadhunterCrmModal } from './components/HeadhunterCrmModal';
import { SystemDesignStudioModal } from './components/SystemDesignStudioModal';
import { EquityLiquidityModal } from './components/EquityLiquidityModal';
import { BackchannelIntelModal } from './components/BackchannelIntelModal';
import { ExecutiveContractGuardModal } from './components/ExecutiveContractGuardModal';
import { ExecutiveOnboardingModal } from './components/ExecutiveOnboardingModal';
import { BoardAdvisoryNexusModal } from './components/BoardAdvisoryNexusModal';
import { ExecutiveSeveranceGuardModal } from './components/ExecutiveSeveranceGuardModal';
import { TechnicalDueDiligenceStudioModal } from './components/TechnicalDueDiligenceStudioModal';
import { OrgTopologyStudioModal } from './components/OrgTopologyStudioModal';
import { ValueStreamStudioModal } from './components/ValueStreamStudioModal';
import { CloudFinopsStudioModal } from './components/CloudFinopsStudioModal';

function readRoute() {
  const [page, id, tab] = location.hash.slice(1).split('/');
  return { page: page || (demoMode ? 'dashboard' : 'auth'), id: id || '', tab: tab === 'interviews' ? 'interviews' as const : tab === 'ai' ? 'ai' as const : 'info' as const };
}

export default function JobTrack() {
  const [route, setRoute] = useState(readRoute);
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [authState, setAuthState] = useState<'bootstrapping' | 'authenticated' | 'unauthenticated' | 'error' | 'expired'>('bootstrapping');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [filters, setFilters] = useState(initialFilters);
  const [form, setForm] = useState<'new' | 'edit' | null>(null);
  const [interview, setInterview] = useState<Interview | null | undefined>(undefined);
  const [deletion, setDeletion] = useState<{ app: Application; round?: Interview } | null>(null);
  const [account, setAccount] = useState(false);
  const [accountEmail, setAccountEmail] = useState('');
  const [actionApp, setActionApp] = useState<Application | null>(null);
  const [reset, setReset] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [grantsModal, setGrantsModal] = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [trashModal, setTrashModal] = useState(false);
  const [radarModal, setRadarModal] = useState(false);
  const [proModal, setProModal] = useState(false);
  const [resumeModal, setResumeModal] = useState(false);
  const [companyModal, setCompanyModal] = useState(false);
  const [contactsModal, setContactsModal] = useState(false);
  const [decisionModal, setDecisionModal] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [outreachModal, setOutreachModal] = useState(false);
  const [simulationModal, setSimulationModal] = useState(false);
  const [dossierModal, setDossierModal] = useState(false);
  const [compensationModal, setCompensationModal] = useState(false);
  const [careerTrajectoryModal, setCareerTrajectoryModal] = useState(false);
  const [resumeOptimizerModal, setResumeOptimizerModal] = useState(false);
  const [pipelineVelocityModal, setPipelineVelocityModal] = useState(false);
  const [cultureRadarModal, setCultureRadarModal] = useState(false);
  const [headhunterCrmModal, setHeadhunterCrmModal] = useState(false);
  const [systemDesignStudioModal, setSystemDesignStudioModal] = useState(false);
  const [equityLiquidityModal, setEquityLiquidityModal] = useState(false);
  const [backchannelIntelModal, setBackchannelIntelModal] = useState(false);
  const [executiveContractModal, setExecutiveContractModal] = useState(false);
  const [executiveOnboardingModal, setExecutiveOnboardingModal] = useState(false);
  const [boardAdvisoryModal, setBoardAdvisoryModal] = useState(false);
  const [executiveSeveranceModal, setExecutiveSeveranceModal] = useState(false);
  const [technicalDueDiligenceModal, setTechnicalDueDiligenceModal] = useState(false);
  const [orgTopologyStudioModal, setOrgTopologyStudioModal] = useState(false);
  const [valueStreamStudioModal, setValueStreamStudioModal] = useState(false);
  const [cloudFinopsStudioModal, setCloudFinopsStudioModal] = useState(false);
  const [targetCompanyName, setTargetCompanyName] = useState('FPT Software');
  const [proStatus, setProStatus] = useState<ProStatusDTO | null>(null);
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null);
  const request = useRef(0);
  const headingRef = useRef<HTMLElement>(null);
  const selected = apps.find(app => app.id === route.id);
  const isApplications = ['applications', 'application'].includes(route.page);
  const notify = (message: string, isError = false) => setToast({ message, error: isError });
  const navigate = (hash: string) => { location.hash = hash; };
  const open = (app: Application, targetTab?: 'info' | 'interviews' | 'ai' | boolean) => navigate(`application/${app.id}${targetTab === 'interviews' || targetTab === true ? '/interviews' : targetTab === 'ai' ? '/ai' : ''}`);

  async function refresh() {
    const id = ++request.current;
    proRepository.getStatus().then(setProStatus).catch(() => {});
    try { const result = await repository.list(); if (id === request.current) { setApps(result); setError(''); } }
    catch (err) { if (id === request.current) { if (!demoMode && err instanceof ApiError && err.status === 401) { setApps([]); setAuthState('unauthenticated'); navigate('auth'); } else setError((err as Error).message); } }
    finally { if (id === request.current) setLoading(false); }
  }

  async function bootstrap() {
    setLoading(true);
    setError('');
    if (demoMode) {
      setAuthState('authenticated');
      void refresh();
      return;
    }
    try {
      const user = await repository.me();
      setCurrentUserId(user.id);
      setAccountEmail(user.email);
      setAuthState('authenticated');
      if (readRoute().page === 'auth') navigate('dashboard');
      void refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setAuthState('unauthenticated');
        setCurrentUserId(null);
        setApps([]);
        navigate('auth');
      } else {
        setAuthState('error');
        setError((err as Error).message || 'Không thể kết nối máy chủ.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void bootstrap();
    const change = () => setRoute(readRoute());
    const storage = (event: StorageEvent) => { if (demoMode && event.key === 'jobtrack.design.v1') void refresh(); };
    const expired = () => {
      if (form !== null || interview !== undefined || actionApp !== null) {
        setAuthState('expired');
        notify('Phiên làm việc đã hết hạn. Đăng nhập lại để tiếp tục lưu bản nháp.', true);
      } else {
        request.current++;
        setApps([]);
        setAccountEmail('');
        setCurrentUserId(null);
        setForm(null);
        setInterview(undefined);
        setDeletion(null);
        setActionApp(null);
        setAccount(false);
        setError('');
        setLoading(false);
        setAuthState('unauthenticated');
        navigate('auth');
        notify('Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục.', true);
      }
    };
    window.addEventListener('hashchange', change); window.addEventListener('storage', storage); window.addEventListener('jobtrack:session-expired', expired);
    return () => { request.current++; window.removeEventListener('hashchange', change); window.removeEventListener('storage', storage); window.removeEventListener('jobtrack:session-expired', expired); };
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    headingRef.current?.focus({ preventScroll: true });
    document.title = `${route.page === 'dashboard' ? 'Tổng quan' : route.page === 'analytics' ? 'Phân tích & Hiệu suất' : route.page === 'roadmap' ? 'Lộ trình Sự nghiệp AI' : route.page === 'datasets' ? 'Dữ liệu Web · PageWeave' : route.page === 'interviews' ? 'Lịch phỏng vấn' : route.page === 'auth' ? 'Đăng nhập' : selected?.position || 'Hồ sơ ứng tuyển'} · JobTrack`;
  }, [route.page, route.id, selected?.position]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 6000); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible' && authState === 'authenticated' && !busy) {
        void refresh();
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [authState, busy]);

  useEffect(() => {
    if (demoMode || authState !== 'authenticated') return;
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/events', { withCredentials: true });
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type === 'MUTATION') {
            void refresh();
            const act = String(data.action || '').toLowerCase();
            const actionStr = act === 'create' ? 'thêm mới' : act === 'update' ? 'cập nhật' : act === 'restore' ? 'khôi phục' : 'xóa';
            notify(`Đã đồng bộ thao tác ${actionStr} từ AI / MCP.`);
          }
        } catch {}
      };
    } catch {}
    return () => {
      es?.close();
    };
  }, [authState]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { __JOBTRACK_VIEW_STATE__?: unknown }).__JOBTRACK_VIEW_STATE__ = {
        page: route.page,
        selectedId: route.id || null,
        activeTab: route.tab,
        totalApplications: apps.length,
        activeFilters: filters,
        timestamp: new Date().toISOString()
      };
    }
  }, [route, apps.length, filters]);

  async function saved(id: string) { setForm(null); await refresh(); navigate(`application/${id}`); notify('Đã lưu hồ sơ.'); }
  async function changeStatus(status: Status) {
    if (!selected || busy) return;
    const conflict = duplicate(apps, selected, selected.id);
    if (!['Rejected', 'Withdrawn'].includes(status) && conflict && !['Rejected', 'Withdrawn'].includes(conflict.status)) { notify('Tin tuyển dụng này đã có một hồ sơ đang hoạt động.', true); return; }
    setBusy(true);
    try { await repository.save({ ...selected, status }, selected.id, { version: selected.version }); await refresh(); notify('Đã cập nhật trạng thái.'); }
    catch (error) {
      if (error instanceof ApiError && error.status === 401) window.dispatchEvent(new Event('jobtrack:session-expired'));
      else if (error instanceof ApiError && error.status === 412) {
        await refresh();
        notify('Hồ sơ đã được cập nhật ở nơi khác. Đã tải bản mới nhất, vui lòng chọn lại trạng thái.', true);
      } else if (error instanceof ApiError && error.status === 404) {
        notify('Hồ sơ đã bị xóa trên hệ thống.', true);
        navigate('applications');
      } else notify((error as Error).message, true);
    }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!deletion) return;
    setBusy(true);
    try {
      if (deletion.round) await repository.removeInterview(deletion.app.id, deletion.round.id, deletion.app.version); else await repository.moveToTrash(deletion.app.id, deletion.app.version);
      if (!deletion.round) navigate('applications');
      setDeletion(null); await refresh(); notify(deletion.round ? 'Đã xóa vòng phỏng vấn.' : 'Đã chuyển hồ sơ vào thùng rác.');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.dispatchEvent(new Event('jobtrack:session-expired'));
      } else if (error instanceof ApiError && error.status === 412) {
        try {
          const latestApps = await repository.list();
          const latestApp = latestApps.find(a => a.id === deletion.app.id);
          if (!latestApp) {
            setDeletion(null);
            notify('Hồ sơ đã bị xóa ở nơi khác.');
            navigate('applications');
          } else {
            setDeletion({ app: latestApp, round: deletion.round });
            notify('Hồ sơ đã thay đổi ở nơi khác. Kiểm tra lại nội dung trước khi xác nhận xóa.', true);
          }
        } catch {
          notify((error as Error).message, true);
        }
      } else if (error instanceof ApiError && error.status === 404) {
        setDeletion(null);
        notify('Hồ sơ không còn tồn tại trên hệ thống.');
        navigate('applications');
      } else {
        notify((error as Error).message, true);
      }
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try { await repository.logout(); request.current++; setApps([]); setAccountEmail(''); setCurrentUserId(null); setAuthState('unauthenticated'); setAccount(false); navigate('auth'); }
    catch (error) { notify((error as Error).message, true); }
  }

  function handleLoginSuccess(user?: { id: string; email: string }) {
    if (user) {
      if (currentUserId && user.id !== currentUserId) {
        setForm(null);
        setInterview(undefined);
        setActionApp(null);
        notify('Đã chuyển tài khoản. Bản nháp của tài khoản trước đã bị hủy để bảo mật.');
      }
      setCurrentUserId(user.id);
      setAccountEmail(user.email);
    }
    setAuthState('authenticated');
    void refresh();
    navigate('dashboard');
  }

  const upcomingInterviewsCount = apps.flatMap(a => a.interviews || []).filter(i => i.status === 'Scheduled' && Date.parse(i.at) >= Date.now()).length;
  const navigation = <><a href="#dashboard" className={route.page === 'dashboard' ? 'active' : ''} aria-current={route.page === 'dashboard' ? 'page' : undefined}><LayoutDashboard size={19} /><span>Tổng quan</span></a><a href="#applications" className={isApplications ? 'active' : ''} aria-current={isApplications ? 'page' : undefined}><BriefcaseBusiness size={19} /><span>Hồ sơ ứng tuyển</span><small>{apps.length}</small></a><a href="#interviews" className={route.page === 'interviews' ? 'active' : ''} aria-current={route.page === 'interviews' ? 'page' : undefined}><CalendarDays size={19} /><span>Lịch phỏng vấn</span>{upcomingInterviewsCount > 0 && <small>{upcomingInterviewsCount}</small>}</a><a href="#analytics" className={route.page === 'analytics' ? 'active' : ''} aria-current={route.page === 'analytics' ? 'page' : undefined}><TrendingUp size={19} /><span>Phân tích</span></a><a href="#roadmap" className={route.page === 'roadmap' ? 'active' : ''} aria-current={route.page === 'roadmap' ? 'page' : undefined}><Compass size={19} /><span>Lộ trình AI</span></a><a href="#datasets" className={route.page === 'datasets' ? 'active' : ''} aria-current={route.page === 'datasets' ? 'page' : undefined}><Database size={19} /><span>Dữ liệu Web</span></a></>;
  return <div className="jobtrack"><a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); headingRef.current?.focus(); }}>Đến nội dung chính</a>{route.page === 'auth' || authState === 'unauthenticated' ? <Auth onEnter={user => handleLoginSuccess(user)} /> : <div className="app-shell">
    <aside className="sidebar"><Logo /><nav aria-label="Điều hướng chính">{navigation}<button className="sidebar-trash-btn networking-contacts-sidebar-btn" onClick={() => setContactsModal(true)}><Users size={16} /><span>Mạng lưới kết nối</span></button><button className="sidebar-trash-btn email-ingest-sidebar-btn" onClick={() => setEmailModal(true)}><Mail size={16} /><span>Hộp thư thông minh</span></button><button className="sidebar-trash-btn outreach-campaigns-sidebar-btn" onClick={() => setOutreachModal(true)}><Send size={16} /><span>Chiến dịch Outreach</span></button><button className="sidebar-trash-btn simulation-studio-sidebar-btn" onClick={() => setSimulationModal(true)}><Cpu size={16} /><span>Giả lập phỏng vấn</span></button><button className="sidebar-trash-btn dossier-sidebar-btn" onClick={() => setDossierModal(true)}><ShieldCheck size={16} /><span>Hồ sơ bảo chứng</span></button><button className="sidebar-trash-btn compensation-forecaster-sidebar-btn" onClick={() => setCompensationModal(true)}><CircleDollarSign size={16} /><span>Dự báo thu nhập & ESOP</span></button><button className="sidebar-trash-btn career-trajectory-sidebar-btn" onClick={() => setCareerTrajectoryModal(true)}><Compass size={16} /><span>Lộ trình thăng tiến</span></button><button className="sidebar-trash-btn resume-optimizer-sidebar-btn" onClick={() => setResumeOptimizerModal(true)}><FileCheck size={16} /><span>Tối ưu hóa ATS</span></button><button className="sidebar-trash-btn pipeline-velocity-sidebar-btn" onClick={() => setPipelineVelocityModal(true)}><Gauge size={16} /><span>Tốc độ & Điểm nghẽn</span></button><button className="sidebar-trash-btn culture-radar-sidebar-btn" onClick={() => setCultureRadarModal(true)}><Compass size={16} /><span>Radar Văn hóa</span></button><button className="sidebar-trash-btn headhunter-crm-sidebar-btn" onClick={() => setHeadhunterCrmModal(true)}><UserCheck size={16} /><span>Headhunter & Độc quyền</span></button><button className="sidebar-trash-btn system-design-studio-sidebar-btn" onClick={() => setSystemDesignStudioModal(true)}><Cpu size={16} /><span>System Design AI</span></button><button className="sidebar-trash-btn equity-liquidity-sidebar-btn" onClick={() => setEquityLiquidityModal(true)}><Coins size={16} /><span>Định giá Cổ phần & Exit</span></button><button className="sidebar-trash-btn backchannel-sidebar-btn" onClick={() => setBackchannelIntelModal(true)}><Network size={16} /><span>Backchannel & Bảo chứng</span></button><button className="sidebar-trash-btn executive-contract-guard-sidebar-btn" onClick={() => setExecutiveContractModal(true)}><FileSignature size={16} /><span>Hợp đồng & Sa thải</span></button><button className="sidebar-trash-btn executive-onboarding-sidebar-btn" onClick={() => setExecutiveOnboardingModal(true)}><Compass size={16} /><span>100 Ngày Đầu tiên (C-Level)</span></button><button className="sidebar-trash-btn board-advisory-nexus-sidebar-btn" onClick={() => setBoardAdvisoryModal(true)}><Scale size={16} /><span>Hội đồng & Cố vấn (Board)</span></button><button className="sidebar-trash-btn executive-severance-sidebar-btn" onClick={() => setExecutiveSeveranceModal(true)}><ShieldCheck size={16} /><span>Bảo vệ Thôi việc (Severance)</span></button><button className="sidebar-trash-btn technical-due-diligence-sidebar-btn" onClick={() => setTechnicalDueDiligenceModal(true)}><FileSearch size={16} /><span>Thẩm định Kỹ thuật (M&A VDD)</span></button><button className="sidebar-trash-btn org-topology-studio-sidebar-btn" onClick={() => setOrgTopologyStudioModal(true)}><Workflow size={16} /><span>Org Topology & Nhân sự</span></button><button className="sidebar-trash-btn value-stream-studio-sidebar-btn" data-testid="open-vsm-studio" onClick={() => setValueStreamStudioModal(true)}><BarChart3 size={16} /><span>Value Stream & DORA Studio</span></button><button className="sidebar-trash-btn finops-studio-sidebar-btn" data-testid="open-finops-studio" onClick={() => setCloudFinopsStudioModal(true)}><CircleDollarSign size={16} /><span>FinOps & Cloud Unit Economics</span></button><button className="sidebar-trash-btn decision-matrix-sidebar-btn" onClick={() => setDecisionModal(true)}><Scale size={16} /><span>So sánh cơ hội</span></button><button className="sidebar-trash-btn company-explorer-sidebar-btn" onClick={() => { setTargetCompanyName(apps[0]?.company || 'FPT Software'); setCompanyModal(true); }}><Building2 size={16} /><span>Hồ sơ công ty</span></button><button className="sidebar-trash-btn resume-manager-sidebar-btn" onClick={() => setResumeModal(true)}><FileText size={16} /><span>Kho CV & May đo</span></button><button className="sidebar-trash-btn" onClick={() => setRadarModal(true)}><Radar size={16} /><span>Rada việc làm</span></button><button className="sidebar-trash-btn" onClick={() => setTrashModal(true)}><Trash2 size={16} /><span>Thùng rác</span></button><button className="sidebar-trash-btn pro-btn" onClick={() => setProModal(true)}><Crown size={16} className="text-amber-500" /><span>Gói Pro</span>{proStatus?.isPro && <span className="pro-pill-badge" style={{ marginLeft: 'auto' }}>PRO</span>}</button></nav><div className="sidebar-message"><span className="sidebar-rule" /><strong>Từng bước một.</strong><p>Một nơi cho những cơ hội<br />và bước tiếp theo của bạn.</p><ArrowUpRight size={22} strokeWidth={1.5} /></div><button className="sidebar-account" onClick={() => setAccount(true)}><span className="avatar">{demoMode ? 'NT' : 'TK'}</span><span><strong>{demoMode ? 'Nhật Tân' : 'Tài khoản'}</strong><small>Không gian cá nhân</small></span><ArrowRight size={16} /></button></aside>
    <div className="workspace"><header className="topbar"><div className="mobile-brand"><Logo /></div><div className="breadcrumb"><span>Không gian cá nhân</span><span>/</span><strong>{route.page === 'dashboard' ? 'Tổng quan' : route.page === 'analytics' ? 'Phân tích & Hiệu suất' : route.page === 'roadmap' ? 'Lộ trình Kỹ năng & Sự nghiệp AI' : route.page === 'datasets' ? 'Dữ liệu Web (PageWeave)' : route.page === 'interviews' ? 'Lịch phỏng vấn' : 'Hồ sơ ứng tuyển'}</strong></div><div className="topbar-account">{proStatus?.isPro ? <span className="pro-pill-badge" onClick={() => setProModal(true)} style={{ cursor: 'pointer', marginRight: '8px' }}><Crown size={12} />PRO</span> : <button className="pro-upgrade-nav-btn" onClick={() => setProModal(true)} style={{ marginRight: '8px' }}><Crown size={14} />Nâng cấp Pro</button>}{demoMode && <span className="demo-label"><span />Dữ liệu mẫu</span>}<button className="avatar" aria-label="Mở tài khoản" onClick={() => setAccount(true)}>{demoMode ? 'NT' : 'TK'}</button></div></header>
    <main id="main-content" ref={headingRef} tabIndex={-1} aria-busy={loading || busy}>{loading ? <div className="loading-state" role="status"><LoaderCircle className="spin" size={24} /><p>Đang tải hồ sơ…</p><div className="skeleton-grid"><span /><span /><span /></div></div> : authState === 'error' ? <Empty title="Chưa kết nối được máy chủ" action={<div className="empty-actions"><Button onClick={() => void bootstrap()}>Thử lại</Button></div>}>{error}</Empty> : error ? <Empty title="Chưa tải được hồ sơ" action={<div className="empty-actions"><Button onClick={() => { setLoading(true); void refresh(); }}>Thử lại</Button>{demoMode ? <Button kind="secondary" onClick={() => setReset(true)}>Khôi phục dữ liệu mẫu</Button> : <Button kind="secondary" onClick={() => navigate('auth')}>Đăng nhập lại</Button>}</div>}>{error}</Empty> : route.page === 'dashboard' ? <Dashboard apps={apps} onAction={setActionApp} onOpen={open} onAdd={() => setForm('new')} onList={() => navigate('applications')} onImport={() => setImportModal(true)} /> : route.page === 'analytics' ? <AnalyticsView apps={apps} onOpen={open} notify={notify} /> : route.page === 'roadmap' ? <CareerRoadmapView apps={apps} onOpen={open} notify={notify} /> : route.page === 'datasets' ? <DatasetsView notify={notify} /> : route.page === 'interviews' ? <InterviewsView apps={apps} onOpen={open} notify={notify} /> : route.page === 'applications' ? <Applications apps={apps} filters={filters} onFilters={setFilters} onOpen={open} onAdd={() => setForm('new')} onImport={() => setImportModal(true)} onDecisionMatrix={() => setDecisionModal(true)} onRefresh={refresh} notify={notify} /> : route.page === 'application' && selected ? <Detail app={selected} allOffers={apps.filter(a => a.status === 'Offer')} tab={route.tab} busy={busy} onTab={tab => open(selected, tab)} onBack={() => navigate('applications')} onEdit={() => setForm('edit')} onAction={() => setActionApp(selected)} onInterview={round => setInterview(round || null)} onDelete={() => setDeletion({ app: selected })} onDeleteInterview={round => setDeletion({ app: selected, round })} onStatus={status => void changeStatus(status)} notify={notify} /> : <Empty title="Không tìm thấy hồ sơ" action={<Button onClick={() => navigate('applications')}>Về danh sách</Button>}>Hồ sơ có thể đã bị xóa hoặc đường dẫn chưa đúng.</Empty>}<footer className="workspace-footer"><span>JobTrack<span className="footer-dot" />Mỗi cơ hội, một bước tiến.</span>{demoMode && <span>Dữ liệu mẫu · lưu trên trình duyệt này</span>}</footer></main></div>
    <nav className="bottom-nav" aria-label="Điều hướng mobile">{navigation}<button onClick={() => setForm('new')}><Plus size={21} /><span>Thêm mới</span></button></nav>
  </div>}
  {actionApp && <QuickAction app={actionApp} onClose={() => setActionApp(null)} onSaved={() => { setActionApp(null); void refresh(); notify('Đã cập nhật bước tiếp theo.'); }} />}
  {form && <ApplicationForm app={form === 'edit' ? selected : undefined} apps={apps} onClose={() => setForm(null)} onSaved={id => void saved(id)} onOpenExisting={id => { setForm(null); navigate(`application/${id}`); }} onReload={() => { setForm(null); void refresh(); notify('Đã tải bản mới nhất.'); }} />}
  {interview !== undefined && selected && <InterviewForm app={selected} interview={interview || undefined} onClose={() => setInterview(undefined)} onSaved={() => { setInterview(undefined); void refresh(); notify('Đã lưu lịch phỏng vấn.'); }} />}
  {deletion && <Dialog title={deletion.round ? 'Xóa vòng phỏng vấn?' : 'Chuyển vào thùng rác?'} onClose={() => setDeletion(null)} busy={busy}><div className="dialog-body"><span className="delete-icon"><Trash2 size={27} /></span><h3>{deletion.round?.title || deletion.app.position}</h3><p className="delete-description">{deletion.round ? 'Chỉ xóa vòng phỏng vấn này. Hồ sơ ứng tuyển vẫn được giữ lại.' : `Chuyển hồ sơ tại ${deletion.app.company} và ${deletion.app.interviews.length} vòng phỏng vấn liên quan vào thùng rác.`}</p><p className={deletion.round ? 'danger-text' : 'muted-text'}>{deletion.round ? 'Không thể khôi phục sau khi xóa.' : 'Bạn có thể khôi phục lại bất kỳ lúc nào từ Thùng rác.'}</p></div><footer className="dialog-actions"><Button kind="secondary" disabled={busy} onClick={() => setDeletion(null)}>Giữ lại</Button><Button kind={deletion.round ? 'danger' : 'primary'} disabled={busy} onClick={() => void remove()}>{busy ? 'Đang chuyển…' : deletion.round ? 'Xóa phỏng vấn' : 'Bỏ vào thùng rác'}</Button></footer></Dialog>}
  {account && <Dialog title="Không gian của bạn" onClose={() => setAccount(false)}><div className="dialog-body"><div className="account-summary"><span className="avatar">{demoMode ? 'NT' : 'TK'}</span><div><h3>{demoMode ? 'Nhật Tân' : 'Tài khoản'}</h3><p>{demoMode ? 'Đang khám phá với dữ liệu mẫu.' : accountEmail || 'Không gian ứng tuyển cá nhân.'}</p></div></div><Button kind="secondary" onClick={() => { setAccount(false); setProModal(true); }}><Crown size={16} className="text-amber-500" />{proStatus?.isPro ? 'Quản lý gói Pro' : 'Nâng cấp JobTrack Pro'}</Button><Button kind="secondary" className="account-resume-btn" onClick={() => { setAccount(false); setResumeModal(true); }}><FileText size={16} />Quản lý phiên bản CV (ATS)</Button><Button kind="secondary" onClick={() => { setAccount(false); setProfileModal(true); }}><UserCheck size={16} />Hồ sơ ứng viên cá nhân</Button><Button kind="secondary" onClick={() => { setAccount(false); setGrantsModal(true); }}><KeyRound size={16} />Kết nối AI & MCP</Button>{demoMode && <Button kind="secondary" onClick={() => { setAccount(false); setReset(true); }}><RotateCcw size={16} />Khôi phục dữ liệu mẫu</Button>}<Button kind="ghost" onClick={() => void logout()}><LogOut size={17} />Đăng xuất</Button></div></Dialog>}
  {proModal && <ProUpgradeModal onClose={() => setProModal(false)} onSuccess={status => setProStatus(status)} notify={notify} />}
  {importModal && <ImportLinkModal apps={apps} onClose={() => setImportModal(false)} onSaved={id => void saved(id)} onOpenExisting={id => { setImportModal(false); navigate(`application/${id}`); }} />}
  {grantsModal && <AiGrantsModal onClose={() => setGrantsModal(false)} />}
  {profileModal && <CandidateProfileModal onClose={() => setProfileModal(false)} onSaved={p => { setProfileModal(false); notify(`Đã lưu hồ sơ ứng viên: ${p.fullName}`); }} />}
  {trashModal && <TrashModal onClose={() => setTrashModal(false)} onRestored={() => void refresh()} notify={notify} />}
  {radarModal && <SubscriptionsModal isOpen={radarModal} onClose={() => setRadarModal(false)} onScanCompleted={() => void refresh()} />}
  {resumeModal && <ResumeManagerModal isOpen={resumeModal} onClose={() => setResumeModal(false)} />}
  {companyModal && <CompanyIntelligenceModal isOpen={companyModal} companyName={targetCompanyName} onClose={() => setCompanyModal(false)} />}
  {contactsModal && <NetworkingContactsModal isOpen={contactsModal} onClose={() => setContactsModal(false)} applications={apps} notify={notify} />}
  {decisionModal && <DecisionMatrixModal isOpen={decisionModal} onClose={() => setDecisionModal(false)} applications={apps} onRefreshApps={() => void refresh()} notify={notify} />}
  {emailModal && <EmailIngestModal isOpen={emailModal} onClose={() => setEmailModal(false)} onSuccess={() => void refresh()} notify={notify} />}
  {outreachModal && <OutreachCampaignModal isOpen={outreachModal} onClose={() => setOutreachModal(false)} notify={notify} />}
  {simulationModal && <InterviewSimulationModal isOpen={simulationModal} onClose={() => setSimulationModal(false)} />}
  {dossierModal && <DossierConfigModal isOpen={dossierModal} onClose={() => setDossierModal(false)} />}
  {compensationModal && <CompensationForecasterModal isOpen={compensationModal} onClose={() => setCompensationModal(false)} />}
  {careerTrajectoryModal && <CareerTrajectoryModal isOpen={careerTrajectoryModal} onClose={() => setCareerTrajectoryModal(false)} />}
  {resumeOptimizerModal && <ResumeOptimizerModal isOpen={resumeOptimizerModal} onClose={() => setResumeOptimizerModal(false)} applications={apps} notify={notify} />}
  {pipelineVelocityModal && <PipelineVelocityModal applications={apps} onClose={() => setPipelineVelocityModal(false)} notify={notify} />}
  {cultureRadarModal && <CultureRadarModal currentApplications={apps} defaultCompany={apps[0]?.company || 'FPT Software'} onClose={() => setCultureRadarModal(false)} notify={notify} />}
  {headhunterCrmModal && <HeadhunterCrmModal applications={apps} onClose={() => setHeadhunterCrmModal(false)} onApplicationCreated={refresh} notify={notify} />}
  {systemDesignStudioModal && <SystemDesignStudioModal onClose={() => setSystemDesignStudioModal(false)} notify={notify} />}
  {equityLiquidityModal && <EquityLiquidityModal isOpen={equityLiquidityModal} onClose={() => setEquityLiquidityModal(false)} defaultCompany={apps[0]?.company} defaultRole={apps[0]?.position} />}
  {backchannelIntelModal && <BackchannelIntelModal isOpen={backchannelIntelModal} onClose={() => setBackchannelIntelModal(false)} />}
  {executiveContractModal && <ExecutiveContractGuardModal isOpen={executiveContractModal} onClose={() => setExecutiveContractModal(false)} />}
  {executiveOnboardingModal && <ExecutiveOnboardingModal isOpen={executiveOnboardingModal} onClose={() => setExecutiveOnboardingModal(false)} defaultCompany={apps[0]?.company} defaultRole={apps[0]?.position} />}
  {boardAdvisoryModal && <BoardAdvisoryNexusModal isOpen={boardAdvisoryModal} onClose={() => setBoardAdvisoryModal(false)} />}
  {executiveSeveranceModal && <ExecutiveSeveranceGuardModal isOpen={executiveSeveranceModal} onClose={() => setExecutiveSeveranceModal(false)} />}
  {technicalDueDiligenceModal && <TechnicalDueDiligenceStudioModal isOpen={technicalDueDiligenceModal} onClose={() => setTechnicalDueDiligenceModal(false)} />}
  {orgTopologyStudioModal && <OrgTopologyStudioModal isOpen={orgTopologyStudioModal} onClose={() => setOrgTopologyStudioModal(false)} />}
  {valueStreamStudioModal && <ValueStreamStudioModal isOpen={valueStreamStudioModal} onClose={() => setValueStreamStudioModal(false)} />}
  {cloudFinopsStudioModal && <CloudFinopsStudioModal isOpen={cloudFinopsStudioModal} onClose={() => setCloudFinopsStudioModal(false)} />}
  {authState === 'authenticated' && <ChatWidget onRefreshApps={() => void refresh()} onNavigate={navigate} />}
  {reset && <Dialog title="Khôi phục dữ liệu mẫu?" busy={busy} onClose={() => setReset(false)}><div className="dialog-body"><p>Các thay đổi trong bản dùng thử này sẽ được thay bằng dữ liệu mẫu ban đầu. Không thể hoàn tác.</p></div><footer className="dialog-actions"><Button kind="secondary" disabled={busy} onClick={() => setReset(false)}>Hủy</Button><Button disabled={busy} onClick={async () => { setBusy(true); try { await repository.reset(); setReset(false); await refresh(); navigate('dashboard'); notify('Đã khôi phục dữ liệu mẫu.'); } catch (error) { notify((error as Error).message, true); } finally { setBusy(false); } }}>Khôi phục</Button></footer></Dialog>}
  {authState === 'expired' && (
    <Dialog title="Xác thực lại phiên làm việc" onClose={() => {}} busy={busy}>
      <div className="dialog-body">
        <div className="notice notice-conflict" role="alert">
          <div>
            <h3>Phiên làm việc đã hết hạn</h3>
            <p>Đăng nhập lại để tiếp tục lưu bản nháp mà không bị mất dữ liệu đang nhập.</p>
          </div>
        </div>
        <Auth
          onEnter={async user => {
            if (!user) {
              try { user = await repository.me(); } catch { return; }
            }
            if (currentUserId && user.id !== currentUserId) {
              setCurrentUserId(user.id);
              setAccountEmail(user.email);
              setAuthState('authenticated');
              setForm(null);
              setInterview(undefined);
              setActionApp(null);
              void refresh();
              notify('Đã đăng nhập tài khoản khác. Bản nháp trước đó đã bị hủy để bảo mật.', true);
            } else {
              setCurrentUserId(user.id);
              setAccountEmail(user.email);
              setAuthState('authenticated');
              notify('Phiên đã được khôi phục. Bạn có thể tiếp tục lưu.');
            }
          }}
        />
      </div>
    </Dialog>
  )}
  {toast && <div className={`toast ${toast.error ? 'toast-error' : ''}`} role={toast.error ? 'alert' : 'status'}>{toast.error ? <CircleAlert size={18} /> : <Check size={18} />}<span>{toast.message}</span><button aria-label="Đóng thông báo" className="icon-button" onClick={() => setToast(null)}><X size={16} /></button></div>}
  </div>;
}
