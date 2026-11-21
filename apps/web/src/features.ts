import {
  Building2, CircleDollarSign, Cpu, FileCheck, FileText, Gauge, Mail, Radar, Scale, Send, ShieldCheck,
  Users, type LucideIcon
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
  | 'velocity'
  | 'compensation'
  | 'dossier'
  | 'radar';

export type FeatureItem = {
  label: string;
  icon: LucideIcon;
  key: FeatureKey;
  className?: string;
};

export type FeatureGroup = {
  id: 'work' | 'prepare' | 'discover';
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
    { label: 'Thư viện CV', icon: FileText, key: 'resume', className: 'resume-manager-sidebar-btn' },
    { label: 'Tối ưu hóa ATS', icon: FileCheck, key: 'resumeOptimizer', className: 'resume-optimizer-sidebar-btn' },
    { label: 'Giả lập phỏng vấn', icon: Cpu, key: 'simulation', className: 'simulation-studio-sidebar-btn' },
    { label: 'Tốc độ & Điểm nghẽn', icon: Gauge, key: 'velocity', className: 'pipeline-velocity-sidebar-btn' },
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
];
