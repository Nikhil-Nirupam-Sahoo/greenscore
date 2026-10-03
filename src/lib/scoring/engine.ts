import { DEFAULT_WEIGHTS, FORMULA_VERSION, type Weights } from './config'
import { avgScores, metricScore } from './normalize'
import { BENCHMARKS } from './config'

export interface RollupRow { category: string; totalValue: number; unit: string; coverage: number }
export interface CommuteRow { mode: string; distanceKm: number }
export interface FactorRow { category: string; factor: number }

export interface ScoreInputs {
  period: string // YYYY-MM
  population: number // students + staff (population-weighted occupancy; hostel residents subset of students by default assumption)
  rollups: RollupRow[]
  commutes: CommuteRow[]
  factors: FactorRow[]
  weights?: Weights
  previousTotals?: number[] // own trailing monthly totals (for improvement + baseline)
}

export interface ScoreResult {
  period: string
  totalScore: number | null // null = incomplete (no data at all)
  energyScore: number | null
  waterScore: number | null
  wasteScore: number | null
  transportScore: number | null
  improvementDelta: number
  coverage: number // 0..100
  co2eTotalKg: number
  co2eByCategory: Record<string, number>
  metrics: Record<string, number | null>
  incomplete: boolean
  seasonalityNote: string | null
  weights: Weights
  formulaVersion: string
}

export const SUSTAINABLE_MODES = new Set(['walk', 'cycle', 'bus', 'ev'])

export function co2eFor(category: string, value: number, factors: FactorRow[]): number {
  const f = factors.find((f) => f.category === category)
  return f ? value * f.factor : 0
}

export function computeScore(input: ScoreInputs): ScoreResult {
  const w = input.weights ?? DEFAULT_WEIGHTS
  const pop = Math.max(0, input.population)

  const energyKwh = sumCat(input.rollups, 'electricity')
  const waterKl = sumCat(input.rollups, 'water')
  const waterL = waterKl != null ? waterKl * 1000 : null
  const wasteTotalKg = sumSub(input.rollups, 'waste')
  const wasteDivertedKg = sumSub(input.rollups, 'waste', ['dry', 'plastic', 'ewaste']) // treated as diverted streams

  const totalKm = input.commutes.reduce((a, c) => a + c.distanceKm, 0)
  const sustainableKm = input.commutes.filter((c) => SUSTAINABLE_MODES.has(c.mode)).reduce((a, c) => a + c.distanceKm, 0)
  const transportCo2e = input.commutes.reduce((a, c) => a + co2eFor(`transport.${c.mode}`, c.distanceKm, input.factors), 0)

  const metrics: Record<string, number | null> = {
    energy_kwh_per_person_month: pop > 0 && energyKwh != null ? energyKwh / pop : null,
    water_l_per_person_day: pop > 0 && waterL != null ? waterL / pop / 30 : null,
    waste_kg_per_person_day: pop > 0 && wasteTotalKg != null ? wasteTotalKg / pop / 30 : null,
    waste_diversion_pct: wasteTotalKg ? (wasteDivertedKg ?? 0) / wasteTotalKg * 100 : null,
    transport_co2e_kg_per_person_month: pop > 0 && input.commutes.length ? transportCo2e / pop : null,
    sustainable_mode_pct: totalKm > 0 ? (sustainableKm / totalKm) * 100 : null,
  }

  const energyScore = metricScore(BENCHMARKS.energy_kwh_per_person_month, metrics.energy_kwh_per_person_month)
  const waterScore = metricScore(BENCHMARKS.water_l_per_person_day, metrics.water_l_per_person_day)
  const wasteScore = avgScores([
    metricScore(BENCHMARKS.waste_kg_per_person_day, metrics.waste_kg_per_person_day),
    metricScore(BENCHMARKS.waste_diversion_pct, metrics.waste_diversion_pct),
  ])
  const transportScore = avgScores([
    metricScore(BENCHMARKS.transport_co2e_kg_per_person_month, metrics.transport_co2e_kg_per_person_month),
    metricScore(BENCHMARKS.sustainable_mode_pct, metrics.sustainable_mode_pct),
  ])

  const subscores = { energyScore, waterScore, wasteScore, transportScore }
  const present = (Object.entries(subscores) as Array<[string, number | null]>)
    .filter((e): e is [string, number] => e[1] != null)
    .map(([k, v]) => [k.replace('Score', '') as keyof Weights, v] as [keyof Weights, number])
  const weightSum = present.reduce((x, [k2]) => x + w[k2], 0)
  const totalScore = present.length === 0 ? null : present.reduce((a, [k, v]) => a + v * (w[k] / weightSum), 0)

  // coverage: share of the four domains that have data, weighted by rollup verification coverage
  const domainCoverage = present.length / 4
  const verificationCoverage =
    input.rollups.length > 0 ? input.rollups.reduce((a, r) => a + r.coverage, 0) / input.rollups.length / 100 : 0
  const coverage = Math.round(domainCoverage * verificationCoverage * 100)

  // improvement vs own trailing baseline (median of previous totals)
  let improvementDelta = 0
  if (totalScore != null && input.previousTotals && input.previousTotals.length >= 3) {
    const sorted = [...input.previousTotals].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    improvementDelta = Math.round((totalScore - median) * 10) / 10
  }

  const co2eByCategory: Record<string, number> = {}
  for (const r of input.rollups) {
    const cat = r.category.startsWith('waste.') ? `waste.${r.category.split('.')[1]}` : r.category
    co2eByCategory[cat] = (co2eByCategory[cat] ?? 0) + co2eFor(cat, r.totalValue, input.factors)
  }
  co2eByCategory['transport'] = transportCo2e
  const co2eTotalKg = Object.values(co2eByCategory).reduce((a, b) => a + b, 0)

  return {
    period: input.period,
    totalScore: totalScore == null ? null : Math.round(totalScore * 10) / 10,
    ...mapScore(subscores),
    improvementDelta,
    coverage,
    co2eTotalKg: Math.round(co2eTotalKg),
    co2eByCategory: Object.fromEntries(Object.entries(co2eByCategory).map(([k, v]) => [k, Math.round(v)])),
    metrics,
    incomplete: coverage < 80,
    seasonalityNote: null,
    weights: w,
    formulaVersion: FORMULA_VERSION,
  }
}

function mapScore(s: { energyScore: number | null; waterScore: number | null; wasteScore: number | null; transportScore: number | null }) {
  return {
    energyScore: s.energyScore == null ? null : Math.round(s.energyScore * 10) / 10,
    waterScore: s.waterScore == null ? null : Math.round(s.waterScore * 10) / 10,
    wasteScore: s.wasteScore == null ? null : Math.round(s.wasteScore * 10) / 10,
    transportScore: s.transportScore == null ? null : Math.round(s.transportScore * 10) / 10,
  }
}

function sumCat(rollups: RollupRow[], cat: string): number | null {
  const rows = rollups.filter((r) => r.category === cat)
  return rows.length ? rows.reduce((a, r) => a + r.totalValue, 0) : null
}

function sumSub(rollups: RollupRow[], cat: string, subs?: string[]): number | null {
  // rollup rows for waste are keyed by subCategory in `category` column in this implementation? No — see compute.ts which splits.
  const rows = rollups.filter((r) => r.category === cat || r.category.startsWith(`${cat}.`))
  const filtered = subs
    ? rows.filter((r) => subs.some((s) => r.category === `${cat}.${s}` || r.category === cat))
    : rows
  return filtered.length ? filtered.reduce((a, r) => a + r.totalValue, 0) : null
}
