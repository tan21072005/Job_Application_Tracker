import type { ValidationResult } from './validators.ts';

export type EquityGrantType = 'iso' | 'nso' | 'rsu' | 'phantom' | 'esop';

export type VestingScheduleType =
  | 'standard_4yr_1yr_cliff'
  | 'monthly_no_cliff'
  | 'backloaded_amazon_style'
  | 'milestone_based'
  | 'custom';

export type AccelerationClause =
  | 'none'
  | 'single_trigger_acceleration'
  | 'double_trigger_acceleration';

export type LiquidationPreferenceType =
  | 'non_participating'
  | 'full_participating'
  | 'capped_participating';

export type TaxJurisdiction =
  | 'us_federal_california'
  | 'us_federal_texas'
  | 'vietnam_pit';

export interface PreferredTierDTO {
  tierName: string;
  originalInvestmentAmount: number;
  sharesIssued: number;
  preferenceMultiple: number;
  participationType: LiquidationPreferenceType;
  participationCapMultiple?: number;
  seniorityRank: number;
}

export interface CapTableSnapshotDTO {
  totalFullyDilutedShares: number;
  commonShares: number;
  unallocatedOptionPoolShares: number;
  preferredTiers: PreferredTierDTO[];
}

export interface ExecutiveEquityGrantDTO {
  id: string;
  userId?: string;
  applicationId?: string | null;
  company: string;
  role: string;
  grantType: EquityGrantType;
  shareCount: number;
  strikePrice: number;
  currentFmv: number;
  preferredPrice: number;
  grantDate: string;
  vestingStartDate: string;
  vestingScheduleType: VestingScheduleType;
  cliffMonths: number;
  vestingDurationMonths: number;
  postTerminationExerciseMonths: number;
  accelerationClause: AccelerationClause;
  hasEarlyExercise: boolean;
  section83bElected: boolean;
  customVestingPercentages?: number[];
}

export interface DilutionRoundDTO {
  roundName: string;
  preMoneyValuation: number;
  capitalRaised: number;
  newOptionPoolExpansionPercent: number;
  issuedShareCount: number;
  postMoneyValuation: number;
  investorSharePercentage: number;
  cumulativeDilutionFactor: number;
}

export interface DilutionSimulationResultDTO {
  finalCapTable: CapTableSnapshotDTO;
  executiveDilutedShares: number;
  executiveOwnershipPercent: number;
  roundByRoundSummary: {
    roundName: string;
    preMoneyValuation: number;
    capitalRaised: number;
    postMoneyValuation: number;
    totalDilutedSharesPostRound: number;
    executiveOwnershipPercentPostRound: number;
  }[];
}

export interface WaterfallBreakdownDTO {
  exitValuation: number;
  preferredPayoutTotal: number;
  commonPayoutTotal: number;
  commonSharePrice: number;
  executiveShareCountDiluted: number;
  executiveGrossPayout: number;
  executiveExerciseCost: number;
  executiveNetPreTax: number;
  executiveNetPostTax: number;
  effectiveTaxRatePercent: number;
  returnMultipleOnStrike: number;
  preferredParticipationSummary: {
    tierName: string;
    payout: number;
    convertedToCommon: boolean;
  }[];
}

export interface TaxOptimizationAnalysisDTO {
  jurisdiction: TaxJurisdiction;
  totalExerciseCost: number;
  spreadAtExercise: number;
  ordinaryIncomeTaxAtExercise: number;
  alternativeMinimumTaxAtExercise: number;
  capitalGainAtSale: number;
  capitalGainsTaxAtSale: number;
  totalTaxLiability: number;
  netCashRetained: number;
  effectiveOverallTaxRatePercent: number;
  optimalActionPlan: string[];
}

export interface EquityModelDTO {
  id: string;
  userId?: string;
  applicationId?: string | null;
  modelName: string;
  grant: ExecutiveEquityGrantDTO;
  capTable: CapTableSnapshotDTO;
  dilutionRounds: DilutionRoundDTO[];
  exitScenarios: WaterfallBreakdownDTO[];
  taxAnalysis: TaxOptimizationAnalysisDTO;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutiveEquityGrantMutationDTO {
  applicationId?: string | null;
  company: string;
  role: string;
  grantType: EquityGrantType;
  shareCount: number;
  strikePrice: number;
  currentFmv: number;
  preferredPrice: number;
  grantDate: string;
  vestingStartDate: string;
  vestingScheduleType: VestingScheduleType;
  cliffMonths: number;
  vestingDurationMonths: number;
  postTerminationExerciseMonths: number;
  accelerationClause: AccelerationClause;
  hasEarlyExercise: boolean;
  section83bElected: boolean;
  customVestingPercentages?: number[];
}

export interface EquityModelMutationDTO {
  applicationId?: string | null;
  modelName: string;
  grant: ExecutiveEquityGrantMutationDTO;
  capTable: CapTableSnapshotDTO;
  dilutionRounds: DilutionRoundDTO[];
  exitValuations: number[];
  taxJurisdiction: TaxJurisdiction;
  notes?: string;
}

export interface ExecutivePackageComparisonDTO {
  baselineModel: EquityModelDTO;
  counterOfferModel: EquityModelDTO;
  riskAdjustedExpectedValueDelta: number;
  downsidePayoutDelta: number;
  upsidePayoutDelta: number;
  breakevenValuationDelta: number;
  recommendationVerdict: string;
  keyDifferentiators: string[];
}

export function calculateDilutionPipeline(
  initialCapTable: CapTableSnapshotDTO,
  executiveShares: number,
  rounds: DilutionRoundDTO[]
): DilutionSimulationResultDTO {
  let currentTotalShares = initialCapTable.totalFullyDilutedShares;
  const currentPreferredTiers = [...initialCapTable.preferredTiers];
  let cumulativeDilution = 1.0;

  const roundSummaries: {
    roundName: string;
    preMoneyValuation: number;
    capitalRaised: number;
    postMoneyValuation: number;
    totalDilutedSharesPostRound: number;
    executiveOwnershipPercentPostRound: number;
  }[] = [];

  for (const round of rounds) {
    const postMoney = round.preMoneyValuation + round.capitalRaised;
    const sharePrice = currentTotalShares > 0 ? round.preMoneyValuation / currentTotalShares : 0;
    const newInvestorShares = sharePrice > 0 ? round.capitalRaised / sharePrice : 0;
    
    const poolExpansionRatio = Math.max(0, Math.min(0.30, round.newOptionPoolExpansionPercent / 100));
    const sharesBeforePool = currentTotalShares + newInvestorShares;
    const poolSharesToAdd = poolExpansionRatio > 0 ? (sharesBeforePool * poolExpansionRatio) / (1 - poolExpansionRatio) : 0;

    const newTotalShares = sharesBeforePool + poolSharesToAdd;
    const roundDilutionFactor = newTotalShares > 0 ? currentTotalShares / newTotalShares : 1;
    cumulativeDilution *= roundDilutionFactor;

    currentPreferredTiers.push({
      tierName: round.roundName,
      originalInvestmentAmount: round.capitalRaised,
      sharesIssued: newInvestorShares,
      preferenceMultiple: 1.0,
      participationType: 'non_participating',
      seniorityRank: currentPreferredTiers.length + 1
    });

    currentTotalShares = newTotalShares;
    const execOwnership = currentTotalShares > 0 ? (executiveShares / currentTotalShares) * 100 : 0;

    roundSummaries.push({
      roundName: round.roundName,
      preMoneyValuation: round.preMoneyValuation,
      capitalRaised: round.capitalRaised,
      postMoneyValuation: postMoney,
      totalDilutedSharesPostRound: Math.round(currentTotalShares),
      executiveOwnershipPercentPostRound: Number(execOwnership.toFixed(4))
    });
  }

  const finalCapTable: CapTableSnapshotDTO = {
    totalFullyDilutedShares: Math.round(currentTotalShares),
    commonShares: initialCapTable.commonShares,
    unallocatedOptionPoolShares: initialCapTable.unallocatedOptionPoolShares,
    preferredTiers: currentPreferredTiers
  };

  const finalExecOwnership = currentTotalShares > 0 ? (executiveShares / currentTotalShares) * 100 : 0;

  return {
    finalCapTable,
    executiveDilutedShares: executiveShares,
    executiveOwnershipPercent: Number(finalExecOwnership.toFixed(4)),
    roundByRoundSummary: roundSummaries
  };
}

export function computeExerciseCostAndTax(
  grant: ExecutiveEquityGrantDTO,
  targetFmv: number,
  exitPricePerShare: number,
  jurisdiction: TaxJurisdiction
): TaxOptimizationAnalysisDTO {
  const totalExerciseCost = grant.shareCount * grant.strikePrice;
  const spreadAtExercise = grant.shareCount * Math.max(0, targetFmv - grant.strikePrice);
  const totalGainAtExit = grant.shareCount * Math.max(0, exitPricePerShare - grant.strikePrice);

  let ordinaryIncomeTaxAtExercise = 0;
  let alternativeMinimumTaxAtExercise = 0;
  let capitalGainAtSale = 0;
  let capitalGainsTaxAtSale = 0;
  const optimalActionPlan: string[] = [];

  if (jurisdiction === 'vietnam_pit') {
    if (grant.grantType === 'esop' || grant.grantType === 'rsu') {
      ordinaryIncomeTaxAtExercise = spreadAtExercise * 0.35;
      capitalGainAtSale = grant.shareCount * exitPricePerShare;
      capitalGainsTaxAtSale = capitalGainAtSale * 0.001;
      optimalActionPlan.push('Ke khai thue thu nhap ca nhan theo bieu thue luy tien tung phan cho phan chenh lech ESOP tai thoi diem nhan co phieu.');
      optimalActionPlan.push('Ap dung thue suat 0.1% tren tong gia tri chuyen nhuong chung khoan khi thoai von exit.');
    } else {
      ordinaryIncomeTaxAtExercise = spreadAtExercise * 0.35;
      capitalGainsTaxAtSale = Math.max(0, totalGainAtExit - spreadAtExercise) * 0.20;
      optimalActionPlan.push('Thoa thuan co che thuong tien mat ho tro dong thue TNCN khi thuc hien quyen chon co phan.');
    }
  } else if (jurisdiction === 'us_federal_california') {
    if (grant.grantType === 'iso') {
      if (grant.section83bElected && grant.hasEarlyExercise) {
        ordinaryIncomeTaxAtExercise = 0;
        alternativeMinimumTaxAtExercise = 0;
        capitalGainAtSale = totalGainAtExit;
        capitalGainsTaxAtSale = capitalGainAtSale * (0.20 + 0.038 + 0.133);
        optimalActionPlan.push('Section 83(b) election successfully locked zero AMT spread at grant.');
        optimalActionPlan.push('Long term capital gains rate achieved across full appreciation spectrum.');
      } else {
        alternativeMinimumTaxAtExercise = spreadAtExercise * 0.28;
        capitalGainAtSale = Math.max(0, totalGainAtExit - spreadAtExercise);
        capitalGainsTaxAtSale = capitalGainAtSale * (0.20 + 0.038 + 0.133);
        optimalActionPlan.push('Holding ISOs beyond calendar year of exercise triggers California AMT liability.');
        optimalActionPlan.push('Evaluate secondary market sale or disqualifying disposition if liquidity is immediate.');
      }
    } else if (grant.grantType === 'nso') {
      ordinaryIncomeTaxAtExercise = spreadAtExercise * (0.37 + 0.133 + 0.0235);
      capitalGainAtSale = Math.max(0, totalGainAtExit - spreadAtExercise);
      capitalGainsTaxAtSale = capitalGainAtSale * (0.20 + 0.038 + 0.133);
      optimalActionPlan.push('NSO exercise triggers mandatory federal, state, and Medicare withholding as W2 compensation.');
    } else {
      ordinaryIncomeTaxAtExercise = (grant.shareCount * targetFmv) * (0.37 + 0.133 + 0.0235);
      capitalGainAtSale = grant.shareCount * Math.max(0, exitPricePerShare - targetFmv);
      capitalGainsTaxAtSale = capitalGainAtSale * (0.20 + 0.038 + 0.133);
      optimalActionPlan.push('RSU vesting is taxed as ordinary income at prevailing market price.');
    }
  } else {
    if (grant.grantType === 'iso') {
      alternativeMinimumTaxAtExercise = spreadAtExercise * 0.28;
      capitalGainAtSale = Math.max(0, totalGainAtExit - spreadAtExercise);
      capitalGainsTaxAtSale = capitalGainAtSale * (0.20 + 0.038);
      optimalActionPlan.push('No state income tax in Texas reduces effective total tax drag.');
    } else if (grant.grantType === 'nso') {
      ordinaryIncomeTaxAtExercise = spreadAtExercise * (0.37 + 0.0235);
      capitalGainAtSale = Math.max(0, totalGainAtExit - spreadAtExercise);
      capitalGainsTaxAtSale = capitalGainAtSale * (0.20 + 0.038);
      optimalActionPlan.push('Federal ordinary income tax applies at exercise with zero state piggyback.');
    } else {
      ordinaryIncomeTaxAtExercise = (grant.shareCount * targetFmv) * (0.37 + 0.0235);
      capitalGainAtSale = grant.shareCount * Math.max(0, exitPricePerShare - targetFmv);
      capitalGainsTaxAtSale = capitalGainAtSale * (0.20 + 0.038);
      optimalActionPlan.push('RSU ordinary income taxation confined to federal tax schedule.');
    }
  }

  const totalTaxLiability = ordinaryIncomeTaxAtExercise + alternativeMinimumTaxAtExercise + capitalGainsTaxAtSale;
  const netCashRetained = Math.max(0, totalGainAtExit - totalTaxLiability);
  const effectiveOverallTaxRatePercent = totalGainAtExit > 0 ? (totalTaxLiability / totalGainAtExit) * 100 : 0;

  return {
    jurisdiction,
    totalExerciseCost,
    spreadAtExercise,
    ordinaryIncomeTaxAtExercise: Number(ordinaryIncomeTaxAtExercise.toFixed(2)),
    alternativeMinimumTaxAtExercise: Number(alternativeMinimumTaxAtExercise.toFixed(2)),
    capitalGainAtSale: Number(capitalGainAtSale.toFixed(2)),
    capitalGainsTaxAtSale: Number(capitalGainsTaxAtSale.toFixed(2)),
    totalTaxLiability: Number(totalTaxLiability.toFixed(2)),
    netCashRetained: Number(netCashRetained.toFixed(2)),
    effectiveOverallTaxRatePercent: Number(effectiveOverallTaxRatePercent.toFixed(2)),
    optimalActionPlan
  };
}

export function resolveLiquidationWaterfall(
  exitValuation: number,
  capTable: CapTableSnapshotDTO,
  executiveShares: number,
  strikePrice: number,
  jurisdiction: TaxJurisdiction
): WaterfallBreakdownDTO {
  const sortedTiers = [...capTable.preferredTiers].sort((a, b) => b.seniorityRank - a.seniorityRank);
  let remainingExitProceeds = Math.max(0, exitValuation);
  let preferredPayoutTotal = 0;
  const participationSummary: { tierName: string; payout: number; convertedToCommon: boolean }[] = [];

  let commonConversionShares = 0;
  const tierConversionStatus: Map<string, boolean> = new Map();

  for (const tier of sortedTiers) {
    const proRataShare = capTable.totalFullyDilutedShares > 0 ? tier.sharesIssued / capTable.totalFullyDilutedShares : 0;
    const proRataValue = exitValuation * proRataShare;
    const preferenceEntitlement = tier.originalInvestmentAmount * tier.preferenceMultiple;

    if (tier.participationType === 'non_participating') {
      if (proRataValue > preferenceEntitlement) {
        tierConversionStatus.set(tier.tierName, true);
        commonConversionShares += tier.sharesIssued;
      } else {
        tierConversionStatus.set(tier.tierName, false);
      }
    } else {
      tierConversionStatus.set(tier.tierName, false);
    }
  }

  for (const tier of sortedTiers) {
    const isConverted = tierConversionStatus.get(tier.tierName) || false;
    if (isConverted) {
      continue;
    }

    const entitlement = tier.originalInvestmentAmount * tier.preferenceMultiple;
    const payout = Math.min(remainingExitProceeds, entitlement);
    remainingExitProceeds -= payout;
    preferredPayoutTotal += payout;

    participationSummary.push({
      tierName: tier.tierName,
      payout,
      convertedToCommon: false
    });
  }

  for (const tier of sortedTiers) {
    if (tier.participationType === 'full_participating' && remainingExitProceeds > 0) {
      const shareOfRemaining = capTable.totalFullyDilutedShares > 0 ? (tier.sharesIssued / capTable.totalFullyDilutedShares) * remainingExitProceeds : 0;
      remainingExitProceeds -= shareOfRemaining;
      preferredPayoutTotal += shareOfRemaining;
      const existing = participationSummary.find(p => p.tierName === tier.tierName);
      if (existing) {
        existing.payout += shareOfRemaining;
      }
    } else if (tier.participationType === 'capped_participating' && remainingExitProceeds > 0) {
      const existing = participationSummary.find(p => p.tierName === tier.tierName);
      const currentPaid = existing ? existing.payout : 0;
      const capMultiple = tier.participationCapMultiple || 2.0;
      const maxTotal = tier.originalInvestmentAmount * capMultiple;
      const allowedAdditional = Math.max(0, maxTotal - currentPaid);
      const shareOfRemaining = capTable.totalFullyDilutedShares > 0 ? (tier.sharesIssued / capTable.totalFullyDilutedShares) * remainingExitProceeds : 0;
      const actualBonus = Math.min(shareOfRemaining, allowedAdditional);
      remainingExitProceeds -= actualBonus;
      preferredPayoutTotal += actualBonus;
      if (existing) {
        existing.payout += actualBonus;
      }
    }
  }

  const commonPayoutTotal = Math.max(0, remainingExitProceeds);
  const eligibleCommonShares = capTable.commonShares + commonConversionShares;
  const commonSharePrice = eligibleCommonShares > 0 ? commonPayoutTotal / eligibleCommonShares : 0;

  for (const tier of sortedTiers) {
    const isConverted = tierConversionStatus.get(tier.tierName) || false;
    if (isConverted) {
      const tierPayout = tier.sharesIssued * commonSharePrice;
      participationSummary.push({
        tierName: tier.tierName,
        payout: tierPayout,
        convertedToCommon: true
      });
      preferredPayoutTotal += tierPayout;
    }
  }

  const netPerShare = Math.max(0, commonSharePrice - strikePrice);
  const executiveGrossPayout = executiveShares * commonSharePrice;
  const executiveExerciseCost = executiveShares * strikePrice;
  const executiveNetPreTax = executiveShares * netPerShare;

  const mockGrant: ExecutiveEquityGrantDTO = {
    id: 'simulation',
    company: 'Target',
    role: 'Executive',
    grantType: 'iso',
    shareCount: executiveShares,
    strikePrice,
    currentFmv: commonSharePrice,
    preferredPrice: commonSharePrice,
    grantDate: '2024-01-01',
    vestingStartDate: '2024-01-01',
    vestingScheduleType: 'standard_4yr_1yr_cliff',
    cliffMonths: 12,
    vestingDurationMonths: 48,
    postTerminationExerciseMonths: 90,
    accelerationClause: 'double_trigger_acceleration',
    hasEarlyExercise: false,
    section83bElected: false
  };

  const taxAnalysis = computeExerciseCostAndTax(
    mockGrant,
    commonSharePrice,
    commonSharePrice,
    jurisdiction
  );

  const effectiveTaxRate = executiveNetPreTax > 0 ? (taxAnalysis.totalTaxLiability / executiveNetPreTax) : 0;
  const executiveNetPostTax = Math.max(0, executiveNetPreTax - taxAnalysis.totalTaxLiability);

  return {
    exitValuation,
    preferredPayoutTotal: Number(preferredPayoutTotal.toFixed(2)),
    commonPayoutTotal: Number(commonPayoutTotal.toFixed(2)),
    commonSharePrice: Number(commonSharePrice.toFixed(4)),
    executiveShareCountDiluted: executiveShares,
    executiveGrossPayout: Number(executiveGrossPayout.toFixed(2)),
    executiveExerciseCost: Number(executiveExerciseCost.toFixed(2)),
    executiveNetPreTax: Number(executiveNetPreTax.toFixed(2)),
    executiveNetPostTax: Number(executiveNetPostTax.toFixed(2)),
    effectiveTaxRatePercent: Number((effectiveTaxRate * 100).toFixed(2)),
    returnMultipleOnStrike: strikePrice > 0 ? Number((commonSharePrice / strikePrice).toFixed(2)) : 0,
    preferredParticipationSummary: participationSummary
  };
}

export function evaluateWaterfallMatrix(
  exitValuations: number[],
  capTable: CapTableSnapshotDTO,
  executiveShares: number,
  strikePrice: number,
  jurisdiction: TaxJurisdiction
): WaterfallBreakdownDTO[] {
  return exitValuations.map(val =>
    resolveLiquidationWaterfall(val, capTable, executiveShares, strikePrice, jurisdiction)
  );
}

export function compareExecutiveEquityPackages(
  modelA: EquityModelDTO,
  modelB: EquityModelDTO
): ExecutivePackageComparisonDTO {
  const exitA = modelA.exitScenarios;
  const exitB = modelB.exitScenarios;

  const evA = exitA.reduce((acc, s) => acc + s.executiveNetPostTax, 0) / (exitA.length || 1);
  const evB = exitB.reduce((acc, s) => acc + s.executiveNetPostTax, 0) / (exitB.length || 1);

  const downsideA = exitA[0]?.executiveNetPostTax || 0;
  const downsideB = exitB[0]?.executiveNetPostTax || 0;

  const upsideA = exitA[exitA.length - 1]?.executiveNetPostTax || 0;
  const upsideB = exitB[exitB.length - 1]?.executiveNetPostTax || 0;

  const breakevenA = exitA.find(s => s.executiveNetPreTax > 0)?.exitValuation || 0;
  const breakevenB = exitB.find(s => s.executiveNetPreTax > 0)?.exitValuation || 0;

  const differentiators: string[] = [];

  if (modelB.grant.postTerminationExerciseMonths > modelA.grant.postTerminationExerciseMonths) {
    differentiators.push(`Counter offer provides ${modelB.grant.postTerminationExerciseMonths} months PTEP versus ${modelA.grant.postTerminationExerciseMonths} months baseline.`);
  }

  if (modelB.grant.accelerationClause === 'double_trigger_acceleration' && modelA.grant.accelerationClause !== 'double_trigger_acceleration') {
    differentiators.push('Counter offer includes double-trigger acceleration protection upon change of control.');
  }

  if (downsideB > downsideA) {
    differentiators.push('Counter offer exhibits superior downside cushion at conservative exit thresholds.');
  }

  const verdict = evB > evA
    ? 'Counter offer yields higher risk-adjusted expected net payout across simulated valuation range.'
    : 'Baseline offer preserves higher upside retention or lower capital structure hurdles.';

  return {
    baselineModel: modelA,
    counterOfferModel: modelB,
    riskAdjustedExpectedValueDelta: Number((evB - evA).toFixed(2)),
    downsidePayoutDelta: Number((downsideB - downsideA).toFixed(2)),
    upsidePayoutDelta: Number((upsideB - upsideA).toFixed(2)),
    breakevenValuationDelta: Number((breakevenB - breakevenA).toFixed(2)),
    recommendationVerdict: verdict,
    keyDifferentiators: differentiators
  };
}

export function exportEquityModelToMarkdown(model: EquityModelDTO): string {
  const g = model.grant;
  const lines: string[] = [
    `# Executive Equity & Liquidity Analysis: ${model.modelName}`,
    '',
    `**Company:** ${g.company}  `,
    `**Executive Role:** ${g.role}  `,
    `**Grant Type:** ${g.grantType.toUpperCase()}  `,
    `**Generated Date:** ${new Date().toISOString().split('T')[0]}`,
    '',
    '---',
    '',
    '## 1. Executive Grant & Cap Table Baseline',
    '',
    '| Parameter | Value |',
    '| :--- | :--- |',
    `| Total Grant Shares | ${g.shareCount.toLocaleString('en-US')} |`,
    `| Strike Price | $${g.strikePrice.toFixed(2)} |`,
    `| Current 409A Fair Market Value | $${g.currentFmv.toFixed(2)} |`,
    `| Preferred Stock Price | $${g.preferredPrice.toFixed(2)} |`,
    `| Vesting Schedule | ${g.vestingScheduleType} (${g.vestingDurationMonths} months) |`,
    `| Cliff Duration | ${g.cliffMonths} months |`,
    `| Post-Termination Exercise Window (PTEP) | ${g.postTerminationExerciseMonths} months |`,
    `| Acceleration Provision | ${g.accelerationClause} |`,
    `| Section 83(b) Election | ${g.section83bElected ? 'Yes (Elected within 30 days)' : 'No'} |`,
    `| Fully Diluted Shares at Grant | ${model.capTable.totalFullyDilutedShares.toLocaleString('en-US')} |`,
    `| Initial Ownership Stake | ${((g.shareCount / (model.capTable.totalFullyDilutedShares || 1)) * 100).toFixed(4)}% |`,
    '',
    '## 2. Dilution Sensitivity & Future Financing Rounds',
    '',
    '| Financing Round | Pre-Money Val | Capital Raised | Post-Money Val | Post-Round Shares | Executive Ownership |',
    '| :--- | :--- | :--- | :--- | :--- | :--- |'
  ];

  for (const r of model.dilutionRounds) {
    const postMoney = r.preMoneyValuation + r.capitalRaised;
    lines.push(
      `| ${r.roundName} | $${(r.preMoneyValuation / 1_000_000).toFixed(1)}M | $${(r.capitalRaised / 1_000_000).toFixed(1)}M | $${(postMoney / 1_000_000).toFixed(1)}M | ${r.issuedShareCount.toLocaleString('en-US')} | ${r.cumulativeDilutionFactor.toFixed(4)}% |`
    );
  }

  lines.push(
    '',
    '## 3. Waterfall Exit & Net Proceed Matrix',
    '',
    '| Exit Valuation | Preferred Payout | Common Per-Share | Exec Gross Payout | Exercise Cost | Exec Net Pre-Tax | Exec Net Post-Tax | Return Multiple |',
    '| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |'
  );

  for (const s of model.exitScenarios) {
    lines.push(
      `| $${(s.exitValuation / 1_000_000).toFixed(1)}M | $${(s.preferredPayoutTotal / 1_000_000).toFixed(2)}M | $${s.commonSharePrice.toFixed(2)} | $${s.executiveGrossPayout.toLocaleString('en-US')} | $${s.executiveExerciseCost.toLocaleString('en-US')} | $${s.executiveNetPreTax.toLocaleString('en-US')} | $${s.executiveNetPostTax.toLocaleString('en-US')} | ${s.returnMultipleOnStrike}x |`
    );
  }

  lines.push(
    '',
    '## 4. Tax Optimization & Exercise Strategy',
    '',
    `**Tax Jurisdiction:** ${model.taxAnalysis.jurisdiction}`,
    '',
    `- **Out-of-Pocket Exercise Cost:** $${model.taxAnalysis.totalExerciseCost.toLocaleString('en-US')}`,
    `- **Spread Subject to Tax at Exercise:** $${model.taxAnalysis.spreadAtExercise.toLocaleString('en-US')}`,
    `- **Estimated Tax Liability at Exercise:** $${(model.taxAnalysis.ordinaryIncomeTaxAtExercise + model.taxAnalysis.alternativeMinimumTaxAtExercise).toLocaleString('en-US')}`,
    `- **Estimated Tax Liability at Liquidity Exit:** $${model.taxAnalysis.capitalGainsTaxAtSale.toLocaleString('en-US')}`,
    `- **Total Projected Tax Burden:** $${model.taxAnalysis.totalTaxLiability.toLocaleString('en-US')}`,
    `- **Effective Tax Rate:** ${model.taxAnalysis.effectiveOverallTaxRatePercent}%`,
    '',
    '### Strategic Action Items & Governance Checklist',
    ''
  );

  for (const action of model.taxAnalysis.optimalActionPlan) {
    lines.push(`- [ ] ${action}`);
  }

  if (model.notes) {
    lines.push('', '### Executive Notes', '', model.notes);
  }

  return lines.join('\n');
}

export function validateEquityGrantInput(input: unknown): ValidationResult<ExecutiveEquityGrantMutationDTO> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ok: false,
      message: 'Du lieu co phan khong hop le.',
      errors: { input: 'Phai la doi tuong JSON.' }
    };
  }

  const b = input as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const company = typeof b.company === 'string' ? b.company.trim() : '';
  if (!company) errors.company = 'Ten cong ty khong duoc de trong.';

  const role = typeof b.role === 'string' ? b.role.trim() : '';
  if (!role) errors.role = 'Vi tri cong viec khong duoc de trong.';

  const validGrantTypes: EquityGrantType[] = ['iso', 'nso', 'rsu', 'phantom', 'esop'];
  const grantType = typeof b.grantType === 'string' && validGrantTypes.includes(b.grantType as EquityGrantType)
    ? (b.grantType as EquityGrantType)
    : 'iso';

  const shareCount = Number(b.shareCount);
  if (isNaN(shareCount) || shareCount <= 0) {
    errors.shareCount = 'So luong co phan phai lon hon 0.';
  }

  const strikePrice = Number(b.strikePrice);
  if (isNaN(strikePrice) || strikePrice < 0) {
    errors.strikePrice = 'Gia thuc hien quyen phai >= 0.';
  }

  const currentFmv = Number(b.currentFmv);
  if (isNaN(currentFmv) || currentFmv < 0) {
    errors.currentFmv = 'Gia thi truong 409A phai >= 0.';
  }

  const preferredPrice = Number(b.preferredPrice);
  if (isNaN(preferredPrice) || preferredPrice < 0) {
    errors.preferredPrice = 'Gia co phieu uu dai phai >= 0.';
  }

  const cliffMonths = Number(b.cliffMonths) || 12;
  const vestingDurationMonths = Number(b.vestingDurationMonths) || 48;
  const postTerminationExerciseMonths = Number(b.postTerminationExerciseMonths) || 90;

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Loi xac thuc tham so co phan dai ngo.',
      errors
    };
  }

  return {
    ok: true,
    data: {
      applicationId: typeof b.applicationId === 'string' ? b.applicationId.trim() : null,
      company,
      role,
      grantType,
      shareCount,
      strikePrice,
      currentFmv,
      preferredPrice,
      grantDate: typeof b.grantDate === 'string' && b.grantDate ? b.grantDate : new Date().toISOString().split('T')[0],
      vestingStartDate: typeof b.vestingStartDate === 'string' && b.vestingStartDate ? b.vestingStartDate : new Date().toISOString().split('T')[0],
      vestingScheduleType: (b.vestingScheduleType as VestingScheduleType) || 'standard_4yr_1yr_cliff',
      cliffMonths,
      vestingDurationMonths,
      postTerminationExerciseMonths,
      accelerationClause: (b.accelerationClause as AccelerationClause) || 'none',
      hasEarlyExercise: Boolean(b.hasEarlyExercise),
      section83bElected: Boolean(b.section83bElected),
      customVestingPercentages: Array.isArray(b.customVestingPercentages) ? b.customVestingPercentages.map(Number) : undefined
    }
  };
}

export function validateEquityModelMutationInput(input: unknown): ValidationResult<EquityModelMutationDTO> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ok: false,
      message: 'Du lieu mo hinh thanh khoan khong hop le.',
      errors: { input: 'Phai la doi tuong JSON.' }
    };
  }

  const b = input as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const modelName = typeof b.modelName === 'string' ? b.modelName.trim() : '';
  if (!modelName) errors.modelName = 'Tieu de mo hinh khong duoc de trong.';

  let validatedGrant: ExecutiveEquityGrantMutationDTO | undefined;
  const grantValidation = validateEquityGrantInput(b.grant);
  if (!grantValidation.ok) {
    Object.assign(errors, grantValidation.errors);
  } else {
    validatedGrant = grantValidation.data;
  }

  if (!b.capTable || typeof b.capTable !== 'object') {
    errors.capTable = 'Thong tin bang von hoa (cap table) la bat buoc.';
  }

  const validTaxJurisdictions: TaxJurisdiction[] = ['us_federal_california', 'us_federal_texas', 'vietnam_pit'];
  const taxJurisdiction = typeof b.taxJurisdiction === 'string' && validTaxJurisdictions.includes(b.taxJurisdiction as TaxJurisdiction)
    ? (b.taxJurisdiction as TaxJurisdiction)
    : 'us_federal_california';

  if (Object.keys(errors).length > 0 || !validatedGrant) {
    return {
      ok: false,
      message: 'Loi xac thuc mo hinh co phan.',
      errors
    };
  }

  return {
    ok: true,
    data: {
      applicationId: typeof b.applicationId === 'string' ? b.applicationId.trim() : null,
      modelName,
      grant: validatedGrant,
      capTable: b.capTable as CapTableSnapshotDTO,
      dilutionRounds: Array.isArray(b.dilutionRounds) ? (b.dilutionRounds as DilutionRoundDTO[]) : [],
      exitValuations: Array.isArray(b.exitValuations) ? b.exitValuations.map(Number) : [25000000, 50000000, 100000000, 250000000, 500000000, 1000000000],
      taxJurisdiction,
      notes: typeof b.notes === 'string' ? b.notes.trim() : undefined
    }
  };
}
