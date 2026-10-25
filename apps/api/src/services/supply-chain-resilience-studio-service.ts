import type { Pool } from 'pg';
import crypto from 'node:crypto';
import {
  type SupplyChainStudioOverviewDTO,
  type SupplierBomNodeDTO,
  type GeopoliticalExposureDTO,
  type InventoryBufferDTO,
  type SourcingHubModelDTO,
  type SupplyChainBoardMemorandumDTO,
  type DisruptionSimulationRequestDTO,
  type DisruptionSimulationResultDTO,
  type HubCostComparisonRequestDTO,
  type HubCostComparisonResultDTO,
  type GenerateSupplyChainBoardMemoRequestDTO,
  type BoardSignoffRole,
  calculateCompositeScri,
  determineCrisisSeverityBand,
  calculateHerfindahlHirschmanIndex,
  calculateDualSourcingRatio,
  calculateSafetyStock,
  calculateTotalLandedCost,
  generateExecutiveSupplyChainMemorandum
} from '@jobtrack/contract';

export class SupplyChainResilienceStudioService {
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async ensureSchema(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS sc_studios (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        composite_scri NUMERIC(5, 2) NOT NULL DEFAULT 82.5,
        resilience_rating_band VARCHAR(64) NOT NULL DEFAULT 'defensible',
        crisis_severity VARCHAR(64) NOT NULL DEFAULT 'tier_1_watch',
        total_mapped_components INT NOT NULL DEFAULT 4,
        single_point_of_failure_count INT NOT NULL DEFAULT 2,
        aggregate_hhi_index INT NOT NULL DEFAULT 2140,
        dual_sourcing_ratio_percent NUMERIC(5, 2) NOT NULL DEFAULT 64.5,
        total_annual_tariff_exposure_usd NUMERIC(15, 2) NOT NULL DEFAULT 4850000.00,
        chokepoints_at_risk_count INT NOT NULL DEFAULT 2,
        average_dio_days NUMERIC(5, 1) NOT NULL DEFAULT 42.5,
        critical_buffer_deficits_count INT NOT NULL DEFAULT 1,
        potential_nearshoring_arbitrage_usd NUMERIC(15, 2) NOT NULL DEFAULT 3240000.00,
        active_sanction_flags_count INT NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_sc_studios_user ON sc_studios(user_id);

      CREATE TABLE IF NOT EXISTS sc_suppliers_bom (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        part_number VARCHAR(128) NOT NULL,
        component_name VARCHAR(255) NOT NULL,
        tier VARCHAR(64) NOT NULL,
        parent_part_number VARCHAR(128),
        supplier_name VARCHAR(255) NOT NULL,
        supplier_country VARCHAR(64) NOT NULL,
        criticality VARCHAR(64) NOT NULL DEFAULT 'high',
        sourcing_strategy VARCHAR(64) NOT NULL DEFAULT 'single_source',
        spend_volume_share_percent NUMERIC(5, 2) NOT NULL DEFAULT 100.0,
        hhi_contribution INT NOT NULL DEFAULT 10000,
        nominal_lead_time_days INT NOT NULL DEFAULT 45,
        annual_spend_usd NUMERIC(15, 2) NOT NULL DEFAULT 0.0,
        bom_vulnerability_score NUMERIC(5, 2) NOT NULL DEFAULT 65.0,
        is_single_point_of_failure BOOLEAN NOT NULL DEFAULT true,
        active_substitute_count INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_sc_bom_user_part ON sc_suppliers_bom(user_id, part_number);
      CREATE INDEX IF NOT EXISTS idx_sc_bom_user_tier ON sc_suppliers_bom(user_id, tier);

      CREATE TABLE IF NOT EXISTS sc_geopolitical_exposures (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        country_code VARCHAR(8) NOT NULL,
        country_name VARCHAR(128) NOT NULL,
        political_stability_score NUMERIC(5, 2) NOT NULL DEFAULT 75.0,
        trade_freedom_score NUMERIC(5, 2) NOT NULL DEFAULT 70.0,
        composite_country_risk NUMERIC(5, 2) NOT NULL DEFAULT 35.0,
        active_sanction_match VARCHAR(64) NOT NULL DEFAULT 'none',
        sanction_status VARCHAR(64) NOT NULL DEFAULT 'cleared',
        primary_hts_code VARCHAR(32) NOT NULL DEFAULT '8542.31.00',
        section_301_tariff_percent NUMERIC(5, 2) NOT NULL DEFAULT 25.0,
        section_232_tariff_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
        effective_tariff_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 25.0,
        primary_maritime_route TEXT[] NOT NULL DEFAULT '{}',
        chokepoint_risk_score NUMERIC(5, 2) NOT NULL DEFAULT 45.0,
        alternate_route_detour_days INT NOT NULL DEFAULT 12,
        annual_tariff_exposure_usd NUMERIC(15, 2) NOT NULL DEFAULT 0.0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_sc_geo_user_country ON sc_geopolitical_exposures(user_id, country_code);

      CREATE TABLE IF NOT EXISTS sc_inventory_buffers (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        sku VARCHAR(128) NOT NULL,
        component_name VARCHAR(255) NOT NULL,
        current_stock_units INT NOT NULL DEFAULT 1000,
        average_daily_demand_units NUMERIC(10, 2) NOT NULL DEFAULT 50.0,
        nominal_lead_time_days INT NOT NULL DEFAULT 30,
        std_dev_lead_time_days NUMERIC(6, 2) NOT NULL DEFAULT 6.5,
        std_dev_daily_demand_units NUMERIC(10, 2) NOT NULL DEFAULT 8.0,
        target_service_level_z NUMERIC(4, 2) NOT NULL DEFAULT 1.96,
        calculated_safety_stock_units INT NOT NULL DEFAULT 450,
        reorder_point_units INT NOT NULL DEFAULT 1950,
        days_of_inventory_outstanding NUMERIC(6, 1) NOT NULL DEFAULT 38.5,
        time_to_survive_days INT NOT NULL DEFAULT 28,
        time_to_recover_days INT NOT NULL DEFAULT 45,
        resilience_ratio NUMERIC(5, 2) NOT NULL DEFAULT 0.62,
        resilience_deficit_days INT NOT NULL DEFAULT 17,
        unit_cost_usd NUMERIC(12, 2) NOT NULL DEFAULT 125.00,
        holding_cost_per_unit_year_usd NUMERIC(12, 2) NOT NULL DEFAULT 25.00,
        stockout_vulnerability VARCHAR(64) NOT NULL DEFAULT 'elevated',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_sc_buffers_user_sku ON sc_inventory_buffers(user_id, sku);

      CREATE TABLE IF NOT EXISTS sc_network_hubs (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        hub_name VARCHAR(128) NOT NULL,
        region VARCHAR(64) NOT NULL,
        country VARCHAR(64) NOT NULL,
        transport_mode VARCHAR(64) NOT NULL DEFAULT 'maritime_container',
        ex_works_unit_cost_usd NUMERIC(12, 2) NOT NULL DEFAULT 100.00,
        freight_per_unit_usd NUMERIC(12, 2) NOT NULL DEFAULT 12.50,
        customs_tariff_percent NUMERIC(5, 2) NOT NULL DEFAULT 25.0,
        customs_tariff_per_unit_usd NUMERIC(12, 2) NOT NULL DEFAULT 25.00,
        pipeline_carrying_cost_per_unit_usd NUMERIC(12, 2) NOT NULL DEFAULT 3.20,
        quality_scrap_risk_per_unit_usd NUMERIC(12, 2) NOT NULL DEFAULT 4.00,
        total_landed_cost_usd NUMERIC(12, 2) NOT NULL DEFAULT 144.70,
        transit_lead_time_days INT NOT NULL DEFAULT 42,
        freight_carbon_kg_co2e_per_ton_km NUMERIC(8, 4) NOT NULL DEFAULT 0.0150,
        total_trip_carbon_kg_co2e_per_unit NUMERIC(10, 2) NOT NULL DEFAULT 48.50,
        regional_agility_rating NUMERIC(5, 2) NOT NULL DEFAULT 62.0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_sc_hubs_user_region ON sc_network_hubs(user_id, region);

      CREATE TABLE IF NOT EXISTS sc_board_memos (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        fiscal_quarter VARCHAR(32) NOT NULL,
        status VARCHAR(64) NOT NULL DEFAULT 'draft',
        crisis_severity VARCHAR(64) NOT NULL DEFAULT 'tier_1_watch',
        composite_scri NUMERIC(5, 2) NOT NULL DEFAULT 82.5,
        total_financial_exposure_usd NUMERIC(15, 2) NOT NULL DEFAULT 4850000.00,
        nearshoring_opportunity_usd NUMERIC(15, 2) NOT NULL DEFAULT 3240000.00,
        executive_summary_markdown TEXT NOT NULL,
        bom_vulnerability_section TEXT NOT NULL,
        geopolitical_sanctions_section TEXT NOT NULL,
        inventory_buffer_section TEXT NOT NULL,
        nearshoring_tlc_section TEXT NOT NULL,
        strategic_directives_section TEXT NOT NULL,
        approved_by_vp_supply_chain_at TIMESTAMPTZ,
        approved_by_coo_at TIMESTAMPTZ,
        approved_by_board_risk_chair_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_sc_memos_user_quarter ON sc_board_memos(user_id, fiscal_quarter DESC);
    `);
  }

  async ensureDefaults(userId: string): Promise<void> {
    await this.ensureSchema();

    const existing = await this.pool.query(
      'SELECT id FROM sc_studios WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    if (existing.rows.length > 0) {
      return;
    }

    const studioId = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO sc_studios (
        id, user_id, composite_scri, resilience_rating_band, crisis_severity,
        total_mapped_components, single_point_of_failure_count, aggregate_hhi_index,
        dual_sourcing_ratio_percent, total_annual_tariff_exposure_usd, chokepoints_at_risk_count,
        average_dio_days, critical_buffer_deficits_count, potential_nearshoring_arbitrage_usd,
        active_sanction_flags_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        studioId,
        userId,
        82.5,
        'defensible',
        'tier_1_watch',
        4,
        2,
        2140,
        64.5,
        4850000.0,
        2,
        42.5,
        1,
        3240000.0,
        1
      ]
    );

    const defaultNodes = [
      {
        id: crypto.randomUUID(),
        partNumber: 'PCBA-7001',
        componentName: 'Main Controller System Motherboard',
        tier: 'tier_1_integrator',
        parentPartNumber: null,
        supplierName: 'Apex Electronics Manufacturing',
        supplierCountry: 'Taiwan',
        criticality: 'existential',
        sourcingStrategy: 'dual_source',
        spendVolumeSharePercent: 65.0,
        hhiContribution: 4225,
        nominalLeadTimeDays: 45,
        annualSpendUsd: 14200000.0,
        bomVulnerabilityScore: 35.0,
        isSinglePointOfFailure: false,
        activeSubstituteCount: 1
      },
      {
        id: crypto.randomUUID(),
        partNumber: 'MEM-8820',
        componentName: 'DDR5 Low-Power High-Density DRAM',
        tier: 'tier_2_subassembly',
        parentPartNumber: 'PCBA-7001',
        supplierName: 'K-Semiconductor Foundry',
        supplierCountry: 'South Korea',
        criticality: 'critical_path',
        sourcingStrategy: 'dual_source',
        spendVolumeSharePercent: 55.0,
        hhiContribution: 3025,
        nominalLeadTimeDays: 38,
        annualSpendUsd: 8500000.0,
        bomVulnerabilityScore: 42.0,
        isSinglePointOfFailure: false,
        activeSubstituteCount: 2
      },
      {
        id: crypto.randomUUID(),
        partNumber: 'MCU-3305',
        componentName: 'Arm Cortex-M7 Real-Time Microcontroller',
        tier: 'tier_3_component',
        parentPartNumber: 'PCBA-7001',
        supplierName: 'TSMC Advanced Packaging',
        supplierCountry: 'Taiwan',
        criticality: 'existential',
        sourcingStrategy: 'single_source',
        spendVolumeSharePercent: 100.0,
        hhiContribution: 10000,
        nominalLeadTimeDays: 52,
        annualSpendUsd: 6100000.0,
        bomVulnerabilityScore: 88.0,
        isSinglePointOfFailure: true,
        activeSubstituteCount: 0
      },
      {
        id: crypto.randomUUID(),
        partNumber: 'RAW-1090',
        componentName: 'Ultra-High-Purity Silicon 300mm Ingot',
        tier: 'tier_4_raw_material',
        parentPartNumber: 'MCU-3305',
        supplierName: 'Bavaria Siltronic AG',
        supplierCountry: 'Germany',
        criticality: 'high',
        sourcingStrategy: 'single_source',
        spendVolumeSharePercent: 100.0,
        hhiContribution: 10000,
        nominalLeadTimeDays: 60,
        annualSpendUsd: 2900000.0,
        bomVulnerabilityScore: 72.0,
        isSinglePointOfFailure: true,
        activeSubstituteCount: 0
      }
    ];

    for (const node of defaultNodes) {
      await this.pool.query(
        `INSERT INTO sc_suppliers_bom (
          id, user_id, part_number, component_name, tier, parent_part_number,
          supplier_name, supplier_country, criticality, sourcing_strategy,
          spend_volume_share_percent, hhi_contribution, nominal_lead_time_days,
          annual_spend_usd, bom_vulnerability_score, is_single_point_of_failure,
          active_substitute_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          node.id,
          userId,
          node.partNumber,
          node.componentName,
          node.tier,
          node.parentPartNumber,
          node.supplierName,
          node.supplierCountry,
          node.criticality,
          node.sourcingStrategy,
          node.spendVolumeSharePercent,
          node.hhiContribution,
          node.nominalLeadTimeDays,
          node.annualSpendUsd,
          node.bomVulnerabilityScore,
          node.isSinglePointOfFailure,
          node.activeSubstituteCount
        ]
      );
    }

    const defaultExposures = [
      {
        id: crypto.randomUUID(),
        countryCode: 'CN',
        countryName: 'China',
        politicalStabilityScore: 54.0,
        tradeFreedomScore: 48.0,
        compositeCountryRisk: 62.0,
        activeSanctionMatch: 'bis_entity_list',
        sanctionStatus: 'flagged_restricted',
        primaryHtsCode: '8542.31.00',
        section301TariffPercent: 25.0,
        section232TariffPercent: 0.0,
        effectiveTariffRatePercent: 25.0,
        primaryMaritimeRoute: ['taiwan_strait', 'strait_of_malacca'],
        chokepointRiskScore: 78.0,
        alternateRouteDetourDays: 14,
        annualTariffExposureUsd: 3100000.0
      },
      {
        id: crypto.randomUUID(),
        countryCode: 'TW',
        countryName: 'Taiwan',
        politicalStabilityScore: 72.0,
        tradeFreedomScore: 85.0,
        compositeCountryRisk: 48.0,
        activeSanctionMatch: 'none',
        sanctionStatus: 'cleared',
        primaryHtsCode: '8542.39.00',
        section301TariffPercent: 0.0,
        section232TariffPercent: 0.0,
        effectiveTariffRatePercent: 0.0,
        primaryMaritimeRoute: ['taiwan_strait', 'suez_canal'],
        chokepointRiskScore: 82.0,
        alternateRouteDetourDays: 12,
        annualTariffExposureUsd: 0.0
      },
      {
        id: crypto.randomUUID(),
        countryCode: 'MX',
        countryName: 'Mexico',
        politicalStabilityScore: 68.0,
        tradeFreedomScore: 78.0,
        compositeCountryRisk: 28.0,
        activeSanctionMatch: 'none',
        sanctionStatus: 'cleared',
        primaryHtsCode: '8504.40.95',
        section301TariffPercent: 0.0,
        section232TariffPercent: 0.0,
        effectiveTariffRatePercent: 0.0,
        primaryMaritimeRoute: [],
        chokepointRiskScore: 5.0,
        alternateRouteDetourDays: 0,
        annualTariffExposureUsd: 0.0
      }
    ];

    for (const exp of defaultExposures) {
      await this.pool.query(
        `INSERT INTO sc_geopolitical_exposures (
          id, user_id, country_code, country_name, political_stability_score,
          trade_freedom_score, composite_country_risk, active_sanction_match,
          sanction_status, primary_hts_code, section_301_tariff_percent,
          section_232_tariff_percent, effective_tariff_rate_percent,
          primary_maritime_route, chokepoint_risk_score, alternate_route_detour_days,
          annual_tariff_exposure_usd
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          exp.id,
          userId,
          exp.countryCode,
          exp.countryName,
          exp.politicalStabilityScore,
          exp.tradeFreedomScore,
          exp.compositeCountryRisk,
          exp.activeSanctionMatch,
          exp.sanctionStatus,
          exp.primaryHtsCode,
          exp.section301TariffPercent,
          exp.section232TariffPercent,
          exp.effectiveTariffRatePercent,
          exp.primaryMaritimeRoute,
          exp.chokepointRiskScore,
          exp.alternateRouteDetourDays,
          exp.annualTariffExposureUsd
        ]
      );
    }

    const defaultBuffers = [
      {
        id: crypto.randomUUID(),
        sku: 'SKU-MCU-3305',
        componentName: 'Arm Cortex-M7 Microcontroller',
        currentStockUnits: 1400,
        averageDailyDemandUnits: 50.0,
        nominalLeadTimeDays: 52,
        stdDevLeadTimeDays: 12.0,
        stdDevDailyDemandUnits: 10.0,
        targetServiceLevelZ: 1.96,
        calculatedSafetyStockUnits: 1220,
        reorderPointUnits: 3820,
        daysOfInventoryOutstanding: 28.0,
        timeToSurviveDays: 28,
        timeToRecoverDays: 52,
        resilienceRatio: 0.54,
        resilienceDeficitDays: 24,
        unitCostUsd: 45.0,
        holdingCostPerUnitYearUsd: 9.0,
        stockoutVulnerability: 'critical_breach'
      },
      {
        id: crypto.randomUUID(),
        sku: 'SKU-MEM-8820',
        componentName: 'DDR5 Low-Power DRAM Module',
        currentStockUnits: 4500,
        averageDailyDemandUnits: 80.0,
        nominalLeadTimeDays: 38,
        stdDevLeadTimeDays: 6.0,
        stdDevDailyDemandUnits: 12.0,
        targetServiceLevelZ: 1.96,
        calculatedSafetyStockUnits: 1020,
        reorderPointUnits: 4060,
        daysOfInventoryOutstanding: 56.2,
        timeToSurviveDays: 56,
        timeToRecoverDays: 38,
        resilienceRatio: 1.47,
        resilienceDeficitDays: 0,
        unitCostUsd: 28.0,
        holdingCostPerUnitYearUsd: 5.6,
        stockoutVulnerability: 'secure'
      }
    ];

    for (const buf of defaultBuffers) {
      await this.pool.query(
        `INSERT INTO sc_inventory_buffers (
          id, user_id, sku, component_name, current_stock_units,
          average_daily_demand_units, nominal_lead_time_days, std_dev_lead_time_days,
          std_dev_daily_demand_units, target_service_level_z, calculated_safety_stock_units,
          reorder_point_units, days_of_inventory_outstanding, time_to_survive_days,
          time_to_recover_days, resilience_ratio, resilience_deficit_days, unit_cost_usd,
          holding_cost_per_unit_year_usd, stockout_vulnerability
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
        [
          buf.id,
          userId,
          buf.sku,
          buf.componentName,
          buf.currentStockUnits,
          buf.averageDailyDemandUnits,
          buf.nominalLeadTimeDays,
          buf.stdDevLeadTimeDays,
          buf.stdDevDailyDemandUnits,
          buf.targetServiceLevelZ,
          buf.calculatedSafetyStockUnits,
          buf.reorderPointUnits,
          buf.daysOfInventoryOutstanding,
          buf.timeToSurviveDays,
          buf.timeToRecoverDays,
          buf.resilienceRatio,
          buf.resilienceDeficitDays,
          buf.unitCostUsd,
          buf.holdingCostPerUnitYearUsd,
          buf.stockoutVulnerability
        ]
      );
    }

    const defaultHubs = [
      {
        id: crypto.randomUUID(),
        hubName: 'Shenzhen Southern Logistics Hub',
        region: 'asia_offshore',
        country: 'China',
        transportMode: 'maritime_container',
        exWorksUnitCostUsd: 85.0,
        freightPerUnitUsd: 14.5,
        customsTariffPercent: 25.0,
        customsTariffPerUnitUsd: 21.25,
        pipelineCarryingCostPerUnitUsd: 2.45,
        qualityScrapRiskPerUnitUsd: 3.5,
        totalLandedCostUsd: 126.7,
        transitLeadTimeDays: 42,
        freightCarbonKgCo2ePerTonKm: 0.015,
        totalTripCarbonKgCo2ePerUnit: 52.4,
        regionalAgilityRating: 58.0
      },
      {
        id: crypto.randomUUID(),
        hubName: 'Monterrey Advanced Manufacturing Center',
        region: 'mexico_nearshore',
        country: 'Mexico',
        transportMode: 'cross_border_trucking',
        exWorksUnitCostUsd: 92.0,
        freightPerUnitUsd: 4.8,
        customsTariffPercent: 0.0,
        customsTariffPerUnitUsd: 0.0,
        pipelineCarryingCostPerUnitUsd: 0.25,
        qualityScrapRiskPerUnitUsd: 1.5,
        totalLandedCostUsd: 98.55,
        transitLeadTimeDays: 4,
        freightCarbonKgCo2ePerTonKm: 0.082,
        totalTripCarbonKgCo2ePerUnit: 16.8,
        regionalAgilityRating: 88.0
      },
      {
        id: crypto.randomUUID(),
        hubName: 'Austin Domestic Technology Hub',
        region: 'us_onshore',
        country: 'United States',
        transportMode: 'intermodal_rail',
        exWorksUnitCostUsd: 104.0,
        freightPerUnitUsd: 2.5,
        customsTariffPercent: 0.0,
        customsTariffPerUnitUsd: 0.0,
        pipelineCarryingCostPerUnitUsd: 0.12,
        qualityScrapRiskPerUnitUsd: 0.5,
        totalLandedCostUsd: 107.12,
        transitLeadTimeDays: 2,
        freightCarbonKgCo2ePerTonKm: 0.028,
        totalTripCarbonKgCo2ePerUnit: 6.2,
        regionalAgilityRating: 95.0
      }
    ];

    for (const hub of defaultHubs) {
      await this.pool.query(
        `INSERT INTO sc_network_hubs (
          id, user_id, hub_name, region, country, transport_mode,
          ex_works_unit_cost_usd, freight_per_unit_usd, customs_tariff_percent,
          customs_tariff_per_unit_usd, pipeline_carrying_cost_per_unit_usd,
          quality_scrap_risk_per_unit_usd, total_landed_cost_usd, transit_lead_time_days,
          freight_carbon_kg_co2e_per_ton_km, total_trip_carbon_kg_co2e_per_unit,
          regional_agility_rating
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          hub.id,
          userId,
          hub.hubName,
          hub.region,
          hub.country,
          hub.transportMode,
          hub.exWorksUnitCostUsd,
          hub.freightPerUnitUsd,
          hub.customsTariffPercent,
          hub.customsTariffPerUnitUsd,
          hub.pipelineCarryingCostPerUnitUsd,
          hub.qualityScrapRiskPerUnitUsd,
          hub.totalLandedCostUsd,
          hub.transitLeadTimeDays,
          hub.freightCarbonKgCo2ePerTonKm,
          hub.totalTripCarbonKgCo2ePerUnit,
          hub.regionalAgilityRating
        ]
      );
    }
  }

  async getOverview(userId: string): Promise<SupplyChainStudioOverviewDTO> {
    await this.ensureDefaults(userId);

    const studioRes = await this.pool.query(
      'SELECT * FROM sc_studios WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    const studioRow = studioRes.rows[0];

    const bomRes = await this.pool.query(
      'SELECT * FROM sc_suppliers_bom WHERE user_id = $1 ORDER BY nominal_lead_time_days DESC',
      [userId]
    );
    const nodes: SupplierBomNodeDTO[] = bomRes.rows.map((r) => ({
      id: r.id,
      partNumber: r.part_number,
      componentName: r.component_name,
      tier: r.tier,
      parentPartNumber: r.parent_part_number,
      supplierName: r.supplier_name,
      supplierCountry: r.supplier_country,
      criticality: r.criticality,
      sourcingStrategy: r.sourcing_strategy,
      spendVolumeSharePercent: Number(r.spend_volume_share_percent),
      hhiContribution: Number(r.hhi_contribution),
      nominalLeadTimeDays: Number(r.nominal_lead_time_days),
      annualSpendUsd: Number(r.annual_spend_usd),
      bomVulnerabilityScore: Number(r.bom_vulnerability_score),
      isSinglePointOfFailure: Boolean(r.is_single_point_of_failure),
      activeSubstituteCount: Number(r.active_substitute_count)
    }));

    const geoRes = await this.pool.query(
      'SELECT * FROM sc_geopolitical_exposures WHERE user_id = $1 ORDER BY composite_country_risk DESC',
      [userId]
    );
    const exposures: GeopoliticalExposureDTO[] = geoRes.rows.map((r) => ({
      id: r.id,
      countryCode: r.country_code,
      countryName: r.country_name,
      politicalStabilityScore: Number(r.political_stability_score),
      tradeFreedomScore: Number(r.trade_freedom_score),
      compositeCountryRisk: Number(r.composite_country_risk),
      activeSanctionMatch: r.active_sanction_match,
      sanctionStatus: r.sanction_status,
      primaryHtsCode: r.primary_hts_code,
      section301TariffPercent: Number(r.section_301_tariff_percent),
      section232TariffPercent: Number(r.section_232_tariff_percent),
      effectiveTariffRatePercent: Number(r.effective_tariff_rate_percent),
      primaryMaritimeRoute: r.primary_maritime_route || [],
      chokepointRiskScore: Number(r.chokepoint_risk_score),
      alternateRouteDetourDays: Number(r.alternate_route_detour_days),
      annualTariffExposureUsd: Number(r.annual_tariff_exposure_usd)
    }));

    const bufferRes = await this.pool.query(
      'SELECT * FROM sc_inventory_buffers WHERE user_id = $1 ORDER BY resilience_deficit_days DESC',
      [userId]
    );
    const buffers: InventoryBufferDTO[] = bufferRes.rows.map((r) => ({
      id: r.id,
      sku: r.sku,
      componentName: r.component_name,
      currentStockUnits: Number(r.current_stock_units),
      averageDailyDemandUnits: Number(r.average_daily_demand_units),
      nominalLeadTimeDays: Number(r.nominal_lead_time_days),
      stdDevLeadTimeDays: Number(r.std_dev_lead_time_days),
      stdDevDailyDemandUnits: Number(r.std_dev_daily_demand_units),
      targetServiceLevelZ: Number(r.target_service_level_z),
      calculatedSafetyStockUnits: Number(r.calculated_safety_stock_units),
      reorderPointUnits: Number(r.reorder_point_units),
      daysOfInventoryOutstanding: Number(r.days_of_inventory_outstanding),
      timeToSurviveDays: Number(r.time_to_survive_days),
      timeToRecoverDays: Number(r.time_to_recover_days),
      resilienceRatio: Number(r.resilience_ratio),
      resilienceDeficitDays: Number(r.resilience_deficit_days),
      unitCostUsd: Number(r.unit_cost_usd),
      holdingCostPerUnitYearUsd: Number(r.holding_cost_per_unit_year_usd),
      stockoutVulnerability: r.stockout_vulnerability
    }));

    const hubsRes = await this.pool.query(
      'SELECT * FROM sc_network_hubs WHERE user_id = $1 ORDER BY total_landed_cost_usd ASC',
      [userId]
    );
    const allHubs: SourcingHubModelDTO[] = hubsRes.rows.map((r) => ({
      id: r.id,
      hubName: r.hub_name,
      region: r.region,
      country: r.country,
      transportMode: r.transport_mode,
      exWorksUnitCostUsd: Number(r.ex_works_unit_cost_usd),
      freightPerUnitUsd: Number(r.freight_per_unit_usd),
      customsTariffPercent: Number(r.customs_tariff_percent),
      customsTariffPerUnitUsd: Number(r.customs_tariff_per_unit_usd),
      pipelineCarryingCostPerUnitUsd: Number(r.pipeline_carrying_cost_per_unit_usd),
      qualityScrapRiskPerUnitUsd: Number(r.quality_scrap_risk_per_unit_usd),
      totalLandedCostUsd: Number(r.total_landed_cost_usd),
      transitLeadTimeDays: Number(r.transit_lead_time_days),
      freightCarbonKgCo2ePerTonKm: Number(r.freight_carbon_kg_co2e_per_ton_km),
      totalTripCarbonKgCo2ePerUnit: Number(r.total_trip_carbon_kg_co2e_per_unit),
      regionalAgilityRating: Number(r.regional_agility_rating)
    }));

    const memoRes = await this.pool.query(
      'SELECT * FROM sc_board_memos WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5',
      [userId]
    );
    const recentMemos: SupplyChainBoardMemorandumDTO[] = memoRes.rows.map((r) => ({
      id: r.id,
      title: r.title,
      fiscalQuarter: r.fiscal_quarter,
      status: r.status,
      crisisSeverity: r.crisis_severity,
      compositeScri: Number(r.composite_scri),
      totalFinancialExposureUsd: Number(r.total_financial_exposure_usd),
      nearshoringOpportunityUsd: Number(r.nearshoring_opportunity_usd),
      executiveSummaryMarkdown: r.executive_summary_markdown,
      bomVulnerabilitySection: r.bom_vulnerability_section,
      geopoliticalSanctionsSection: r.geopolitical_sanctions_section,
      inventoryBufferSection: r.inventory_buffer_section,
      nearshoringTlcSection: r.nearshoring_tlc_section,
      strategicDirectivesSection: r.strategic_directives_section,
      approvedByVpSupplyChainAt: r.approved_by_vp_supply_chain_at,
      approvedByCooAt: r.approved_by_coo_at,
      approvedByBoardRiskChairAt: r.approved_by_board_risk_chair_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    const primaryOffshoreHub = allHubs.find((h) => h.region === 'asia_offshore') || allHubs[0];
    const primaryNearshoreHub = allHubs.find((h) => h.region === 'mexico_nearshore') || allHubs[1];
    const primaryOnshoreHub = allHubs.find((h) => h.region === 'us_onshore') || allHubs[2];

    const compositeBreakdown = calculateCompositeScri({
      supplierRedundancyScore: 78.0,
      geopoliticalStabilityScore: 74.0,
      bufferAdequacyScore: 68.0,
      landedCostAgilityScore: 86.0,
      sanctionsImmunityScore: 92.0
    });

    const severity = determineCrisisSeverityBand(
      compositeBreakdown.compositeScri,
      Number(studioRow.chokepoints_at_risk_count),
      Number(studioRow.critical_buffer_deficits_count),
      Number(studioRow.active_sanction_flags_count)
    );

    return {
      compositeScri: compositeBreakdown.compositeScri,
      resilienceRatingBand: compositeBreakdown.resilienceRatingBand,
      crisisSeverity: severity,
      totalMappedComponents: nodes.length,
      singlePointOfFailureCount: nodes.filter((n) => n.isSinglePointOfFailure).length,
      aggregateHhiIndex: calculateHerfindahlHirschmanIndex(nodes.map((n) => n.spendVolumeSharePercent)),
      dualSourcingRatioPercent: calculateDualSourcingRatio(
        nodes.filter((n) => n.criticality === 'critical_path' || n.criticality === 'existential').length,
        nodes.filter((n) => n.sourcingStrategy === 'dual_source').length
      ),
      totalAnnualTariffExposureUsd: exposures.reduce((acc, e) => acc + e.annualTariffExposureUsd, 0),
      chokepointsAtRiskCount: Number(studioRow.chokepoints_at_risk_count),
      averageDioDays: Number(studioRow.average_dio_days),
      criticalBufferDeficitCount: buffers.filter((b) => b.resilienceDeficitDays > 0).length,
      potentialNearshoringArbitrageUsd: Number(studioRow.potential_nearshoring_arbitrage_usd),
      activeSanctionFlagsCount: exposures.filter((e) => e.sanctionStatus === 'flagged_restricted').length,
      indexBreakdown: {
        supplierRedundancyScore: 78.0,
        geopoliticalStabilityScore: 74.0,
        bufferAdequacyScore: 68.0,
        landedCostAgilityScore: 86.0,
        sanctionsImmunityScore: 92.0,
        compositeScri: compositeBreakdown.compositeScri,
        resilienceRatingBand: compositeBreakdown.resilienceRatingBand
      },
      bomSummary: {
        totalComponentsMapped: nodes.length,
        tier1Count: nodes.filter((n) => n.tier === 'tier_1_integrator').length,
        tier2Count: nodes.filter((n) => n.tier === 'tier_2_subassembly').length,
        tier3Count: nodes.filter((n) => n.tier === 'tier_3_component').length,
        tier4Count: nodes.filter((n) => n.tier === 'tier_4_raw_material').length,
        singlePointOfFailureCount: nodes.filter((n) => n.isSinglePointOfFailure).length,
        aggregateHhiIndex: calculateHerfindahlHirschmanIndex(nodes.map((n) => n.spendVolumeSharePercent)),
        dualSourcingRatioPercent: 64.5,
        averageBomVulnerabilityScore: 59.2,
        nodes
      },
      geopoliticalSummary: {
        totalCountriesMonitored: exposures.length,
        highRiskJurisdictionCount: exposures.filter((e) => e.compositeCountryRisk >= 50).length,
        flaggedSanctionEntitiesCount: exposures.filter((e) => e.sanctionStatus === 'flagged_restricted').length,
        totalAnnualTariffExposureUsd: exposures.reduce((acc, e) => acc + e.annualTariffExposureUsd, 0),
        criticalChokepointVulnerabilityCount: exposures.filter((e) => e.chokepointRiskScore >= 70).length,
        exposures
      },
      bufferSummary: {
        totalSkusTracked: buffers.length,
        criticalDeficitSkusCount: buffers.filter((b) => b.resilienceDeficitDays > 0).length,
        averageDioDays: 42.1,
        totalBufferCarryingCostUsd: buffers.reduce((acc, b) => acc + b.holdingCostPerUnitYearUsd * b.currentStockUnits, 0),
        aggregateStockoutExposureUsd: 1450000.0,
        buffers
      },
      networkSummary: {
        activeHubsCount: allHubs.length,
        primaryOffshoreHub,
        primaryNearshoreHub,
        primaryOnshoreHub,
        projectedAnnualNearshoringArbitrageUsd: 3240000.0,
        averageLeadTimeAdvantageDays: 38,
        allHubs
      },
      recentMemos
    };
  }

  async getBomNodes(userId: string): Promise<SupplierBomNodeDTO[]> {
    await this.ensureDefaults(userId);
    const res = await this.pool.query(
      'SELECT * FROM sc_suppliers_bom WHERE user_id = $1 ORDER BY nominal_lead_time_days DESC',
      [userId]
    );
    return res.rows.map((r) => ({
      id: r.id,
      partNumber: r.part_number,
      componentName: r.component_name,
      tier: r.tier,
      parentPartNumber: r.parent_part_number,
      supplierName: r.supplier_name,
      supplierCountry: r.supplier_country,
      criticality: r.criticality,
      sourcingStrategy: r.sourcing_strategy,
      spendVolumeSharePercent: Number(r.spend_volume_share_percent),
      hhiContribution: Number(r.hhi_contribution),
      nominalLeadTimeDays: Number(r.nominal_lead_time_days),
      annualSpendUsd: Number(r.annual_spend_usd),
      bomVulnerabilityScore: Number(r.bom_vulnerability_score),
      isSinglePointOfFailure: Boolean(r.is_single_point_of_failure),
      activeSubstituteCount: Number(r.active_substitute_count)
    }));
  }

  async saveBomNode(userId: string, input: Partial<SupplierBomNodeDTO>): Promise<SupplierBomNodeDTO> {
    await this.ensureDefaults(userId);
    const id = input.id || crypto.randomUUID();
    const hhiContrib = Math.round(Math.pow(input.spendVolumeSharePercent || 100, 2));
    const isSpof = (input.sourcingStrategy === 'single_source') || (input.activeSubstituteCount === 0);
    const bomVuln = isSpof ? Math.min(100, 50 + (input.nominalLeadTimeDays || 45) * 0.7) : 35.0;

    const res = await this.pool.query(
      `INSERT INTO sc_suppliers_bom (
        id, user_id, part_number, component_name, tier, parent_part_number,
        supplier_name, supplier_country, criticality, sourcing_strategy,
        spend_volume_share_percent, hhi_contribution, nominal_lead_time_days,
        annual_spend_usd, bom_vulnerability_score, is_single_point_of_failure,
        active_substitute_count, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        part_number = EXCLUDED.part_number,
        component_name = EXCLUDED.component_name,
        tier = EXCLUDED.tier,
        parent_part_number = EXCLUDED.parent_part_number,
        supplier_name = EXCLUDED.supplier_name,
        supplier_country = EXCLUDED.supplier_country,
        criticality = EXCLUDED.criticality,
        sourcing_strategy = EXCLUDED.sourcing_strategy,
        spend_volume_share_percent = EXCLUDED.spend_volume_share_percent,
        hhi_contribution = EXCLUDED.hhi_contribution,
        nominal_lead_time_days = EXCLUDED.nominal_lead_time_days,
        annual_spend_usd = EXCLUDED.annual_spend_usd,
        bom_vulnerability_score = EXCLUDED.bom_vulnerability_score,
        is_single_point_of_failure = EXCLUDED.is_single_point_of_failure,
        active_substitute_count = EXCLUDED.active_substitute_count,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        id,
        userId,
        input.partNumber || 'PART-UNKNOWN',
        input.componentName || 'Component',
        input.tier || 'tier_3_component',
        input.parentPartNumber || null,
        input.supplierName || 'Global Supplier',
        input.supplierCountry || 'US',
        input.criticality || 'high',
        input.sourcingStrategy || 'single_source',
        input.spendVolumeSharePercent ?? 100.0,
        hhiContrib,
        input.nominalLeadTimeDays ?? 45,
        input.annualSpendUsd ?? 1000000.0,
        bomVuln,
        isSpof,
        input.activeSubstituteCount ?? 0
      ]
    );

    const r = res.rows[0];
    return {
      id: r.id,
      partNumber: r.part_number,
      componentName: r.component_name,
      tier: r.tier,
      parentPartNumber: r.parent_part_number,
      supplierName: r.supplier_name,
      supplierCountry: r.supplier_country,
      criticality: r.criticality,
      sourcingStrategy: r.sourcing_strategy,
      spendVolumeSharePercent: Number(r.spend_volume_share_percent),
      hhiContribution: Number(r.hhi_contribution),
      nominalLeadTimeDays: Number(r.nominal_lead_time_days),
      annualSpendUsd: Number(r.annual_spend_usd),
      bomVulnerabilityScore: Number(r.bom_vulnerability_score),
      isSinglePointOfFailure: Boolean(r.is_single_point_of_failure),
      activeSubstituteCount: Number(r.active_substitute_count)
    };
  }

  async getGeopoliticalExposures(userId: string): Promise<GeopoliticalExposureDTO[]> {
    await this.ensureDefaults(userId);
    const res = await this.pool.query(
      'SELECT * FROM sc_geopolitical_exposures WHERE user_id = $1 ORDER BY composite_country_risk DESC',
      [userId]
    );
    return res.rows.map((r) => ({
      id: r.id,
      countryCode: r.country_code,
      countryName: r.country_name,
      politicalStabilityScore: Number(r.political_stability_score),
      tradeFreedomScore: Number(r.trade_freedom_score),
      compositeCountryRisk: Number(r.composite_country_risk),
      activeSanctionMatch: r.active_sanction_match,
      sanctionStatus: r.sanction_status,
      primaryHtsCode: r.primary_hts_code,
      section301TariffPercent: Number(r.section_301_tariff_percent),
      section232TariffPercent: Number(r.section_232_tariff_percent),
      effectiveTariffRatePercent: Number(r.effective_tariff_rate_percent),
      primaryMaritimeRoute: r.primary_maritime_route || [],
      chokepointRiskScore: Number(r.chokepoint_risk_score),
      alternateRouteDetourDays: Number(r.alternate_route_detour_days),
      annualTariffExposureUsd: Number(r.annual_tariff_exposure_usd)
    }));
  }

  async screenSanctions(userId: string): Promise<GeopoliticalExposureDTO[]> {
    await this.ensureDefaults(userId);
    return this.getGeopoliticalExposures(userId);
  }

  async getInventoryBuffers(userId: string): Promise<InventoryBufferDTO[]> {
    await this.ensureDefaults(userId);
    const res = await this.pool.query(
      'SELECT * FROM sc_inventory_buffers WHERE user_id = $1 ORDER BY resilience_deficit_days DESC',
      [userId]
    );
    return res.rows.map((r) => ({
      id: r.id,
      sku: r.sku,
      componentName: r.component_name,
      currentStockUnits: Number(r.current_stock_units),
      averageDailyDemandUnits: Number(r.average_daily_demand_units),
      nominalLeadTimeDays: Number(r.nominal_lead_time_days),
      stdDevLeadTimeDays: Number(r.std_dev_lead_time_days),
      stdDevDailyDemandUnits: Number(r.std_dev_daily_demand_units),
      targetServiceLevelZ: Number(r.target_service_level_z),
      calculatedSafetyStockUnits: Number(r.calculated_safety_stock_units),
      reorderPointUnits: Number(r.reorder_point_units),
      daysOfInventoryOutstanding: Number(r.days_of_inventory_outstanding),
      timeToSurviveDays: Number(r.time_to_survive_days),
      timeToRecoverDays: Number(r.time_to_recover_days),
      resilienceRatio: Number(r.resilience_ratio),
      resilienceDeficitDays: Number(r.resilience_deficit_days),
      unitCostUsd: Number(r.unit_cost_usd),
      holdingCostPerUnitYearUsd: Number(r.holding_cost_per_unit_year_usd),
      stockoutVulnerability: r.stockout_vulnerability
    }));
  }

  async simulateLeadTimeDisruption(
    userId: string,
    req: DisruptionSimulationRequestDTO
  ): Promise<DisruptionSimulationResultDTO> {
    await this.ensureDefaults(userId);
    const bufRes = await this.pool.query(
      'SELECT * FROM sc_inventory_buffers WHERE user_id = $1 AND sku = $2 LIMIT 1',
      [userId, req.sku]
    );
    if (bufRes.rows.length === 0) {
      throw new Error(`Buffer SKU ${req.sku} not found`);
    }
    const buf = bufRes.rows[0];

    const effectiveDelay = req.simulatedDelayDays;
    const currentTts = Number(buf.time_to_survive_days);
    const projectedShortfall = Math.max(0, effectiveDelay - currentTts);
    const lostRev = projectedShortfall * Number(buf.average_daily_demand_units) * Number(buf.unit_cost_usd) * 3.5;

    const newSafetyStock = calculateSafetyStock(
      Number(buf.target_service_level_z),
      Number(buf.nominal_lead_time_days) + effectiveDelay,
      Number(buf.std_dev_daily_demand_units),
      Number(buf.average_daily_demand_units) * (1 + req.demandSurgePercent / 100),
      Number(buf.std_dev_lead_time_days) * 1.5
    );

    const incrementalUnits = Math.max(0, newSafetyStock - Number(buf.calculated_safety_stock_units));
    const incrementalWorkingCapital = incrementalUnits * Number(buf.unit_cost_usd);
    const simulatedTtsRatio = Number(((currentTts + incrementalUnits / Number(buf.average_daily_demand_units)) / (Number(buf.nominal_lead_time_days) + effectiveDelay)).toFixed(2));

    let feasibility: 'feasible_buffered' | 'urgent_mitigation_needed' | 'catastrophic_shutdown' =
      'catastrophic_shutdown';
    if (simulatedTtsRatio >= 1.0) {
      feasibility = 'feasible_buffered';
    } else if (simulatedTtsRatio >= 0.7) {
      feasibility = 'urgent_mitigation_needed';
    }

    return {
      sku: req.sku,
      simulatedDelayDays: req.simulatedDelayDays,
      projectedStockoutDays: projectedShortfall,
      estimatedLostRevenueUsd: Number(lostRev.toFixed(2)),
      recommendedSafetyStockIncreaseUnits: incrementalUnits,
      incrementalWorkingCapitalUsd: Number(incrementalWorkingCapital.toFixed(2)),
      simulatedTtsRatio,
      recoveryFeasibility: feasibility
    };
  }

  async getNetworkHubs(userId: string): Promise<SourcingHubModelDTO[]> {
    await this.ensureDefaults(userId);
    const res = await this.pool.query(
      'SELECT * FROM sc_network_hubs WHERE user_id = $1 ORDER BY total_landed_cost_usd ASC',
      [userId]
    );
    return res.rows.map((r) => ({
      id: r.id,
      hubName: r.hub_name,
      region: r.region,
      country: r.country,
      transportMode: r.transport_mode,
      exWorksUnitCostUsd: Number(r.ex_works_unit_cost_usd),
      freightPerUnitUsd: Number(r.freight_per_unit_usd),
      customsTariffPercent: Number(r.customs_tariff_percent),
      customsTariffPerUnitUsd: Number(r.customs_tariff_per_unit_usd),
      pipelineCarryingCostPerUnitUsd: Number(r.pipeline_carrying_cost_per_unit_usd),
      qualityScrapRiskPerUnitUsd: Number(r.quality_scrap_risk_per_unit_usd),
      totalLandedCostUsd: Number(r.total_landed_cost_usd),
      transitLeadTimeDays: Number(r.transit_lead_time_days),
      freightCarbonKgCo2ePerTonKm: Number(r.freight_carbon_kg_co2e_per_ton_km),
      totalTripCarbonKgCo2ePerUnit: Number(r.total_trip_carbon_kg_co2e_per_unit),
      regionalAgilityRating: Number(r.regional_agility_rating)
    }));
  }

  async compareHubLandedCosts(
    userId: string,
    req: HubCostComparisonRequestDTO
  ): Promise<HubCostComparisonResultDTO> {
    await this.ensureDefaults(userId);
    const hubs = await this.getNetworkHubs(userId);
    const baselineHub = hubs.find((h) => h.id === req.baselineHubId) || hubs[0];
    const candidateHubs = hubs.filter((h) => req.candidateHubIds.includes(h.id));

    const bestCandidate = candidateHubs.reduce(
      (best, current) => (current.totalLandedCostUsd < best.totalLandedCostUsd ? current : best),
      candidateHubs[0] || baselineHub
    );

    const costDeltaPerUnit = baselineHub.totalLandedCostUsd - bestCandidate.totalLandedCostUsd;
    const annualSavingsUsd = Math.max(0, costDeltaPerUnit * req.annualProductionVolumeUnits);
    const landedCostDeltaPercent = Number(((costDeltaPerUnit / baselineHub.totalLandedCostUsd) * 100).toFixed(2));
    const leadTimeReductionDays = Math.max(0, baselineHub.transitLeadTimeDays - bestCandidate.transitLeadTimeDays);
    const freightCarbonDeltaPercent = Number(
      (((baselineHub.totalTripCarbonKgCo2ePerUnit - bestCandidate.totalTripCarbonKgCo2ePerUnit) /
        baselineHub.totalTripCarbonKgCo2ePerUnit) *
        100).toFixed(2)
    );

    return {
      baselineHub,
      candidateHubs,
      annualSavingsUsd: Number(annualSavingsUsd.toFixed(2)),
      landedCostDeltaPercent,
      leadTimeReductionDays,
      freightCarbonDeltaPercent,
      optimalRecommendation: `Transition primary manufacturing volume to ${bestCandidate.hubName} (${bestCandidate.country}) to capture ${landedCostDeltaPercent}% TLC savings and reduce freight lead times by ${leadTimeReductionDays} days.`
    };
  }

  async getBoardMemos(userId: string): Promise<SupplyChainBoardMemorandumDTO[]> {
    await this.ensureDefaults(userId);
    const res = await this.pool.query(
      'SELECT * FROM sc_board_memos WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return res.rows.map((r) => ({
      id: r.id,
      title: r.title,
      fiscalQuarter: r.fiscal_quarter,
      status: r.status,
      crisisSeverity: r.crisis_severity,
      compositeScri: Number(r.composite_scri),
      totalFinancialExposureUsd: Number(r.total_financial_exposure_usd),
      nearshoringOpportunityUsd: Number(r.nearshoring_opportunity_usd),
      executiveSummaryMarkdown: r.executive_summary_markdown,
      bomVulnerabilitySection: r.bom_vulnerability_section,
      geopoliticalSanctionsSection: r.geopolitical_sanctions_section,
      inventoryBufferSection: r.inventory_buffer_section,
      nearshoringTlcSection: r.nearshoring_tlc_section,
      strategicDirectivesSection: r.strategic_directives_section,
      approvedByVpSupplyChainAt: r.approved_by_vp_supply_chain_at,
      approvedByCooAt: r.approved_by_coo_at,
      approvedByBoardRiskChairAt: r.approved_by_board_risk_chair_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  }

  async generateBoardMemorandum(
    userId: string,
    req: GenerateSupplyChainBoardMemoRequestDTO
  ): Promise<SupplyChainBoardMemorandumDTO> {
    const overview = await this.getOverview(userId);
    const memoId = crypto.randomUUID();
    const markdownContent = generateExecutiveSupplyChainMemorandum({
      title: req.title,
      fiscalQuarter: req.fiscalQuarter,
      overview,
      customDirectives: req.customDirectives
    });

    const inserted = await this.pool.query(
      `INSERT INTO sc_board_memos (
        id, user_id, title, fiscal_quarter, status, crisis_severity,
        composite_scri, total_financial_exposure_usd, nearshoring_opportunity_usd,
        executive_summary_markdown, bom_vulnerability_section, geopolitical_sanctions_section,
        inventory_buffer_section, nearshoring_tlc_section, strategic_directives_section
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        memoId,
        userId,
        req.title,
        req.fiscalQuarter,
        'draft',
        overview.crisisSeverity,
        overview.compositeScri,
        overview.totalAnnualTariffExposureUsd,
        overview.potentialNearshoringArbitrageUsd,
        markdownContent,
        'Pillar A Multi-Tier BOM Analysis',
        'Pillar B Geopolitical & Sanctions Screening Analysis',
        'Pillar C Buffer Stock & Monte Carlo Simulation Analysis',
        'Pillar D Nearshoring Total Landed Cost Analysis',
        'Pillar E Strategic C-Suite Directives'
      ]
    );

    const r = inserted.rows[0];
    return {
      id: r.id,
      title: r.title,
      fiscalQuarter: r.fiscal_quarter,
      status: r.status,
      crisisSeverity: r.crisis_severity,
      compositeScri: Number(r.composite_scri),
      totalFinancialExposureUsd: Number(r.total_financial_exposure_usd),
      nearshoringOpportunityUsd: Number(r.nearshoring_opportunity_usd),
      executiveSummaryMarkdown: r.executive_summary_markdown,
      bomVulnerabilitySection: r.bom_vulnerability_section,
      geopoliticalSanctionsSection: r.geopolitical_sanctions_section,
      inventoryBufferSection: r.inventory_buffer_section,
      nearshoringTlcSection: r.nearshoring_tlc_section,
      strategicDirectivesSection: r.strategic_directives_section,
      approvedByVpSupplyChainAt: r.approved_by_vp_supply_chain_at,
      approvedByCooAt: r.approved_by_coo_at,
      approvedByBoardRiskChairAt: r.approved_by_board_risk_chair_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  async signOffBoardMemorandum(
    userId: string,
    memoId: string,
    role: BoardSignoffRole,
    notes?: string
  ): Promise<SupplyChainBoardMemorandumDTO> {
    await this.ensureDefaults(userId);
    let updateField = '';
    if (role === 'vp_supply_chain') {
      updateField = 'approved_by_vp_supply_chain_at = CURRENT_TIMESTAMP';
    } else if (role === 'chief_operating_officer') {
      updateField = 'approved_by_coo_at = CURRENT_TIMESTAMP';
    } else if (role === 'board_risk_chair') {
      updateField = "approved_by_board_risk_chair_at = CURRENT_TIMESTAMP, status = 'board_approved'";
    } else {
      throw new Error(`Invalid role ${role}`);
    }

    const res = await this.pool.query(
      `UPDATE sc_board_memos
       SET ${updateField}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [memoId, userId]
    );

    if (res.rows.length === 0) {
      throw new Error(`Board memo ${memoId} not found`);
    }

    const r = res.rows[0];
    return {
      id: r.id,
      title: r.title,
      fiscalQuarter: r.fiscal_quarter,
      status: r.status,
      crisisSeverity: r.crisis_severity,
      compositeScri: Number(r.composite_scri),
      totalFinancialExposureUsd: Number(r.total_financial_exposure_usd),
      nearshoringOpportunityUsd: Number(r.nearshoring_opportunity_usd),
      executiveSummaryMarkdown: r.executive_summary_markdown,
      bomVulnerabilitySection: r.bom_vulnerability_section,
      geopoliticalSanctionsSection: r.geopolitical_sanctions_section,
      inventoryBufferSection: r.inventory_buffer_section,
      nearshoringTlcSection: r.nearshoring_tlc_section,
      strategicDirectivesSection: r.strategic_directives_section,
      approvedByVpSupplyChainAt: r.approved_by_vp_supply_chain_at,
      approvedByCooAt: r.approved_by_coo_at,
      approvedByBoardRiskChairAt: r.approved_by_board_risk_chair_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }
}
