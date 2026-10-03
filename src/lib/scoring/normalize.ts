import { BENCHMARKS, type Benchmark } from './config'

/** Linear interpolation of a normalised metric to a 0–100 sub-score, capped. */
export function metricScore(b: Benchmark, value: number | null | undefined): number | null {
  if (value == null || !isFinite(value)) return null
  const { poor, excellent, lowerIsBetter } = b
  let s: number
  if (lowerIsBetter) {
    s = ((poor - value) / (poor - excellent)) * 100
  } else {
    s = ((value - poor) / (excellent - poor)) * 100
  }
  return Math.max(0, Math.min(100, s))
}

export function scoreFromKey(key: string, value: number | null | undefined): number | null {
  const b = BENCHMARKS[key]
  if (!b) throw new Error(`Unknown benchmark key: ${key}`)
  return metricScore(b, value)
}

/** Average of non-null scores; null only if everything is missing. */
export function avgScores(scores: Array<number | null>): number | null {
  const valid = scores.filter((s): s is number => s != null)
  if (valid.length === 0) return null
  return valid.reduce((a, b) => a + b, 0) / valid.length
}
