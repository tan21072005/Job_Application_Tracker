import type { Pool } from 'pg';
import crypto from 'node:crypto';
import {
  type EsgStudioOverviewDTO,
  type GhgCarbonInventoryDTO,
  type RecordCarbonEmissionsRequestDTO,
  type TcfdScenarioModelDTO,
  type TcfdSimulationRequestDTO,
  type TcfdSimulationResultDTO,
  type DoubleMaterialityMatrixDTO,
  type UpdateMaterialityTopicRequestDTO,
  type EsrsTopicAssessmentDTO,
  type Scope3SupplyChainOverviewDTO,
  type SupplierDecarbonizationDTO,
  type SupplierDecarbonizationSimulationRequestDTO,
  type SupplierDecarbonizationSimulationResultDTO,
  type SecComplianceOverviewDTO,
  type GenerateBoardMemoRequestDTO,
  type ExecutiveEsgBoardMemorandumDTO,
  type BoardEsgSignoffRole,
  type EsgGovernanceStatusBand,
  type SupplierEsgTier,
  calculateGhgGrossAndNetEmissions,
  calculateCarbonIntensities,
  calculateTcfdFinancialExposure,
  calculateDoubleMaterialityScores,
  calculateSbtiTrajectoryVariance,
  calculateSupplierDecarbonizationImpact
} from '@jobtrack/contract';

export class EsgSustainabilityStudioService {
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async ensureSchema(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS esg_studios (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        enterprise_name VARCHAR(255) NOT NULL,
        base_year INT NOT NULL DEFAULT 2021,
        target_net_zero_year INT NOT NULL DEFAULT 2040,
        reporting_currency VARCHAR(8) NOT NULL DEFAULT 'USD',
        default_fiscal_year INT NOT NULL DEFAULT 2026,
        composite_esg_score NUMERIC(5, 2) NOT NULL DEFAULT 84.50,
        governance_status_band VARCHAR(64) NOT NULL DEFAULT 'managed_defensible',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_esg_studios_user ON esg_studios(user_id);

      CREATE TABLE IF NOT EXISTS esg_carbon_inventories (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reporting_year INT NOT NULL,
        scope1_stationary_tco2e NUMERIC(12, 2) NOT NULL DEFAULT 0,
        scope1_mobile_tco2e NUMERIC(12, 2) NOT NULL DEFAULT 0,
        scope1_fugitive_tco2e NUMERIC(12, 2) NOT NULL DEFAULT 0,
        scope1_process_tco2e NUMERIC(12, 2) NOT NULL DEFAULT 0,
        scope1_total_tco2e NUMERIC(12, 2) NOT NULL DEFAULT 0,
        scope2_location_tco2e NUMERIC(12, 2) NOT NULL DEFAULT 0,
        scope2_market_tco2e NUMERIC(12, 2) NOT NULL DEFAULT 0,
        renewable_eac_mwh NUMERIC(12, 2) NOT NULL DEFAULT 0,
        scope3_upstream_tco2e NUMERIC(12, 2) NOT NULL DEFAULT 0,
        scope3_downstream_tco2e NUMERIC(12, 2) NOT NULL DEFAULT 0,
        scope3_total_tco2e NUMERIC(12, 2) NOT NULL DEFAULT 0,
        gross_emissions_tco2e NUMERIC(12, 2) NOT NULL DEFAULT 0,
        verified_removals_tco2e NUMERIC(12, 2) NOT NULL DEFAULT 0,
        net_emissions_tco2e NUMERIC(12, 2) NOT NULL DEFAULT 0,
        revenue_million_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
        headcount_fte INT NOT NULL DEFAULT 0,
        real_estate_area_m2 NUMERIC(12, 2) NOT NULL DEFAULT 0,
        intensity_revenue NUMERIC(8, 2) NOT NULL DEFAULT 0,
        intensity_fte NUMERIC(8, 2) NOT NULL DEFAULT 0,
        intensity_area NUMERIC(8, 2) NOT NULL DEFAULT 0,
        energy_total_mwh NUMERIC(12, 2) NOT NULL DEFAULT 0,
        renewable_energy_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
        scope3_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
        last_audited_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_esg_carbon_user_year ON esg_carbon_inventories(user_id, reporting_year);

      CREATE TABLE IF NOT EXISTS esg_climate_risk_scenarios (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        scenario VARCHAR(64) NOT NULL,
        scenario_label VARCHAR(128) NOT NULL,
        time_horizon VARCHAR(32) NOT NULL DEFAULT 'short_term_2030',
        target_year INT NOT NULL DEFAULT 2030,
        assumed_temp_rise_celsius NUMERIC(4, 2) NOT NULL DEFAULT 1.5,
        carbon_price_usd_per_ton NUMERIC(8, 2) NOT NULL DEFAULT 130.0,
        acute_physical_loss_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        chronic_opex_surcharge_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        carbon_tax_liability_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        stranded_asset_impairment_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        aggregate_financial_exposure_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        climate_var95_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        climate_var_pct NUMERIC(6, 2) NOT NULL DEFAULT 0,
        ebitda_impact_pct NUMERIC(6, 2) NOT NULL DEFAULT 0,
        physical_risks JSONB NOT NULL DEFAULT '[]'::jsonb,
        transition_risks JSONB NOT NULL DEFAULT '[]'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_esg_scenarios_user ON esg_climate_risk_scenarios(user_id, scenario);

      CREATE TABLE IF NOT EXISTS esg_materiality_assessments (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        topic_code VARCHAR(32) NOT NULL,
        topic_name VARCHAR(128) NOT NULL,
        standard VARCHAR(64) NOT NULL,
        standard_label VARCHAR(128) NOT NULL,
        impact_materiality_score NUMERIC(4, 2) NOT NULL DEFAULT 3.0,
        impact_scale NUMERIC(3, 1) NOT NULL DEFAULT 3.0,
        impact_scope NUMERIC(3, 1) NOT NULL DEFAULT 3.0,
        impact_irremediability NUMERIC(3, 1) NOT NULL DEFAULT 3.0,
        impact_likelihood NUMERIC(3, 1) NOT NULL DEFAULT 3.0,
        financial_materiality_score NUMERIC(4, 2) NOT NULL DEFAULT 3.0,
        financial_magnitude NUMERIC(3, 1) NOT NULL DEFAULT 3.0,
        financial_probability NUMERIC(3, 1) NOT NULL DEFAULT 3.0,
        is_material BOOLEAN NOT NULL DEFAULT true,
        materiality_tier VARCHAR(64) NOT NULL DEFAULT 'tier_1_double_material',
        gri_alignment_ref VARCHAR(64) NOT NULL DEFAULT 'GRI 305',
        issb_reference VARCHAR(64) NOT NULL DEFAULT 'IFRS S2',
        audit_readiness_pct NUMERIC(5, 2) NOT NULL DEFAULT 85.0,
        key_impacts TEXT[] NOT NULL DEFAULT '{}',
        key_financial_risks TEXT[] NOT NULL DEFAULT '{}',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_esg_materiality_user_code ON esg_materiality_assessments(user_id, topic_code);

      CREATE TABLE IF NOT EXISTS esg_supplier_decarbonizations (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        vendor_name VARCHAR(128) NOT NULL,
        procurement_category VARCHAR(64) NOT NULL,
        annual_spend_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        esg_tier VARCHAR(64) NOT NULL DEFAULT 'tier_b_measured_targets',
        allocated_scope3_tco2e NUMERIC(12, 2) NOT NULL DEFAULT 0,
        has_sbti_validated_target BOOLEAN NOT NULL DEFAULT false,
        reported_renewable_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
        carbon_intensity_per_spend NUMERIC(8, 4) NOT NULL DEFAULT 0.0012,
        annual_reduction_pct NUMERIC(5, 2) NOT NULL DEFAULT 4.2,
        engagement_status VARCHAR(64) NOT NULL DEFAULT 'engaged_active',
        last_engaged_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_esg_suppliers_user ON esg_supplier_decarbonizations(user_id, esg_tier);

      CREATE TABLE IF NOT EXISTS esg_board_memoranda (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        reporting_year INT NOT NULL,
        status VARCHAR(64) NOT NULL DEFAULT 'draft',
        composite_esg_score NUMERIC(5, 2) NOT NULL DEFAULT 84.50,
        governance_status_band VARCHAR(64) NOT NULL DEFAULT 'managed_defensible',
        sbti_alignment_status VARCHAR(64) NOT NULL DEFAULT 'on_track_1_5c',
        sec_filing_readiness_pct NUMERIC(5, 2) NOT NULL DEFAULT 88.0,
        greenwashing_risk_index NUMERIC(5, 2) NOT NULL DEFAULT 15.0,
        executive_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
        ghg_inventory_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
        tcfd_scenario_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
        csrd_materiality_review JSONB NOT NULL DEFAULT '{}'::jsonb,
        sbti_supply_chain_roadmap JSONB NOT NULL DEFAULT '{}'::jsonb,
        sec_compliance_audit JSONB NOT NULL DEFAULT '{}'::jsonb,
        approved_by_cso_at TIMESTAMPTZ,
        approved_by_cfo_at TIMESTAMPTZ,
        approved_by_board_chair_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_esg_board_memos_user ON esg_board_memoranda(user_id, reporting_year DESC);
    `);
  }

  async ensureDefaults(userId: string): Promise<void> {
    await this.ensureSchema();
    const existing = await this.pool.query(
      'SELECT id FROM esg_studios WHERE user_id = $1',
      [userId]
    );
    if (existing.rows.length > 0) return;

    await this.seedEnterpriseEsgTelemetry(userId);
  }

  async getOverview(userId: string): Promise<EsgStudioOverviewDTO> {
    await this.ensureDefaults(userId);
    const studioRes = await this.pool.query(
      'SELECT * FROM esg_studios WHERE user_id = $1',
      [userId]
    );
    const carbonRes = await this.pool.query(
      'SELECT * FROM esg_carbon_inventories WHERE user_id = $1 ORDER BY reporting_year DESC LIMIT 1',
      [userId]
    );
    const scenarioRes = await this.pool.query(
      'SELECT * FROM esg_climate_risk_scenarios WHERE user_id = $1 ORDER BY target_year ASC',
      [userId]
    );
    const materialityRes = await this.pool.query(
      'SELECT * FROM esg_materiality_assessments WHERE user_id = $1 ORDER BY impact_materiality_score DESC',
      [userId]
    );
    const supplierRes = await this.pool.query(
      'SELECT * FROM esg_supplier_decarbonizations WHERE user_id = $1 ORDER BY allocated_scope3_tco2e DESC',
      [userId]
    );
    const memoRes = await this.pool.query(
      'SELECT * FROM esg_board_memoranda WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    return this.assembleOverviewDto(
      studioRes.rows[0],
      carbonRes.rows[0],
      scenarioRes.rows,
      materialityRes.rows,
      supplierRes.rows,
      memoRes.rows[0]
    );
  }

  async getCarbonInventory(userId: string, year = 2026): Promise<GhgCarbonInventoryDTO> {
    await this.ensureDefaults(userId);
    const res = await this.pool.query(
      'SELECT * FROM esg_carbon_inventories WHERE user_id = $1 AND reporting_year = $2',
      [userId, year]
    );
    if (res.rows.length === 0) {
      const fallback = await this.pool.query(
        'SELECT * FROM esg_carbon_inventories WHERE user_id = $1 ORDER BY reporting_year DESC LIMIT 1',
        [userId]
      );
      return this.mapCarbonRowToDto(fallback.rows[0]);
    }
    return this.mapCarbonRowToDto(res.rows[0]);
  }

  async recordCarbonEmissions(userId: string, dto: RecordCarbonEmissionsRequestDTO): Promise<GhgCarbonInventoryDTO> {
    await this.ensureDefaults(userId);
    const scope3Total = (dto.scope3Categories || []).reduce((acc, c) => acc + (Number(c.emissionsTco2e) || 0), 0);
    const calc = calculateGhgGrossAndNetEmissions({
      scope1Stationary: Number(dto.scope1Stationary) || 0,
      scope1Mobile: Number(dto.scope1Mobile) || 0,
      scope1Fugitive: Number(dto.scope1Fugitive) || 0,
      scope2MarketBased: Number(dto.scope2Market) || 0,
      scope3Total,
      verifiedRemovals: Number(dto.verifiedRemovals) || 0
    });

    const intensities = calculateCarbonIntensities({
      grossEmissionsTco2e: calc.grossTco2e,
      revenueMillionUsd: Number(dto.revenueMillionUsd) || 1,
      headcountFte: Number(dto.headcountFte) || 1,
      realEstateAreaM2: Number(dto.realEstateAreaM2) || 1,
      scope1Plus2Tco2e: calc.scope1Total + (Number(dto.scope2Market) || 0)
    });

    const id = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO esg_carbon_inventories (
        id, user_id, reporting_year, scope1_stationary_tco2e, scope1_mobile_tco2e, scope1_fugitive_tco2e,
        scope1_total_tco2e, scope2_location_tco2e, scope2_market_tco2e, scope3_total_tco2e,
        gross_emissions_tco2e, verified_removals_tco2e, net_emissions_tco2e, revenue_million_usd,
        headcount_fte, real_estate_area_m2, intensity_revenue, intensity_fte, intensity_area,
        energy_total_mwh, renewable_energy_pct, scope3_categories, last_audited_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW()
      )
      ON CONFLICT (user_id, reporting_year) DO UPDATE SET
        scope1_stationary_tco2e = EXCLUDED.scope1_stationary_tco2e,
        scope1_mobile_tco2e = EXCLUDED.scope1_mobile_tco2e,
        scope1_fugitive_tco2e = EXCLUDED.scope1_fugitive_tco2e,
        scope1_total_tco2e = EXCLUDED.scope1_total_tco2e,
        scope2_location_tco2e = EXCLUDED.scope2_location_tco2e,
        scope2_market_tco2e = EXCLUDED.scope2_market_tco2e,
        scope3_total_tco2e = EXCLUDED.scope3_total_tco2e,
        gross_emissions_tco2e = EXCLUDED.gross_emissions_tco2e,
        verified_removals_tco2e = EXCLUDED.verified_removals_tco2e,
        net_emissions_tco2e = EXCLUDED.net_emissions_tco2e,
        revenue_million_usd = EXCLUDED.revenue_million_usd,
        headcount_fte = EXCLUDED.headcount_fte,
        real_estate_area_m2 = EXCLUDED.real_estate_area_m2,
        intensity_revenue = EXCLUDED.intensity_revenue,
        intensity_fte = EXCLUDED.intensity_fte,
        intensity_area = EXCLUDED.intensity_area,
        energy_total_mwh = EXCLUDED.energy_total_mwh,
        renewable_energy_pct = EXCLUDED.renewable_energy_pct,
        scope3_categories = EXCLUDED.scope3_categories,
        last_audited_at = NOW()`,
      [
        id, userId, dto.reportingYear, dto.scope1Stationary, dto.scope1Mobile, dto.scope1Fugitive,
        calc.scope1Total, dto.scope2Location, dto.scope2Market, scope3Total,
        calc.grossTco2e, dto.verifiedRemovals, calc.netTco2e, dto.revenueMillionUsd,
        dto.headcountFte, dto.realEstateAreaM2, intensities.revenueIntensityTco2ePerMillionUsd,
        intensities.headcountIntensityTco2ePerFte, intensities.realEstateIntensityKgCo2ePerM2,
        dto.energyTotalMwh, (dto.renewableEnergyMwh / (dto.energyTotalMwh || 1)) * 100,
        JSON.stringify(dto.scope3Categories || [])
      ]
    );

    return this.getCarbonInventory(userId, dto.reportingYear);
  }

  async getTcfdScenarios(userId: string): Promise<TcfdScenarioModelDTO[]> {
    await this.ensureDefaults(userId);
    const res = await this.pool.query(
      'SELECT * FROM esg_climate_risk_scenarios WHERE user_id = $1 ORDER BY target_year ASC',
      [userId]
    );
    return res.rows.map((r: any) => this.mapScenarioRowToDto(r));
  }

  async simulateTcfdScenario(userId: string, dto: TcfdSimulationRequestDTO): Promise<TcfdSimulationResultDTO> {
    await this.ensureDefaults(userId);
    const carbonRes = await this.pool.query(
      'SELECT gross_emissions_tco2e FROM esg_carbon_inventories WHERE user_id = $1 ORDER BY reporting_year DESC LIMIT 1',
      [userId]
    );
    const grossEmissions = carbonRes.rows[0]?.gross_emissions_tco2e || 37770;

    const carbonPrice = dto.customCarbonPriceUsdPerTon || (dto.scenario === 'rcp_2_6_net_zero' ? 145.0 : 45.0);
    const exposedAssetValue = dto.enterpriseValueUsd * 0.35;
    const baselineEnergy = dto.enterpriseValueUsd * 0.04;

    const result = calculateTcfdFinancialExposure({
      scenario: dto.scenario,
      timeHorizonYears: dto.timeHorizon === 'short_term_2030' ? 2030 : dto.timeHorizon === 'medium_term_2040' ? 2040 : 2050,
      grossEmissionsTco2e: Number(grossEmissions),
      enterpriseValueUsd: dto.enterpriseValueUsd,
      carbonPriceUsdPerTon: carbonPrice,
      totalExposedAssetValueUsd: exposedAssetValue,
      baselineEnergySpendUsd: baselineEnergy
    });

    const scenarioId = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO esg_climate_risk_scenarios (
        id, user_id, scenario, scenario_label, time_horizon, target_year, carbon_price_usd_per_ton,
        acute_physical_loss_usd, chronic_opex_surcharge_usd, carbon_tax_liability_usd,
        stranded_asset_impairment_usd, aggregate_financial_exposure_usd, climate_var95_usd,
        climate_var_pct, ebitda_impact_pct, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())`,
      [
        scenarioId, userId, dto.scenario,
        dto.scenario === 'rcp_2_6_net_zero' ? 'Net-Zero 1.5°C Orderly Transition' : 'Current Policies Extreme Warming',
        dto.timeHorizon, dto.timeHorizon === 'short_term_2030' ? 2030 : 2050, carbonPrice,
        result.acutePhysicalLossUsd, result.chronicOpexIncreaseUsd, result.carbonTaxLiabilityUsd,
        result.strandedAssetImpairmentUsd, result.aggregateFinancialExposureUsd, result.climateVar95Usd,
        result.climateVarPercent, result.ebitdaErosionPercent
      ]
    );

    return result;
  }

  async getDoubleMaterialityMatrix(userId: string): Promise<DoubleMaterialityMatrixDTO> {
    await this.ensureDefaults(userId);
    const res = await this.pool.query(
      'SELECT * FROM esg_materiality_assessments WHERE user_id = $1 ORDER BY impact_materiality_score DESC',
      [userId]
    );
    const topics: EsrsTopicAssessmentDTO[] = res.rows.map((r: any) => this.mapMaterialityRowToDto(r));

    let doubleMat = 0;
    let impactOnly = 0;
    let finOnly = 0;
    let nonMat = 0;

    for (const t of topics) {
      if (t.materialityTier === 'tier_1_double_material') doubleMat++;
      else if (t.materialityTier === 'tier_2_impact_material_only') impactOnly++;
      else if (t.materialityTier === 'tier_2_financial_material_only') finOnly++;
      else nonMat++;
    }

    return {
      totalTopicsAssessed: topics.length,
      doubleMaterialTopicsCount: doubleMat,
      impactOnlyTopicsCount: impactOnly,
      financialOnlyTopicsCount: finOnly,
      nonMaterialTopicsCount: nonMat,
      averageAuditReadinessPercent: 86.5,
      topics
    };
  }

  async updateMaterialityAssessment(userId: string, code: string, dto: UpdateMaterialityTopicRequestDTO): Promise<EsrsTopicAssessmentDTO> {
    await this.ensureDefaults(userId);
    const scores = calculateDoubleMaterialityScores({
      scale: dto.impactScale,
      scope: dto.impactScope,
      irremediability: dto.impactIrremediability,
      likelihood: dto.impactLikelihood,
      magnitude: dto.financialMagnitude,
      probability: dto.financialProbability
    });

    await this.pool.query(
      `UPDATE esg_materiality_assessments SET
        impact_materiality_score = $1, impact_scale = $2, impact_scope = $3,
        impact_irremediability = $4, impact_likelihood = $5, financial_materiality_score = $6,
        financial_magnitude = $7, financial_probability = $8, is_material = $9,
        materiality_tier = $10, key_impacts = $11, key_financial_risks = $12, updated_at = NOW()
      WHERE user_id = $13 AND topic_code = $14`,
      [
        scores.impactScore, dto.impactScale, dto.impactScope, dto.impactIrremediability,
        dto.impactLikelihood, scores.financialScore, dto.financialMagnitude, dto.financialProbability,
        scores.tier !== 'tier_3_non_material', scores.tier, dto.keyImpacts, dto.keyFinancialRisks,
        userId, code
      ]
    );

    const res = await this.pool.query(
      'SELECT * FROM esg_materiality_assessments WHERE user_id = $1 AND topic_code = $2',
      [userId, code]
    );
    if (res.rows.length === 0) {
      throw new Error(`Materiality topic not found: ${code}`);
    }
    return this.mapMaterialityRowToDto(res.rows[0]);
  }

  async getSupplierDecarbonization(userId: string): Promise<Scope3SupplyChainOverviewDTO> {
    await this.ensureDefaults(userId);
    const suppliersRes = await this.pool.query(
      'SELECT * FROM esg_supplier_decarbonizations WHERE user_id = $1 ORDER BY allocated_scope3_tco2e DESC',
      [userId]
    );
    const suppliers: SupplierDecarbonizationDTO[] = suppliersRes.rows.map((r: any) => this.mapSupplierRowToDto(r));

    let totalSpend = 0;
    let totalScope3 = 0;
    let sbtiSpend = 0;
    const tierCounts: Record<SupplierEsgTier, number> = {
      tier_a_sbti_net_zero: 0,
      tier_b_measured_targets: 0,
      tier_c_basic_disclosure: 0,
      tier_d_unresponsive_high_carbon: 0
    };

    for (const s of suppliers) {
      totalSpend += s.annualSpendUsd;
      totalScope3 += s.allocatedScope3Tco2e;
      tierCounts[s.esgTier] = (tierCounts[s.esgTier] || 0) + 1;
      if (s.hasSbtiValidatedTarget) {
        sbtiSpend += s.annualSpendUsd;
      }
    }

    const sbtiVariance = calculateSbtiTrajectoryVariance({
      baseYear: 2021,
      targetNetZeroYear: 2040,
      currentYear: 2026,
      baseYearEmissionsTco2e: 48500,
      currentActualEmissionsTco2e: 37770,
      annualLinearReductionRate: 0.042
    });

    return {
      totalVendorsTracked: suppliers.length,
      totalProcurementSpendUsd: totalSpend,
      totalScope3SpendAllocatedTco2e: totalScope3,
      sbtiTelemetry: {
        baseYear: 2021,
        targetNetZeroYear: 2040,
        target1Point5CYearlyReductionRatePercent: 4.2,
        baseYearScope1And2Tco2e: 13850,
        baseYearScope3Tco2e: 34650,
        currentYearTargetTco2e: sbtiVariance.targetEmissionsTco2e,
        currentYearActualTco2e: 37770,
        cumulativeReductionTco2e: 10730,
        trajectoryVariancePercent: sbtiVariance.variancePercent,
        alignmentStatus: sbtiVariance.status,
        supplierEngagementSpendCoveragePercent: totalSpend > 0 ? Number(((sbtiSpend / totalSpend) * 100).toFixed(1)) : 71.4,
        targetSupplierEngagementPercent: 67.0
      },
      tierDistribution: tierCounts,
      topSuppliers: suppliers
    };
  }

  async simulateSupplierDecarbonization(userId: string, dto: SupplierDecarbonizationSimulationRequestDTO): Promise<SupplierDecarbonizationSimulationResultDTO> {
    const supplyChain = await this.getSupplierDecarbonization(userId);
    return calculateSupplierDecarbonizationImpact({
      suppliers: supplyChain.topSuppliers,
      targetTierASharePercent: dto.targetTierAProcurementSharePercent,
      targetVendorRenewablePercent: dto.targetVendorRenewableAdoptionPercent
    });
  }

  async getSecDisclosureAudit(userId: string): Promise<SecComplianceOverviewDTO> {
    await this.ensureDefaults(userId);
    return {
      overallFilingReadinessPercent: 89.2,
      isScope1And2Audited: true,
      isOnePercentFinancialStatementImpactMet: false,
      regSkItems: [
        {
          itemCode: 'ITEM_1501_GOVERNANCE',
          itemTitle: 'Board Oversight of Climate-Related Risks',
          regulationCitation: '17 CFR § 229.1501',
          isCompliant: true,
          readinessScorePercent: 95.0,
          keyFindings: 'Board ESG Committee charter active; quarterly review of Climate VaR formalized.'
        },
        {
          itemCode: 'ITEM_1502_STRATEGY',
          itemTitle: 'Impact of Climate Risks on Strategy & Financial Model',
          regulationCitation: '17 CFR § 229.1502',
          isCompliant: true,
          readinessScorePercent: 90.0,
          keyFindings: 'TCFD scenario modeling integrated into long-range strategic financial plan.'
        },
        {
          itemCode: 'ITEM_1504_METRICS',
          itemTitle: 'Scope 1 and Scope 2 GHG Emissions Metrics',
          regulationCitation: '17 CFR § 229.1504',
          isCompliant: true,
          readinessScorePercent: 92.0,
          keyFindings: 'Scope 1 and Market-based Scope 2 verified by accredited third-party audit firm.'
        },
        {
          itemCode: 'REG_SX_ARTICLE_14',
          itemTitle: 'Financial Statement Severe Weather Footnote Disclosures',
          regulationCitation: '17 CFR § 210.14-02',
          isCompliant: true,
          readinessScorePercent: 80.0,
          keyFindings: 'Flood recovery capex evaluated against 1% line-item threshold; no disclosure required.'
        }
      ],
      greenwashingAudit: {
        overallRiskLevel: 'low_defensible',
        greenwashingExposureIndex: 14.2,
        totalClaimsAudited: 24,
        flaggedClaimsCount: 1,
        offsetAdditionalityIntegrityPercent: 92.5,
        activeFlags: [
          {
            id: 'GW-FLAG-01',
            claimSnippet: 'Zero net carbon operations across all facilities by 2026.',
            sourceDocument: 'Annual Corporate Marketing Brochure (Page 4)',
            riskCategory: 'unsubstantiated_neutrality',
            riskSeverity: 'medium',
            regulatoryStandardViolated: 'EU Green Claims Directive & ISO 14021',
            suggestedDefensibleRewrite: 'On track to achieve 85% renewable electricity powering owned facilities by 2026.'
          }
        ]
      }
    };
  }

  async generateBoardMemorandum(userId: string, dto: GenerateBoardMemoRequestDTO): Promise<ExecutiveEsgBoardMemorandumDTO> {
    const overview = await this.getOverview(userId);
    const id = crypto.randomUUID();

    const memo: ExecutiveEsgBoardMemorandumDTO = {
      id,
      title: dto.title,
      reportingYear: dto.reportingYear,
      status: 'draft',
      compositeEsgScore: overview.compositeScore,
      governanceStatusBand: overview.statusBand,
      sbtiAlignmentStatus: overview.sbtiAlignmentStatus,
      secFilingReadinessPercent: overview.secReadinessPercent,
      greenwashingRiskIndex: overview.greenwashingIndex,
      executiveSummary: {
        sectionKey: 'EXEC_SUMMARY',
        heading: 'Executive Climate Leadership & Strategic Fiduciary Mandate',
        executiveSummaryText: `During fiscal year ${dto.reportingYear}, the enterprise maintained a rigorous ESG control plane achieving an overall Composite ESG Governance Score of ${overview.compositeScore}/100 (${overview.statusBand.replace(/_/g, ' ').toUpperCase()}). Emissions reductions tracked ahead of the SBTi 1.5°C glide path trajectory.`,
        keyMetricsBulletPoints: [
          `Gross GHG Emissions: ${overview.grossEmissionsTco2e.toLocaleString()} tCO2e (Net: ${overview.netEmissionsTco2e.toLocaleString()} tCO2e).`,
          `Revenue Carbon Intensity: ${overview.carbonIntensityRevenue.toFixed(1)} tCO2e / $M revenue.`,
          `TCFD Climate VaR-95: $${(overview.climateVar95Usd / 1_000_000).toFixed(1)}M under 1.5°C Net-Zero scenario.`,
          `CSRD Double Materiality: ${overview.doubleMaterialTopicsCount} topics classified as Priority Tier 1 Double Material.`
        ],
        strategicGovernanceGuidance: 'Execute planned $4.2M capital allocation for facility microgrids and ratify Scope 3 vendor engagement covenants.'
      },
      ghgInventoryBreakdown: {
        sectionKey: 'GHG_INVENTORY',
        heading: 'GHG Protocol Corporate Carbon Ledger & Audit Certification',
        executiveSummaryText: 'Audited accounting across Scope 1 direct fuel, Scope 2 dual-reporting (location and market), and 15 Scope 3 value chain categories.',
        keyMetricsBulletPoints: [
          `Scope 1 Direct Emissions: ${overview.carbonInventory.scope1.totalScope1Tco2e.toLocaleString()} tCO2e.`,
          `Scope 2 Market-Based Emissions: ${overview.carbonInventory.scope2.marketBasedContractedTco2e.toLocaleString()} tCO2e (80% contracted renewable electricity).`,
          `Scope 3 Value Chain Emissions: ${overview.carbonInventory.totalScope3Tco2e.toLocaleString()} tCO2e (Purchased Goods & Logistics dominant).`
        ],
        strategicGovernanceGuidance: 'Contract additional 15 MWh of Power Purchase Agreements to eliminate remaining Scope 2 market exposure by 2027.'
      },
      tcfdScenarioAnalysis: {
        sectionKey: 'TCFD_SCENARIOS',
        heading: 'TCFD Climate Financial Value-at-Risk Stress Testing',
        executiveSummaryText: 'Comparative analysis of balance sheet exposures under Orderly Transition (RCP 2.6) versus Extreme Physical Warming (RCP 8.5).',
        keyMetricsBulletPoints: [
          `RCP 2.6 Net-Zero VaR-95: $15.3M (Driven by $145/tCO2e projected carbon pricing).`,
          `RCP 8.5 Extreme Warming VaR-95: $22.8M (Driven by acute convective storms and chronic cooling surcharges).`,
          `EBITDA At-Risk: 4.8% to 7.2% across 10-year planning horizons.`
        ],
        strategicGovernanceGuidance: 'Incorporate internal shadow carbon pricing ($85/tCO2e) into capital expenditure hurdle rate calculations.'
      },
      csrdMaterialityReview: {
        sectionKey: 'CSRD_MATERIALITY',
        heading: 'EU CSRD Double Materiality Matrix & ESRS Audit Defensibility',
        executiveSummaryText: 'Dual-axis assessment evaluating inside-out environmental impact alongside outside-in financial value erosion.',
        keyMetricsBulletPoints: [
          'ESRS E1 Climate Change & ESRS S1 Own Workforce certified as Priority Tier 1 Double Material.',
          'Limited assurance audit documentation prepared across 42 required datapoints.',
          'Multi-standard interoperability cross-referenced against GRI 305 and IFRS S2.'
        ],
        strategicGovernanceGuidance: 'Engage statutory independent auditor for CSRD limited assurance readiness sign-off in Q3.'
      },
      sbtiSupplyChainRoadmap: {
        sectionKey: 'SBTI_SUPPLY_CHAIN',
        heading: 'Scope 3 Supply Chain Decarbonization & SBTi Trajectory',
        executiveSummaryText: 'Tracking corporate value chain decarbonization against the Science Based Targets initiative 1.5°C corporate net-zero standard.',
        keyMetricsBulletPoints: [
          'SBTi Trajectory Variance: -1.42% (Outperforming mandatory 4.2% annual linear reduction target).',
          'Supplier Engagement: 71.4% of procurement spend committed to SBTi validated reduction targets.',
          'Simulated 22% Scope 3 abatement achievable through supplier renewable electricity transition.'
        ],
        strategicGovernanceGuidance: 'Mandate SBTi target commitment clauses in all tier-one procurement master service agreements.'
      },
      secComplianceAudit: {
        sectionKey: 'SEC_COMPLIANCE',
        heading: 'SEC Climate Disclosure Readiness & Greenwashing Audit',
        executiveSummaryText: 'Statutory readiness evaluation for Regulation S-K Item 1500 rules and consumer protection green claims audit.',
        keyMetricsBulletPoints: [
          'SEC Reg S-K Items 1501-1504 readiness: 89.2% audit-certified.',
          'Reg S-X severe weather footnote evaluation: No material financial statement impact exceeding 1% threshold.',
          'Greenwashing Exposure Index: 14.2 / 100 (Single cautionary marketing claim rewritten for audit defensibility).'
        ],
        strategicGovernanceGuidance: 'Authorize publication of Form 10-K climate risk disclosures upon tripartite sign-off completion.'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.pool.query(
      `INSERT INTO esg_board_memoranda (
        id, user_id, title, reporting_year, status, composite_esg_score, governance_status_band,
        sbti_alignment_status, sec_filing_readiness_pct, greenwashing_risk_index,
        executive_summary, ghg_inventory_breakdown, tcfd_scenario_analysis, csrd_materiality_review,
        sbti_supply_chain_roadmap, sec_compliance_audit, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())`,
      [
        memo.id, userId, memo.title, memo.reportingYear, memo.status, memo.compositeEsgScore,
        memo.governanceStatusBand, memo.sbtiAlignmentStatus, memo.secFilingReadinessPercent,
        memo.greenwashingRiskIndex, JSON.stringify(memo.executiveSummary),
        JSON.stringify(memo.ghgInventoryBreakdown), JSON.stringify(memo.tcfdScenarioAnalysis),
        JSON.stringify(memo.csrdMaterialityReview), JSON.stringify(memo.sbtiSupplyChainRoadmap),
        JSON.stringify(memo.secComplianceAudit)
      ]
    );

    return memo;
  }

  async signOffBoardMemorandum(userId: string, memoId: string, role: BoardEsgSignoffRole): Promise<ExecutiveEsgBoardMemorandumDTO> {
    await this.ensureDefaults(userId);
    const col = role === 'cso'
      ? 'approved_by_cso_at'
      : role === 'cfo'
      ? 'approved_by_cfo_at'
      : 'approved_by_board_chair_at';

    await this.pool.query(
      `UPDATE esg_board_memoranda SET ${col} = NOW(), updated_at = NOW() WHERE user_id = $1 AND id = $2`,
      [userId, memoId]
    );

    const checkRes = await this.pool.query(
      'SELECT * FROM esg_board_memoranda WHERE user_id = $1 AND id = $2',
      [userId, memoId]
    );
    if (checkRes.rows.length === 0) {
      throw new Error(`Board memorandum not found: ${memoId}`);
    }
    const row = checkRes.rows[0];
    if (row.approved_by_cso_at && row.approved_by_cfo_at && row.approved_by_board_chair_at) {
      await this.pool.query(
        "UPDATE esg_board_memoranda SET status = 'board_approved', updated_at = NOW() WHERE user_id = $1 AND id = $2",
        [userId, memoId]
      );
    } else if (row.approved_by_cso_at || row.approved_by_cfo_at) {
      await this.pool.query(
        "UPDATE esg_board_memoranda SET status = 'under_csuite_review', updated_at = NOW() WHERE user_id = $1 AND id = $2",
        [userId, memoId]
      );
    }

    const finalRes = await this.pool.query(
      'SELECT * FROM esg_board_memoranda WHERE user_id = $1 AND id = $2',
      [userId, memoId]
    );
    return this.mapBoardMemoRowToDto(finalRes.rows[0]);
  }

  private async seedEnterpriseEsgTelemetry(userId: string): Promise<void> {
    const studioId = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO esg_studios (
        id, user_id, enterprise_name, base_year, target_net_zero_year, reporting_currency,
        default_fiscal_year, composite_esg_score, governance_status_band
      ) VALUES ($1, $2, 'Acme Global Enterprises', 2021, 2040, 'USD', 2026, 87.40, 'managed_defensible')`,
      [studioId, userId]
    );

    const carbonId = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO esg_carbon_inventories (
        id, user_id, reporting_year, scope1_stationary_tco2e, scope1_mobile_tco2e, scope1_fugitive_tco2e,
        scope1_process_tco2e, scope1_total_tco2e, scope2_location_tco2e, scope2_market_tco2e,
        renewable_eac_mwh, scope3_upstream_tco2e, scope3_downstream_tco2e, scope3_total_tco2e,
        gross_emissions_tco2e, verified_removals_tco2e, net_emissions_tco2e, revenue_million_usd,
        headcount_fte, real_estate_area_m2, intensity_revenue, intensity_fte, intensity_area,
        energy_total_mwh, renewable_energy_pct, scope3_categories
      ) VALUES (
        $1, $2, 2026, 1220.00, 440.00, 180.00, 0, 1840.00, 6420.00, 1280.00, 19600.00,
        28750.00, 5900.00, 34650.00, 37770.00, 2500.00, 35270.00, 420.00, 2850, 45000.00,
        89.93, 13.25, 69.33, 24500.00, 68.50,
        '[
          {"category": "cat_01_purchased_goods", "categoryLabel": "Purchased Goods & Services", "isUpstream": true, "emissionsTco2e": 21400, "calculationMethod": "hybrid_activity", "percentageOfScope3": 61.8},
          {"category": "cat_02_capital_goods", "categoryLabel": "Capital Goods & Equipment", "isUpstream": true, "emissionsTco2e": 4100, "calculationMethod": "spend_based", "percentageOfScope3": 11.8},
          {"category": "cat_04_upstream_transport", "categoryLabel": "Upstream Transportation & Logistics", "isUpstream": true, "emissionsTco2e": 3300, "calculationMethod": "supplier_specific", "percentageOfScope3": 9.5},
          {"category": "cat_06_business_travel", "categoryLabel": "Business Air & Rail Travel", "isUpstream": true, "emissionsTco2e": 3250, "calculationMethod": "hybrid_activity", "percentageOfScope3": 9.4},
          {"category": "cat_07_employee_commuting", "categoryLabel": "Employee Commuting & Remote Telework", "isUpstream": true, "emissionsTco2e": 2600, "calculationMethod": "spend_based", "percentageOfScope3": 7.5}
        ]'::jsonb
      )`,
      [carbonId, userId]
    );

    const sc1Id = crypto.randomUUID();
    const sc2Id = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO esg_climate_risk_scenarios (
        id, user_id, scenario, scenario_label, time_horizon, target_year, assumed_temp_rise_celsius,
        carbon_price_usd_per_ton, acute_physical_loss_usd, chronic_opex_surcharge_usd,
        carbon_tax_liability_usd, stranded_asset_impairment_usd, aggregate_financial_exposure_usd,
        climate_var95_usd, climate_var_pct, ebitda_impact_pct
      ) VALUES
      ($1, $2, 'rcp_2_6_net_zero', 'Net-Zero 1.5°C Orderly Transition', 'short_term_2030', 2030, 1.50, 145.00, 850000, 320000, 4650000, 3800000, 9620000, 15300000, 3.64, 4.80),
      ($3, $2, 'rcp_8_5_extreme_warming', 'Current Policies Extreme Warming', 'long_term_2050', 2050, 4.20, 45.00, 6200000, 2400000, 950000, 4200000, 13750000, 22800000, 5.43, 7.20)`,
      [sc1Id, userId, sc2Id]
    );

    const topics = [
      { code: 'ESRS_E1', name: 'Climate Change (Mitigation & Adaptation)', std: 'esrs_e1_climate_change', stdLbl: 'ESRS E1 Climate', imp: 4.8, fin: 4.5, tier: 'tier_1_double_material' },
      { code: 'ESRS_S1', name: 'Own Workforce (DEI & Pay Equity)', std: 'esrs_s1_own_workforce', stdLbl: 'ESRS S1 Workforce', imp: 4.4, fin: 4.0, tier: 'tier_1_double_material' },
      { code: 'ESRS_G1', name: 'Business Conduct & Anti-Corruption', std: 'esrs_g1_business_conduct', stdLbl: 'ESRS G1 Governance', imp: 3.8, fin: 3.9, tier: 'tier_1_double_material' },
      { code: 'ESRS_E5', name: 'Resource Use & Circular Economy', std: 'esrs_e5_circular_economy', stdLbl: 'ESRS E5 Circular', imp: 3.6, fin: 3.2, tier: 'tier_1_double_material' },
      { code: 'ESRS_S2', name: 'Workers in Value Chain', std: 'esrs_s2_value_chain_workers', stdLbl: 'ESRS S2 Value Chain', imp: 3.5, fin: 3.1, tier: 'tier_1_double_material' }
    ];

    for (const t of topics) {
      await this.pool.query(
        `INSERT INTO esg_materiality_assessments (
          id, user_id, topic_code, topic_name, standard, standard_label, impact_materiality_score,
          financial_materiality_score, is_material, materiality_tier, audit_readiness_pct
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, 88.0)`,
        [crypto.randomUUID(), userId, t.code, t.name, t.std, t.stdLbl, t.imp, t.fin, t.tier]
      );
    }

    const suppliers = [
      { name: 'Foxconn Precision Hardware', cat: 'Electronics & Hardware', spend: 45000000, tier: 'tier_a_sbti_net_zero', sc3: 11200, sbti: true, ren: 85.0 },
      { name: 'CloudCore Data Centers', cat: 'Cloud Infrastructure', spend: 32000000, tier: 'tier_a_sbti_net_zero', sc3: 6800, sbti: true, ren: 100.0 },
      { name: 'Apex Freight & Logistics', cat: 'Transportation & Logistics', spend: 24000000, tier: 'tier_b_measured_targets', sc3: 5400, sbti: false, ren: 40.0 },
      { name: 'BioGreen Sustainable Packaging', cat: 'Packaging Materials', spend: 18000000, tier: 'tier_a_sbti_net_zero', sc3: 3100, sbti: true, ren: 75.0 },
      { name: 'Vertex Global Staffing', cat: 'Professional Services', spend: 15000000, tier: 'tier_c_basic_disclosure', sc3: 1850, sbti: false, ren: 20.0 }
    ];

    for (const s of suppliers) {
      await this.pool.query(
        `INSERT INTO esg_supplier_decarbonizations (
          id, user_id, vendor_name, procurement_category, annual_spend_usd, esg_tier,
          allocated_scope3_tco2e, has_sbti_validated_target, reported_renewable_pct
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [crypto.randomUUID(), userId, s.name, s.cat, s.spend, s.tier, s.sc3, s.sbti, s.ren]
      );
    }
  }

  private assembleOverviewDto(
    studio: any,
    carbon: any,
    scenarios: any[],
    materiality: any[],
    suppliers: any[],
    memo: any
  ): EsgStudioOverviewDTO {
    const carbonDto = this.mapCarbonRowToDto(carbon);
    const scenarioDtos = scenarios.map((s: any) => this.mapScenarioRowToDto(s));
    const materialityDtos = materiality.map((m: any) => this.mapMaterialityRowToDto(m));
    const supplierDtos = suppliers.map((sup: any) => this.mapSupplierRowToDto(sup));
    const memoDto = memo ? this.mapBoardMemoRowToDto(memo) : undefined;

    const worstCaseVar = Math.max(...scenarioDtos.map((s) => s.climateVar95Usd), 22800000);
    const doubleMatCount = materialityDtos.filter((m) => m.materialityTier === 'tier_1_double_material').length;

    let totalProcSpend = 0;
    let sbtiProcSpend = 0;
    for (const sup of supplierDtos) {
      totalProcSpend += sup.annualSpendUsd;
      if (sup.hasSbtiValidatedTarget) sbtiProcSpend += sup.annualSpendUsd;
    }

    const sbtiVariance = calculateSbtiTrajectoryVariance({
      baseYear: 2021,
      targetNetZeroYear: 2040,
      currentYear: 2026,
      baseYearEmissionsTco2e: 48500,
      currentActualEmissionsTco2e: carbonDto.grossEmissionsTco2e,
      annualLinearReductionRate: 0.042
    });

    return {
      compositeScore: Number(studio?.composite_esg_score || 87.40),
      statusBand: (studio?.governance_status_band || 'managed_defensible') as EsgGovernanceStatusBand,
      reportingYear: carbonDto.reportingYear,
      grossEmissionsTco2e: carbonDto.grossEmissionsTco2e,
      netEmissionsTco2e: carbonDto.netEmissionsTco2e,
      carbonIntensityRevenue: carbonDto.intensity.revenueIntensityTco2ePerMillionUsd,
      climateVar95Usd: worstCaseVar,
      doubleMaterialTopicsCount: doubleMatCount,
      sbtiAlignmentStatus: sbtiVariance.status,
      secReadinessPercent: 89.2,
      greenwashingIndex: 14.2,
      carbonInventory: carbonDto,
      tcfdOverview: {
        scenarios: scenarioDtos,
        worstCaseVar95Usd: worstCaseVar,
        recommendedMitigationSpendUsd: 4200000
      },
      materialityOverview: {
        totalTopicsAssessed: materialityDtos.length,
        doubleMaterialTopicsCount: doubleMatCount,
        impactOnlyTopicsCount: materialityDtos.filter((m) => m.materialityTier === 'tier_2_impact_material_only').length,
        financialOnlyTopicsCount: materialityDtos.filter((m) => m.materialityTier === 'tier_2_financial_material_only').length,
        nonMaterialTopicsCount: materialityDtos.filter((m) => m.materialityTier === 'tier_3_non_material').length,
        averageAuditReadinessPercent: 86.5,
        topics: materialityDtos
      },
      supplyChainOverview: {
        totalVendorsTracked: supplierDtos.length,
        totalProcurementSpendUsd: totalProcSpend,
        totalScope3SpendAllocatedTco2e: supplierDtos.reduce((acc, s) => acc + s.allocatedScope3Tco2e, 0),
        sbtiTelemetry: {
          baseYear: 2021,
          targetNetZeroYear: 2040,
          target1Point5CYearlyReductionRatePercent: 4.2,
          baseYearScope1And2Tco2e: 13850,
          baseYearScope3Tco2e: 34650,
          currentYearTargetTco2e: sbtiVariance.targetEmissionsTco2e,
          currentYearActualTco2e: carbonDto.grossEmissionsTco2e,
          cumulativeReductionTco2e: 10730,
          trajectoryVariancePercent: sbtiVariance.variancePercent,
          alignmentStatus: sbtiVariance.status,
          supplierEngagementSpendCoveragePercent: totalProcSpend > 0 ? Number(((sbtiProcSpend / totalProcSpend) * 100).toFixed(1)) : 71.4,
          targetSupplierEngagementPercent: 67.0
        },
        tierDistribution: {
          tier_a_sbti_net_zero: supplierDtos.filter((s) => s.esgTier === 'tier_a_sbti_net_zero').length,
          tier_b_measured_targets: supplierDtos.filter((s) => s.esgTier === 'tier_b_measured_targets').length,
          tier_c_basic_disclosure: supplierDtos.filter((s) => s.esgTier === 'tier_c_basic_disclosure').length,
          tier_d_unresponsive_high_carbon: supplierDtos.filter((s) => s.esgTier === 'tier_d_unresponsive_high_carbon').length
        },
        topSuppliers: supplierDtos
      },
      secCompliance: {
        overallFilingReadinessPercent: 89.2,
        isScope1And2Audited: true,
        isOnePercentFinancialStatementImpactMet: false,
        regSkItems: [
          {
            itemCode: 'ITEM_1501_GOVERNANCE',
            itemTitle: 'Board Oversight of Climate-Related Risks',
            regulationCitation: '17 CFR § 229.1501',
            isCompliant: true,
            readinessScorePercent: 95.0,
            keyFindings: 'Board ESG Committee charter active; quarterly review of Climate VaR formalized.'
          },
          {
            itemCode: 'ITEM_1502_STRATEGY',
            itemTitle: 'Impact of Climate Risks on Strategy & Financial Model',
            regulationCitation: '17 CFR § 229.1502',
            isCompliant: true,
            readinessScorePercent: 90.0,
            keyFindings: 'TCFD scenario modeling integrated into long-range strategic financial plan.'
          },
          {
            itemCode: 'ITEM_1504_METRICS',
            itemTitle: 'Scope 1 and Scope 2 GHG Emissions Metrics',
            regulationCitation: '17 CFR § 229.1504',
            isCompliant: true,
            readinessScorePercent: 92.0,
            keyFindings: 'Scope 1 and Market-based Scope 2 verified by accredited third-party audit firm.'
          },
          {
            itemCode: 'REG_SX_ARTICLE_14',
            itemTitle: 'Financial Statement Severe Weather Footnote Disclosures',
            regulationCitation: '17 CFR § 210.14-02',
            isCompliant: true,
            readinessScorePercent: 80.0,
            keyFindings: 'Flood recovery capex evaluated against 1% line-item threshold; no disclosure required.'
          }
        ],
        greenwashingAudit: {
          overallRiskLevel: 'low_defensible',
          greenwashingExposureIndex: 14.2,
          totalClaimsAudited: 24,
          flaggedClaimsCount: 1,
          offsetAdditionalityIntegrityPercent: 92.5,
          activeFlags: [
            {
              id: 'GW-FLAG-01',
              claimSnippet: 'Zero net carbon operations across all facilities by 2026.',
              sourceDocument: 'Annual Corporate Marketing Brochure (Page 4)',
              riskCategory: 'unsubstantiated_neutrality',
              riskSeverity: 'medium',
              regulatoryStandardViolated: 'EU Green Claims Directive & ISO 14021',
              suggestedDefensibleRewrite: 'On track to achieve 85% renewable electricity powering owned facilities by 2026.'
            }
          ]
        }
      },
      latestBoardMemo: memoDto
    };
  }

  private mapCarbonRowToDto(row: any): GhgCarbonInventoryDTO {
    const rawCategories = typeof row?.scope3_categories === 'string' ? JSON.parse(row.scope3_categories) : row?.scope3_categories || [];
    return {
      id: row?.id || 'demo-carbon',
      reportingYear: Number(row?.reporting_year || 2026),
      scope1: {
        stationaryCombustionTco2e: Number(row?.scope1_stationary_tco2e || 0),
        mobileFleetTco2e: Number(row?.scope1_mobile_tco2e || 0),
        fugitiveRefrigerantsTco2e: Number(row?.scope1_fugitive_tco2e || 0),
        processEmissionsTco2e: Number(row?.scope1_process_tco2e || 0),
        totalScope1Tco2e: Number(row?.scope1_total_tco2e || 0)
      },
      scope2: {
        locationBasedGridTco2e: Number(row?.scope2_location_tco2e || 0),
        marketBasedContractedTco2e: Number(row?.scope2_market_tco2e || 0),
        renewableEnergyAttributeCertificatesMwh: Number(row?.renewable_eac_mwh || 0),
        powerPurchaseAgreementsMwh: 12500,
        residualGridMixEmissionFactorKgPerKwh: 0.425,
        totalScope2Tco2e: Number(row?.scope2_market_tco2e || 0)
      },
      scope3Categories: rawCategories,
      totalScope3Tco2e: Number(row?.scope3_total_tco2e || 0),
      grossEmissionsTco2e: Number(row?.gross_emissions_tco2e || 0),
      verifiedCarbonRemovalsTco2e: Number(row?.verified_removals_tco2e || 0),
      netEmissionsTco2e: Number(row?.net_emissions_tco2e || 0),
      intensity: {
        revenueIntensityTco2ePerMillionUsd: Number(row?.intensity_revenue || 0),
        headcountIntensityTco2ePerFte: Number(row?.intensity_fte || 0),
        realEstateIntensityKgCo2ePerM2: Number(row?.intensity_area || 0),
        energyTotalMwh: Number(row?.energy_total_mwh || 24500),
        renewableEnergyPercent: Number(row?.renewable_energy_pct || 68.5)
      },
      baseYearEmissionsTco2e: 48500,
      baseYearPercentChange: -22.1,
      lastAuditedAt: row?.last_audited_at ? new Date(row.last_audited_at).toISOString() : new Date().toISOString()
    };
  }

  private mapScenarioRowToDto(row: any): TcfdScenarioModelDTO {
    return {
      id: row.id,
      scenario: row.scenario,
      scenarioLabel: row.scenario_label,
      timeHorizon: row.time_horizon,
      targetYear: Number(row.target_year),
      assumedTemperatureRiseCelsius: Number(row.assumed_temp_rise_celsius || 1.5),
      projectedCarbonTaxUsdPerTon: Number(row.carbon_price_usd_per_ton || 130),
      physicalRisks: typeof row.physical_risks === 'string' ? JSON.parse(row.physical_risks) : row.physical_risks || [],
      transitionRisks: typeof row.transition_risks === 'string' ? JSON.parse(row.transition_risks) : row.transition_risks || [],
      totalPhysicalLossUsd: Number(row.acute_physical_loss_usd || 0),
      totalTransitionLossUsd: Number(row.carbon_tax_liability_usd || 0) + Number(row.stranded_asset_impairment_usd || 0),
      aggregateFinancialExposureUsd: Number(row.aggregate_financial_exposure_usd || 0),
      climateVar95Usd: Number(row.climate_var95_usd || 0),
      climateVarPercentOfEnterpriseValue: Number(row.climate_var_pct || 0),
      projectedEbitdaImpactPercent: Number(row.ebitda_impact_pct || 0)
    };
  }

  private mapMaterialityRowToDto(row: any): EsrsTopicAssessmentDTO {
    return {
      id: row.id,
      topicCode: row.topic_code,
      topicName: row.topic_name,
      standard: row.standard,
      standardLabel: row.standard_label,
      impactMaterialityScore: Number(row.impact_materiality_score),
      impactScale: Number(row.impact_scale),
      impactScope: Number(row.impact_scope),
      impactIrremediability: Number(row.impact_irremediability),
      impactLikelihood: Number(row.impact_likelihood),
      financialMaterialityScore: Number(row.financial_materiality_score),
      financialMagnitude: Number(row.financial_magnitude),
      financialProbability: Number(row.financial_probability),
      isMaterial: Boolean(row.is_material),
      materialityTier: row.materiality_tier,
      griAlignmentReference: row.gri_alignment_ref || 'GRI 305',
      issbReference: row.issb_reference || 'IFRS S2',
      auditReadinessPercent: Number(row.audit_readiness_pct || 85),
      keyPositiveOrNegativeImpacts: row.key_impacts || [],
      keyFinancialRisksAndOpportunities: row.key_financial_risks || []
    };
  }

  private mapSupplierRowToDto(row: any): SupplierDecarbonizationDTO {
    return {
      id: row.id,
      vendorName: row.vendor_name,
      procurementCategory: row.procurement_category,
      annualSpendUsd: Number(row.annual_spend_usd),
      esgTier: row.esg_tier,
      allocatedScope3Tco2e: Number(row.allocated_scope3_tco2e),
      hasSbtiValidatedTarget: Boolean(row.has_sbti_validated_target),
      reportedRenewableElectricityPercent: Number(row.reported_renewable_pct || 0),
      carbonIntensityTco2ePerSpendUsd: Number(row.carbon_intensity_per_spend || 0.0012),
      annualEmissionsReductionPercent: Number(row.annual_reduction_pct || 4.2),
      engagementStatus: row.engagement_status || 'engaged_active',
      lastEngagedAt: row.last_engaged_at ? new Date(row.last_engaged_at).toISOString() : new Date().toISOString()
    };
  }

  private mapBoardMemoRowToDto(row: any): ExecutiveEsgBoardMemorandumDTO {
    const parseJson = (val: any) => (typeof val === 'string' ? JSON.parse(val) : val || {});
    return {
      id: row.id,
      title: row.title,
      reportingYear: Number(row.reporting_year),
      status: row.status,
      compositeEsgScore: Number(row.composite_esg_score),
      governanceStatusBand: row.governance_status_band,
      sbtiAlignmentStatus: row.sbti_alignment_status,
      secFilingReadinessPercent: Number(row.sec_filing_readiness_pct),
      greenwashingRiskIndex: Number(row.greenwashing_risk_index),
      executiveSummary: parseJson(row.executive_summary),
      ghgInventoryBreakdown: parseJson(row.ghg_inventory_breakdown),
      tcfdScenarioAnalysis: parseJson(row.tcfd_scenario_analysis),
      csrdMaterialityReview: parseJson(row.csrd_materiality_review),
      sbtiSupplyChainRoadmap: parseJson(row.sbti_supply_chain_roadmap),
      secComplianceAudit: parseJson(row.sec_compliance_audit),
      approvedByCsoAt: row.approved_by_cso_at ? new Date(row.approved_by_cso_at).toISOString() : undefined,
      approvedByCfoAt: row.approved_by_cfo_at ? new Date(row.approved_by_cfo_at).toISOString() : undefined,
      approvedByBoardChairAt: row.approved_by_board_chair_at ? new Date(row.approved_by_board_chair_at).toISOString() : undefined,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString()
    };
  }
}
