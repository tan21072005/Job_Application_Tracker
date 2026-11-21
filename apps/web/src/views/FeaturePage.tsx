import type { Application } from '../domain';
import type { FeatureKey } from '../features';
import { featureGroups } from '../features';
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
import { SubscriptionsModal } from '../components/SubscriptionsModal';

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
  dossier: 'Hồ sơ bảo chứng',
  radar: 'Rada việc làm'
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
  featureKey, apps, notify, onBack, onRefresh
}: {
  featureKey: FeatureKey;
  apps: Application[];
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
      {featureKey === 'radar' && <SubscriptionsModal isOpen onClose={onBack} onScanCompleted={onRefresh} />}
    </div>
  );
}
