/** Progress % toward a challenge target. */
export function challengeProgress(targetType: string, baseline: number, current: number, targetPct: number): number {
  if ((targetType === 'water_reduction' || targetType === 'energy_reduction') && baseline <= 0) return 0
  switch (targetType) {
    case 'water_reduction':
    case 'energy_reduction': {
      const reductionPct = ((baseline - current) / baseline) * 100
      return clamp((reductionPct / targetPct) * 100)
    }
    case 'waste_diversion': {
      return clamp((current / targetPct) * 100) // targetPct here = target kg for demo? use pct of goal passed as current/target
    }
    case 'sustainable_transport': {
      return clamp((current / targetPct) * 100)
    }
    default:
      return 0
  }
}

function clamp(v: number) { return Math.max(0, Math.min(100, Math.round(v))) }
