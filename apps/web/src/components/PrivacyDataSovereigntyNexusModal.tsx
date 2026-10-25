import React, { useState, useEffect } from 'react';
import {
  type PrivacyNexusOverview,
  type CrossBorderTransfer,
  type DsrRequest,
  type RopaActivity,
  type DpiaAssessment,
  type AiCorpusLineage,
  type SyntheticDataset,
  type BoardRatification,
  type TripartiteRole,
  calculateTransferRiskIndex,
  calculateDpiaResidualRisk,
  calculateDifferentialPrivacyLeakage,
  calculateMultiJurisdictionalFineExposure,
  computeTripartiteSha256Seal
} from '../domain';
import { privacyDataSovereigntyRepository } from '../data';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type TabKey = 'transfers' | 'dsr' | 'dpia' | 'ai' | 'warroom';

export const PrivacyDataSovereigntyNexusModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('transfers');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [overview, setOverview] = useState<PrivacyNexusOverview | null>(null);

  const [newCorridorCode, setNewCorridorCode] = useState('EU-SG-CLOUD-01');
  const [newOriginCountry, setNewOriginCountry] = useState('DEU');
  const [newDestinationCountry, setNewDestinationCountry] = useState('SGP');
  const [newJurisdictionTier, setNewJurisdictionTier] = useState<any>('moderate_safeguards_rule_of_law');
  const [newTransferMechanism, setNewTransferMechanism] = useState<any>('scc_module_2_c2p');
  const [newLegalReference, setNewLegalReference] = useState('SCC 2021/914 Module 2 TIA V4');
  const [newDataSensitivity, setNewDataSensitivity] = useState<any>('consumer_pii');
  const [newTechMeasure, setNewTechMeasure] = useState<any>('eea_sovereign_hsm_encryption');
  const [newVolume, setNewVolume] = useState<number>(180000);

  const [newSubjectId, setNewSubjectId] = useState('CUST-EU-8921');
  const [newSubjectEmail, setNewSubjectEmail] = useState('sarah.connor@cyberdyne.eu');
  const [newFramework, setNewFramework] = useState<any>('gdpr_eu');
  const [newRequestType, setNewRequestType] = useState<any>('erasure_deletion');
  const [newVerificationMethod, setNewVerificationMethod] = useState('bank_id_oidc_token');

  const [newDpiaTitle, setNewDpiaTitle] = useState('Automated Video Interview Biometric Expression Analysis');
  const [newDpiaRef, setNewDpiaRef] = useState('DPIA-2026-BIO-01');
  const [dpiaSystematic, setDpiaSystematic] = useState(true);
  const [dpiaLargeScale, setDpiaLargeScale] = useState(true);
  const [dpiaInnovative, setDpiaInnovative] = useState(true);
  const [dpiaVulnerable, setDpiaVulnerable] = useState(false);
  const [dpiaAutomated, setDpiaAutomated] = useState(true);
  const [newDpoOpinion, setNewDpoOpinion] = useState('Mandate differential privacy clipping and strict applicant consent revocation webhooks.');

  const [newSynthCode, setNewSynthCode] = useState('SYNTH-GLOBAL-CANDIDATES-2026');
  const [newSynthAlgo, setNewSynthAlgo] = useState('DP-PATE-GAN-Conditional');
  const [newEpsilon, setNewEpsilon] = useState<number>(0.85);
  const [newDelta, setNewDelta] = useState<number>(0.000001);
  const [newNoise, setNewNoise] = useState<any>('subsampled_gaussian_rdp');
  const [newSynthCount, setNewSynthCount] = useState<number>(850000);

  const loadOverview = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await privacyDataSovereigntyRepository.getOverview();
      setOverview(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load privacy and data sovereignty overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadOverview();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const summary = overview?.summary;
  const transfers = overview?.transfers || [];
  const dsrRequests = overview?.pendingDsrRequests || [];
  const ropaActivities = overview?.ropaActivities || [];
  const dpiaAssessments = overview?.dpiaAssessments || [];
  const aiCorpora = overview?.aiCorpora || [];
  const syntheticDatasets = overview?.syntheticDatasets || [];
  const regulatoryFines = overview?.regulatoryFines || [];
  const latestRatification = overview?.latestRatification;

  const handleEvaluateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await privacyDataSovereigntyRepository.evaluateTransfer({
        corridorCode: newCorridorCode.trim(),
        originCountry: newOriginCountry.trim(),
        destinationCountry: newDestinationCountry.trim(),
        destinationJurisdictionTier: newJurisdictionTier,
        transferMechanism: newTransferMechanism,
        legalInstrumentReference: newLegalReference.trim(),
        dataSensitivityCategory: newDataSensitivity,
        supplementaryTechnicalMeasure: newTechMeasure,
        annualDataSubjectVolume: Number(newVolume)
      });
      await loadOverview();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to evaluate transfer corridor');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDsr = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await privacyDataSovereigntyRepository.createDsrRequest({
        subjectIdentifier: newSubjectId.trim(),
        subjectEmail: newSubjectEmail.trim(),
        regulatoryFramework: newFramework,
        requestType: newRequestType,
        identityVerificationMethod: newVerificationMethod.trim()
      });
      await loadOverview();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to register DSR request');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerExtension = async (dsrId: string) => {
    try {
      setLoading(true);
      await privacyDataSovereigntyRepository.triggerDsrExtension({
        dsrRequestId: dsrId,
        extensionReason: 'Statutory complexity extension under GDPR Art. 12(3) due to distributed cold-storage archives.'
      });
      await loadOverview();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to trigger statutory extension');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDpia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ropaActivities.length === 0) return;
    try {
      setLoading(true);
      await privacyDataSovereigntyRepository.createDpiaAssessment({
        ropaActivityId: ropaActivities[0].id,
        dpiaReference: newDpiaRef.trim(),
        title: newDpiaTitle.trim(),
        systematicMonitoringFlag: dpiaSystematic,
        largeScaleProcessingFlag: dpiaLargeScale,
        innovativeTechFlag: dpiaInnovative,
        vulnerableSubjectsFlag: dpiaVulnerable,
        automatedDecisionFlag: dpiaAutomated,
        threatItems: [
          {
            threatScenario: 'Model inversion attack revealing applicant salary history',
            privacyHarmType: 'Financial profiling and loss of confidentiality',
            likelihoodRating: 3,
            severityRating: 4,
            mitigationControls: 'Differential privacy DP-SGD gradient clipping and noise injection',
            controlWeight: 0.85
          }
        ],
        dpoOpinion: newDpoOpinion.trim()
      });
      await loadOverview();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create DPIA assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSynthetic = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await privacyDataSovereigntyRepository.generateSyntheticDataset({
        datasetCode: newSynthCode.trim(),
        synthesisAlgorithm: newSynthAlgo.trim(),
        epsilonBudgetSpent: Number(newEpsilon),
        deltaBoundParameter: Number(newDelta),
        noiseMechanism: newNoise,
        syntheticRecordCount: Number(newSynthCount),
        storageS3Bucket: 'jobtrack-synthetic-eu-west-1',
        storageS3Key: `datasets/${newSynthCode.toLowerCase()}.parquet`
      });
      await loadOverview();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to synthesize dataset');
    } finally {
      setLoading(false);
    }
  };

  const handleSignRatification = async (role: TripartiteRole) => {
    if (!latestRatification) return;
    try {
      setLoading(true);
      let name = 'Dr. Hélène Rousseau, DPO';
      if (role === 'chief_privacy_officer') name = 'Marcus Sterling, Esq., CPO';
      if (role === 'chief_executive_officer') name = 'Elena Rostova, CEO';

      await privacyDataSovereigntyRepository.signRatification({
        ratificationId: latestRatification.id,
        role,
        signatoryFullName: name,
        notes: 'Statutory compliance attestation verified under non-repudiation cryptographic digest.'
      });
      await loadOverview();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign ratification');
    } finally {
      setLoading(false);
    }
  };

  const handleResetDemo = async () => {
    try {
      setLoading(true);
      await privacyDataSovereigntyRepository.resetDemo();
      await loadOverview();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset demo');
    } finally {
      setLoading(false);
    }
  };

  const getTierBadge = (tier: string) => {
    if (tier === 'safe_harbor') return <span className="privacy-sovereignty-badge privacy-badge-safe">SAFE HARBOR</span>;
    if (tier === 'managed_risk') return <span className="privacy-sovereignty-badge privacy-badge-managed">MANAGED RISK</span>;
    if (tier === 'elevated_action_required') return <span className="privacy-sovereignty-badge privacy-badge-elevated">ELEVATED ACTION</span>;
    return <span className="privacy-sovereignty-badge privacy-badge-prohibitive">PROHIBITIVE</span>;
  };

  return (
    <div className="privacy-sovereignty-modal-overlay" data-testid="privacy-data-sovereignty-nexus-modal">
      <div className="privacy-sovereignty-modal">
        <div className="privacy-sovereignty-header">
          <div>
            <div className="privacy-sovereignty-header-title">
              <span>🛡️</span>
              <span>Bảo mật dữ liệu & Chủ quyền AI (Privacy & Sovereign AI Nexus)</span>
              {summary && (
                <span className="privacy-sovereignty-badge privacy-badge-blue">
                  TRI {summary.compositeTransferRiskIndex} / 100
                </span>
              )}
            </div>
            <div className="privacy-sovereignty-subtitle">
              Kiểm soát truyền dữ liệu xuyên biên giới (Chapter V GDPR), DSR Clocks, RoPA/DPIA, và Chứng thực DPO Tripartite
            </div>
          </div>
          <button
            className="privacy-sovereignty-close-btn"
            onClick={onClose}
            data-testid="close-privacy-data-sovereignty-nexus-modal"
          >
            ×
          </button>
        </div>

        <div className="privacy-sovereignty-tabs">
          <button
            className={`privacy-sovereignty-tab-btn ${activeTab === 'transfers' ? 'active' : ''}`}
            onClick={() => setActiveTab('transfers')}
            data-testid="tab-transfers"
          >
            🌐 1. Radar Chuyển dữ liệu Quốc tế (TRI)
          </button>
          <button
            className={`privacy-sovereignty-tab-btn ${activeTab === 'dsr' ? 'active' : ''}`}
            onClick={() => setActiveTab('dsr')}
            data-testid="tab-dsr"
          >
            ⏱️ 2. DSR Rights & Đồng hồ SLA ({dsrRequests.length})
          </button>
          <button
            className={`privacy-sovereignty-tab-btn ${activeTab === 'dpia' ? 'active' : ''}`}
            onClick={() => setActiveTab('dpia')}
            data-testid="tab-dpia"
          >
            📋 3. Điều 30 RoPA & Đánh giá DPIA
          </button>
          <button
            className={`privacy-sovereignty-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
            data-testid="tab-ai"
          >
            🤖 4. Chủ quyền Dữ liệu AI & Differential Privacy
          </button>
          <button
            className={`privacy-sovereignty-tab-btn ${activeTab === 'warroom' ? 'active' : ''}`}
            onClick={() => setActiveTab('warroom')}
            data-testid="tab-warroom"
          >
            🏛️ 5. Phòng Tình báo Hội đồng & Phê chuẩn DPO
          </button>
        </div>

        <div className="privacy-sovereignty-body">
          {errorMessage && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem', color: '#fca5a5', fontSize: '0.85rem' }}>
              {errorMessage}
            </div>
          )}

          {activeTab === 'transfers' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="privacy-sovereignty-grid-4">
                <div className="privacy-sovereignty-card">
                  <div className="privacy-metric-label">CHỈ SỐ RỦI RO TRUYỀN DỮ LIỆU (TRI)</div>
                  <div className="privacy-metric-value" style={{ color: '#38bdf8' }}>{summary?.compositeTransferRiskIndex || 0}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Ngưỡng an toàn Safe Harbor &lt; 20.0</div>
                </div>
                <div className="privacy-sovereignty-card">
                  <div className="privacy-metric-label">HÀNH LANG DỮ LIỆU HOẠT ĐỘNG</div>
                  <div className="privacy-metric-value" style={{ color: '#34d399' }}>{summary?.activeCorridorsCount || 0}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Mã hóa Sovereign HSM EU / TIA</div>
                </div>
                <div className="privacy-sovereignty-card">
                  <div className="privacy-metric-label">QUỐC GIA ĐÍCH GIÁM SÁT CAO</div>
                  <div className="privacy-metric-value" style={{ color: '#fbbf24' }}>
                    {transfers.filter((t) => t.destinationJurisdictionTier === 'authoritarian_unbounded_access' || t.destinationJurisdictionTier === 'elevated_surveillance_fisa702').length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>FISA 702 / EO 1233 / PIPL Art 38</div>
                </div>
                <div className="privacy-sovereignty-card">
                  <div className="privacy-metric-label">PHẠM VI CHỦ THỂ DỮ LIỆU / NĂM</div>
                  <div className="privacy-metric-value" style={{ color: '#c4b5fd' }}>
                    {(transfers.reduce((acc, t) => acc + t.annualDataSubjectVolume, 0) / 1000).toFixed(0)}k
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Hồ sơ ứng viên & nhân tài toàn cầu</div>
                </div>
              </div>

              <div className="privacy-sovereignty-grid-2">
                <div className="privacy-sovereignty-card">
                  <div className="privacy-sovereignty-card-title">
                    <span>Đánh giá Hành lang Chuyển giao mới (Transfer Impact Assessment)</span>
                  </div>
                  <form onSubmit={handleEvaluateTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="privacy-sovereignty-grid-2">
                      <div className="privacy-sovereignty-form-group">
                        <label className="privacy-sovereignty-label">Mã hành lang (Corridor Code)</label>
                        <input className="privacy-sovereignty-input" value={newCorridorCode} onChange={(e) => setNewCorridorCode(e.target.value)} required />
                      </div>
                      <div className="privacy-sovereignty-form-group">
                        <label className="privacy-sovereignty-label">Nguồn / Đích (Quốc gia)</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input className="privacy-sovereignty-input" style={{ width: '50%' }} value={newOriginCountry} onChange={(e) => setNewOriginCountry(e.target.value)} required />
                          <input className="privacy-sovereignty-input" style={{ width: '50%' }} value={newDestinationCountry} onChange={(e) => setNewDestinationCountry(e.target.value)} required />
                        </div>
                      </div>
                    </div>

                    <div className="privacy-sovereignty-grid-2">
                      <div className="privacy-sovereignty-form-group">
                        <label className="privacy-sovereignty-label">Phân hạng Tư pháp Nơi đến</label>
                        <select className="privacy-sovereignty-select" value={newJurisdictionTier} onChange={(e) => setNewJurisdictionTier(e.target.value)}>
                          <option value="adequacy_recognized">Adequacy Recognized (EU, UK, JP)</option>
                          <option value="dpf_certified_participant">EU-US Data Privacy Framework Certified</option>
                          <option value="moderate_safeguards_rule_of_law">Moderate Safeguards (Rule of Law)</option>
                          <option value="elevated_surveillance_fisa702">Elevated Surveillance (US non-DPF)</option>
                          <option value="authoritarian_unbounded_access">Authoritarian Access (China, Russia)</option>
                        </select>
                      </div>
                      <div className="privacy-sovereignty-form-group">
                        <label className="privacy-sovereignty-label">Cơ chế Chuyển giao (Instrument)</label>
                        <select className="privacy-sovereignty-select" value={newTransferMechanism} onChange={(e) => setNewTransferMechanism(e.target.value)}>
                          <option value="adequacy_decision">EC Adequacy Decision</option>
                          <option value="eu_us_dpf_certified">EU-US DPF Self-Certification</option>
                          <option value="bcr_approved">Approved Binding Corporate Rules (BCR)</option>
                          <option value="scc_module_1_c2c">SCC Module 1 (C2C)</option>
                          <option value="scc_module_2_c2p">SCC Module 2 (C2P)</option>
                          <option value="cac_security_assessment">China CAC Outbound Security Assessment</option>
                          <option value="india_dpdp_corridor">India DPDP Corridors</option>
                          <option value="article_49_derogation">Article 49 Explicit Derogation</option>
                        </select>
                      </div>
                    </div>

                    <div className="privacy-sovereignty-grid-2">
                      <div className="privacy-sovereignty-form-group">
                        <label className="privacy-sovereignty-label">Độ nhạy cảm Dữ liệu (Sensitivity)</label>
                        <select className="privacy-sovereignty-select" value={newDataSensitivity} onChange={(e) => setNewDataSensitivity(e.target.value)}>
                          <option value="anonymized_telemetry">Anonymized Telemetry</option>
                          <option value="b2b_professional_contacts">B2B Professional Contacts</option>
                          <option value="consumer_pii">Consumer PII / Candidates</option>
                          <option value="financial_geolocation">Financial & Geolocation</option>
                          <option value="special_category_art_9_10">Special Category (Art 9/10 GDPR)</option>
                        </select>
                      </div>
                      <div className="privacy-sovereignty-form-group">
                        <label className="privacy-sovereignty-label">Biện pháp Kỹ thuật Bổ sung (EDPB 01/2020)</label>
                        <select className="privacy-sovereignty-select" value={newTechMeasure} onChange={(e) => setNewTechMeasure(e.target.value)}>
                          <option value="eea_sovereign_hsm_encryption">EEA Sovereign HSM Encryption (0.15x)</option>
                          <option value="irreversible_tokenization">Irreversible Tokenization (0.30x)</option>
                          <option value="provider_managed_kms">Cloud Provider Managed KMS (0.70x)</option>
                          <option value="cleartext_none">Plaintext Cleartext Transit (1.00x)</option>
                        </select>
                      </div>
                    </div>

                    <div className="privacy-sovereignty-form-group">
                      <label className="privacy-sovereignty-label">Khối lượng Chủ thể / Năm (Data Subjects)</label>
                      <input className="privacy-sovereignty-input" type="number" value={newVolume} onChange={(e) => setNewVolume(Number(e.target.value))} required />
                    </div>

                    <button type="submit" className="privacy-sovereignty-btn-primary" data-testid="btn-evaluate-transfer" disabled={loading}>
                      {loading ? 'Đang tính toán TRI...' : 'Phân tích & Thẩm định Hành lang Dữ liệu'}
                    </button>
                  </form>
                </div>

                <div className="privacy-sovereignty-card">
                  <div className="privacy-sovereignty-card-title">
                    <span>Mô hình Pháp lý Schrems II & Phân bổ Tiers</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
                    <div className="privacy-sovereignty-outcome-box">
                      <span>Tier 1: Safe Harbor (TRI &le; 20.0)</span>
                      <span className="privacy-sovereignty-badge privacy-badge-safe">ĐƯỢC PHÉP CHUYỂN</span>
                    </div>
                    <div className="privacy-sovereignty-outcome-box">
                      <span>Tier 2: Managed Risk (20.0 &lt; TRI &le; 45.0)</span>
                      <span className="privacy-sovereignty-badge privacy-badge-managed">YÊU CẦU TIA HÀNG NĂM</span>
                    </div>
                    <div className="privacy-sovereignty-outcome-box">
                      <span>Tier 3: Elevated Action (45.0 &lt; TRI &le; 70.0)</span>
                      <span className="privacy-sovereignty-badge privacy-badge-elevated">BẮT BUỘC BỔ SUNG HSM</span>
                    </div>
                    <div className="privacy-sovereignty-outcome-box">
                      <span>Tier 4: Prohibitive (&gt; 70.0)</span>
                      <span className="privacy-sovereignty-badge privacy-badge-prohibitive">ĐÌNH CHỈ TRUYỀN NGAY</span>
                    </div>
                    <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(2, 6, 23, 0.4)', borderRadius: '6px', borderLeft: '3px solid #8b5cf6' }}>
                      <strong>Công thức Định lượng TRI:</strong>
                      <br />
                      <code>TRI = min(100, L_dest × S_mech × M_tech × W_sens × (1 + 0.15 × ln(1 + N / 10000)))</code>
                    </div>
                  </div>
                </div>
              </div>

              <div className="privacy-sovereignty-card">
                <div className="privacy-sovereignty-card-title">
                  <span>Danh mục Hành lang Chuyển giao Đang Hoạt động ({transfers.length})</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="privacy-sovereignty-table">
                    <thead>
                      <tr>
                        <th className="privacy-sovereignty-th">HÀNH LANG</th>
                        <th className="privacy-sovereignty-th">TỪ → ĐẾN</th>
                        <th className="privacy-sovereignty-th">CƠ CHẾ PHÁP LÝ</th>
                        <th className="privacy-sovereignty-th">BIỆN PHÁP BỔ SUNG</th>
                        <th className="privacy-sovereignty-th">KHỐI LƯỢNG</th>
                        <th className="privacy-sovereignty-th">CHỈ SỐ TRI</th>
                        <th className="privacy-sovereignty-th">PHÂN TIER</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transfers.map((t) => (
                        <tr key={t.id}>
                          <td className="privacy-sovereignty-td" style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600 }}>{t.corridorCode}</td>
                          <td className="privacy-sovereignty-td">{t.originCountry} → {t.destinationCountry}</td>
                          <td className="privacy-sovereignty-td">{t.transferMechanism}</td>
                          <td className="privacy-sovereignty-td">{t.supplementaryTechnicalMeasure}</td>
                          <td className="privacy-sovereignty-td">{t.annualDataSubjectVolume.toLocaleString()}</td>
                          <td className="privacy-sovereignty-td" style={{ fontWeight: 700, color: t.transferRiskIndex <= 20 ? '#34d399' : '#f87171' }}>
                            {t.transferRiskIndex.toFixed(1)}
                          </td>
                          <td className="privacy-sovereignty-td">{getTierBadge(t.riskTier)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dsr' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="privacy-sovereignty-grid-4">
                <div className="privacy-sovereignty-card">
                  <div className="privacy-metric-label">YÊU CẦU DSR ĐANG XỬ LÝ</div>
                  <div className="privacy-metric-value" style={{ color: '#38bdf8' }}>{dsrRequests.length}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Quyền xóa, truy cập, chỉnh sửa</div>
                </div>
                <div className="privacy-sovereignty-card">
                  <div className="privacy-metric-label">TỈ LỆ TUÂN THỦ SLA</div>
                  <div className="privacy-metric-value" style={{ color: '#34d399' }}>{summary?.dsrSlaAdherencePct || 100}%</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Không quá hạn 30 ngày (GDPR)</div>
                </div>
                <div className="privacy-sovereignty-card">
                  <div className="privacy-metric-label">XÁC MINH DANH TÍNH IAL2</div>
                  <div className="privacy-metric-value" style={{ color: '#c4b5fd' }}>100%</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>NIST SP 800-63-3 Assurance</div>
                </div>
                <div className="privacy-sovereignty-card">
                  <div className="privacy-metric-label">TOMBSTONING PHÂN TÁN</div>
                  <div className="privacy-metric-value" style={{ color: '#fbbf24' }}>Hoạt động</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Đồng bộ S3 / Postgres / Redis</div>
                </div>
              </div>

              <div className="privacy-sovereignty-grid-2">
                <div className="privacy-sovereignty-card">
                  <div className="privacy-sovereignty-card-title">
                    <span>Tiếp nhận Yêu cầu Quyền Chủ thể Dữ liệu (New DSR Intake)</span>
                  </div>
                  <form onSubmit={handleCreateDsr} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="privacy-sovereignty-grid-2">
                      <div className="privacy-sovereignty-form-group">
                        <label className="privacy-sovereignty-label">Mã định danh Chủ thể (Subject ID)</label>
                        <input className="privacy-sovereignty-input" value={newSubjectId} onChange={(e) => setNewSubjectId(e.target.value)} required />
                      </div>
                      <div className="privacy-sovereignty-form-group">
                        <label className="privacy-sovereignty-label">Email Chủ thể</label>
                        <input className="privacy-sovereignty-input" type="email" value={newSubjectEmail} onChange={(e) => setNewSubjectEmail(e.target.value)} required />
                      </div>
                    </div>

                    <div className="privacy-sovereignty-grid-2">
                      <div className="privacy-sovereignty-form-group">
                        <label className="privacy-sovereignty-label">Khung Pháp lý (Regulatory Framework)</label>
                        <select className="privacy-sovereignty-select" value={newFramework} onChange={(e) => setNewFramework(e.target.value)}>
                          <option value="gdpr_eu">GDPR (European Union - 30 days)</option>
                          <option value="ccpa_cpra_us">CCPA / CPRA (California - 45 days)</option>
                          <option value="gdpr_uk">UK GDPR (30 days)</option>
                          <option value="china_pipl">China PIPL (30 days)</option>
                          <option value="india_dpdp">India DPDP Act (30 days)</option>
                        </select>
                      </div>
                      <div className="privacy-sovereignty-form-group">
                        <label className="privacy-sovereignty-label">Loại Yêu cầu Quyền (Right Type)</label>
                        <select className="privacy-sovereignty-select" value={newRequestType} onChange={(e) => setNewRequestType(e.target.value)}>
                          <option value="erasure_deletion">Quyền Xóa bỏ / Quên lãng (Erasure / Deletion)</option>
                          <option value="access_portability">Quyền Truy cập & Di chuyển Dữ liệu (Portability)</option>
                          <option value="rectification">Quyền Chỉnh sửa Dữ liệu (Rectification)</option>
                          <option value="restriction_processing">Quyền Hạn chế Xử lý (Restriction)</option>
                          <option value="objection_opt_out">Quyền Phản đối Xử lý / AI Opt-out</option>
                        </select>
                      </div>
                    </div>

                    <div className="privacy-sovereignty-form-group">
                      <label className="privacy-sovereignty-label">Phương thức Xác thực Danh tính (Identity Proofing)</label>
                      <input className="privacy-sovereignty-input" value={newVerificationMethod} onChange={(e) => setNewVerificationMethod(e.target.value)} required />
                    </div>

                    <button type="submit" className="privacy-sovereignty-btn-primary" data-testid="btn-create-dsr" disabled={loading}>
                      {loading ? 'Đang tạo...' : 'Kích hoạt Quy trình Điều phối DSR & Đồng hồ SLA'}
                    </button>
                  </form>
                </div>

                <div className="privacy-sovereignty-card">
                  <div className="privacy-sovereignty-card-title">
                    <span>Quy định Thời hạn Pháp định & Gia hạn (GDPR Art. 12(3))</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
                    <div className="privacy-sovereignty-outcome-box">
                      <span>Thời hạn Chuẩn GDPR</span>
                      <span className="privacy-sovereignty-badge privacy-badge-blue">30 NGÀY TỐI ĐA</span>
                    </div>
                    <div className="privacy-sovereignty-outcome-box">
                      <span>Gia hạn Phức tạp (Article 12(3))</span>
                      <span className="privacy-sovereignty-badge privacy-badge-managed">+60 NGÀY (TỔNG 90)</span>
                    </div>
                    <div className="privacy-sovereignty-outcome-box">
                      <span>Thời hạn Chuẩn CCPA/CPRA</span>
                      <span className="privacy-sovereignty-badge privacy-badge-blue">45 NGÀY (+45 GIA HẠN)</span>
                    </div>
                    <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(2, 6, 23, 0.4)', borderRadius: '6px', borderLeft: '3px solid #10b981' }}>
                      <strong>Điều phối Tự động:</strong> Khi quyền xóa (Right to be Forgotten) được phê duyệt, hệ thống phát lệnh Tombstone đồng thời tới PostgreSQL, Redis cluster, S3 deep archives, và các sub-processor đã đăng ký.
                    </div>
                  </div>
                </div>
              </div>

              <div className="privacy-sovereignty-card">
                <div className="privacy-sovereignty-card-title">
                  <span>Hàng đợi Điều phối Yêu cầu DSR ({dsrRequests.length})</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="privacy-sovereignty-table">
                    <thead>
                      <tr>
                        <th className="privacy-sovereignty-th">MÃ TICKET</th>
                        <th className="privacy-sovereignty-th">CHỦ THỂ / EMAIL</th>
                        <th className="privacy-sovereignty-th">QUY ĐỊNH</th>
                        <th className="privacy-sovereignty-th">LOẠI QUYỀN</th>
                        <th className="privacy-sovereignty-th">HẠN ĐÓNG (SLA)</th>
                        <th className="privacy-sovereignty-th">TIẾN ĐỘ</th>
                        <th className="privacy-sovereignty-th">TRẠNG THÁI</th>
                        <th className="privacy-sovereignty-th">THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dsrRequests.map((d) => (
                        <tr key={d.id}>
                          <td className="privacy-sovereignty-td" style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600 }}>{d.ticketReference}</td>
                          <td className="privacy-sovereignty-td">
                            <div>{d.subjectIdentifier}</div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{d.subjectEmail}</div>
                          </td>
                          <td className="privacy-sovereignty-td">{d.regulatoryFramework.toUpperCase()}</td>
                          <td className="privacy-sovereignty-td">{d.requestType}</td>
                          <td className="privacy-sovereignty-td">
                            {new Date(d.extendedDeadlineAt || d.statutoryDeadlineAt).toLocaleDateString()}
                            {d.isExtensionTriggered && (
                              <span style={{ display: 'block', fontSize: '0.7rem', color: '#fbbf24' }}>Gia hạn Art 12(3)</span>
                            )}
                          </td>
                          <td className="privacy-sovereignty-td">
                            <div style={{ background: '#1e293b', borderRadius: '4px', height: '6px', width: '80px', overflow: 'hidden' }}>
                              <div style={{ background: '#38bdf8', height: '100%', width: `${d.orchestrationProgressPct}%` }}></div>
                            </div>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{d.orchestrationProgressPct}%</span>
                          </td>
                          <td className="privacy-sovereignty-td">
                            <span className="privacy-sovereignty-badge privacy-badge-blue">{d.status}</span>
                          </td>
                          <td className="privacy-sovereignty-td">
                            {!d.isExtensionTriggered && (
                              <button
                                className="privacy-sovereignty-btn-secondary"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                                onClick={() => handleTriggerExtension(d.id)}
                                data-testid="btn-extend-dsr"
                              >
                                Gia hạn +60d
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dpia' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="privacy-sovereignty-grid-4">
                <div className="privacy-sovereignty-card">
                  <div className="privacy-metric-label">HỒ SƠ XỬ LÝ (ROPA ART 30)</div>
                  <div className="privacy-metric-value" style={{ color: '#38bdf8' }}>{ropaActivities.length}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Cơ sở pháp lý Điều 6 & Điều 9</div>
                </div>
                <div className="privacy-sovereignty-card">
                  <div className="privacy-metric-label">ĐÁNH GIÁ TÁC ĐỘNG (DPIA)</div>
                  <div className="privacy-metric-value" style={{ color: '#34d399' }}>{dpiaAssessments.length}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Hoạt động rủi ro cao Art 35</div>
                </div>
                <div className="privacy-sovereignty-card">
                  <div className="privacy-metric-label">DPIA RỦI RO CAO / THAM VẤN</div>
                  <div className="privacy-metric-value" style={{ color: '#fbbf24' }}>{summary?.highRiskDpiaPendingCount || 0}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Ngưỡng tham vấn DPO Art 36</div>
                </div>
                <div className="privacy-sovereignty-card">
                  <div className="privacy-metric-label">HIỆU LỰC KIỂM SOÁT TOMS</div>
                  <div className="privacy-metric-value" style={{ color: '#c4b5fd' }}>72.5%</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Mã hóa, RBAC & Giảm thiểu dữ liệu</div>
                </div>
              </div>

              <div className="privacy-sovereignty-grid-2">
                <div className="privacy-sovereignty-card">
                  <div className="privacy-sovereignty-card-title">
                    <span>Khởi tạo Đánh giá Tác động Bảo mật (New DPIA Assessment)</span>
                  </div>
                  <form onSubmit={handleCreateDpia} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="privacy-sovereignty-grid-2">
                      <div className="privacy-sovereignty-form-group">
                        <label className="privacy-sovereignty-label">Mã DPIA Reference</label>
                        <input className="privacy-sovereignty-input" value={newDpiaRef} onChange={(e) => setNewDpiaRef(e.target.value)} required />
                      </div>
                      <div className="privacy-sovereignty-form-group">
                        <label className="privacy-sovereignty-label">Tiêu đề Dự án Xử lý</label>
                        <input className="privacy-sovereignty-input" value={newDpiaTitle} onChange={(e) => setNewDpiaTitle(e.target.value)} required />
                      </div>
                    </div>

                    <div className="privacy-sovereignty-form-group">
                      <label className="privacy-sovereignty-label">Các yếu tố Kích hoạt Rủi ro cao (GDPR Art. 35 Triggers)</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.75rem', color: '#cbd5e1' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <input type="checkbox" checked={dpiaSystematic} onChange={(e) => setDpiaSystematic(e.target.checked)} />
                          Giám sát hệ thống (Systematic Monitoring)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <input type="checkbox" checked={dpiaLargeScale} onChange={(e) => setDpiaLargeScale(e.target.checked)} />
                          Quy mô lớn (Large-Scale Processing)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <input type="checkbox" checked={dpiaInnovative} onChange={(e) => setDpiaInnovative(e.target.checked)} />
                          Công nghệ đột phá / AI (Innovative Tech)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <input type="checkbox" checked={dpiaAutomated} onChange={(e) => setDpiaAutomated(e.target.checked)} />
                          Quyết định tự động / Profiling (Art 22)
                        </label>
                      </div>
                    </div>

                    <div className="privacy-sovereignty-form-group">
                      <label className="privacy-sovereignty-label">Ý kiến & Kết luận của DPO (DPO Formal Opinion)</label>
                      <textarea className="privacy-sovereignty-textarea" value={newDpoOpinion} onChange={(e) => setNewDpoOpinion(e.target.value)} required />
                    </div>

                    <button type="submit" className="privacy-sovereignty-btn-primary" data-testid="btn-create-dpia" disabled={loading}>
                      {loading ? 'Đang thẩm định...' : 'Tính toán Rủi ro Còn lại & Phê duyệt DPIA'}
                    </button>
                  </form>
                </div>

                <div className="privacy-sovereignty-card">
                  <div className="privacy-sovereignty-card-title">
                    <span>Hồ sơ Xử lý Dữ liệu Điều 30 RoPA ({ropaActivities.length})</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '340px', overflowY: 'auto' }}>
                    {ropaActivities.map((r) => (
                      <div key={r.id} style={{ background: '#060a17', border: '1px solid #1e293b', borderRadius: '6px', padding: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.85rem' }}>{r.name}</span>
                          <span className="privacy-sovereignty-badge privacy-badge-blue">{r.activityCode}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                          Bộ phận: {r.businessUnit} · Chủ sở hữu: {r.processOwner} · Lưu trữ: {r.retentionPeriodMonths} tháng
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                          <strong>Cơ sở pháp lý:</strong> {r.gdprArticle6Basis} · <strong>Dữ liệu:</strong> {r.dataCategories.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="privacy-sovereignty-card">
                <div className="privacy-sovereignty-card-title">
                  <span>Danh mục Đánh giá Tác động DPIA Hoạt động ({dpiaAssessments.length})</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="privacy-sovereignty-table">
                    <thead>
                      <tr>
                        <th className="privacy-sovereignty-th">MÃ DPIA</th>
                        <th className="privacy-sovereignty-th">TIÊU ĐỀ DỰ ÁN</th>
                        <th className="privacy-sovereignty-th">RỦI RO VỐN CÓ</th>
                        <th className="privacy-sovereignty-th">HIỆU QUẢ KIỂM SOÁT</th>
                        <th className="privacy-sovereignty-th">RỦI RO CÒN LẠI</th>
                        <th className="privacy-sovereignty-th">THAM VẤN DPO</th>
                        <th className="privacy-sovereignty-th">TRẠNG THÁI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dpiaAssessments.map((dp) => (
                        <tr key={dp.id}>
                          <td className="privacy-sovereignty-td" style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600 }}>{dp.dpiaReference}</td>
                          <td className="privacy-sovereignty-td">{dp.title}</td>
                          <td className="privacy-sovereignty-td">{dp.inherentRiskScore.toFixed(1)} / 100</td>
                          <td className="privacy-sovereignty-td">{(dp.controlEffectivenessFactor * 100).toFixed(1)}%</td>
                          <td className="privacy-sovereignty-td" style={{ fontWeight: 700, color: dp.residualRiskScore <= 25 ? '#34d399' : '#fbbf24' }}>
                            {dp.residualRiskScore.toFixed(1)}
                          </td>
                          <td className="privacy-sovereignty-td">
                            {dp.priorConsultationRequired ? (
                              <span className="privacy-sovereignty-badge privacy-badge-prohibitive">BẮT BUỘC</span>
                            ) : (
                              <span className="privacy-sovereignty-badge privacy-badge-safe">KHÔNG</span>
                            )}
                          </td>
                          <td className="privacy-sovereignty-td">
                            <span className="privacy-sovereignty-badge privacy-badge-blue">{dp.approvalStatus}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="privacy-sovereignty-grid-4">
                <div className="privacy-sovereignty-card">
                  <div className="privacy-metric-label">TẬP DỮ LIỆU HUẤN LUYỆN AI</div>
                  <div className="privacy-metric-value" style={{ color: '#38bdf8' }}>{aiCorpora.length}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tuân thủ Điều 10 EU AI Act</div>
                </div>
                <div className="privacy-sovereignty-card">
                  <div className="privacy-metric-label">TỔNG RECORD / TOKEN</div>
                  <div className="privacy-metric-value" style={{ color: '#34d399' }}>
                    {(aiCorpora.reduce((acc, c) => acc + c.totalTokenOrRecordCount, 0) / 1000000000).toFixed(1)}B
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Kiểm soát bản quyền & Opt-out</div>
                </div>
                <div className="privacy-sovereignty-card">
                  <div className="privacy-metric-label">TẬP DỮ LIỆU TỔNG HỢP (SYNTHETIC)</div>
                  <div className="privacy-metric-value" style={{ color: '#c4b5fd' }}>{syntheticDatasets.length}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Bảo mật Differential Privacy</div>
                </div>
                <div className="privacy-sovereignty-card">
                  <div className="privacy-metric-label">ĐIỂM HỮU DỤNG WASSERSTEIN</div>
                  <div className="privacy-metric-value" style={{ color: '#fbbf24' }}>89.8%</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Pareto Optimal (Utility vs Privacy)</div>
                </div>
              </div>

              <div className="privacy-sovereignty-grid-2">
                <div className="privacy-sovereignty-card">
                  <div className="privacy-sovereignty-card-title">
                    <span>Tạo Tập Dữ liệu Tổng hợp Bảo mật (Generate Synthetic Dataset)</span>
                  </div>
                  <form onSubmit={handleGenerateSynthetic} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="privacy-sovereignty-grid-2">
                      <div className="privacy-sovereignty-form-group">
                        <label className="privacy-sovereignty-label">Mã tập dữ liệu (Dataset Code)</label>
                        <input className="privacy-sovereignty-input" value={newSynthCode} onChange={(e) => setNewSynthCode(e.target.value)} required />
                      </div>
                      <div className="privacy-sovereignty-form-group">
                        <label className="privacy-sovereignty-label">Thuật toán Tổng hợp (Algorithm)</label>
                        <input className="privacy-sovereignty-input" value={newSynthAlgo} onChange={(e) => setNewSynthAlgo(e.target.value)} required />
                      </div>
                    </div>

                    <div className="privacy-sovereignty-grid-3">
                      <div className="privacy-sovereignty-form-group">
                        <label className="privacy-sovereignty-label">Epsilon Budget (&epsilon;)</label>
                        <input className="privacy-sovereignty-input" type="number" step="0.05" value={newEpsilon} onChange={(e) => setNewEpsilon(Number(e.target.value))} required />
                      </div>
                      <div className="privacy-sovereignty-form-group">
                        <label className="privacy-sovereignty-label">Delta Bound (&delta;)</label>
                        <input className="privacy-sovereignty-input" type="number" step="0.000001" value={newDelta} onChange={(e) => setNewDelta(Number(e.target.value))} required />
                      </div>
                      <div className="privacy-sovereignty-form-group">
                        <label className="privacy-sovereignty-label">Cơ chế Nhiễu (Noise)</label>
                        <select className="privacy-sovereignty-select" value={newNoise} onChange={(e) => setNewNoise(e.target.value)}>
                          <option value="subsampled_gaussian_rdp">Subsampled Gaussian (RDP)</option>
                          <option value="gaussian">Standard Gaussian</option>
                          <option value="laplace">Laplace Mechanism</option>
                        </select>
                      </div>
                    </div>

                    <div className="privacy-sovereignty-form-group">
                      <label className="privacy-sovereignty-label">Số lượng Bản ghi Tổng hợp (Synthetic Records)</label>
                      <input className="privacy-sovereignty-input" type="number" value={newSynthCount} onChange={(e) => setNewSynthCount(Number(e.target.value))} required />
                    </div>

                    <button type="submit" className="privacy-sovereignty-btn-primary" data-testid="btn-generate-synthetic" disabled={loading}>
                      {loading ? 'Đang tổng hợp...' : 'Chạy Sinh Dữ liệu Bảo tồn Riêng tư (DP-PATE-GAN)'}
                    </button>
                  </form>
                </div>

                <div className="privacy-sovereignty-card">
                  <div className="privacy-sovereignty-card-title">
                    <span>Đảm bảo Toán học $(\epsilon, \delta)$-Differential Privacy</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
                    <div className="privacy-sovereignty-outcome-box">
                      <span>Giới hạn Epsilon An toàn (&epsilon;)</span>
                      <span className="privacy-sovereignty-badge privacy-badge-safe">&le; 1.0 (PROVABLE DP)</span>
                    </div>
                    <div className="privacy-sovereignty-outcome-box">
                      <span>Rò rỉ Tấn công Thành viên (MIA Adv)</span>
                      <span className="privacy-sovereignty-badge privacy-badge-blue">&lt; 0.12 (BOUNDED)</span>
                    </div>
                    <div className="privacy-sovereignty-outcome-box">
                      <span>Chứng nhận Điều 10 EU AI Act</span>
                      <span className="privacy-sovereignty-badge privacy-badge-emerald">ĐẠT CHUẨN ĐẦU VÀO</span>
                    </div>
                    <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(2, 6, 23, 0.4)', borderRadius: '6px', borderLeft: '3px solid #38bdf8' }}>
                      <strong>Chống Suy luận Ngược:</strong> Dữ liệu tổng hợp được sinh ra có phân phối thống kê tương đồng với dữ liệu gốc (khoảng cách Wasserstein $W_1$ tối thiểu) nhưng bảo đảm không thể suy ngược ra danh tính của bất kỳ ứng viên cụ thể nào trong tập huấn luyện.
                    </div>
                  </div>
                </div>
              </div>

              <div className="privacy-sovereignty-card">
                <div className="privacy-sovereignty-card-title">
                  <span>Nguồn gốc & Bản quyền Tập dữ liệu Huấn luyện AI ({aiCorpora.length})</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="privacy-sovereignty-table">
                    <thead>
                      <tr>
                        <th className="privacy-sovereignty-th">MÃ TẬP CORPORE</th>
                        <th className="privacy-sovereignty-th">TÊN DỮ LIỆU</th>
                        <th className="privacy-sovereignty-th">NGUỒN / QUỐC GIA</th>
                        <th className="privacy-sovereignty-th">CƠ SỞ PHÁP LÝ</th>
                        <th className="privacy-sovereignty-th">FAIR USE</th>
                        <th className="privacy-sovereignty-th">RỦI RO PII</th>
                        <th className="privacy-sovereignty-th">EU AI ACT ART 10</th>
                        <th className="privacy-sovereignty-th">TRẠNG THÁI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiCorpora.map((c) => (
                        <tr key={c.id}>
                          <td className="privacy-sovereignty-td" style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600 }}>{c.corpusIdentifier}</td>
                          <td className="privacy-sovereignty-td">{c.datasetName}</td>
                          <td className="privacy-sovereignty-td">{c.collectionJurisdiction}</td>
                          <td className="privacy-sovereignty-td">{c.legalBasisForTraining}</td>
                          <td className="privacy-sovereignty-td">{c.fairUseFourFactorScore.toFixed(2)} / 4.0</td>
                          <td className="privacy-sovereignty-td" style={{ color: c.piiExtractionRiskScore < 20 ? '#34d399' : '#f87171' }}>
                            {c.piiExtractionRiskScore.toFixed(1)}%
                          </td>
                          <td className="privacy-sovereignty-td">
                            {c.euAiActArticle10Compliant ? (
                              <span className="privacy-sovereignty-badge privacy-badge-safe">TUÂN THỦ</span>
                            ) : (
                              <span className="privacy-sovereignty-badge privacy-badge-prohibitive">CHƯA ĐẠT</span>
                            )}
                          </td>
                          <td className="privacy-sovereignty-td">
                            <span className="privacy-sovereignty-badge privacy-badge-blue">{c.governanceStatus}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'warroom' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="privacy-sovereignty-grid-3">
                <div className="privacy-sovereignty-card">
                  <div className="privacy-metric-label">PHẠT TỐI ĐA PHÁP ĐỊNH (GDPR ART 83)</div>
                  <div className="privacy-metric-value" style={{ color: '#f87171' }}>
                    €{((regulatoryFines.find((f) => f.regulatoryFramework === 'gdpr_eu')?.statutoryMaxFineEur || 48000000) / 1000000).toFixed(1)}M
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>4% Doanh thu toàn cầu (€1.2B)</div>
                </div>
                <div className="privacy-sovereignty-card">
                  <div className="privacy-metric-label">RỦI RO ĐÃ ĐIỀU CHỈNH BIỆN PHÁP HỢP TÁC</div>
                  <div className="privacy-metric-value" style={{ color: '#fbbf24' }}>
                    €{((summary?.totalRegulatoryFineExposureEur || 4520076) / 1000000).toFixed(2)}M
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Giảm trừ 45% nhờ RoPA & DPIA</div>
                </div>
                <div className="privacy-sovereignty-card">
                  <div className="privacy-metric-label">TRẠNG THÁI PHÊ CHUẨN HỘI ĐỒNG</div>
                  <div className="privacy-metric-value" style={{ color: latestRatification?.ratificationStatus === 'fully_ratified' ? '#34d399' : '#38bdf8' }}>
                    {latestRatification?.ratificationStatus || 'PENDING'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>DPO → CPO → CEO Tripartite</div>
                </div>
              </div>

              <div className="privacy-sovereignty-grid-2">
                <div className="privacy-sovereignty-card">
                  <div className="privacy-sovereignty-card-title">
                    <span>Quy trình Ký điện tử Tam quyền (Tripartite Ratification Gate)</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="privacy-sovereignty-outcome-box">
                      <div>
                        <strong>1. Cán bộ Bảo vệ Dữ liệu (DPO)</strong>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {latestRatification?.dpoFullName} · {latestRatification?.dpoSignedAt ? `Ký ngày ${new Date(latestRatification.dpoSignedAt).toLocaleDateString()}` : 'Chưa ký'}
                        </div>
                      </div>
                      {latestRatification?.dpoSignedAt ? (
                        <span className="privacy-sovereignty-btn-signed">ĐÃ PHÊ CHUẨN</span>
                      ) : (
                        <button className="privacy-sovereignty-btn-primary" onClick={() => handleSignRatification('data_protection_officer')} data-testid="btn-signoff-dpo" disabled={loading}>
                          Ký xác thực DPO
                        </button>
                      )}
                    </div>

                    <div className="privacy-sovereignty-outcome-box">
                      <div>
                        <strong>2. Giám đốc Pháp chế & Bảo mật (CPO)</strong>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {latestRatification?.cpoFullName} · {latestRatification?.cpoSignedAt ? `Ký ngày ${new Date(latestRatification.cpoSignedAt).toLocaleDateString()}` : 'Chưa ký'}
                        </div>
                      </div>
                      {latestRatification?.cpoSignedAt ? (
                        <span className="privacy-sovereignty-btn-signed">ĐÃ PHÊ CHUẨN</span>
                      ) : (
                        <button className="privacy-sovereignty-btn-primary" onClick={() => handleSignRatification('chief_privacy_officer')} data-testid="btn-signoff-cpo" disabled={loading}>
                          Ký xác thực CPO
                        </button>
                      )}
                    </div>

                    <div className="privacy-sovereignty-outcome-box">
                      <div>
                        <strong>3. Tổng Giám đốc Điều hành (CEO)</strong>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {latestRatification?.ceoFullName} · {latestRatification?.ceoSignedAt ? `Ký ngày ${new Date(latestRatification.ceoSignedAt).toLocaleDateString()}` : 'Chưa ký'}
                        </div>
                      </div>
                      {latestRatification?.ceoSignedAt ? (
                        <span className="privacy-sovereignty-btn-signed">ĐÃ PHÊ CHUẨN</span>
                      ) : (
                        <button className="privacy-sovereignty-btn-primary" onClick={() => handleSignRatification('chief_executive_officer')} data-testid="btn-signoff-ceo" disabled={loading}>
                          Ký phê chuẩn CEO
                        </button>
                      )}
                    </div>

                    {latestRatification?.tripartiteSealSha256 && (
                      <div style={{ padding: '0.75rem', background: '#060a17', borderRadius: '6px', border: '1px solid #1e293b' }}>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.25rem' }}>MÃ CHỨNG THỰC BẢO TOÀN SHA-256 (IMMUTABLE SEAL)</div>
                        <code style={{ fontSize: '0.72rem', color: '#34d399', wordBreak: 'break-all' }}>
                          {latestRatification.tripartiteSealSha256}
                        </code>
                      </div>
                    )}
                  </div>
                </div>

                <div className="privacy-sovereignty-card">
                  <div className="privacy-sovereignty-card-title">
                    <span>Mô phỏng Trách nhiệm Pháp định Đa Quốc gia</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {regulatoryFines.map((f) => (
                      <div key={f.id} className="privacy-sovereignty-outcome-box">
                        <div>
                          <strong>{f.regulatoryFramework.toUpperCase()} ({f.jurisdictionCode})</strong>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            Trần mức phạt: €{(Number(f.statutoryMaxFineEur) / 1000000).toFixed(2)}M · Tỉ lệ vi phạm: {f.unintentionalInfractionsCount} vụ
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: 700, color: '#f87171' }}>
                            €{(Number(f.expectedRegulatoryExposureEur) / 1000).toFixed(1)}k
                          </span>
                          <div style={{ fontSize: '0.7rem', color: '#34d399' }}>Giảm trừ {(f.cooperationMitigationCredit * 100).toFixed(0)}%</div>
                        </div>
                      </div>
                    ))}
                    <div style={{ padding: '0.75rem', background: 'rgba(2, 6, 23, 0.4)', borderRadius: '6px', borderLeft: '3px solid #f59e0b', fontSize: '0.78rem', color: '#cbd5e1' }}>
                      <strong>Bảo vệ Trách nhiệm Cá nhân Thành viên HĐQT:</strong> Chữ ký điện tử tam quyền được lưu vết vào chuỗi kiểm toán bất biến (Audit Event Ledger), là chứng cứ pháp lý chứng minh ban giám đốc đã thực thi trách nhiệm cẩn trọng (Duty of Care & Due Diligence).
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="privacy-sovereignty-footer">
          <div>
            Hệ thống Quản trị Bảo mật Dữ liệu & Chủ quyền AI Quốc tế · JobTrack Enterprise Compliance Edition
          </div>
          <button className="privacy-sovereignty-footer-btn" onClick={handleResetDemo} data-testid="btn-reset-privacy-demo">
            ↺ Khôi phục Dữ liệu Kiểm toán Mẫu
          </button>
        </div>
      </div>
    </div>
  );
};
