import React, { useState, useEffect } from 'react';
import {
  type GlobalTradeNexusOverviewDTO,
  type SanctionsScreeningResultDTO,
  type EccnClassificationResultDTO,
  type CfiusTidAssessmentResultDTO,
  type CustomsLandedDutyResultDTO,
  type VoluntarySelfDisclosureDTO,
  type BeneficialOwnerNodeDTO,
  type FreeTradeAgreementCode,
  type EarCountryGroup
} from '../domain';
import { tradeSanctionsNexusRepository } from '../data';

interface GlobalTradeSanctionsNexusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalTradeSanctionsNexusModal: React.FC<GlobalTradeSanctionsNexusModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'sanctions' | 'eccn' | 'cfius' | 'customs' | 'war_room'>('sanctions');
  const [overview, setOverview] = useState<GlobalTradeNexusOverviewDTO | null>(null);
  const [loading, setLoading] = useState(false);

  const [screeningQuery, setScreeningQuery] = useState('Vneshtorg Logistics Holding');
  const [screeningCountry, setScreeningCountry] = useState('RU');
  const [ownershipPct, setOwnershipPct] = useState(55);
  const [screeningResult, setScreeningResult] = useState<SanctionsScreeningResultDTO | null>(null);

  const [eccnItemName, setEccnItemName] = useState('SecureEdge Mesh Gateway Daemon');
  const [eccnDescription, setEccnDescription] = useState('Enterprise cryptographic zero trust mesh daemon with dual-use cipher routines');
  const [symmetricBits, setSymmetricBits] = useState(256);
  const [isMassMarket, setIsMassMarket] = useState(false);
  const [eccnDestCountry, setEccnDestCountry] = useState('DE');
  const [eccnResult, setEccnResult] = useState<EccnClassificationResultDTO | null>(null);

  const [deemedEmployeeName, setDeemedEmployeeName] = useState('Dr. Dmitry Volkov');
  const [deemedCountry, setDeemedCountry] = useState('RU');
  const [deemedScope, setDeemedScope] = useState<'source_code_read' | 'binary_execution' | 'architecture_specs' | 'cryptographic_keys'>('source_code_read');
  const [deemedResult, setDeemedResult] = useState<any | null>(null);

  const [cfiusCompanyName, setCfiusCompanyName] = useState('Apex Quantum Telemetry Inc.');
  const [personalDataRecords, setPersonalDataRecords] = useState(1500000);
  const [foreignGovVoting, setForeignGovVoting] = useState(30);
  const [foreignOwnership, setForeignOwnership] = useState(51);
  const [cfiusResult, setCfiusResult] = useState<CfiusTidAssessmentResultDTO | null>(null);

  const [htsCode, setHtsCode] = useState('8542.31.0000');
  const [partNumber, setPartNumber] = useState('GPU-ACCEL-01');
  const [customsValue, setCustomsValue] = useState(500000);
  const [originCountry, setOriginCountry] = useState('CN');
  const [ftaQualifying, setFtaQualifying] = useState<FreeTradeAgreementCode>('usmca');
  const [customsResult, setCustomsResult] = useState<CustomsLandedDutyResultDTO | null>(null);

  const [vsdDossier, setVsdDossier] = useState<VoluntarySelfDisclosureDTO | null>(null);
  const [signedCompliance, setSignedCompliance] = useState(false);
  const [signedClo, setSignedClo] = useState(false);
  const [signedCeo, setSignedCeo] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadOverview();
    }
  }, [isOpen]);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const data = await tradeSanctionsNexusRepository.getOverview();
      setOverview(data);
    } catch {
      setOverview({
        ctsriScore: 12.5,
        ctsriRiskTier: 'tier_1_elite_zero_defect',
        sanctionsRiskComponent: 10.0,
        exportControlRiskComponent: 15.0,
        cfiusRiskComponent: 12.0,
        customsDutyRiskComponent: 14.0,
        disclosureGovernanceComponent: 5.0,
        activeSanctionsScreeningCount: 1420,
        pendingSanctionsHitsCount: 0,
        activeEccnClassificationsCount: 88,
        activeDeemedExportLicensesCount: 4,
        activeCfiusAssessmentsCount: 3,
        activeNsmaAgreementsCount: 1,
        activeHtsCatalogItemsCount: 312,
        pendingVsdFilingsCount: 0,
        lastUpdated: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleRunScreening = async () => {
    setLoading(true);
    try {
      const mockTree: BeneficialOwnerNodeDTO = {
        id: 'root-node',
        name: screeningQuery,
        country: screeningCountry,
        isDirectlySanctioned: false,
        ownershipPercentage: 100,
        votingRightsPercentage: 100,
        children: [
          {
            id: 'child-node-1',
            name: 'Vnesheconombank Capital Trust',
            country: 'RU',
            isDirectlySanctioned: true,
            sanctionSource: 'ofac_sdn',
            ownershipPercentage: ownershipPct,
            votingRightsPercentage: ownershipPct,
            children: []
          }
        ]
      };

      const result = await tradeSanctionsNexusRepository.screenSanctions({
        queryName: screeningQuery,
        countryCode: screeningCountry,
        beneficialOwnershipRoot: mockTree
      });
      setScreeningResult(result);
    } finally {
      setLoading(false);
    }
  };

  const handleClassifyEccn = async () => {
    setLoading(true);
    try {
      const result = await tradeSanctionsNexusRepository.classifyEccn({
        itemId: 'item-001',
        itemName: eccnItemName,
        functionalDescription: eccnDescription,
        eccnCandidate: '5D002',
        implementsSymmetricEncryption: symmetricBits > 0,
        symmetricKeyLengthBits: symmetricBits,
        implementsAsymmetricEncryption: true,
        asymmetricKeyLengthBits: 2048,
        implementsEllipticCurve: true,
        ellipticCurveBits: 256,
        isMassMarketRetailAvailable: isMassMarket,
        isUserModifiableCryptographicArchitecture: false,
        destinationCountry: eccnDestCountry
      });
      setEccnResult(result);
    } finally {
      setLoading(false);
    }
  };

  const handleAuditDeemedExport = async () => {
    setLoading(true);
    try {
      const result = await tradeSanctionsNexusRepository.auditDeemedExport({
        employeeId: 'emp-001',
        employeeName: deemedEmployeeName,
        citizenshipCountry: deemedCountry,
        isUsPerson: false,
        accessedEccn: '5D002.a.1',
        technicalDataScope: deemedScope
      });
      setDeemedResult(result);
    } finally {
      setLoading(false);
    }
  };

  const handleRunCfius = async () => {
    setLoading(true);
    try {
      const result = await tradeSanctionsNexusRepository.assessCfius({
        transactionId: 'tx-001',
        targetCompanyName: cfiusCompanyName,
        dealValueUsd: 125000000,
        producesCriticalTechnology: false,
        operatesCriticalInfrastructure: false,
        sensitivePersonalDataRecordsCount: personalDataRecords,
        targetsMilitaryOrIntelligencePersonnel: false,
        foreignInvestorCountry: 'SG',
        foreignInvestorOwnershipPercentage: foreignOwnership,
        foreignInvestorBoardSeats: 2,
        foreignInvestorMaterialNonpublicAccess: true,
        foreignGovernmentVotingPercentage: foreignGovVoting
      });
      setCfiusResult(result);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateDuty = async () => {
    setLoading(true);
    try {
      const result = await tradeSanctionsNexusRepository.calculateLandedDuty({
        partNumber,
        description: 'Enterprise Accelerator Module',
        htsCode,
        countryOfOrigin: originCountry,
        exportCountry: 'US',
        customsValueUsd: customsValue,
        freightInsuranceUsd: 15000,
        qualifyingFta: ftaQualifying,
        totalTransactionValueUsd: customsValue * 1.2,
        netCostUsd: customsValue * 0.85,
        valueNonOriginatingMaterialsUsd: customsValue * 0.35
      });
      setCustomsResult(result);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateVsd = async () => {
    setLoading(true);
    try {
      const result = await tradeSanctionsNexusRepository.compileVsdReport({
        vsdReferenceNumber: 'VSD-2026-EAR-0091',
        targetAuthority: 'bis_oee',
        title: 'Inadvertent Dual-Use Encryption Source Code Commit Access',
        suspectedRegulationBreach: '15 CFR § 734.13 (Deemed Export Control Violation)',
        incidentStartDate: '2026-08-01',
        incidentEndDate: '2026-10-15',
        estimatedTransactionsCount: 14,
        estimatedTransactionVolumeUsd: 1250000,
        narrativeSummary: 'During automated CI/CD pipeline refactoring, foreign national contractors belonging to Country Group D:1 accessed unredacted 5D002 cryptographic repository branches without an active Technology Transfer Plan.',
        rootCauseAnalysis: 'Repository permissions defaulted to organization-wide read upon migration to microservices architecture without cross-referencing active deemed export authorizations.',
        remedialActionsImplemented: [
          'Revoked all non-US person access to cryptographic source repositories',
          'Instituted mandatory pre-commit branch gating validating citizenship credentials',
          'Appointed external independent trade compliance auditor for quarterly reviews'
        ]
      });
      setVsdDossier(result);
      setSignedCompliance(false);
      setSignedClo(false);
      setSignedCeo(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSignCompliance = async () => {
    if (!vsdDossier) return;
    await tradeSanctionsNexusRepository.executeSignoff({
      vsdId: vsdDossier.id,
      role: 'head_of_global_trade_compliance',
      signerName: 'Victoria Price, CTP',
      signatureHash: 'sha256:8899aabbccddeeff0011223344556677'
    });
    setSignedCompliance(true);
  };

  const handleSignClo = async () => {
    if (!vsdDossier || !signedCompliance) return;
    await tradeSanctionsNexusRepository.executeSignoff({
      vsdId: vsdDossier.id,
      role: 'chief_legal_officer',
      signerName: 'Alexander Vance, Esq.',
      signatureHash: 'sha256:112233445566778899aabbccddeeff00'
    });
    setSignedClo(true);
  };

  const handleSignCeo = async () => {
    if (!vsdDossier || !signedClo) return;
    await tradeSanctionsNexusRepository.executeSignoff({
      vsdId: vsdDossier.id,
      role: 'chief_executive_officer',
      signerName: 'Eleanor Sterling',
      signatureHash: 'sha256:33445566778899aabbccddeeff001122'
    });
    setSignedCeo(true);
  };

  return (
    <div className="trade-nexus-backdrop" data-testid="global-trade-sanctions-nexus-modal">
      <div className="trade-nexus-container">
        <div className="trade-nexus-header">
          <div className="trade-nexus-title-group">
            <div className="trade-nexus-icon-badge">NX</div>
            <div>
              <h2 className="trade-nexus-title">
                Global Trade, Export Controls & Sanctions Nexus
                <span className="trade-nexus-badge-tier">CTSRI: {overview?.ctsriScore ?? 12.5} / 100</span>
                <span className="trade-nexus-badge-sub">
                  {overview?.ctsriRiskTier?.replace(/_/g, ' ').toUpperCase() ?? 'TIER 1 ELITE ZERO DEFECT'}
                </span>
              </h2>
              <p className="trade-nexus-subtitle">
                Milestone 52 &bull; Multi-Jurisdiction Regulatory Command Center (OFAC &bull; BIS EAR &bull; CFIUS &bull; CBP HTS)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            data-testid="close-trade-nexus-btn"
            className="trade-nexus-close-btn"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="trade-nexus-tabs">
          {[
            { id: 'sanctions', label: '1. Sanctions & 50% Rule Radar' },
            { id: 'eccn', label: '2. EAR & Dual-Use Tech Highway' },
            { id: 'cfius', label: '3. CFIUS & FDI National Security' },
            { id: 'customs', label: '4. Customs HTS & FTA Optimization' },
            { id: 'war_room', label: '5. Board War Room & VSD Protocol' }
          ].map((tab) => (
            <button
              key={tab.id}
              data-testid={`trade-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id as any)}
              className={`trade-nexus-tab-btn${activeTab === tab.id ? ' active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="trade-nexus-body">
          {activeTab === 'sanctions' && (
            <div className="trade-nexus-grid-2">
              <div className="trade-nexus-card">
                <h3 className="trade-nexus-card-title">Denied Parties & 50% Rule Screening Simulator</h3>
                <div className="trade-nexus-form-group">
                  <label className="trade-nexus-label">Target Entity / Counterparty Name</label>
                  <input
                    type="text"
                    value={screeningQuery}
                    onChange={(e) => setScreeningQuery(e.target.value)}
                    className="trade-nexus-input"
                  />
                </div>
                <div className="trade-nexus-grid-2">
                  <div className="trade-nexus-form-group">
                    <label className="trade-nexus-label">Jurisdiction Country</label>
                    <input
                      type="text"
                      value={screeningCountry}
                      onChange={(e) => setScreeningCountry(e.target.value)}
                      className="trade-nexus-input"
                    />
                  </div>
                  <div className="trade-nexus-form-group">
                    <label className="trade-nexus-label">SDN Beneficial Ownership (%)</label>
                    <input
                      type="number"
                      value={ownershipPct}
                      onChange={(e) => setOwnershipPct(Number(e.target.value))}
                      className="trade-nexus-input"
                    />
                  </div>
                </div>
                <button
                  onClick={handleRunScreening}
                  data-testid="execute-sanctions-screening-btn"
                  className="trade-nexus-btn-primary"
                >
                  Execute Multi-Factor Sanctions Screening
                </button>
              </div>

              <div className="trade-nexus-card">
                <h3 className="trade-nexus-card-title">Screening Resolution Output</h3>
                {screeningResult ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="trade-nexus-outcome-box">
                      <span style={{ color: '#94a3b8' }}>OFAC 50% Rule Status:</span>
                      <span style={{ fontWeight: 700, color: screeningResult.isBlockedByFiftyPercentRule ? '#f43f5e' : '#34d399' }}>
                        {screeningResult.isBlockedByFiftyPercentRule ? 'BLOCKED PER SE (>= 50%)' : 'CLEAR (< 50%)'}
                      </span>
                    </div>
                    <div className="trade-nexus-outcome-box">
                      <span style={{ color: '#94a3b8' }}>Secondary Sanctions Index (SSEI):</span>
                      <span style={{ fontFamily: 'monospace', color: '#f59e0b', fontWeight: 700 }}>
                        {screeningResult.secondarySanctionsExposureIndex} / 100
                      </span>
                    </div>
                    <div className="trade-nexus-outcome-box">
                      <span style={{ color: '#94a3b8' }}>Mandated Compliance Action:</span>
                      <span style={{ fontWeight: 600, color: '#a78bfa', textTransform: 'uppercase' }}>
                        {screeningResult.recommendedAction.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {screeningResult.directMatches.map((m) => (
                      <div key={m.id} className="trade-nexus-hit-box">
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fda4af', fontWeight: 600 }}>
                          <span>{m.entityName}</span>
                          <span style={{ fontFamily: 'monospace' }}>{Math.round(m.compositeSimilarityScore * 100)}% Match</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>{m.regulatoryReference}</p>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b' }}>
                          Jaro-Winkler: {m.scoreJaroWinkler} &bull; Levenshtein: {m.scoreLevenshtein} &bull; Phonetic: {m.scorePhonetic}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                    No screening executed yet. Run simulator to test fuzzy match & 50% rule algorithms.
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'eccn' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="trade-nexus-grid-2">
                <div className="trade-nexus-card">
                  <h3 className="trade-nexus-card-title">EAR Dual-Use & Cryptographic ECCN Wizard</h3>
                  <div className="trade-nexus-form-group">
                    <label className="trade-nexus-label">Software / Hardware Product Name</label>
                    <input
                      type="text"
                      value={eccnItemName}
                      onChange={(e) => setEccnItemName(e.target.value)}
                      className="trade-nexus-input"
                    />
                  </div>
                  <div className="trade-nexus-form-group">
                    <label className="trade-nexus-label">Symmetric Key Length (Bits)</label>
                    <input
                      type="number"
                      value={symmetricBits}
                      onChange={(e) => setSymmetricBits(Number(e.target.value))}
                      className="trade-nexus-input"
                    />
                  </div>
                  <div className="trade-nexus-form-group">
                    <label className="trade-nexus-label">Destination Country</label>
                    <input
                      type="text"
                      value={eccnDestCountry}
                      onChange={(e) => setEccnDestCountry(e.target.value)}
                      className="trade-nexus-input"
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.25rem' }}>
                    <input
                      type="checkbox"
                      id="massMarket"
                      checked={isMassMarket}
                      onChange={(e) => setIsMassMarket(e.target.checked)}
                      style={{ accentColor: '#8b5cf6', cursor: 'pointer' }}
                    />
                    <label htmlFor="massMarket" style={{ fontSize: '0.75rem', color: '#cbd5e1', cursor: 'pointer' }}>
                      Qualifies for Mass Market Retail under Note 3 to Category 5 Part 2
                    </label>
                  </div>
                  <button
                    onClick={handleClassifyEccn}
                    data-testid="classify-eccn-btn"
                    className="trade-nexus-btn-primary"
                  >
                    Classify ECCN & Determine License Exceptions
                  </button>
                </div>

                <div className="trade-nexus-card">
                  <h3 className="trade-nexus-card-title">ECCN Classification Determination</h3>
                  {eccnResult ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div className="trade-nexus-outcome-box">
                        <span style={{ color: '#94a3b8' }}>Assigned ECCN:</span>
                        <span style={{ fontFamily: 'monospace', color: '#34d399', fontWeight: 700, fontSize: '0.95rem' }}>
                          {eccnResult.assignedEccn}
                        </span>
                      </div>
                      <div className="trade-nexus-outcome-box">
                        <span style={{ color: '#94a3b8' }}>License Exception:</span>
                        <span style={{ fontFamily: 'monospace', color: '#a78bfa', fontWeight: 600, textTransform: 'uppercase' }}>
                          {eccnResult.applicableLicenseException}
                        </span>
                      </div>
                      <div className="trade-nexus-outcome-box">
                        <span style={{ color: '#94a3b8' }}>Semi-Annual ENC Reporting:</span>
                        <span style={{ fontWeight: 600, color: eccnResult.requiresSemiAnnualReporting ? '#f59e0b' : '#94a3b8' }}>
                          {eccnResult.requiresSemiAnnualReporting ? 'MANDATORY (15 CFR § 740.17(e))' : 'EXEMPT'}
                        </span>
                      </div>
                      <div style={{ background: '#080d1a', border: '1px solid #1e293b', borderRadius: '6px', padding: '0.8rem 1rem', fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                        {eccnResult.determinationJustification}
                      </div>
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                      Configure technical parameters to generate deterministic ECCN classification.
                    </p>
                  )}
                </div>
              </div>

              <div className="trade-nexus-card">
                <h3 className="trade-nexus-card-title">Deemed Export Personnel Clearance Audit</h3>
                <div className="trade-nexus-grid-3">
                  <div className="trade-nexus-form-group">
                    <label className="trade-nexus-label">Employee Name</label>
                    <input
                      type="text"
                      value={deemedEmployeeName}
                      onChange={(e) => setDeemedEmployeeName(e.target.value)}
                      className="trade-nexus-input"
                    />
                  </div>
                  <div className="trade-nexus-form-group">
                    <label className="trade-nexus-label">Citizenship Country</label>
                    <input
                      type="text"
                      value={deemedCountry}
                      onChange={(e) => setDeemedCountry(e.target.value)}
                      className="trade-nexus-input"
                    />
                  </div>
                  <div className="trade-nexus-form-group">
                    <label className="trade-nexus-label">Technical Data Scope</label>
                    <select
                      value={deemedScope}
                      onChange={(e) => setDeemedScope(e.target.value as any)}
                      className="trade-nexus-select"
                    >
                      <option value="source_code_read">Source Code Read Access</option>
                      <option value="binary_execution">Binary Execution</option>
                      <option value="architecture_specs">Architecture Specifications</option>
                      <option value="cryptographic_keys">Cryptographic Keys</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleAuditDeemedExport}
                  data-testid="audit-deemed-export-btn"
                  className="trade-nexus-btn-primary"
                  style={{ alignSelf: 'flex-start' }}
                >
                  Audit Deemed Export Exposure
                </button>

                {deemedResult && (
                  <div className="trade-nexus-grid-3" style={{ background: '#080d1a', border: '1px solid #1e293b', borderRadius: '6px', padding: '0.8rem 1rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>EAR Country Group:</span>
                      <span style={{ fontWeight: 600, color: '#f59e0b', textTransform: 'uppercase' }}>{deemedResult.earCountryGroup}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Exposure Score:</span>
                      <span style={{ fontFamily: 'monospace', color: '#a78bfa', fontWeight: 700 }}>{deemedResult.deemedExportExposureScore} / 100</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>License Mandate:</span>
                      <span style={{ fontWeight: 700, color: deemedResult.requiresDeemedExportLicense ? '#f43f5e' : '#34d399' }}>
                        {deemedResult.requiresDeemedExportLicense ? 'LICENSE REQUIRED BEFORE ACCESS' : 'CLEAR'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'cfius' && (
            <div className="trade-nexus-grid-2">
              <div className="trade-nexus-card">
                <h3 className="trade-nexus-card-title">CFIUS TID National Security Radar</h3>
                <div className="trade-nexus-form-group">
                  <label className="trade-nexus-label">Target US Business Name</label>
                  <input
                    type="text"
                    value={cfiusCompanyName}
                    onChange={(e) => setCfiusCompanyName(e.target.value)}
                    className="trade-nexus-input"
                  />
                </div>
                <div className="trade-nexus-form-group">
                  <label className="trade-nexus-label">US Personal Data Records Maintained</label>
                  <input
                    type="number"
                    value={personalDataRecords}
                    onChange={(e) => setPersonalDataRecords(Number(e.target.value))}
                    className="trade-nexus-input"
                  />
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Threshold: 1,000,000 records triggers Sensitive Personal Data TID</span>
                </div>
                <div className="trade-nexus-grid-2">
                  <div className="trade-nexus-form-group">
                    <label className="trade-nexus-label">Foreign Gov Voting (%)</label>
                    <input
                      type="number"
                      value={foreignGovVoting}
                      onChange={(e) => setForeignGovVoting(Number(e.target.value))}
                      className="trade-nexus-input"
                    />
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Threshold: 25% substantial interest</span>
                  </div>
                  <div className="trade-nexus-form-group">
                    <label className="trade-nexus-label">Foreign Acquisition (%)</label>
                    <input
                      type="number"
                      value={foreignOwnership}
                      onChange={(e) => setForeignOwnership(Number(e.target.value))}
                      className="trade-nexus-input"
                    />
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Threshold: 49% acquisition trigger</span>
                  </div>
                </div>
                <button
                  onClick={handleRunCfius}
                  data-testid="evaluate-cfius-btn"
                  className="trade-nexus-btn-primary"
                >
                  Evaluate National Security Filing Obligations
                </button>
              </div>

              <div className="trade-nexus-card">
                <h3 className="trade-nexus-card-title">CFIUS Clearance Determination</h3>
                {cfiusResult ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="trade-nexus-outcome-box">
                      <span style={{ color: '#94a3b8' }}>TID Status:</span>
                      <span style={{ fontWeight: 600, color: '#f59e0b', textTransform: 'uppercase' }}>{cfiusResult.tidStatus}</span>
                    </div>
                    <div className="trade-nexus-outcome-box">
                      <span style={{ color: '#94a3b8' }}>Filing Obligation:</span>
                      <span style={{ fontWeight: 700, textTransform: 'uppercase', color: cfiusResult.filingRequirement.includes('mandatory') ? '#f43f5e' : '#34d399' }}>
                        {cfiusResult.filingRequirement.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="trade-nexus-outcome-box">
                      <span style={{ color: '#94a3b8' }}>National Security Risk Score:</span>
                      <span style={{ fontFamily: 'monospace', color: '#a78bfa', fontWeight: 700 }}>{cfiusResult.nationalSecurityRiskScore} / 100</span>
                    </div>
                    <div style={{ background: '#080d1a', border: '1px solid #1e293b', borderRadius: '6px', padding: '0.8rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Recommended NSMA Mitigation Covenants:</span>
                      {cfiusResult.recommendedMitigationMeasures.map((c, i) => (
                        <div key={i} style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
                          <span style={{ color: '#8b5cf6' }}>&bull;</span>
                          <span>{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                    Enter deal parameters to analyze Part 800 mandatory declaration thresholds.
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'customs' && (
            <div className="trade-nexus-grid-2">
              <div className="trade-nexus-card">
                <h3 className="trade-nexus-card-title">Customs HTS Tariff & FTA Optimization Engine</h3>
                <div className="trade-nexus-grid-2">
                  <div className="trade-nexus-form-group">
                    <label className="trade-nexus-label">HTS Code</label>
                    <input
                      type="text"
                      value={htsCode}
                      onChange={(e) => setHtsCode(e.target.value)}
                      className="trade-nexus-input"
                    />
                  </div>
                  <div className="trade-nexus-form-group">
                    <label className="trade-nexus-label">Customs Value (USD)</label>
                    <input
                      type="number"
                      value={customsValue}
                      onChange={(e) => setCustomsValue(Number(e.target.value))}
                      className="trade-nexus-input"
                    />
                  </div>
                </div>
                <div className="trade-nexus-grid-2">
                  <div className="trade-nexus-form-group">
                    <label className="trade-nexus-label">Country of Origin</label>
                    <input
                      type="text"
                      value={originCountry}
                      onChange={(e) => setOriginCountry(e.target.value)}
                      className="trade-nexus-input"
                    />
                  </div>
                  <div className="trade-nexus-form-group">
                    <label className="trade-nexus-label">Candidate Free Trade Agreement</label>
                    <select
                      value={ftaQualifying}
                      onChange={(e) => setFtaQualifying(e.target.value as any)}
                      className="trade-nexus-select"
                    >
                      <option value="usmca">USMCA (North America)</option>
                      <option value="cptpp">CPTPP (Trans-Pacific)</option>
                      <option value="evfta">EVFTA (EU-Vietnam)</option>
                      <option value="general_mfn_non_preferential">General MFN (No FTA)</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleCalculateDuty}
                  data-testid="calculate-customs-duty-btn"
                  className="trade-nexus-btn-primary"
                >
                  Calculate Landed Duty & Regional Value Content
                </button>
              </div>

              <div className="trade-nexus-card">
                <h3 className="trade-nexus-card-title">Landed Tariff Cost & Duty Stack</h3>
                {customsResult ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="trade-nexus-outcome-box">
                      <span style={{ color: '#94a3b8' }}>Total Duty Payable:</span>
                      <span style={{ fontFamily: 'monospace', color: '#f43f5e', fontWeight: 700, fontSize: '0.95rem' }}>
                        ${customsResult.totalDutyPayableUsd.toLocaleString()} USD
                      </span>
                    </div>
                    <div className="trade-nexus-outcome-box">
                      <span style={{ color: '#94a3b8' }}>FTA Preferential Duty Savings:</span>
                      <span style={{ fontFamily: 'monospace', color: '#34d399', fontWeight: 700 }}>
                        ${customsResult.dutySavedByFtaUsd.toLocaleString()} USD
                      </span>
                    </div>
                    <div className="trade-nexus-outcome-box">
                      <span style={{ color: '#94a3b8' }}>Section 301 Punitive Tariff:</span>
                      <span style={{ fontFamily: 'monospace', color: '#f59e0b', fontWeight: 600 }}>
                        ${customsResult.section301AmountUsd.toLocaleString()} USD ({customsResult.section301DutyRate}%)
                      </span>
                    </div>
                    <div className="trade-nexus-outcome-box">
                      <span style={{ color: '#94a3b8' }}>Regional Value Content (RVC):</span>
                      <span style={{ fontFamily: 'monospace', color: '#a78bfa', fontWeight: 600 }}>
                        {customsResult.regionalValueContentPercentage}% ({customsResult.isFtaOriginQualified ? 'QUALIFIED' : 'FAILED'})
                      </span>
                    </div>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                    Submit customs parameters to calculate Section 301/232 duty stacks and FTA qualification.
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'war_room' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="trade-nexus-card" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 className="trade-nexus-card-title">Automated Voluntary Self-Disclosure (VSD) Protocol</h3>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                    Generate regulatory markdown dossier for BIS/OFAC self-disclosure with binding tripartite executive execution.
                  </p>
                </div>
                <button
                  onClick={handleGenerateVsd}
                  data-testid="compile-vsd-btn"
                  className="trade-nexus-btn-primary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                >
                  Compile VSD Dossier
                </button>
              </div>

              {vsdDossier && (
                <div className="trade-nexus-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.6rem', borderBottom: '1px solid #1e293b' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#a78bfa', fontWeight: 600 }}>
                      {vsdDossier.vsdReferenceNumber} &bull; {vsdDossier.targetAuthority.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)', fontWeight: 600 }}>
                      {signedCompliance && signedClo && signedCeo ? 'FULLY EXECUTED & SEALED' : 'PENDING TRIPARTITE SIGN-OFF'}
                    </span>
                  </div>

                  <pre className="trade-nexus-pre">
                    {vsdDossier.generatedMarkdownReport}
                  </pre>

                  <div className="trade-nexus-grid-3" style={{ paddingTop: '0.5rem' }}>
                    <div style={{ background: '#080d1a', border: '1px solid #1e293b', borderRadius: '6px', padding: '0.8rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>1. Head of Global Trade Compliance</span>
                      <button
                        disabled={signedCompliance}
                        onClick={handleSignCompliance}
                        data-testid="signoff-compliance-btn"
                        className={signedCompliance ? 'trade-nexus-btn-signed' : 'trade-nexus-btn-primary'}
                      >
                        {signedCompliance ? 'Signed & Attested' : 'Execute Compliance Sign-off'}
                      </button>
                    </div>

                    <div style={{ background: '#080d1a', border: '1px solid #1e293b', borderRadius: '6px', padding: '0.8rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>2. Chief Legal Officer / GC</span>
                      <button
                        disabled={!signedCompliance || signedClo}
                        onClick={handleSignClo}
                        data-testid="signoff-clo-btn"
                        className={signedClo ? 'trade-nexus-btn-signed' : 'trade-nexus-btn-primary'}
                      >
                        {signedClo ? 'Legal Approval Granted' : 'Execute Legal Sign-off'}
                      </button>
                    </div>

                    <div style={{ background: '#080d1a', border: '1px solid #1e293b', borderRadius: '6px', padding: '0.8rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>3. Chief Executive Officer</span>
                      <button
                        disabled={!signedClo || signedCeo}
                        onClick={handleSignCeo}
                        data-testid="signoff-ceo-btn"
                        className={signedCeo ? 'trade-nexus-btn-signed' : 'trade-nexus-btn-primary'}
                      >
                        {signedCeo ? 'CEO Authority Executed' : 'Execute Final CEO Seal'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="trade-nexus-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span>Tenant Multi-Tenancy: Isolated</span>
            <span>OFAC 50% Recursive Engine: Online</span>
            <span>EAR Dual-Use Matrix: Enforced</span>
          </div>
          <button
            onClick={onClose}
            className="trade-nexus-footer-btn"
          >
            Close Nexus Command
          </button>
        </div>
      </div>
    </div>
  );
};
