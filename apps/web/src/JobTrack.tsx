import { Suspense, useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, BriefcaseBusiness, Check, ChevronLeft, ChevronRight, CircleAlert, LayoutDashboard, LoaderCircle, LogOut, Menu, Plus, RotateCcw, Settings, Trash2, X, KeyRound, Sparkles, Database, UserCheck, Radar, CalendarDays, Crown, TrendingUp, FileText, Building2, Users, Scale, Compass, Mail, Send, Cpu, ShieldCheck, CircleDollarSign, FileCheck, Gauge, Coins, Network, FileSignature, FileSearch, Workflow, BarChart3, ShieldAlert, Leaf, Truck, Landmark } from 'lucide-react';
import { demoMode, repository, proRepository, enterpriseModulesEnabled } from './data';
import type { ProStatusDTO } from '@jobtrack/contract';
import { ApiError } from './transport';
import { duplicate, type Application, type Interview, type Status } from './domain';
import { Button, Dialog, Empty, Logo } from './components/ui';
import { ApplicationForm, InterviewForm } from './components/forms';
import Dashboard from './views/Dashboard';
import Applications, { initialFilters } from './views/Applications';
import Detail from './views/Detail';
import Auth from './views/Auth';
import PasswordRecovery from './views/PasswordRecovery';
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
import PasswordSecurityModal from './components/PasswordSecurityModal';
import { HeadhunterCrmModal, SystemDesignStudioModal, EquityLiquidityModal, BackchannelIntelModal, ExecutiveContractGuardModal, ExecutiveOnboardingModal, BoardAdvisoryNexusModal, ExecutiveSeveranceGuardModal, TechnicalDueDiligenceStudioModal, OrgTopologyStudioModal, ValueStreamStudioModal, CloudFinopsStudioModal, AiGovernanceStudioModal, SuccessionPipelineStudioModal, CyberRiskGovernanceStudioModal, EsgSustainabilityStudioModal, SupplyChainResilienceStudioModal, WorkforceTotalRewardsStudioModal, CorporateTreasuryNexusModal, InternalAuditErmNexusModal, LegalOperationsNexusModal, InvestorRelationsNexusModal, CorpDevPmiNexusModal, GlobalTradeSanctionsNexusModal, StrategicCommsCrisisNexusModal, ShareholderActivismDefenseNexusModal, AntitrustCompetitionNexusModal, PrivacyDataSovereigntyNexusModal } from './components/enterprise';
import Sidebar from './components/Sidebar';
import MobileDrawer from './components/MobileDrawer';
import SettingsView from './views/SettingsView';
import type { FeatureKey } from './features';
import { applyPreferences, readPreferences } from './preferences';

function readRoute() {
  const [page, id, tab] = location.hash.slice(1).split('/');
  const rawPage = page || (demoMode ? 'dashboard' : 'auth');
  const queryStart = rawPage.indexOf('?');
  const cleanPage = queryStart === -1 ? rawPage : rawPage.slice(0, queryStart);
  const authError = queryStart === -1 ? '' : new URLSearchParams(rawPage.slice(queryStart + 1)).get('error') || '';
  return { page: cleanPage, id: id || '', authError, tab: tab === 'interviews' ? 'interviews' as const : tab === 'ai' ? 'ai' as const : 'info' as const };
}

function readResetToken(): { active: boolean; token: string | null } {
  const hash = location.hash.slice(1);
  if (hash === 'forgot-password') return { active: true, token: null };
  if (!hash.startsWith('reset-password')) return { active: false, token: null };
  const queryStart = hash.indexOf('?');
  if (queryStart === -1) return { active: true, token: null };
  const params = new URLSearchParams(hash.slice(queryStart + 1));
  return { active: true, token: params.get('token') };
}

export default function JobTrack() {
  const [route, setRoute] = useState(readRoute);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      if (typeof localStorage === 'undefined') return true;
      const stored = localStorage.getItem('jobtrack.sidebar.pinned');
      if (stored !== null) return stored !== '1';
      return true;
    } catch {
      return true;
    }
  });
  const toggleSidebar = () => {
    setSidebarCollapsed(current => {
      const next = !current;
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem('jobtrack.sidebar.pinned', next ? '0' : '1');
      } catch {
      }
      return next;
    });
  };
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
  const [passwordModal, setPasswordModal] = useState(false);
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
  const [aiGovernanceStudioModal, setAiGovernanceStudioModal] = useState(false);
  const [successionStudioModal, setSuccessionStudioModal] = useState(false);
  const [cyberRiskStudioModal, setCyberRiskStudioModal] = useState(false);
  const [esgStudioModal, setEsgStudioModal] = useState(false);
  const [supplyChainStudioModal, setSupplyChainStudioModal] = useState(false);
  const [totalRewardsStudioModal, setTotalRewardsStudioModal] = useState(false);
  const [corporateTreasuryModal, setCorporateTreasuryModal] = useState(false);
  const [internalAuditErmModal, setInternalAuditErmModal] = useState(false);
  const [legalOperationsModal, setLegalOperationsModal] = useState(false);
  const [investorRelationsModal, setInvestorRelationsModal] = useState(false);
  const [corpDevModal, setCorpDevModal] = useState(false);
  const [tradeSanctionsModal, setTradeSanctionsModal] = useState(false);
  const [commsCrisisModal, setCommsCrisisModal] = useState(false);
  const [shareholderActivismModal, setShareholderActivismModal] = useState(false);
  const [antitrustModal, setAntitrustModal] = useState(false);
  const [privacyNexusModal, setPrivacyNexusModal] = useState(false);
  const [targetCompanyName, setTargetCompanyName] = useState('FPT Software');
  const [proStatus, setProStatus] = useState<ProStatusDTO | null>(null);
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null);
  const [drawer, setDrawer] = useState(false);
  const request = useRef(0);
  const headingRef = useRef<HTMLElement>(null);
  const selected = apps.find(app => app.id === route.id);
  const isApplications = ['applications', 'application'].includes(route.page);
  const notify = (message: string, isError = false) => setToast({ message, error: isError });
  const navigate = (hash: string) => { location.hash = hash; };

  const openFeature = (key: FeatureKey) => {
    if (key === 'contacts') setContactsModal(true);
    else if (key === 'email') setEmailModal(true);
    else if (key === 'outreach') setOutreachModal(true);
    else if (key === 'decision') setDecisionModal(true);
    else if (key === 'company') { setTargetCompanyName(apps[0]?.company || 'FPT Software'); setCompanyModal(true); }
    else if (key === 'resume') setResumeModal(true);
    else if (key === 'resumeOptimizer') setResumeOptimizerModal(true);
    else if (key === 'simulation') setSimulationModal(true);
    else if (key === 'trajectory') setCareerTrajectoryModal(true);
    else if (key === 'velocity') setPipelineVelocityModal(true);
    else if (key === 'culture') setCultureRadarModal(true);
    else if (key === 'compensation') setCompensationModal(true);
    else if (key === 'dossier') setDossierModal(true);
    else if (key === 'radar') setRadarModal(true);
    else if (key === 'headhunter') setHeadhunterCrmModal(true);
    else if (key === 'systemDesign') setSystemDesignStudioModal(true);
    else if (key === 'equity') setEquityLiquidityModal(true);
    else if (key === 'backchannel') setBackchannelIntelModal(true);
    else if (key === 'executiveContract') setExecutiveContractModal(true);
    else if (key === 'executiveOnboarding') setExecutiveOnboardingModal(true);
    else if (key === 'board') setBoardAdvisoryModal(true);
    else if (key === 'severance') setExecutiveSeveranceModal(true);
    else if (key === 'dueDiligence') setTechnicalDueDiligenceModal(true);
    else if (key === 'orgTopology') setOrgTopologyStudioModal(true);
    else if (key === 'valueStream') setValueStreamStudioModal(true);
    else if (key === 'finops') setCloudFinopsStudioModal(true);
    else if (key === 'aiGovernance') setAiGovernanceStudioModal(true);
    else if (key === 'succession') setSuccessionStudioModal(true);
    else if (key === 'cyberRisk') setCyberRiskStudioModal(true);
    else if (key === 'esg') setEsgStudioModal(true);
    else if (key === 'supplyChain') setSupplyChainStudioModal(true);
    else if (key === 'totalRewards') setTotalRewardsStudioModal(true);
    else if (key === 'treasury') setCorporateTreasuryModal(true);
    else if (key === 'internalAudit') setInternalAuditErmModal(true);
    else if (key === 'legal') setLegalOperationsModal(true);
    else if (key === 'investorRelations') setInvestorRelationsModal(true);
    else if (key === 'corpDev') setCorpDevModal(true);
    else if (key === 'tradeSanctions') setTradeSanctionsModal(true);
    else if (key === 'commsCrisis') setCommsCrisisModal(true);
    else if (key === 'activism') setShareholderActivismModal(true);
    else if (key === 'antitrust') setAntitrustModal(true);
    else if (key === 'privacy') setPrivacyNexusModal(true);
  };
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
    applyPreferences(readPreferences());
  }, []);

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
    document.title = `${route.page === 'dashboard' ? 'Tổng quan' : route.page === 'analytics' ? 'Phân tích & Hiệu suất' : route.page === 'roadmap' ? 'Lộ trình Sự nghiệp AI' : route.page === 'datasets' ? 'Dữ liệu Web · PageWeave' : route.page === 'interviews' ? 'Lịch phỏng vấn' : route.page === 'settings' ? 'Cài đặt' : route.page === 'auth' ? 'Đăng nhập' : selected?.position || 'Hồ sơ ứng tuyển'} · JobTrack`;
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
  const navigation = <><a href="#dashboard" className={route.page === 'dashboard' ? 'active' : ''} aria-current={route.page === 'dashboard' ? 'page' : undefined}><LayoutDashboard size={19} /><span>Tổng quan</span></a><a href="#applications" className={isApplications ? 'active' : ''} aria-current={isApplications ? 'page' : undefined}><BriefcaseBusiness size={19} /><span>Hồ sơ ứng tuyển</span>{apps.length > 0 && <small>{apps.length}</small>}</a><a href="#interviews" className={route.page === 'interviews' ? 'active' : ''} aria-current={route.page === 'interviews' ? 'page' : undefined}><CalendarDays size={19} /><span>Lịch phỏng vấn</span>{upcomingInterviewsCount > 0 && <small>{upcomingInterviewsCount}</small>}</a><a href="#analytics" className={route.page === 'analytics' ? 'active' : ''} aria-current={route.page === 'analytics' ? 'page' : undefined}><TrendingUp size={19} /><span>Phân tích</span></a><a href="#roadmap" className={route.page === 'roadmap' ? 'active' : ''} aria-current={route.page === 'roadmap' ? 'page' : undefined}><Compass size={19} /><span>Lộ trình AI</span></a><a href="#datasets" className={route.page === 'datasets' ? 'active' : ''} aria-current={route.page === 'datasets' ? 'page' : undefined}><Database size={19} /><span>Dữ liệu Web</span></a><a href="#settings" className={route.page === 'settings' ? 'active' : ''} aria-current={route.page === 'settings' ? 'page' : undefined}><Settings size={19} /><span>Cài đặt</span></a></>;
  const mobileNavigation = <><a href="#dashboard" className={route.page === 'dashboard' ? 'active' : ''} aria-current={route.page === 'dashboard' ? 'page' : undefined}><LayoutDashboard size={21} /><span>Tổng quan</span></a><a href="#applications" className={isApplications ? 'active' : ''} aria-current={isApplications ? 'page' : undefined}><BriefcaseBusiness size={21} /><span>Hồ sơ</span></a><button onClick={() => setForm('new')}><Plus size={21} /><span>Thêm mới</span></button><a href="#interviews" className={route.page === 'interviews' ? 'active' : ''} aria-current={route.page === 'interviews' ? 'page' : undefined}><CalendarDays size={21} /><span>Lịch</span></a><button onClick={() => setDrawer(true)} aria-expanded={drawer} aria-haspopup="dialog"><Menu size={21} /><span>Thêm</span></button></>;
  const recovery = readResetToken();
  return <div className="jobtrack"><a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); headingRef.current?.focus(); }}>Đến nội dung chính</a>{recovery.active ? <PasswordRecovery token={recovery.token || undefined} onDone={() => { location.hash = 'auth'; setRoute(readRoute()); }} /> : route.page === 'auth' || authState === 'unauthenticated' ? <Auth onEnter={user => handleLoginSuccess(user)} errorCode={route.authError} onForgot={() => { location.hash = 'forgot-password'; setRoute(readRoute()); }} /> : <div className={`app-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
    <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} navigation={navigation} enterpriseEnabled={enterpriseModulesEnabled} accountEmail={accountEmail} isPro={Boolean(proStatus?.isPro)} onAccount={() => setAccount(true)} onUpgrade={() => setProModal(true)} onTrash={() => setTrashModal(true)} onFeature={openFeature} />
    <div className="workspace"><header className="topbar"><div className="mobile-brand"><Logo /></div><div className="breadcrumb"><span>Không gian cá nhân</span><span>/</span><strong>{route.page === 'dashboard' ? 'Tổng quan' : route.page === 'analytics' ? 'Phân tích & Hiệu suất' : route.page === 'roadmap' ? 'Lộ trình Kỹ năng & Sự nghiệp AI' : route.page === 'datasets' ? 'Dữ liệu Web (PageWeave)' : route.page === 'interviews' ? 'Lịch phỏng vấn' : route.page === 'settings' ? 'Cài đặt' : 'Hồ sơ ứng tuyển'}</strong></div><div className="topbar-account">{proStatus?.isPro ? <span className="pro-pill-badge" onClick={() => setProModal(true)} style={{ cursor: 'pointer', marginRight: '8px' }}><Crown size={12} />PRO</span> : <button className="pro-upgrade-nav-btn" onClick={() => setProModal(true)} style={{ marginRight: '8px' }}><Crown size={14} />Nâng cấp Pro</button>}{demoMode && <span className="demo-label"><span />Dữ liệu mẫu</span>}<button className="avatar" aria-label="Mở tài khoản" onClick={() => setAccount(true)}>{demoMode ? 'NT' : 'TK'}</button></div></header>
    <main id="main-content" ref={headingRef} tabIndex={-1} aria-busy={loading || busy}>{loading ? <div className="loading-state" role="status"><LoaderCircle className="spin" size={24} /><p>Đang tải hồ sơ…</p><div className="skeleton-grid"><span /><span /><span /></div></div> : authState === 'error' ? <Empty title="Chưa kết nối được máy chủ" action={<div className="empty-actions"><Button onClick={() => void bootstrap()}>Thử lại</Button></div>}>{error}</Empty> : error ? <Empty title="Chưa tải được hồ sơ" action={<div className="empty-actions"><Button onClick={() => { setLoading(true); void refresh(); }}>Thử lại</Button>{demoMode ? <Button kind="secondary" onClick={() => setReset(true)}>Khôi phục dữ liệu mẫu</Button> : <Button kind="secondary" onClick={() => navigate('auth')}>Đăng nhập lại</Button>}</div>}>{error}</Empty> : route.page === 'dashboard' ? <Dashboard apps={apps} onAction={setActionApp} onOpen={open} onAdd={() => setForm('new')} onList={() => navigate('applications')} onImport={() => setImportModal(true)} /> : route.page === 'analytics' ? <AnalyticsView apps={apps} onOpen={open} notify={notify} /> : route.page === 'roadmap' ? <CareerRoadmapView apps={apps} onOpen={open} notify={notify} /> : route.page === 'datasets' ? <DatasetsView notify={notify} /> : route.page === 'interviews' ? <InterviewsView apps={apps} onOpen={open} notify={notify} /> : route.page === 'settings' ? <SettingsView apps={apps} accountEmail={accountEmail} proStatus={proStatus} notify={notify} onProfile={() => setProfileModal(true)} onSecurity={() => setPasswordModal(true)} onGrants={() => setGrantsModal(true)} onTrash={() => setTrashModal(true)} onUpgrade={() => setProModal(true)} onResumes={() => setResumeModal(true)} /> : route.page === 'applications' ? <Applications apps={apps} filters={filters} onFilters={setFilters} onOpen={open} onAdd={() => setForm('new')} onImport={() => setImportModal(true)} onDecisionMatrix={() => setDecisionModal(true)} onRefresh={refresh} notify={notify} /> : route.page === 'application' && selected ? <Detail app={selected} allOffers={apps.filter(a => a.status === 'Offer')} tab={route.tab} busy={busy} onTab={tab => open(selected, tab)} onBack={() => navigate('applications')} onEdit={() => setForm('edit')} onAction={() => setActionApp(selected)} onInterview={round => setInterview(round || null)} onDelete={() => setDeletion({ app: selected })} onDeleteInterview={round => setDeletion({ app: selected, round })} onStatus={status => void changeStatus(status)} notify={notify} /> : <Empty title="Không tìm thấy hồ sơ" action={<Button onClick={() => navigate('applications')}>Về danh sách</Button>}>Hồ sơ có thể đã bị xóa hoặc đường dẫn chưa đúng.</Empty>}<footer className="workspace-footer"><span>JobTrack<span className="footer-dot" />Mỗi cơ hội, một bước tiến.</span>{demoMode && <span>Dữ liệu mẫu · lưu trên trình duyệt này</span>}</footer></main></div>
    <nav className="bottom-nav" aria-label="Điều hướng mobile">{mobileNavigation}</nav>
  </div>}
  {actionApp && <QuickAction app={actionApp} onClose={() => setActionApp(null)} onSaved={() => { setActionApp(null); void refresh(); notify('Đã cập nhật bước tiếp theo.'); }} />}
  {form && <ApplicationForm app={form === 'edit' ? selected : undefined} apps={apps} onClose={() => setForm(null)} onSaved={id => void saved(id)} onOpenExisting={id => { setForm(null); navigate(`application/${id}`); }} onReload={() => { setForm(null); void refresh(); notify('Đã tải bản mới nhất.'); }} />}
  {interview !== undefined && selected && <InterviewForm app={selected} interview={interview || undefined} onClose={() => setInterview(undefined)} onSaved={() => { setInterview(undefined); void refresh(); notify('Đã lưu lịch phỏng vấn.'); }} />}
  {deletion && <Dialog title={deletion.round ? 'Xóa vòng phỏng vấn?' : 'Chuyển vào thùng rác?'} onClose={() => setDeletion(null)} busy={busy}><div className="dialog-body"><span className="delete-icon"><Trash2 size={27} /></span><h3>{deletion.round?.title || deletion.app.position}</h3><p className="delete-description">{deletion.round ? 'Chỉ xóa vòng phỏng vấn này. Hồ sơ ứng tuyển vẫn được giữ lại.' : `Chuyển hồ sơ tại ${deletion.app.company} và ${deletion.app.interviews.length} vòng phỏng vấn liên quan vào thùng rác.`}</p><p className={deletion.round ? 'danger-text' : 'muted-text'}>{deletion.round ? 'Không thể khôi phục sau khi xóa.' : 'Bạn có thể khôi phục lại bất kỳ lúc nào từ Thùng rác.'}</p></div><footer className="dialog-actions"><Button kind="secondary" disabled={busy} onClick={() => setDeletion(null)}>Giữ lại</Button><Button kind={deletion.round ? 'danger' : 'primary'} disabled={busy} onClick={() => void remove()}>{busy ? 'Đang chuyển…' : deletion.round ? 'Xóa phỏng vấn' : 'Bỏ vào thùng rác'}</Button></footer></Dialog>}
  {account && <Dialog title="Không gian của bạn" onClose={() => setAccount(false)}><div className="dialog-body"><div className="account-summary"><span className="avatar">{demoMode ? 'NT' : 'TK'}</span><div><h3>{demoMode ? 'Nhật Tân' : 'Tài khoản'}</h3><p>{demoMode ? 'Đang khám phá với dữ liệu mẫu.' : accountEmail || 'Không gian ứng tuyển cá nhân.'}</p></div></div><Button kind="secondary" onClick={() => { setAccount(false); navigate('settings'); }}><Settings size={16} />Cài đặt & tuỳ chọn</Button><Button kind="secondary" onClick={() => { setAccount(false); setProModal(true); }}><Crown size={16} className="text-amber-500" />{proStatus?.isPro ? 'Quản lý gói Pro' : 'Nâng cấp JobTrack Pro'}</Button><Button kind="secondary" className="account-resume-btn" onClick={() => { setAccount(false); setResumeModal(true); }}><FileText size={16} />Quản lý phiên bản CV (ATS)</Button><Button kind="secondary" onClick={() => { setAccount(false); setProfileModal(true); }}><UserCheck size={16} />Hồ sơ ứng viên cá nhân</Button><Button kind="secondary" onClick={() => { setAccount(false); setGrantsModal(true); }}><KeyRound size={16} />Kết nối AI & MCP</Button><Button kind="secondary" onClick={() => { setAccount(false); setPasswordModal(true); }}><KeyRound size={16} />Đổi mật khẩu & phiên</Button>{demoMode && <Button kind="secondary" onClick={() => { setAccount(false); setReset(true); }}><RotateCcw size={16} />Khôi phục dữ liệu mẫu</Button>}<Button kind="ghost" onClick={() => void logout()}><LogOut size={17} />Đăng xuất</Button></div></Dialog>}
  {proModal && <ProUpgradeModal onClose={() => setProModal(false)} onSuccess={status => setProStatus(status)} notify={notify} />}
  {passwordModal && <PasswordSecurityModal onClose={() => setPasswordModal(false)} notify={notify} onAccountDeleted={() => { setPasswordModal(false); setApps([]); setAccountEmail(''); setCurrentUserId(null); setAuthState('unauthenticated'); navigate('auth'); }} />}
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
  {enterpriseModulesEnabled && <Suspense fallback={null}>
    {enterpriseModulesEnabled && headhunterCrmModal && <HeadhunterCrmModal applications={apps} onClose={() => setHeadhunterCrmModal(false)} onApplicationCreated={refresh} notify={notify} />}
    {enterpriseModulesEnabled && systemDesignStudioModal && <SystemDesignStudioModal onClose={() => setSystemDesignStudioModal(false)} notify={notify} />}
    {enterpriseModulesEnabled && equityLiquidityModal && <EquityLiquidityModal isOpen={equityLiquidityModal} onClose={() => setEquityLiquidityModal(false)} defaultCompany={apps[0]?.company} defaultRole={apps[0]?.position} />}
    {enterpriseModulesEnabled && backchannelIntelModal && <BackchannelIntelModal isOpen={backchannelIntelModal} onClose={() => setBackchannelIntelModal(false)} />}
    {enterpriseModulesEnabled && executiveContractModal && <ExecutiveContractGuardModal isOpen={executiveContractModal} onClose={() => setExecutiveContractModal(false)} />}
    {enterpriseModulesEnabled && executiveOnboardingModal && <ExecutiveOnboardingModal isOpen={executiveOnboardingModal} onClose={() => setExecutiveOnboardingModal(false)} defaultCompany={apps[0]?.company} defaultRole={apps[0]?.position} />}
    {enterpriseModulesEnabled && boardAdvisoryModal && <BoardAdvisoryNexusModal isOpen={boardAdvisoryModal} onClose={() => setBoardAdvisoryModal(false)} />}
    {enterpriseModulesEnabled && executiveSeveranceModal && <ExecutiveSeveranceGuardModal isOpen={executiveSeveranceModal} onClose={() => setExecutiveSeveranceModal(false)} />}
    {enterpriseModulesEnabled && technicalDueDiligenceModal && <TechnicalDueDiligenceStudioModal isOpen={technicalDueDiligenceModal} onClose={() => setTechnicalDueDiligenceModal(false)} />}
    {enterpriseModulesEnabled && orgTopologyStudioModal && <OrgTopologyStudioModal isOpen={orgTopologyStudioModal} onClose={() => setOrgTopologyStudioModal(false)} />}
    {enterpriseModulesEnabled && valueStreamStudioModal && <ValueStreamStudioModal isOpen={valueStreamStudioModal} onClose={() => setValueStreamStudioModal(false)} />}
    {enterpriseModulesEnabled && cloudFinopsStudioModal && <CloudFinopsStudioModal isOpen={cloudFinopsStudioModal} onClose={() => setCloudFinopsStudioModal(false)} />}
    {enterpriseModulesEnabled && aiGovernanceStudioModal && <AiGovernanceStudioModal isOpen={aiGovernanceStudioModal} onClose={() => setAiGovernanceStudioModal(false)} />}
    {enterpriseModulesEnabled && successionStudioModal && <SuccessionPipelineStudioModal isOpen={successionStudioModal} onClose={() => setSuccessionStudioModal(false)} />}
    {enterpriseModulesEnabled && cyberRiskStudioModal && <CyberRiskGovernanceStudioModal isOpen={cyberRiskStudioModal} onClose={() => setCyberRiskStudioModal(false)} />}
    {enterpriseModulesEnabled && esgStudioModal && <EsgSustainabilityStudioModal isOpen={esgStudioModal} onClose={() => setEsgStudioModal(false)} />}
    {enterpriseModulesEnabled && supplyChainStudioModal && <SupplyChainResilienceStudioModal isOpen={supplyChainStudioModal} onClose={() => setSupplyChainStudioModal(false)} />}
    {enterpriseModulesEnabled && totalRewardsStudioModal && <WorkforceTotalRewardsStudioModal isOpen={totalRewardsStudioModal} onClose={() => setTotalRewardsStudioModal(false)} />}
    {enterpriseModulesEnabled && corporateTreasuryModal && <CorporateTreasuryNexusModal isOpen={corporateTreasuryModal} onClose={() => setCorporateTreasuryModal(false)} />}
    {enterpriseModulesEnabled && internalAuditErmModal && <InternalAuditErmNexusModal isOpen={internalAuditErmModal} onClose={() => setInternalAuditErmModal(false)} />}
    {enterpriseModulesEnabled && legalOperationsModal && <LegalOperationsNexusModal isOpen={legalOperationsModal} onClose={() => setLegalOperationsModal(false)} />}
    {enterpriseModulesEnabled && investorRelationsModal && <InvestorRelationsNexusModal isOpen={investorRelationsModal} onClose={() => setInvestorRelationsModal(false)} />}
    {enterpriseModulesEnabled && corpDevModal && <CorpDevPmiNexusModal isOpen={corpDevModal} onClose={() => setCorpDevModal(false)} />}
    {enterpriseModulesEnabled && tradeSanctionsModal && <GlobalTradeSanctionsNexusModal isOpen={tradeSanctionsModal} onClose={() => setTradeSanctionsModal(false)} />}
    {enterpriseModulesEnabled && commsCrisisModal && <StrategicCommsCrisisNexusModal isOpen={commsCrisisModal} onClose={() => setCommsCrisisModal(false)} />}
    {enterpriseModulesEnabled && shareholderActivismModal && <ShareholderActivismDefenseNexusModal isOpen={shareholderActivismModal} onClose={() => setShareholderActivismModal(false)} />}
    {enterpriseModulesEnabled && antitrustModal && <AntitrustCompetitionNexusModal isOpen={antitrustModal} onClose={() => setAntitrustModal(false)} />}
    {enterpriseModulesEnabled && privacyNexusModal && <PrivacyDataSovereigntyNexusModal isOpen={privacyNexusModal} onClose={() => setPrivacyNexusModal(false)} />}
  </Suspense>}
  {authState === 'authenticated' && <ChatWidget onRefreshApps={() => void refresh()} onNavigate={navigate} />}
  <MobileDrawer open={drawer} onClose={() => setDrawer(false)} onFeature={openFeature} onSettings={() => { navigate('settings'); }} enterpriseEnabled={enterpriseModulesEnabled} />
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
