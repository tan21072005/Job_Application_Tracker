import React, { useState, useEffect } from 'react';
import {
  type TechnicalDueDiligenceAuditDTO,
  type DiligenceFindingDTO,
  type ArchitectureTypology,
  type DoraTier,
  generateTechnicalDueDiligenceMemoMarkdown
} from '../domain';
import { technicalDueDiligenceRepository } from '../data';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const TechnicalDueDiligenceStudioModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [audits, setAudits] = useState<TechnicalDueDiligenceAuditDTO[]>([]);
  const [activeAuditId, setActiveAuditId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'arch' | 'licenses' | 'cloud' | 'security' | 'team' | 'memo'>('arch');
  const [findings, setFindings] = useState<DiligenceFindingDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedMemo, setCopiedMemo] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    loadAudits();
  }, [isOpen]);

  useEffect(() => {
    if (!activeAuditId) return;
    loadFindings(activeAuditId);
  }, [activeAuditId]);

  async function loadAudits() {
    setLoading(true);
    const list = await technicalDueDiligenceRepository.listAudits();
    setAudits(list);
    if (list.length > 0) {
      setActiveAuditId(list[0].id);
    }
    setLoading(false);
  }

  async function loadFindings(auditId: string) {
    const list = await technicalDueDiligenceRepository.listFindings(auditId);
    setFindings(list);
  }

  if (!isOpen) return null;

  const currentAudit = audits.find(a => a.id === activeAuditId) || audits[0];
  if (!currentAudit) {
    return (
      <div className="tdd-studio-modal-overlay">
        <div className="tdd-studio-container">
          <div className="tdd-studio-header">
            <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Technical Due Diligence Studio</h2>
            <button className="tdd-studio-close-btn tdd-studio-btn-secondary" onClick={onClose}>✕</button>
          </div>
          <div className="tdd-studio-body">
            <p>Loading diligence audits...</p>
          </div>
        </div>
      </div>
    );
  }

  async function handleUpdateAudit(partial: Partial<TechnicalDueDiligenceAuditDTO>) {
    if (!currentAudit) return;
    const mutation = {
      targetCompanyName: partial.targetCompanyName ?? currentAudit.targetCompanyName,
      dealSizeUsd: partial.dealSizeUsd ?? currentAudit.dealSizeUsd,
      transactionType: partial.transactionType ?? currentAudit.transactionType,
      auditLeadName: partial.auditLeadName ?? currentAudit.auditLeadName,
      auditDate: partial.auditDate ?? currentAudit.auditDate,
      architecture: partial.architecture ?? currentAudit.architecture,
      licenses: partial.licenses ?? currentAudit.licenses,
      cloudEconomics: partial.cloudEconomics ?? currentAudit.cloudEconomics,
      securityCompliance: partial.securityCompliance ?? currentAudit.securityCompliance,
      teamVelocity: partial.teamVelocity ?? currentAudit.teamVelocity,
      executiveSummaryText: partial.executiveSummaryText ?? currentAudit.executiveSummaryText
    };

    const updated = await technicalDueDiligenceRepository.updateAudit(currentAudit.id, mutation);
    if (updated) {
      setAudits(audits.map(a => a.id === updated.id ? updated : a));
    }
  }

  const memoMarkdown = generateTechnicalDueDiligenceMemoMarkdown(currentAudit);

  function getRiskBadgeClass(level: string) {
    switch (level) {
      case 'low': return 'tdd-studio-badge-green';
      case 'moderate': return 'tdd-studio-badge-amber';
      case 'high': return 'tdd-studio-badge-red';
      case 'critical': return 'tdd-studio-badge-critical';
      default: return 'tdd-studio-badge-amber';
    }
  }

  return (
    <div className="tdd-studio-modal-overlay">
      <div className="tdd-studio-container">
        <div className="tdd-studio-header">
          <div className="tdd-studio-title-area">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>⚖️</span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
                  Technical Due Diligence & M&A VDD Studio
                </span>
                <span className={`tdd-studio-badge ${getRiskBadgeClass(currentAudit.scorecard.overallRiskLevel)}`}>
                  {currentAudit.scorecard.overallRiskLevel.toUpperCase()} RISK ({currentAudit.scorecard.compositeRiskIndex}/100)
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                Target: <strong>{currentAudit.targetCompanyName}</strong> | Valuation: ${currentAudit.dealSizeUsd.toLocaleString()} | Lead: {currentAudit.auditLeadName}
              </div>
            </div>
          </div>
          <button className="tdd-studio-close-btn tdd-studio-btn-secondary" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '12px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div className="tdd-studio-input-group" style={{ flex: '1 1 200px' }}>
            <label className="tdd-studio-input-label">Target Company</label>
            <input
              name="targetCompanyName"
              className="tdd-studio-input"
              value={currentAudit.targetCompanyName}
              onChange={e => handleUpdateAudit({ targetCompanyName: e.target.value })}
            />
          </div>
          <div className="tdd-studio-input-group" style={{ flex: '1 1 160px' }}>
            <label className="tdd-studio-input-label">Deal Size (USD)</label>
            <input
              name="dealSizeUsd"
              type="number"
              className="tdd-studio-input"
              value={currentAudit.dealSizeUsd}
              onChange={e => handleUpdateAudit({ dealSizeUsd: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="tdd-studio-input-group" style={{ flex: '1 1 180px' }}>
            <label className="tdd-studio-input-label">Transaction Context</label>
            <select
              className="tdd-studio-select"
              value={currentAudit.transactionType}
              onChange={e => handleUpdateAudit({ transactionType: e.target.value as any })}
            >
              <option value="buy_side_acquisition">Buy-Side M&A Acquisition</option>
              <option value="sell_side_vdd">Sell-Side Vendor Diligence (VDD)</option>
              <option value="growth_equity_pe">Growth Equity / PE Round</option>
              <option value="executive_onboarding_audit">Executive Leadership Onboarding</option>
            </select>
          </div>
          <div className="tdd-studio-input-group" style={{ flex: '1 1 180px' }}>
            <label className="tdd-studio-input-label">Audit Lead</label>
            <input
              className="tdd-studio-input"
              value={currentAudit.auditLeadName}
              onChange={e => handleUpdateAudit({ auditLeadName: e.target.value })}
            />
          </div>
        </div>

        <div className="tdd-studio-tabs-bar">
          <button
            id="tdd-tab-arch"
            className={`tdd-studio-tab-btn ${activeTab === 'arch' ? 'active' : ''}`}
            onClick={() => setActiveTab('arch')}
          >
            🏛️ Architecture & Tech Debt
          </button>
          <button
            id="tdd-tab-licenses"
            className={`tdd-studio-tab-btn ${activeTab === 'licenses' ? 'active' : ''}`}
            onClick={() => setActiveTab('licenses')}
          >
            📜 Open-Source & IP Contagion
          </button>
          <button
            id="tdd-tab-cloud"
            className={`tdd-studio-tab-btn ${activeTab === 'cloud' ? 'active' : ''}`}
            onClick={() => setActiveTab('cloud')}
          >
            ☁️ Cloud COGS & Unit Economics
          </button>
          <button
            id="tdd-tab-security"
            className={`tdd-studio-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            🛡️ Security & Escrow Holdbacks
          </button>
          <button
            id="tdd-tab-team"
            className={`tdd-studio-tab-btn ${activeTab === 'team' ? 'active' : ''}`}
            onClick={() => setActiveTab('team')}
          >
            👥 Team Bus Factor & Velocity
          </button>
          <button
            id="tdd-tab-memo"
            className={`tdd-studio-tab-btn ${activeTab === 'memo' ? 'active' : ''}`}
            onClick={() => setActiveTab('memo')}
          >
            📑 IC Memo & RAG Scorecard
          </button>
        </div>

        <div className="tdd-studio-body">
          {activeTab === 'arch' && (
            <>
              <div className="tdd-studio-grid-4">
                <div className="tdd-studio-card">
                  <div className="tdd-studio-card-header">Typology</div>
                  <select
                    className="tdd-studio-select"
                    value={currentAudit.architecture.typology}
                    onChange={e => handleUpdateAudit({
                      architecture: { ...currentAudit.architecture, typology: e.target.value as ArchitectureTypology }
                    })}
                  >
                    <option value="monolith">Monolith</option>
                    <option value="modular_monolith">Modular Monolith</option>
                    <option value="microservices">Microservices</option>
                    <option value="event_driven">Event-Driven</option>
                    <option value="serverless_hybrid">Serverless Hybrid</option>
                  </select>
                </div>
                <div className="tdd-studio-card">
                  <div className="tdd-studio-card-header">Tech Debt Ratio (TDR)</div>
                  <div className="tdd-studio-stat-number">{currentAudit.architecture.technicalDebtRatio}%</div>
                  <div className="tdd-studio-stat-label">Remediation: ${currentAudit.architecture.technicalDebtRemediationCost.toLocaleString()}</div>
                </div>
                <div className="tdd-studio-card">
                  <div className="tdd-studio-card-header">Disaster Recovery (RTO / RPO)</div>
                  <div className="tdd-studio-stat-number">{currentAudit.architecture.rtoMinutesCurrent}m / {currentAudit.architecture.rpoMinutesCurrent}m</div>
                  <div className="tdd-studio-stat-label">Target: {currentAudit.architecture.rtoMinutesTarget}m / {currentAudit.architecture.rpoMinutesTarget}m</div>
                </div>
                <div className="tdd-studio-card">
                  <div className="tdd-studio-card-header">Scalability Horizon</div>
                  <div className="tdd-studio-stat-number">{currentAudit.architecture.scalabilitySaturationHorizon}x</div>
                  <div className="tdd-studio-stat-label">Peak QPS: {currentAudit.architecture.currentPeakQps} / Max: {currentAudit.architecture.maxDatabaseQps}</div>
                </div>
              </div>

              <div className="tdd-studio-grid-2">
                <div className="tdd-studio-card">
                  <div className="tdd-studio-card-header">Remediation & Sizing Parameters</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="tdd-studio-input-group">
                      <label className="tdd-studio-input-label">Remediation Cost ($)</label>
                      <input
                        type="number"
                        className="tdd-studio-input"
                        value={currentAudit.architecture.technicalDebtRemediationCost}
                        onChange={e => handleUpdateAudit({
                          architecture: { ...currentAudit.architecture, technicalDebtRemediationCost: Number(e.target.value) || 0 }
                        })}
                      />
                    </div>
                    <div className="tdd-studio-input-group">
                      <label className="tdd-studio-input-label">System Replacement Cost ($)</label>
                      <input
                        type="number"
                        className="tdd-studio-input"
                        value={currentAudit.architecture.replacementCostEstimate}
                        onChange={e => handleUpdateAudit({
                          architecture: { ...currentAudit.architecture, replacementCostEstimate: Number(e.target.value) || 1 }
                        })}
                      />
                    </div>
                  </div>
                </div>
                <div className="tdd-studio-card">
                  <div className="tdd-studio-card-header">Traffic & Scalability Limits</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="tdd-studio-input-group">
                      <label className="tdd-studio-input-label">Current Peak QPS</label>
                      <input
                        type="number"
                        className="tdd-studio-input"
                        value={currentAudit.architecture.currentPeakQps}
                        onChange={e => handleUpdateAudit({
                          architecture: { ...currentAudit.architecture, currentPeakQps: Number(e.target.value) || 1 }
                        })}
                      />
                    </div>
                    <div className="tdd-studio-input-group">
                      <label className="tdd-studio-input-label">Max Database QPS</label>
                      <input
                        type="number"
                        className="tdd-studio-input"
                        value={currentAudit.architecture.maxDatabaseQps}
                        onChange={e => handleUpdateAudit({
                          architecture: { ...currentAudit.architecture, maxDatabaseQps: Number(e.target.value) || 1 }
                        })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="tdd-studio-card">
                <div className="tdd-studio-card-header">
                  <span>Identified Single Points of Failure (SPOF) - Criticality Index: {currentAudit.architecture.spofCriticalityIndex}/100</span>
                </div>
                <table className="tdd-studio-table">
                  <thead>
                    <tr>
                      <th>Component</th>
                      <th>Type</th>
                      <th>Severity</th>
                      <th>Redundancy Active</th>
                      <th>Remediation Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentAudit.architecture.identifiedSpofs.map(spof => (
                      <tr key={spof.id}>
                        <td><strong>{spof.component}</strong></td>
                        <td>{spof.type.replace(/_/g, ' ')}</td>
                        <td>
                          <span className={`tdd-studio-badge ${getRiskBadgeClass(spof.severity)}`}>
                            {spof.severity}
                          </span>
                        </td>
                        <td>{spof.redundancyInPlace ? '✅ Yes' : '❌ Singleton'}</td>
                        <td>{spof.remediationEstimateDays} days</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'licenses' && (
            <>
              <div className="tdd-studio-grid-3">
                <div className="tdd-studio-card">
                  <div className="tdd-studio-card-header">Contagion Risk Score</div>
                  <div className="tdd-studio-stat-number">{currentAudit.licenses.openSourceContagionScore} / 100</div>
                  <div className="tdd-studio-stat-label">Copyleft Findings: {currentAudit.licenses.copyleftFindingsCount}</div>
                </div>
                <div className="tdd-studio-card">
                  <div className="tdd-studio-card-header">Total Dependencies</div>
                  <div className="tdd-studio-stat-number">{currentAudit.licenses.dependenciesCount}</div>
                  <div className="tdd-studio-stat-label">Permissive: {currentAudit.licenses.licenseBreakdown.permissiveCount}</div>
                </div>
                <div className="tdd-studio-card">
                  <div className="tdd-studio-card-header">Legal Ring-Fencing</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                    <div>Proprietary Linked with GPL: <strong>{currentAudit.licenses.proprietaryCodeLinkedWithGpl ? '❌ YES (Critical)' : '✅ Clean'}</strong></div>
                    <div>Contractor IP Assigned (CIIAA): <strong>{currentAudit.licenses.contractorAssignmentsComplete ? '✅ Complete' : '⚠️ Deficient'}</strong></div>
                  </div>
                </div>
              </div>

              <div className="tdd-studio-card">
                <div className="tdd-studio-card-header">Flagged Libraries & Copyleft Liabilities</div>
                <table className="tdd-studio-table">
                  <thead>
                    <tr>
                      <th>Package</th>
                      <th>Version</th>
                      <th>License</th>
                      <th>Category</th>
                      <th>Usage Mode</th>
                      <th>Remediation Strategy</th>
                      <th>Remediation Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentAudit.licenses.flaggedLibraries.map(lib => (
                      <tr key={lib.id}>
                        <td><strong>{lib.packageName}</strong></td>
                        <td>{lib.version}</td>
                        <td>{lib.license}</td>
                        <td>
                          <span className={`tdd-studio-badge ${getRiskBadgeClass(lib.riskLevel)}`}>
                            {lib.category.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td>{lib.usageMode.replace(/_/g, ' ')}</td>
                        <td>{lib.remediationStrategy.replace(/_/g, ' ')}</td>
                        <td>${lib.remediationCost.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'cloud' && (
            <>
              <div className="tdd-studio-grid-4">
                <div className="tdd-studio-card">
                  <div className="tdd-studio-card-header">Cloud COGS % of ARR</div>
                  <div id="tdd-cloud-cogs-stat" className="tdd-studio-stat-number">{currentAudit.cloudEconomics.cloudCogsPercentOfArr}%</div>
                  <div className="tdd-studio-stat-label">Spend: ${currentAudit.cloudEconomics.annualCloudSpendTotal.toLocaleString()}</div>
                </div>
                <div className="tdd-studio-card">
                  <div className="tdd-studio-card-header">Current Gross Margin</div>
                  <div className="tdd-studio-stat-number">{currentAudit.cloudEconomics.currentGrossMarginPercent}%</div>
                  <div className="tdd-studio-stat-label">ARR: ${currentAudit.cloudEconomics.annualRecurringRevenue.toLocaleString()}</div>
                </div>
                <div className="tdd-studio-card">
                  <div className="tdd-studio-card-header">Projected Gross Margin</div>
                  <div className="tdd-studio-stat-number" style={{ color: '#16a34a' }}>
                    {currentAudit.cloudEconomics.projectedOptimizedGrossMarginPercent}%
                  </div>
                  <div className="tdd-studio-stat-label">Capture: ${currentAudit.cloudEconomics.finopsOptimizationCaptureEstimate.toLocaleString()}</div>
                </div>
                <div className="tdd-studio-card">
                  <div className="tdd-studio-card-header">Annual Idle Wastage</div>
                  <div className="tdd-studio-stat-number" style={{ color: '#dc2626' }}>
                    ${currentAudit.cloudEconomics.idleResourceWastageAnnual.toLocaleString()}
                  </div>
                  <div className="tdd-studio-stat-label">Commitment Liability: ${currentAudit.cloudEconomics.multiYearCommitmentLiability.toLocaleString()}</div>
                </div>
              </div>

              <div className="tdd-studio-grid-2">
                <div className="tdd-studio-card">
                  <div className="tdd-studio-card-header">Hosting Provider Breakdown</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                    <div>AWS Annual: <strong>${currentAudit.cloudEconomics.spendByProvider.awsAnnual.toLocaleString()}</strong></div>
                    <div>GCP Annual: <strong>${currentAudit.cloudEconomics.spendByProvider.gcpAnnual.toLocaleString()}</strong></div>
                    <div>Azure Annual: <strong>${currentAudit.cloudEconomics.spendByProvider.azureAnnual.toLocaleString()}</strong></div>
                    <div>Other Infra: <strong>${currentAudit.cloudEconomics.spendByProvider.otherInfrastructureAnnual.toLocaleString()}</strong></div>
                  </div>
                </div>
                <div className="tdd-studio-card">
                  <div className="tdd-studio-card-header">FinOps Wastage Breakdown</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                    <div>Idle Compute: <strong>${currentAudit.cloudEconomics.wastageCategories.idleComputeAnnual.toLocaleString()}</strong></div>
                    <div>Unattached Storage: <strong>${currentAudit.cloudEconomics.wastageCategories.unattachedStorageAnnual.toLocaleString()}</strong></div>
                    <div>Unindexed Egress: <strong>${currentAudit.cloudEconomics.wastageCategories.unindexedEgressAnnual.toLocaleString()}</strong></div>
                    <div>Overprovisioned DB: <strong>${currentAudit.cloudEconomics.wastageCategories.overprovisionedDbAnnual.toLocaleString()}</strong></div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'security' && (
            <>
              <div className="tdd-studio-grid-4">
                <div className="tdd-studio-card">
                  <div className="tdd-studio-card-header">Security Maturity (SCMI)</div>
                  <div className="tdd-studio-stat-number">{currentAudit.securityCompliance.securityComplianceMaturityIndex} / 100</div>
                  <div className="tdd-studio-stat-label">Pen-test Recency: {currentAudit.securityCompliance.thirdPartyPenTestRecencyMonths} mos</div>
                </div>
                <div className="tdd-studio-card">
                  <div className="tdd-studio-card-header">Special Escrow Holdback</div>
                  <div id="tdd-escrow-holdback-stat" className="tdd-studio-stat-number" style={{ color: '#2563eb' }}>
                    ${currentAudit.securityCompliance.recommendedSpecialEscrowHoldback.toLocaleString()}
                  </div>
                  <div className="tdd-studio-stat-label">Remediation: ${currentAudit.securityCompliance.remediationCostEstimate.toLocaleString()}</div>
                </div>
                <div className="tdd-studio-card">
                  <div className="tdd-studio-card-header">Certifications</div>
                  <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>SOC 2: <strong>{currentAudit.securityCompliance.soc2Type2Status}</strong></div>
                    <div>ISO 27001: <strong>{currentAudit.securityCompliance.iso27001Status}</strong></div>
                  </div>
                </div>
                <div className="tdd-studio-card">
                  <div className="tdd-studio-card-header">CVE Vulnerability Backlog</div>
                  <div className="tdd-studio-stat-number" style={{ color: currentAudit.securityCompliance.criticalCveCount > 0 ? '#dc2626' : '#16a34a' }}>
                    {currentAudit.securityCompliance.criticalCveCount} Crit / {currentAudit.securityCompliance.highCveCount} High
                  </div>
                  <div className="tdd-studio-stat-label">Medium CVEs: {currentAudit.securityCompliance.mediumCveCount}</div>
                </div>
              </div>

              <div className="tdd-studio-card">
                <div className="tdd-studio-card-header">Privacy & Regulatory Controls</div>
                <div className="tdd-studio-grid-3">
                  <div>GDPR Auto-Deletion: <strong>{currentAudit.securityCompliance.gdprAutomatedDeletionCapable ? '✅ Yes' : '❌ Non-compliant'}</strong></div>
                  <div>PII Encryption at Rest: <strong>{currentAudit.securityCompliance.piiEncryptionAtRest ? '✅ Enforced' : '❌ No'}</strong></div>
                  <div>PII Encryption in Transit: <strong>{currentAudit.securityCompliance.piiEncryptionInTransit ? '✅ TLS 1.3' : '❌ No'}</strong></div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'team' && (
            <>
              <div className="tdd-studio-grid-4">
                <div className="tdd-studio-card">
                  <div className="tdd-studio-card-header">Engineering Velocity (EVQ)</div>
                  <div className="tdd-studio-stat-number">{currentAudit.teamVelocity.engineeringVelocityQuotient} / 100</div>
                  <div className="tdd-studio-stat-label">Deploy: {currentAudit.teamVelocity.doraDeploymentFrequency.toUpperCase()}</div>
                </div>
                <div className="tdd-studio-card">
                  <div className="tdd-studio-card-header">Team Bus Factor</div>
                  <div id="tdd-bus-factor-stat" className="tdd-studio-stat-number">{currentAudit.teamVelocity.teamBusFactor}</div>
                  <div className="tdd-studio-stat-label">Top Author Commits: {currentAudit.teamVelocity.topContributorCommitSharePercent}%</div>
                </div>
                <div className="tdd-studio-card">
                  <div className="tdd-studio-card-header">Bus Factor Vulnerability</div>
                  <div className="tdd-studio-stat-number" style={{ color: currentAudit.teamVelocity.busFactorVulnerabilityIndex > 40 ? '#dc2626' : '#16a34a' }}>
                    {currentAudit.teamVelocity.busFactorVulnerabilityIndex} / 100
                  </div>
                  <div className="tdd-studio-stat-label">Doc Coverage: {Math.round(currentAudit.teamVelocity.documentationCoverageRatio * 100)}%</div>
                </div>
                <div className="tdd-studio-card">
                  <div className="tdd-studio-card-header">Retention Pool Sizing</div>
                  <div className="tdd-studio-stat-number" style={{ color: '#2563eb' }}>
                    ${currentAudit.teamVelocity.recommendedRetentionPoolSize.toLocaleString()}
                  </div>
                  <div className="tdd-studio-stat-label">{currentAudit.teamVelocity.retentionProgramDurationMonths} Months Vesting</div>
                </div>
              </div>

              <div className="tdd-studio-card">
                <div className="tdd-studio-card-header">DORA Metrics Breakdown</div>
                <div className="tdd-studio-grid-4">
                  <div className="tdd-studio-input-group">
                    <label className="tdd-studio-input-label">Deployment Frequency</label>
                    <select
                      className="tdd-studio-select"
                      value={currentAudit.teamVelocity.doraDeploymentFrequency}
                      onChange={e => handleUpdateAudit({
                        teamVelocity: { ...currentAudit.teamVelocity, doraDeploymentFrequency: e.target.value as DoraTier }
                      })}
                    >
                      <option value="elite">Elite</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div className="tdd-studio-input-group">
                    <label className="tdd-studio-input-label">Lead Time for Changes</label>
                    <select
                      className="tdd-studio-select"
                      value={currentAudit.teamVelocity.doraLeadTimeForChanges}
                      onChange={e => handleUpdateAudit({
                        teamVelocity: { ...currentAudit.teamVelocity, doraLeadTimeForChanges: e.target.value as DoraTier }
                      })}
                    >
                      <option value="elite">Elite</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div className="tdd-studio-input-group">
                    <label className="tdd-studio-input-label">Change Failure Rate</label>
                    <select
                      className="tdd-studio-select"
                      value={currentAudit.teamVelocity.doraChangeFailureRate}
                      onChange={e => handleUpdateAudit({
                        teamVelocity: { ...currentAudit.teamVelocity, doraChangeFailureRate: e.target.value as DoraTier }
                      })}
                    >
                      <option value="elite">Elite</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div className="tdd-studio-input-group">
                    <label className="tdd-studio-input-label">Time to Restore Service</label>
                    <select
                      className="tdd-studio-select"
                      value={currentAudit.teamVelocity.doraTimeToRestoreService}
                      onChange={e => handleUpdateAudit({
                        teamVelocity: { ...currentAudit.teamVelocity, doraTimeToRestoreService: e.target.value as DoraTier }
                      })}
                    >
                      <option value="elite">Elite</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'memo' && (
            <>
              <div className="tdd-studio-card" style={{ background: '#0f172a', color: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase' }}>IC Transaction Recommendation</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '4px' }}>
                      {currentAudit.recommendation.replace(/_/g, ' ').toUpperCase()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', color: '#94a3b8' }}>Total Valuation Haircut</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#f87171' }}>
                      ${currentAudit.scorecard.totalValuationHaircutEstimate.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="tdd-studio-memo-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Generated Diligence Memorandum</h3>
                  <button
                    id="tdd-copy-memo-btn"
                    className="tdd-studio-btn-primary"
                    onClick={() => {
                      navigator.clipboard.writeText(memoMarkdown);
                      setCopiedMemo(true);
                      setTimeout(() => setCopiedMemo(false), 2000);
                    }}
                  >
                    {copiedMemo ? 'Copied!' : 'Copy Memorandum Markdown'}
                  </button>
                </div>
                <pre className="tdd-studio-memo-pre">{memoMarkdown}</pre>
              </div>
            </>
          )}
        </div>

        <div className="tdd-studio-actions-bar">
          <button className="tdd-studio-btn-secondary" onClick={onClose}>
            Close Studio
          </button>
        </div>
      </div>
    </div>
  );
};
