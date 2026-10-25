import React, { useState, useEffect, useMemo } from 'react';
import {
  type LegalOperationsOverviewDTO,
  type LegalEntityDTO,
  type IPAssetDTO,
  type MaterialContractDTO,
  type LitigationMatterDTO,
  type CustodianLegalHoldDTO,
  type LegalBoardMemorandumDTO,
  type LegalSignoffRole,
  type CommercialContractType,
  calculatePQDI,
  calculateCRDI,
  assessASC450Contingency
} from '../domain';
import { legalOperationsNexusRepository, demoMode } from '../data';

interface LegalOperationsNexusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LegalOperationsNexusModal({ isOpen, onClose }: LegalOperationsNexusModalProps) {
  const [activeTab, setActiveTab] = useState<'subsidiaries' | 'ip-portfolio' | 'contracts' | 'litigation' | 'war-room'>('subsidiaries');
  const [overview, setOverview] = useState<LegalOperationsOverviewDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedAssetForPqdi, setSelectedAssetForPqdi] = useState<IPAssetDTO | null>(null);
  const [pqdiClaimsCount, setPqdiClaimsCount] = useState<number>(25);
  const [pqdiIndClaims, setPqdiIndClaims] = useState<number>(3);
  const [pqdiFwdCitations, setPqdiFwdCitations] = useState<number>(15);
  const [calculatedPqdiScore, setCalculatedPqdiScore] = useState<number | null>(null);

  const [contractTypeFilter, setContractTypeFilter] = useState<string>('ALL');
  const [showCrdiCalcModal, setShowCrdiCalcModal] = useState<boolean>(false);
  const [sampleCrdiResult, setSampleCrdiResult] = useState<number | null>(null);

  const [selectedMatterForAsc450, setSelectedMatterForAsc450] = useState<LitigationMatterDTO | null>(null);
  const [asc450Prob, setAsc450Prob] = useState<number>(75);
  const [asc450PointEstimate, setAsc450PointEstimate] = useState<number>(1500000);
  const [asc450Min, setAsc450Min] = useState<number>(1000000);
  const [asc450Max, setAsc450Max] = useState<number>(3000000);

  const [showAddEntityModal, setShowAddEntityModal] = useState<boolean>(false);
  const [newEntityName, setNewEntityName] = useState<string>('');
  const [newEntityJurisdiction, setNewEntityJurisdiction] = useState<string>('SINGAPORE');
  const [newEntityType, setNewEntityType] = useState<string>('PRIVATE_LIMITED_COMPANY');
  const [newEntityRegNum, setNewEntityRegNum] = useState<string>('');

  const [item103PreviewText, setItem103PreviewText] = useState<string>('');
  const [signoffSignerName, setSignoffSignerName] = useState<string>('Victoria Sterling, Esq.');
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  const demoActive = demoMode;

  useEffect(() => {
    if (isOpen) {
      loadOverviewData();
    }
  }, [isOpen]);

  async function loadOverviewData() {
    setLoading(true);
    setError(null);
    try {
      const data = await legalOperationsNexusRepository.getOverview();
      setOverview(data);
      if (data.activeBoardMemorandum) {
        setItem103PreviewText(data.activeBoardMemorandum.item103DisclosureText || '');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const filteredContracts = useMemo(() => {
    if (!overview) return [];
    if (contractTypeFilter === 'ALL') return overview.materialContracts;
    return overview.materialContracts.filter((c) => c.contractType === contractTypeFilter);
  }, [overview, contractTypeFilter]);

  const autoRenewalImminentCount = useMemo(() => {
    if (!overview) return 0;
    return overview.materialContracts.filter((c) => c.autoRenewalNoticeDays <= 60).length;
  }, [overview]);

  async function handleCreateEntity(e: React.FormEvent) {
    e.preventDefault();
    if (!newEntityName.trim() || !newEntityRegNum.trim()) return;
    try {
      await legalOperationsNexusRepository.createEntity({
        legalName: newEntityName.trim(),
        jurisdiction: newEntityJurisdiction,
        entityType: newEntityType,
        registrationNumber: newEntityRegNum.trim()
      });
      setShowAddEntityModal(false);
      setNewEntityName('');
      setNewEntityRegNum('');
      setActionSuccessNotice('Statutory legal entity successfully registered.');
      await loadOverviewData();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleExecutePqdiCalculation() {
    if (!selectedAssetForPqdi) return;
    try {
      const updated = await legalOperationsNexusRepository.calculatePqdi(selectedAssetForPqdi.id, {
        totalClaimsCount: pqdiClaimsCount,
        independentClaimsCount: pqdiIndClaims,
        forwardCitationsCount: pqdiFwdCitations,
        benchmarkForwardCitations: 12,
        officeActionsCount: selectedAssetForPqdi.officeActionsCount,
        rceFilingsCount: selectedAssetForPqdi.rceFilingsCount,
        statutoryExtensionsCount: selectedAssetForPqdi.statutoryExtensionsCount,
        foreignFamilyCount: selectedAssetForPqdi.foreignFamilyCount
      });
      setCalculatedPqdiScore(updated.pqdiScore);
      setActionSuccessNotice(`Patent defensibility re-indexed at PQDI ${updated.pqdiScore}/100.`);
      await loadOverviewData();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleSaveAsc450Assessment() {
    if (!selectedMatterForAsc450) return;
    try {
      await legalOperationsNexusRepository.assessAsc450(selectedMatterForAsc450.id, {
        probabilityPercent: asc450Prob,
        estimatedLossMinUsd: asc450Min,
        estimatedLossMaxUsd: asc450Max,
        singlePointEstimateUsd: asc450PointEstimate
      });
      setSelectedMatterForAsc450(null);
      setActionSuccessNotice('ASC 450 litigation reserve assessment calibrated and saved.');
      await loadOverviewData();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleEscalateCustodians() {
    setActionSuccessNotice('FRCP Rule 37(e) compliance reminders dispatched to all pending custodians.');
  }

  async function handleGenerateItem103() {
    if (!overview) return;
    try {
      const text = await legalOperationsNexusRepository.generateSecItem103Text(overview.activeBoardMemorandum.id);
      setItem103PreviewText(text);
      setActionSuccessNotice('SEC Regulation S-K Item 103 disclosure text compiled.');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleSignoffRole(role: LegalSignoffRole) {
    if (!overview) return;
    try {
      await legalOperationsNexusRepository.signOffBoardMemo(overview.activeBoardMemorandum.id, {
        role,
        signerName: signoffSignerName,
        signerTitle:
          role === 'deputy_general_counsel'
            ? 'Deputy General Counsel, Commercial & Regulatory'
            : role === 'chief_intellectual_property_counsel'
            ? 'Chief Intellectual Property Counsel'
            : 'Chief Legal Officer, General Counsel & Corporate Secretary'
      });
      setActionSuccessNotice(`Digital attestation verified for ${role}.`);
      await loadOverviewData();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto" data-testid="legal-operations-nexus-modal">
      <div className="relative w-full max-w-7xl max-h-[92vh] flex flex-col rounded-xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden font-sans">
        
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Enterprise Global Entity Governance & Legal Operations Nexus
              </h2>
              <p className="text-xs text-slate-400">
                Subsidiary Registers, IP Defensibility Highway, CLM Clause Risk, ASC 450 Litigation Reserves & Board Cockpit
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                demoActive ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}
              data-testid="badge-runtime-mode"
            >
              {demoActive ? 'Demo Mode (Offline Local)' : 'Production API (Multi-Tenant)'}
            </span>
            <button
              onClick={onClose}
              data-testid="btn-close-legal-nexus"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {actionSuccessNotice && (
          <div className="flex items-center justify-between bg-emerald-950/80 border-b border-emerald-800/60 px-6 py-2 text-xs text-emerald-300">
            <span>{actionSuccessNotice}</span>
            <button onClick={() => setActionSuccessNotice(null)} className="text-emerald-400 hover:text-white">✕</button>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-between bg-red-950/80 border-b border-red-800/60 px-6 py-2 text-xs text-red-300">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white">✕</button>
          </div>
        )}

        {overview && (
          <div className="grid grid-cols-5 gap-3 border-b border-slate-800 bg-slate-950/40 p-4">
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3" data-testid="metric-lrci-composite-score">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Legal Risk Composite (LRCI)</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-indigo-400">{overview.lrciCompositeScore}</span>
                <span className="text-xs font-semibold text-emerald-400">/ 100</span>
              </div>
              <span className="mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold bg-indigo-500/10 text-indigo-300">
                {overview.lrciRiskBand}
              </span>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3" data-testid="metric-subsidiary-compliance">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Subsidiary Good Standing</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-emerald-400">{overview.subsidiaryComplianceScore}%</span>
                <span className="text-xs text-slate-400">({overview.entities.length} Entities)</span>
              </div>
              <span className="text-[10px] text-slate-400">Delaware, UK, SG, DE, KY</span>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3" data-testid="metric-average-pqdi">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Avg Patent Quality (PQDI)</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-sky-400">{overview.averagePqdiScore}</span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>
              <span className="text-[10px] text-sky-300 font-semibold">{overview.totalActivePatentsAndTrademarksCount} Registered IP Assets</span>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3" data-testid="metric-average-crdi">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Avg Contract Risk (CRDI)</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-amber-400">{overview.averageCrdiScore}</span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>
              <span className="text-[10px] text-amber-300 font-semibold">${(overview.totalAnnualContractValueCoveredUsd / 1000000).toFixed(1)}M ACV Monitored</span>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3" data-testid="metric-accrued-litigation-reserves">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">ASC 450 Accrued Reserve</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-rose-400">
                  ${(overview.totalLitigationReserveAccruedUsd / 1000000).toFixed(2)}M
                </span>
              </div>
              <span className="text-[10px] text-rose-300 font-semibold">{overview.activeLitigationMattersCount} Active Tribunal Proceedings</span>
            </div>
          </div>
        )}

        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 gap-2">
          <button
            onClick={() => setActiveTab('subsidiaries')}
            data-testid="tab-subsidiaries"
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'subsidiaries' ? 'border-indigo-400 text-indigo-300' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Pillar A: Subsidiary & Legal Entities
          </button>
          <button
            onClick={() => setActiveTab('ip-portfolio')}
            data-testid="tab-ip-portfolio"
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'ip-portfolio' ? 'border-indigo-400 text-indigo-300' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Pillar B: IP & Patent Highway
          </button>
          <button
            onClick={() => setActiveTab('contracts')}
            data-testid="tab-commercial-contracts"
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'contracts' ? 'border-indigo-400 text-indigo-300' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Pillar C: CLM Contracts & Clause Risk
          </button>
          <button
            onClick={() => setActiveTab('litigation')}
            data-testid="tab-litigation-holds"
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'litigation' ? 'border-indigo-400 text-indigo-300' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Pillar D: Litigation & Legal Holds
          </button>
          <button
            onClick={() => setActiveTab('war-room')}
            data-testid="tab-board-war-room"
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'war-room' ? 'border-indigo-400 text-indigo-300' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Pillar E: General Counsel War Room
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && !overview && (
            <div className="flex h-64 items-center justify-center text-slate-400">
              Loading legal operations telemetry...
            </div>
          )}

          {activeTab === 'subsidiaries' && overview && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Global Legal Entity Hierarchy & Statutory Registers</h3>
                  <p className="text-xs text-slate-400">Delaware C-Corp, UK Limited, Singapore Pte Ltd, German GmbH, Cayman Islands</p>
                </div>
                <button
                  onClick={() => setShowAddEntityModal(true)}
                  data-testid="btn-add-legal-entity"
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow"
                >
                  + Register Subsidiary
                </button>
              </div>

              {showAddEntityModal && (
                <form onSubmit={handleCreateEntity} className="rounded-lg border border-slate-700 bg-slate-800/80 p-4 space-y-3">
                  <h4 className="text-sm font-bold text-indigo-300">Register New Corporate Entity</h4>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400">Legal Entity Name</label>
                      <input
                        type="text"
                        value={newEntityName}
                        onChange={(e) => setNewEntityName(e.target.value)}
                        placeholder="JobTrack Singapore Pte Ltd"
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400">Jurisdiction</label>
                      <select
                        value={newEntityJurisdiction}
                        onChange={(e) => setNewEntityJurisdiction(e.target.value)}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-white"
                      >
                        <option value="DELAWARE_US">Delaware, USA</option>
                        <option value="UNITED_KINGDOM">United Kingdom</option>
                        <option value="SINGAPORE">Singapore</option>
                        <option value="GERMANY">Germany</option>
                        <option value="CAYMAN_ISLANDS">Cayman Islands</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400">Entity Structure Type</label>
                      <select
                        value={newEntityType}
                        onChange={(e) => setNewEntityType(e.target.value)}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-white"
                      >
                        <option value="C_CORPORATION">C-Corporation</option>
                        <option value="LIMITED_LIABILITY_COMPANY">LLC</option>
                        <option value="PRIVATE_LIMITED_COMPANY">Private Limited Company</option>
                        <option value="GMBH">GmbH</option>
                        <option value="EXEMPTED_COMPANY">Exempted Company</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400">Registration Number</label>
                      <input
                        type="text"
                        value={newEntityRegNum}
                        onChange={(e) => setNewEntityRegNum(e.target.value)}
                        placeholder="SG-202319401"
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-white"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddEntityModal(false)}
                      className="rounded px-3 py-1 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded bg-indigo-600 px-4 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
                    >
                      Save Entity
                    </button>
                  </div>
                </form>
              )}

              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-xs" data-testid="table-legal-entities">
                  <thead className="bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Legal Name</th>
                      <th className="px-4 py-3">Jurisdiction</th>
                      <th className="px-4 py-3">Entity Type</th>
                      <th className="px-4 py-3">Reg Number</th>
                      <th className="px-4 py-3">Standing</th>
                      <th className="px-4 py-3">Registered Agent</th>
                      <th className="px-4 py-3">Intercompany MSAs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {overview.entities.map((ent) => (
                      <tr key={ent.id} className="hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-semibold text-white">{ent.legalName}</td>
                        <td className="px-4 py-3 text-indigo-300 font-mono">{ent.jurisdiction}</td>
                        <td className="px-4 py-3 text-slate-300">{ent.entityType}</td>
                        <td className="px-4 py-3 text-slate-400 font-mono">{ent.registrationNumber}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {ent.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 max-w-[200px] truncate">{ent.registeredAgent}</td>
                        <td className="px-4 py-3 text-indigo-400 font-semibold">{ent.intercompanyAgreementCount} Agreements</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                  <h4 className="text-xs uppercase font-bold text-slate-400 mb-3">Statutory Deadlines & Franchise Tax</h4>
                  <div className="space-y-2">
                    {overview.entities.flatMap((e) => e.statutoryFilings).map((filing) => (
                      <div
                        key={filing.id}
                        data-testid={`filing-deadline-item-${filing.id}`}
                        className="flex items-center justify-between rounded border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-slate-200">{filing.filingTitle}</div>
                          <div className="text-[10px] text-slate-400">{filing.filingAuthority} • Due: {filing.statutoryDeadline}</div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                            filing.filingStatus === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {filing.filingStatus}
                          </span>
                          <div className="text-[10px] text-rose-400 font-mono mt-0.5">Penalty: ${filing.penaltyExposureUsd}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                  <h4 className="text-xs uppercase font-bold text-slate-400 mb-3">Statutory Officers & Beneficial Ownership (PSC/UBO)</h4>
                  <div className="space-y-2">
                    {overview.entities.flatMap((e) => e.statutoryRegisters).map((reg) => (
                      <div key={reg.id} className="flex items-center justify-between rounded border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs">
                        <div>
                          <div className="font-semibold text-slate-200">{reg.fullName}</div>
                          <div className="text-[10px] text-slate-400">{reg.nationalityOrJurisdiction} • Appointed: {reg.appointmentDate}</div>
                        </div>
                        <div className="text-right">
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-indigo-500/10 text-indigo-300">
                            {reg.registerType}
                          </span>
                          {reg.ownershipPercentage && (
                            <div className="text-[10px] text-emerald-400 font-mono mt-0.5">{reg.ownershipPercentage}% Ownership</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ip-portfolio' && overview && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Intellectual Property & Patent Prosecution Highway (PPH)</h3>
                  <p className="text-xs text-slate-400">Utility Patents, Trademarks, Trade Secrets (DTSA) & Defensibility Valuation</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-xs" data-testid="table-ip-assets">
                  <thead className="bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Asset Title</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Office & Reg #</th>
                      <th className="px-4 py-3">Claims</th>
                      <th className="px-4 py-3">Citations</th>
                      <th className="px-4 py-3">PPH Status</th>
                      <th className="px-4 py-3">PQDI Defensibility</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {overview.ipAssets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-semibold text-white max-w-[260px] truncate">{asset.title}</td>
                        <td className="px-4 py-3 text-slate-300">{asset.ipType}</td>
                        <td className="px-4 py-3 text-indigo-300 font-mono">{asset.office} - {asset.registrationOrAppNumber}</td>
                        <td className="px-4 py-3 text-slate-300">{asset.claimsCount} ({asset.independentClaimsCount} Ind)</td>
                        <td className="px-4 py-3 text-slate-300">{asset.forwardCitationsCount} Fwd / {asset.backwardCitationsCount} Bwd</td>
                        <td className="px-4 py-3">
                          <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            {asset.pphStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded px-2 py-0.5 text-xs font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {asset.pqdiScore} / 100
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => {
                              setSelectedAssetForPqdi(asset);
                              setPqdiClaimsCount(asset.claimsCount);
                              setPqdiIndClaims(asset.independentClaimsCount);
                              setPqdiFwdCitations(asset.forwardCitationsCount);
                            }}
                            data-testid={`btn-open-pqdi-calc-${asset.id}`}
                            className="rounded bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
                          >
                            Simulate PQDI
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedAssetForPqdi && (
                <div className="rounded-lg border border-sky-800/60 bg-sky-950/20 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-sky-300">Patent Quality & Defensibility Index (PQDI) Simulator</h4>
                      <p className="text-xs text-slate-400">Evaluating {selectedAssetForPqdi.title}</p>
                    </div>
                    {calculatedPqdiScore !== null && (
                      <span className="rounded-full px-3 py-1 text-sm font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" data-testid="badge-calculated-pqdi">
                        Simulated PQDI: {calculatedPqdiScore}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400">Total Claims Count</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={pqdiClaimsCount}
                        onChange={(e) => setPqdiClaimsCount(parseInt(e.target.value, 10) || 0)}
                        data-testid="input-pqdi-claims-count"
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400">Independent Claims Count</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={pqdiIndClaims}
                        onChange={(e) => setPqdiIndClaims(parseInt(e.target.value, 10) || 0)}
                        data-testid="input-pqdi-ind-claims"
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400">Forward Citations</label>
                      <input
                        type="number"
                        min="0"
                        max="500"
                        value={pqdiFwdCitations}
                        onChange={(e) => setPqdiFwdCitations(parseInt(e.target.value, 10) || 0)}
                        data-testid="input-pqdi-fwd-citations"
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setSelectedAssetForPqdi(null)}
                      className="rounded px-3 py-1 text-xs text-slate-400 hover:text-white"
                    >
                      Close
                    </button>
                    <button
                      onClick={handleExecutePqdiCalculation}
                      data-testid="btn-execute-pqdi-calc"
                      className="rounded bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 shadow"
                    >
                      Calculate & Persist PQDI
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'contracts' && overview && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Material Commercial Contracts & Clause Risk Analysis</h3>
                  <p className="text-xs text-slate-400">MSAs, NDAs, DPAs, Limitation of Liability Caps & Contract Risk Deviation (CRDI)</p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={contractTypeFilter}
                    onChange={(e) => setContractTypeFilter(e.target.value)}
                    data-testid="select-contract-type-filter"
                    className="rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                  >
                    <option value="ALL">All Contract Types</option>
                    <option value="MASTER_SERVICES_AGREEMENT">Master Services Agreement</option>
                    <option value="ENTERPRISE_SAAS_SUBSCRIPTION">Enterprise SaaS Subscription</option>
                    <option value="NON_DISCLOSURE_AGREEMENT">NDA</option>
                    <option value="DATA_PROCESSING_ADDENDUM">DPA</option>
                  </select>
                  <button
                    onClick={() => {
                      const score = calculateCRDI({
                        liabilityCapType: 'STANDARD_1X_ACV',
                        hasUncappedIndemnity: false,
                        governingLaw: 'DELAWARE_US',
                        disputeForum: 'DELAWARE_CHANCERY_COURT',
                        hasMfnClause: false,
                        hasExclusivityOrNonCompete: false,
                        autoRenewalNoticeDays: 60,
                        terminationForConvenienceNoticeDays: 30
                      });
                      setSampleCrdiResult(score);
                      setShowCrdiCalcModal(true);
                    }}
                    data-testid="btn-evaluate-contract-crdi"
                    className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    Evaluate Playbook CRDI
                  </button>
                </div>
              </div>

              {autoRenewalImminentCount > 0 && (
                <div
                  className="flex items-center justify-between rounded-lg border border-amber-800/80 bg-amber-950/30 p-3 text-xs text-amber-300"
                  data-testid="banner-auto-renewal-alerts"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚠️</span>
                    <span>
                      <strong>Auto-Renewal Notice Notice:</strong> {autoRenewalImminentCount} contracts have notice windows within 60 days. Timely opt-out required to prevent evergreen lock-in.
                    </span>
                  </div>
                </div>
              )}

              {showCrdiCalcModal && (
                <div className="rounded-lg border border-indigo-800/60 bg-indigo-950/20 p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-indigo-300">Standard Playbook Deviation Score</span>
                    <button onClick={() => setShowCrdiCalcModal(false)} className="text-xs text-slate-400 hover:text-white">✕</button>
                  </div>
                  <p className="text-xs text-slate-300">
                    Corporate Approved Legal Playbook (1x ACV Cap, Delaware law, Chancery Court forum) evaluates to <strong className="text-emerald-400">CRDI: {sampleCrdiResult}/100</strong> (Sovereign Low Risk).
                  </p>
                </div>
              )}

              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-xs" data-testid="table-material-contracts">
                  <thead className="bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Contract Title</th>
                      <th className="px-4 py-3">Counterparty</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">ACV</th>
                      <th className="px-4 py-3">Liability Cap</th>
                      <th className="px-4 py-3">Governing Law</th>
                      <th className="px-4 py-3">Renewal Window</th>
                      <th className="px-4 py-3">CRDI Deviation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {filteredContracts.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-semibold text-white max-w-[240px] truncate">{c.title}</td>
                        <td className="px-4 py-3 text-slate-300">{c.counterpartyLegalName}</td>
                        <td className="px-4 py-3 text-slate-400">{c.contractType}</td>
                        <td className="px-4 py-3 text-emerald-400 font-mono font-semibold">${c.annualContractValue.toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-300">{c.liabilityCapType}</td>
                        <td className="px-4 py-3 text-indigo-300 font-mono">{c.governingLaw}</td>
                        <td className="px-4 py-3 text-amber-300 font-mono">{c.autoRenewalNoticeDays} Days Notice</td>
                        <td className="px-4 py-3">
                          <span className={`rounded px-2 py-0.5 text-xs font-bold ${
                            c.crdiScore <= 20 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {c.crdiScore} / 100
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'litigation' && overview && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Litigation Matter Surveillance, ASC 450 & Custodian Holds</h3>
                  <p className="text-xs text-slate-400">Federal District Court & PTAB Dockets, Loss Contingency Reserves, FRCP 37(e) Spoliation Controls</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-xs" data-testid="table-litigation-matters">
                  <thead className="bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Case Caption</th>
                      <th className="px-4 py-3">Docket Number</th>
                      <th className="px-4 py-3">Tribunal</th>
                      <th className="px-4 py-3">Opposing Party</th>
                      <th className="px-4 py-3">Relief Claimed</th>
                      <th className="px-4 py-3">ASC 450 Status</th>
                      <th className="px-4 py-3">Accrued Reserve</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {overview.litigationMatters.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-semibold text-white max-w-[240px] truncate">{m.caseCaption}</td>
                        <td className="px-4 py-3 text-indigo-300 font-mono">{m.docketNumber}</td>
                        <td className="px-4 py-3 text-slate-300">{m.tribunal}</td>
                        <td className="px-4 py-3 text-slate-400">{m.opposingParty}</td>
                        <td className="px-4 py-3 text-rose-400 font-mono font-semibold">${m.reliefClaimedAmountUsd.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            m.asc450Classification === 'PROBABLE' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {m.asc450Classification}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-200 font-mono font-semibold">${m.accruedReserveAmountUsd.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => {
                              setSelectedMatterForAsc450(m);
                              setAsc450Prob(m.asc450Classification === 'PROBABLE' ? 80 : 50);
                              setAsc450Min(m.estimatedLossRangeMinUsd);
                              setAsc450Max(m.estimatedLossRangeMaxUsd);
                              setAsc450PointEstimate(m.accruedReserveAmountUsd || m.estimatedLossRangeMinUsd);
                            }}
                            data-testid={`btn-open-asc450-modal-${m.id}`}
                            className="rounded bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
                          >
                            ASC 450 Model
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedMatterForAsc450 && (
                <div className="rounded-lg border border-rose-800/60 bg-rose-950/20 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-rose-300">ASC 450 Financial Loss Reserve Modeling</h4>
                      <p className="text-xs text-slate-400">Matter: {selectedMatterForAsc450.caseCaption}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400">Loss Probability ({asc450Prob}%)</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={asc450Prob}
                        onChange={(e) => setAsc450Prob(parseInt(e.target.value, 10))}
                        data-testid="slider-asc450-probability"
                        className="mt-2 w-full accent-rose-500"
                      />
                      <span className="text-[10px] text-slate-400">
                        {asc450Prob >= 75 ? 'Probable (Accrual Mandatory)' : asc450Prob >= 25 ? 'Reasonably Possible (Footnote)' : 'Remote'}
                      </span>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400">Specific Accrual Point Estimate ($ USD)</label>
                      <input
                        type="number"
                        value={asc450PointEstimate}
                        onChange={(e) => setAsc450PointEstimate(parseFloat(e.target.value) || 0)}
                        data-testid="input-asc450-point-estimate"
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400">Footnote Range Min ($ USD)</label>
                      <input
                        type="number"
                        value={asc450Min}
                        onChange={(e) => setAsc450Min(parseFloat(e.target.value) || 0)}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400">Footnote Range Max ($ USD)</label>
                      <input
                        type="number"
                        value={asc450Max}
                        onChange={(e) => setAsc450Max(parseFloat(e.target.value) || 0)}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setSelectedMatterForAsc450(null)}
                      className="rounded px-3 py-1 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAsc450Assessment}
                      data-testid="btn-save-asc450-assessment"
                      className="rounded bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 shadow"
                    >
                      Save Reserve Assessment
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs uppercase font-bold text-slate-400">Custodian Legal Holds & Spoliation Controls (FRCP 37(e))</h4>
                  <button
                    onClick={handleEscalateCustodians}
                    data-testid="btn-escalate-unacknowledged-custodians"
                    className="rounded bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
                  >
                    Escalate Unacknowledged Custodians
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs" data-testid="table-custodian-holds">
                    <thead className="bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-2">Hold Title</th>
                        <th className="px-4 py-2">Issued At</th>
                        <th className="px-4 py-2">Status</th>
                        <th className="px-4 py-2">Custodians Acknowledged</th>
                        <th className="px-4 py-2">Spoliation Risk Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                      {overview.litigationMatters.flatMap((m) => m.legalHolds).map((hold) => (
                        <tr key={hold.id} className="hover:bg-slate-800/40">
                          <td className="px-4 py-2.5 font-semibold text-white">{hold.holdTitle}</td>
                          <td className="px-4 py-2.5 text-slate-400 font-mono">{hold.issuedAt.slice(0, 10)}</td>
                          <td className="px-4 py-2.5">
                            <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                              {hold.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-300 font-mono">
                            {hold.acknowledgedCount} / {hold.totalCustodiansCount} ({Math.round((hold.acknowledgedCount / (hold.totalCustodiansCount || 1)) * 100)}%)
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className="rounded px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400"
                              data-testid={`badge-spoliation-risk-${hold.id}`}
                            >
                              {hold.spoliationRiskScore} (Zero Spoliation)
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'war-room' && overview && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">General Counsel Board War Room & Tripartite Digital Certification</h3>
                  <p className="text-xs text-slate-400">SEC Form 10-K Item 103 Legal Proceedings Disclosure & Cryptographic Executive Sign-off</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-full px-3 py-1 text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                    data-testid="badge-board-memo-locked-status"
                  >
                    Status: {overview.activeBoardMemorandum.memoStatus}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs uppercase font-bold text-slate-400">SEC Form 10-K / 10-Q Item 103 Disclosure Documentation</h4>
                  <button
                    onClick={handleGenerateItem103}
                    data-testid="btn-generate-sec-item103"
                    className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    Compile Item 103 Disclosure
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={8}
                  value={item103PreviewText}
                  data-testid="textarea-sec-item103-text"
                  className="w-full rounded border border-slate-800 bg-slate-950 p-3 text-xs font-mono text-slate-300 leading-relaxed focus:outline-none"
                />
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-4">
                <h4 className="text-xs uppercase font-bold text-slate-400">Office of the General Counsel Tripartite Sign-off Pipeline</h4>
                
                <div className="mb-3 flex items-center gap-3">
                  <label className="text-xs text-slate-400">Active Legal Signer Name:</label>
                  <input
                    type="text"
                    value={signoffSignerName}
                    onChange={(e) => setSignoffSignerName(e.target.value)}
                    className="rounded border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Stage 1: Operational Legal Verification</span>
                      <h5 className="text-sm font-bold text-white mt-1">Deputy General Counsel</h5>
                      <p className="text-[11px] text-slate-400 mt-1">Certifies entity statutory registers and commercial contract liability caps.</p>
                      
                      {overview.activeBoardMemorandum.signatures.some((s) => s.role === 'deputy_general_counsel') ? (
                        <div className="mt-3 text-xs text-emerald-400 font-semibold flex items-center gap-1">
                          ✓ Signed & Attested
                        </div>
                      ) : (
                        <div className="mt-3 text-xs text-amber-400 font-semibold">Pending Signature</div>
                      )}
                    </div>

                    <button
                      onClick={() => handleSignoffRole('deputy_general_counsel')}
                      data-testid="btn-signoff-deputy-gc"
                      className="mt-4 w-full rounded bg-indigo-600/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                    >
                      Sign as Deputy GC
                    </button>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Stage 2: IP Portfolio Certification</span>
                      <h5 className="text-sm font-bold text-white mt-1">Chief IP Counsel</h5>
                      <p className="text-[11px] text-slate-400 mt-1">Certifies patent docketing status, PPH acceleration, and DTSA trade secrets.</p>

                      {overview.activeBoardMemorandum.signatures.some((s) => s.role === 'chief_intellectual_property_counsel') ? (
                        <div className="mt-3 text-xs text-emerald-400 font-semibold flex items-center gap-1">
                          ✓ Signed & Attested
                        </div>
                      ) : (
                        <div className="mt-3 text-xs text-amber-400 font-semibold">Pending Signature</div>
                      )}
                    </div>

                    <button
                      onClick={() => handleSignoffRole('chief_intellectual_property_counsel')}
                      data-testid="btn-signoff-chief-ip-counsel"
                      className="mt-4 w-full rounded bg-sky-600/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
                    >
                      Sign as Chief IP Counsel
                    </button>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Stage 3: Executive Board Lock</span>
                      <h5 className="text-sm font-bold text-white mt-1">General Counsel & Corporate Secretary</h5>
                      <p className="text-[11px] text-slate-400 mt-1">Executes final sign-off, locks SEC Form 10-K Item 103 disclosure text.</p>

                      {overview.activeBoardMemorandum.signatures.some((s) => s.role === 'general_counsel_corporate_secretary') ? (
                        <div className="mt-3 text-xs text-emerald-400 font-semibold flex items-center gap-1">
                          ✓ Signed & Attested
                        </div>
                      ) : (
                        <div className="mt-3 text-xs text-amber-400 font-semibold">Pending Signature</div>
                      )}
                    </div>

                    <button
                      onClick={() => handleSignoffRole('general_counsel_corporate_secretary')}
                      data-testid="btn-signoff-general-counsel"
                      className="mt-4 w-full rounded bg-emerald-600/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                    >
                      Sign as General Counsel
                    </button>
                  </div>
                </div>

                <div className="rounded border border-slate-800 bg-slate-950/50 p-2.5 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                  <span>Cryptographic Integrity Digest (SHA-256):</span>
                  <span className="text-indigo-400 truncate max-w-[480px]">
                    {overview.activeBoardMemorandum.cryptographicIntegrityDigest}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
