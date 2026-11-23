import {
  Building2, Cpu, FileCheck, FileText, Mail, Scale, ShieldCheck,
  Users, type LucideIcon
} from 'lucide-react';

export type FeatureKey =
  | 'contacts'
  | 'email'
  | 'decision'
  | 'company'
  | 'resume'
  | 'resumeOptimizer'
  | 'simulation'
  | 'dossier';


export type FeatureItem = {
  label: string;
  icon: LucideIcon;
  key: FeatureKey;
  className?: string;
};

export type FeatureGroup = {
  id: 'work' | 'prepare';
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
    { label: 'Hồ sơ bảo chứng', icon: ShieldCheck, key: 'dossier', className: 'dossier-sidebar-btn' },
    ]
  },
];
