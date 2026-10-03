/**
 * Scoring configuration — editable reference table.
 * Sources: published green-campus rubrics & municipal per-capita norms.
 * !! PLACEHOLDER VALUES: must be verified against the current official
 * NAAC manual / state benchmarks before being used for accreditation. !!
 */
export interface Benchmark {
  /** normalised metric key */
  key: string
  /** value at the "poor" end (score 0) */
  poor: number
  /** value at the "excellent" end (score 100) */
  excellent: number
  /** lower raw value = better? */
  lowerIsBetter: boolean
  unit: string
  source: string
}

export const BENCHMARKS: Record<string, Benchmark> = {
  energy_kwh_per_person_month: {
    key: 'energy_kwh_per_person_month', poor: 150, excellent: 60, lowerIsBetter: true,
    unit: 'kWh/person/month', source: 'Placeholder benchmark — verify against green-campus rubric',
  },
  water_l_per_person_day: {
    key: 'water_l_per_person_day', poor: 200, excellent: 80, lowerIsBetter: true,
    unit: 'L/person/day', source: 'Placeholder — verify vs CPWD norms',
  },
  waste_kg_per_person_day: {
    key: 'waste_kg_per_person_day', poor: 1.2, excellent: 0.4, lowerIsBetter: true,
    unit: 'kg/person/day', source: 'Placeholder — verify vs SBM city estimates',
  },
  waste_diversion_pct: {
    key: 'waste_diversion_pct', poor: 20, excellent: 70, lowerIsBetter: false,
    unit: '%', source: 'Placeholder — verify',
  },
  transport_co2e_kg_per_person_month: {
    key: 'transport_co2e_kg_per_person_month', poor: 90, excellent: 25, lowerIsBetter: true,
    unit: 'kgCO2e/person/month', source: 'Placeholder — verify',
  },
  sustainable_mode_pct: {
    key: 'sustainable_mode_pct', poor: 25, excellent: 70, lowerIsBetter: false,
    unit: '%', source: 'Placeholder — verify',
  },
}

export interface Weights { energy: number; water: number; waste: number; transport: number }
export const DEFAULT_WEIGHTS: Weights = { energy: 30, water: 25, waste: 25, transport: 20 }

export const FORMULA_VERSION = 'greenscore-1.0.0'

export function validateWeights(w: Weights): boolean {
  const sum = w.energy + w.water + w.waste + w.transport
  return Math.abs(sum - 100) < 0.001 && w.energy >= 0 && w.water >= 0 && w.waste >= 0 && w.transport >= 0
}
