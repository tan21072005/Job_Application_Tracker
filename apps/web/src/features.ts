import {
  BarChart3, BriefcaseBusiness, Building2, CircleDollarSign, Coins, Compass, Cpu, FileCheck, FileSearch,
  FileSignature, FileText, Gauge, Landmark, Leaf, Mail, Network, Radar, Scale, Send, ShieldAlert, ShieldCheck,
  TrendingUp, Truck, UserCheck, Users, Workflow, type LucideIcon
} from 'lucide-react';

export type FeatureKey =
  | 'contacts'
  | 'email'
  | 'outreach'
  | 'decision'
  | 'company'
  | 'resume'
  | 'resumeOptimizer'
  | 'simulation'
  | 'trajectory'
  | 'velocity'
  | 'culture'
  | 'compensation'
  | 'dossier'
  | 'radar'
  | 'headhunter'
  | 'systemDesign'
  | 'equity'
  | 'backchannel'
  | 'executiveContract'
  | 'executiveOnboarding'
  | 'board'
  | 'severance'
  | 'dueDiligence'
  | 'orgTopology'
  | 'valueStream'
  | 'finops'
  | 'aiGovernance'
  | 'succession'
  | 'cyberRisk'
  | 'esg'
  | 'supplyChain'
  | 'totalRewards'
  | 'treasury'
  | 'internalAudit'
  | 'legal'
  | 'investorRelations'
  | 'corpDev'
  | 'tradeSanctions'
  | 'commsCrisis'
  | 'activism'
  | 'antitrust'
  | 'privacy';

export type FeatureItem = {
  label: string;
  icon: LucideIcon;
  key: FeatureKey;
  className?: string;
};

export type FeatureGroup = {
  id: 'work' | 'prepare' | 'discover' | 'enterprise';
  label: string;
  items: FeatureItem[];
};

export const featureGroups: FeatureGroup[] = [
  {
    id: 'work',
    label: 'Làm việc',
    items: [
    { label: 'Mạng lưới kết nối', icon: Users, key: 'contacts', className: 'networking-contacts-sidebar-btn' },
    { label: 'Hộp thư thông minh', icon: Mail, key: 'email', className: 'email-ingest-sidebar-btn' },
    { label: 'Chiến dịch Outreach', icon: Send, key: 'outreach', className: 'outreach-campaigns-sidebar-btn' },
    { label: 'So sánh cơ hội', icon: Scale, key: 'decision', className: 'decision-matrix-sidebar-btn' },
    { label: 'Hồ sơ công ty', icon: Building2, key: 'company', className: 'company-explorer-sidebar-btn' },
    ]
  },
  {
    id: 'prepare',
    label: 'Chuẩn bị',
    items: [
    { label: 'Kho CV & May đo', icon: FileText, key: 'resume', className: 'resume-manager-sidebar-btn' },
    { label: 'Tối ưu hóa ATS', icon: FileCheck, key: 'resumeOptimizer', className: 'resume-optimizer-sidebar-btn' },
    { label: 'Giả lập phỏng vấn', icon: Cpu, key: 'simulation', className: 'simulation-studio-sidebar-btn' },
    { label: 'Lộ trình thăng tiến', icon: Compass, key: 'trajectory', className: 'career-trajectory-sidebar-btn' },
    { label: 'Tốc độ & Điểm nghẽn', icon: Gauge, key: 'velocity', className: 'pipeline-velocity-sidebar-btn' },
    { label: 'Radar Văn hóa', icon: Compass, key: 'culture', className: 'culture-radar-sidebar-btn' },
    { label: 'Dự báo thu nhập & ESOP', icon: CircleDollarSign, key: 'compensation', className: 'compensation-forecaster-sidebar-btn' },
    { label: 'Hồ sơ bảo chứng', icon: ShieldCheck, key: 'dossier', className: 'dossier-sidebar-btn' },
    ]
  },
  {
    id: 'discover',
    label: 'Khám phá',
    items: [
    { label: 'Rada việc làm', icon: Radar, key: 'radar' },
    ]
  },
  {
    id: 'enterprise',
    label: 'Doanh nghiệp',
    items: [
    { label: 'Headhunter & Độc quyền', icon: UserCheck, key: 'headhunter', className: 'headhunter-crm-sidebar-btn' },
    { label: 'System Design AI', icon: Cpu, key: 'systemDesign', className: 'system-design-studio-sidebar-btn' },
    { label: 'Định giá Cổ phần & Exit', icon: Coins, key: 'equity', className: 'equity-liquidity-sidebar-btn' },
    { label: 'Backchannel & Bảo chứng', icon: Network, key: 'backchannel', className: 'backchannel-sidebar-btn' },
    { label: 'Hợp đồng & Sa thải', icon: FileSignature, key: 'executiveContract', className: 'executive-contract-guard-sidebar-btn' },
    { label: '100 Ngày Đầu tiên (C-Level)', icon: Compass, key: 'executiveOnboarding', className: 'executive-onboarding-sidebar-btn' },
    { label: 'Hội đồng & Cố vấn (Board)', icon: Scale, key: 'board', className: 'board-advisory-nexus-sidebar-btn' },
    { label: 'Bảo vệ Thôi việc (Severance)', icon: ShieldCheck, key: 'severance', className: 'executive-severance-sidebar-btn' },
    { label: 'Thẩm định Kỹ thuật (M&A VDD)', icon: FileSearch, key: 'dueDiligence', className: 'technical-due-diligence-sidebar-btn' },
    { label: 'Org Topology & Nhân sự', icon: Workflow, key: 'orgTopology', className: 'org-topology-studio-sidebar-btn' },
    { label: 'Value Stream & DORA Studio', icon: BarChart3, key: 'valueStream', className: 'value-stream-studio-sidebar-btn' },
    { label: 'FinOps & Cloud Unit Economics', icon: CircleDollarSign, key: 'finops', className: 'finops-studio-sidebar-btn' },
    { label: 'AI Governance & LLM Studio', icon: ShieldAlert, key: 'aiGovernance', className: 'ai-gov-studio-sidebar-btn' },
    { label: 'Succession & 9-Box Studio', icon: Users, key: 'succession', className: 'succession-studio-sidebar-btn' },
    { label: 'Cyber Risk & CISO Studio', icon: ShieldCheck, key: 'cyberRisk', className: 'cyber-studio-sidebar-btn' },
    { label: 'ESG & Climate Studio', icon: Leaf, key: 'esg', className: 'esg-studio-sidebar-btn' },
    { label: 'Supply Chain Resilience', icon: Truck, key: 'supplyChain', className: 'sc-studio-sidebar-btn' },
    { label: 'Total Rewards & LTI', icon: Coins, key: 'totalRewards', className: 'tr-studio-sidebar-btn' },
    { label: 'Kho bạc & Treasury', icon: Landmark, key: 'treasury', className: 'treasury-nexus-sidebar-btn' },
    { label: 'Kiểm toán & SOX', icon: Scale, key: 'internalAudit', className: 'sox-nexus-sidebar-btn' },
    { label: 'Pháp lý & IP Nexus', icon: BriefcaseBusiness, key: 'legal', className: 'legal-ops-sidebar-btn' },
    { label: 'Quan hệ Nhà đầu tư (IR)', icon: TrendingUp, key: 'investorRelations', className: 'ir-nexus-sidebar-btn' },
    { label: 'M&A & Hậu sáp nhập (PMI)', icon: Compass, key: 'corpDev', className: 'corp-dev-sidebar-btn' },
    { label: 'Xuất nhập khẩu & Trừng phạt (Trade)', icon: ShieldAlert, key: 'tradeSanctions', className: 'global-trade-sanctions-sidebar-btn' },
    { label: 'Khủng hoảng & Truyền thông', icon: ShieldAlert, key: 'commsCrisis', className: 'comms-crisis-sidebar-btn' },
    { label: 'Bảo vệ Cổ đông & Activism', icon: ShieldAlert, key: 'activism', className: 'activism-sidebar-btn' },
    { label: 'Chống độc quyền & M&A (Antitrust)', icon: Scale, key: 'antitrust', className: 'antitrust-sidebar-btn' },
    { label: 'Bảo mật Dữ liệu & AI (Privacy)', icon: ShieldCheck, key: 'privacy', className: 'privacy-sovereignty-sidebar-btn' },
    ]
  }
];
