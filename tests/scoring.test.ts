import { describe, it, expect } from 'vitest'
import { metricScore, avgScores } from '../src/lib/scoring/normalize'
import { computeScore } from '../src/lib/scoring/engine'
import { BENCHMARKS, validateWeights, DEFAULT_WEIGHTS } from '../src/lib/scoring/config'

describe('metricScore', () => {
  it('caps at 0 and 100', () => {
    expect(metricScore(BENCHMARKS.energy_kwh_per_person_month, 0)).toBe(100)
    expect(metricScore(BENCHMARKS.energy_kwh_per_person_month, 99999)).toBe(0)
    expect(metricScore(BENCHMARKS.sustainable_mode_pct, 0)).toBe(0)
    expect(metricScore(BENCHMARKS.sustainable_mode_pct, 1000)).toBe(100)
  })
  it('interpolates linearly', () => {
    const b = BENCHMARKS.water_l_per_person_day // 200 poor, 80 excellent
    expect(metricScore(b, 140)).toBeCloseTo(50)
  })
  it('returns null for missing/NaN input', () => {
    expect(metricScore(BENCHMARKS.water_l_per_person_day, null)).toBeNull()
    expect(metricScore(BENCHMARKS.water_l_per_person_day, NaN)).toBeNull()
  })
})

describe('avgScores', () => {
  it('ignores nulls, null if empty', () => {
    expect(avgScores([50, null, 70])).toBe(60)
    expect(avgScores([null, null])).toBeNull()
  })
})

describe('weights validation', () => {
  it('must sum to 100', () => {
    expect(validateWeights(DEFAULT_WEIGHTS)).toBe(true)
    expect(validateWeights({ energy: 50, water: 50, waste: 50, transport: 50 })).toBe(false)
  })
})

describe('computeScore edge cases', () => {
  const factors = [{ category: 'electricity', factor: 0.82 }, { category: 'water', factor: 0.34 }, { category: 'transport.car', factor: 0.192 }]
  it('zero population → per-capita metrics null, no crash', () => {
    const r = computeScore({
      period: '2026-01', population: 0,
      rollups: [{ category: 'electricity', totalValue: 10000, unit: 'kWh', coverage: 100 }],
      commutes: [], factors,
    })
    expect(r.metrics.energy_kwh_per_person_month).toBeNull()
    expect(r.incomplete).toBe(true)
  })
  it('missing category → that subscore is null, total re-normalises', () => {
    const r = computeScore({
      period: '2026-01', population: 1000,
      rollups: [{ category: 'electricity', totalValue: 80000, unit: 'kWh', coverage: 100 }],
      commutes: [], factors,
    })
    expect(r.energyScore).not.toBeNull()
    expect(r.waterScore).toBeNull()
    expect(r.totalScore).not.toBeNull()
  })
  it('never treats missing data as zero: empty inputs → totalScore null', () => {
    const r = computeScore({ period: '2026-01', population: 1000, rollups: [], commutes: [], factors })
    expect(r.totalScore).toBeNull()
    expect(r.coverage).toBe(0)
  })
  it('improvement delta vs trailing median', () => {
    const r = computeScore({
      period: '2026-01', population: 1000,
      rollups: [{ category: 'electricity', totalValue: 50000, unit: 'kWh', coverage: 100 }],
      commutes: [], factors, previousTotals: [40, 42, 41, 100, 39],
    })
    expect(r.improvementDelta).toBeGreaterThan(0)
  })
})
