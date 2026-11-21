import type { Application } from '../domain';
import type { FeatureKey } from '../features';
import { featureGroups } from '../features';
import type { ProStatusDTO } from '@jobtrack/contract';
import { NetworkingContactsModal } from '../components/NetworkingContactsModal';
import { EmailIngestModal } from '../components/EmailIngestModal';
import { OutreachCampaignModal } from '../components/OutreachCampaignModal';
import { DecisionMatrixModal } from '../components/DecisionMatrixModal';
import { CompanyIntelligenceModal } from '../components/CompanyIntelligenceModal';
import { ResumeManagerModal } from '../components/ResumeManagerModal';
import { ResumeOptimizerModal } from '../components/ResumeOptimizerModal';
import { InterviewSimulationModal } from '../components/InterviewSimulationModal';
import { PipelineVelocityModal } from '../components/PipelineVelocityModal';
import { CompensationForecasterModal } from '../components/CompensationForecasterModal';
import { DossierConfigModal } from '../components/DossierConfigModal';
import TrashModal from '../components/TrashModal';
import ProUpgradeModal from '../components/ProUpgradeModal';

export const featureTitles: Record<FeatureKey, string> = {
  contacts: 'Mạng lưới kết nối',
  email: 'Hộp thư thông minh',
  outreach: 'Chiến dịch Outreach',
  decision: 'So sánh cơ hội',
  company: 'Hồ sơ công ty',
  resume: 'Thư viện CV',
  resumeOptimizer: 'Tối ưu hóa ATS',
  simulation: 'Giả lập phỏng vấn',
  velocity: 'Tốc độ & Điểm nghẽn',
  compensation: 'Dự báo thu nhập & ESOP',
  dossier: 'Hồ sơ bảo chứng'
};

export const extraPages: Record<string, string> = {
  trash: 'Thùng rác',
  pro: 'Gói Hội Viên JobTrack Pro'
};

export function featureFromHash(id: string): FeatureKey | null {
  for (const group of featureGroups) {
    for (const item of group.items) {
      if (item.key === id) return item.key;
    }
  }
  return null;
}

export default function FeaturePage({
  featureKey, apps, proStatus, notify, onBack, onRefresh
}: {
  featureKey: FeatureKey;
  apps: Application[];
  proStatus: ProStatusDTO | null;
  notify: (message: string, isError?: boolean) => void;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const companyName = apps[0]?.company || 'FPT Software';

  return (
    <div className="feature-page" data-feature={featureKey}>
      <h1 className="sr-only">{featureTitles[featureKey]}</h1>
      {featureKey === 'contacts' && <NetworkingContactsModal isOpen onClose={onBack} applications={apps} notify={notify} />}
      {featureKey === 'email' && <EmailIngestModal isOpen onClose={onBack} onSuccess={onRefresh} notify={notify} />}
      {featureKey === 'outreach' && <OutreachCampaignModal isOpen onClose={onBack} notify={notify} />}
      {featureKey === 'decision' && <DecisionMatrixModal isOpen onClose={onBack} applications={apps} onRefreshApps={onRefresh} notify={notify} />}
      {featureKey === 'company' && <CompanyIntelligenceModal isOpen companyName={companyName} onClose={onBack} />}
      {featureKey === 'resume' && <ResumeManagerModal isOpen onClose={onBack} />}
      {featureKey === 'resumeOptimizer' && <ResumeOptimizerModal isOpen onClose={onBack} applications={apps} notify={notify} />}
      {featureKey === 'simulation' && <InterviewSimulationModal isOpen onClose={onBack} />}
      {featureKey === 'velocity' && <PipelineVelocityModal applications={apps} onClose={onBack} notify={notify} />}
      {featureKey === 'compensation' && <CompensationForecasterModal isOpen onClose={onBack} initialCompany={companyName} />}
      {featureKey === 'dossier' && <DossierConfigModal isOpen onClose={onBack} />}
    </div>
  );
}

export function ExtraPage({
  page, proStatus, notify, onBack, onRefresh
}: {
  page: string;
  proStatus: ProStatusDTO | null;
  notify: (message: string, isError?: boolean) => void;
  onBack: () => void;
  onRefresh: () => void;
}) {
  if (page === 'trash') {
    return (
      <div className="feature-page" data-feature="trash">
        <h1 className="sr-only">Thùng rác</h1>
        <TrashModal onClose={onBack} onRestored={onRefresh} notify={notify} />
      </div>
    );
  }
  if (page === 'pro') {
    return (
      <div className="feature-page" data-feature="pro">
        <h1 className="sr-only">Gói Hội Viên JobTrack Pro</h1>
        <ProUpgradeModal onClose={onBack} onSuccess={() => { onRefresh(); }} notify={notify} />
      </div>
    );
  }
  return null;
}
