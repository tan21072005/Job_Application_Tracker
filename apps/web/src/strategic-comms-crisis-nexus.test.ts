import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateNetSentimentScore,
  calculateNarrativeVelocityIndex,
  calculateViralPropagationVector,
  calculateBrandReputationResilienceIndex,
  compileOmnichannelHoldingStatement,
  evaluateQaBridgeTransition
} from './domain';
import { strategicCommsNexusRepository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Strategic Communications, Crisis Management & Reputation Nexus', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('computes Net Sentiment Score within bounds and applies hostile weighting', () => {
    const balanced = calculateNetSentimentScore({ positive: 50, neutral: 100, negative: 50, hostileAdversarial: 0 });
    expect(balanced).toBe(0);

    const acuteHostile = calculateNetSentimentScore({ positive: 10, neutral: 20, negative: 30, hostileAdversarial: 40 });
    expect(acuteHostile).toBeLessThanOrEqual(-80);
    expect(acuteHostile).toBeGreaterThanOrEqual(-100);

    const zero = calculateNetSentimentScore({ positive: 0, neutral: 0, negative: 0, hostileAdversarial: 0 });
    expect(zero).toBe(0);
  });

  it('evaluates Narrative Velocity Index tracking mention surge and syndication', () => {
    const baseline = calculateNarrativeVelocityIndex({
      hourlyMentionsCurrent: 20,
      hourlyMentionsPrevious: 20,
      tier1OutletCount: 1,
      syndicationMultiplier: 1.0
    });
    const surge = calculateNarrativeVelocityIndex({
      hourlyMentionsCurrent: 800,
      hourlyMentionsPrevious: 80,
      tier1OutletCount: 12,
      syndicationMultiplier: 3.0
    });
    expect(surge).toBeGreaterThan(baseline);
    expect(surge).toBeLessThanOrEqual(100);
  });

  it('evaluates Viral Propagation Vector R_0 against epidemic threshold', () => {
    const contained = calculateViralPropagationVector({
      retweetShareRatio: 0.4,
      influencerCentralityFactor: 0.9,
      narrativeHalfLifeHours: 1.5
    });
    expect(contained).toBeLessThan(1.0);

    const viralContagion = calculateViralPropagationVector({
      retweetShareRatio: 5.2,
      influencerCentralityFactor: 3.1,
      narrativeHalfLifeHours: 14.0
    });
    expect(viralContagion).toBeGreaterThan(2.0);
  });

  it('calculates Brand Reputation Resilience Index (BRRI) composite scores', () => {
    const brri = calculateBrandReputationResilienceIndex({
      netSentimentScore: -40,
      narrativeVelocityIndex: 55,
      viralPropagationVector: 1.4,
      stakeholderTrustScores: [70, 75, 80, 65, 70],
      verifiedFactCount: 12,
      activeRumorCount: 4
    });
    expect(brri.compositeScore).toBeGreaterThanOrEqual(0);
    expect(brri.compositeScore).toBeLessThanOrEqual(100);
    expect(brri.resilienceBand).toBeDefined();
    expect(brri.sentimentStabilityScore).toBeGreaterThanOrEqual(0);
    expect(brri.velocityMitigationFactor).toBeGreaterThanOrEqual(0);
  });

  it('compiles holding statements with statutory safe harbors and content hash', () => {
    const statement = compileOmnichannelHoldingStatement({
      incidentTitle: 'Core Cluster Lateral Incursion',
      playbookType: 'cyber_ransomware_data_breach',
      targetTier: 'tier_2_institutional_investors',
      toneCalibration: 'authoritative_transparent',
      headline: 'Enterprise Security Remediation Notice',
      bodyText: 'Our forensic response teams have successfully isolated the perimeter.',
      includePslraSafeHarbor: true,
      includeRegulationFdNotice: true
    });
    expect(statement.safeHarborDisclaimer).toContain('Private Securities Litigation Reform Act of 1995');
    expect(statement.regulationFdNotice).toContain('Regulation FD');
    expect(statement.contentHashSha256).toMatch(/^sha256_/);
  });

  it('evaluates ABC bridge techniques and defaults', () => {
    const factsTransition = evaluateQaBridgeTransition('bridge_to_facts');
    expect(factsTransition).toContain('verified engineering');

    const valuesTransition = evaluateQaBridgeTransition('bridge_to_values');
    expect(valuesTransition).toContain('organizational priority');

    const custom = evaluateQaBridgeTransition('bridge_to_action', 'Here is what we immediately did:');
    expect(custom).toBe('Here is what we immediately did:');
  });

  it('executes full repository lifecycle in demo mode with parity', async () => {
    const overview = await strategicCommsNexusRepository.getOverview();
    expect(overview.activeIncidents.length).toBeGreaterThan(0);
    expect(overview.primaryActiveIncident).toBeDefined();
    expect(overview.mediaSummary.totalMentions).toBeGreaterThan(0);
    expect(overview.holdingStatements.length).toBeGreaterThan(0);
    expect(overview.factMoatSummary.totalVerifiedFacts).toBeGreaterThan(0);
    expect(overview.resilienceIndex.compositeScore).toBeGreaterThan(0);

    const newIncident = await strategicCommsNexusRepository.createIncident({
      title: 'Sudden Regulatory Civil Subpoena on Trading Telemetry',
      playbookType: 'regulatory_enforcement_subpoena',
      initialSeverity: 'level_3_serious_reputational_threat',
      incidentCommander: 'David Zhao, VP Legal Ops',
      communicationsLead: 'Marcus Vance, Head of Comms',
      legalCounselLead: 'Rachel Thorne, General Counsel',
      technicalLead: 'Sarah Lin, Lead SRE',
      summary: 'Voluntary document production request received regarding automated algorithmic execution.'
    });
    expect(newIncident.id).toBeDefined();
    expect(newIncident.checkpoints.length).toBe(5);

    const newStatement = await strategicCommsNexusRepository.createHoldingStatement({
      incidentId: newIncident.id,
      targetTier: 'tier_4_regulators_government',
      toneCalibration: 'regulatory_compliant_measured',
      headline: 'JobTrack Cooperates Fully with Regulatory Information Requests',
      bodyText: 'We maintain continuous proactive transparency with all supervisory authorities.',
      includePslraSafeHarbor: true,
      includeRegulationFdNotice: false
    });
    expect(newStatement.id).toBeDefined();
    expect(newStatement.status).toBe('pending_legal_review');

    const factEntry = await strategicCommsNexusRepository.registerFactMoatEntry({
      incidentId: newIncident.id,
      factClaim: 'All requested algorithm logs were preserved in accordance with Rule 17a-4.',
      technicalCorroboration: 'WORM storage compliance certification and hash chain validation.',
      sourceOwner: 'David Zhao',
      corroborationStatus: 'verified_corroborated',
      refutedRumor: 'Hostile rumor claiming destruction of trading records.',
      evidenceReferenceId: 'REG-WORM-8812'
    });
    expect(factEntry.id).toBeDefined();
    expect(factEntry.corroborationStatus).toBe('verified_corroborated');

    const qaItem = await strategicCommsNexusRepository.recordQaBridgeItem({
      incidentId: newIncident.id,
      hostileQuestion: 'Are regulatory authorities preparing criminal indictments against your trading desk?',
      anticipatedOutlet: 'Bloomberg',
      bridgeTechnique: 'bridge_to_facts',
      pivotMessage: 'This is a standard civil information request with zero allegations of misconduct.',
      riskRating: 8
    });
    expect(qaItem.id).toBeDefined();

    const signoff1 = await strategicCommsNexusRepository.submitSignoff({
      holdingStatementId: newStatement.id,
      role: 'head_of_communications',
      signerName: 'Marcus Vance'
    });
    expect(signoff1.headOfCommsSignoff?.isSigned).toBe(true);
    expect(signoff1.isFullyAuthorized).toBe(false);

    const signoff2 = await strategicCommsNexusRepository.submitSignoff({
      holdingStatementId: newStatement.id,
      role: 'chief_legal_officer',
      signerName: 'Rachel Thorne',
      legalComments: 'Reviewed for PSLRA safe harbor.'
    });
    expect(signoff2.chiefLegalOfficerSignoff?.isSigned).toBe(true);
    expect(signoff2.isFullyAuthorized).toBe(false);

    const signoff3 = await strategicCommsNexusRepository.submitSignoff({
      holdingStatementId: newStatement.id,
      role: 'chief_executive_officer',
      signerName: 'Elena Sterling'
    });
    expect(signoff3.ceoSignoff?.isSigned).toBe(true);
    expect(signoff3.isFullyAuthorized).toBe(true);

    const updatedOverview = await strategicCommsNexusRepository.getOverview();
    const approved = updatedOverview.holdingStatements.find((s: any) => s.id === newStatement.id);
    expect(approved?.status).toBe('approved_for_release');
  });
});
