import { prisma } from '../db'
import { computeScore } from './engine'
import { createHash } from 'crypto'

/** (Re)compute ScoreSnapshots for the main campus across all available periods. */
export async function computeAndStoreScores() {
  const campus = await prisma.campus.findFirst({ where: { peerOfBand: null } })
  if (!campus) throw new Error('no campus')
  const factors = await prisma.emissionFactor.findMany({ where: { active: true } })
  const factorsVersion = createHash('sha256')
    .update(factors.map((f) => `${f.category}:${f.factor}:${f.validFrom.toISOString()}`).join('|'))
    .digest('hex')
    .slice(0, 12)

  const rollups = await prisma.monthlyRollup.findMany({ where: { location: { campusId: campus.id } } })
  const periods = [...new Set(rollups.map((r) => r.period))].sort()
  const commutes = await prisma.commuteLog.findMany({ select: { mode: true, distanceKm: true, date: true } })
  const locationIds = new Set((await prisma.location.findMany({ where: { campusId: campus.id }, select: { id: true } })).map((l) => l.id))
  const ownRollups = rollups.filter((r) => locationIds.has(r.locationId))
  const locIds = new Set(ownRollups.map((r) => r.locationId))
  void locIds

  const previousTotals: number[] = []
  let written = 0
  for (const period of periods) {
    const periodRollups = ownRollups.filter((r) => r.period === period).map((r) => ({
      category: r.category, totalValue: r.totalValue, unit: r.unit, coverage: r.coverage,
    }))
    const periodCommutes = commutes
      .filter((c) => c.date.toISOString().slice(0, 7) === period)
      .map((c) => ({ mode: c.mode, distanceKm: c.distanceKm }))
    const score = computeScore({
      period,
      population: campus.population_students + campus.population_staff,
      rollups: periodRollups,
      commutes: periodCommutes,
      factors: factors.map((f) => ({ category: f.category, factor: f.factor })),
      previousTotals,
    })
    await prisma.scoreSnapshot.upsert({
      where: { campusId_period_locationId: { campusId: campus.id, period, locationId: '' } },
      create: {
        campusId: campus.id, period, locationId: '',
        totalScore: score.totalScore ?? 0,
        energyScore: score.energyScore ?? 0,
        waterScore: score.waterScore ?? 0,
        wasteScore: score.wasteScore ?? 0,
        transportScore: score.transportScore ?? 0,
        improvementDelta: score.improvementDelta,
        coverage: score.coverage,
        inputs: JSON.stringify({ metrics: score.metrics, co2eByCategory: score.co2eByCategory, incomplete: score.incomplete }),
        weights: JSON.stringify(score.weights),
        factorsVersion,
        formulaVersion: score.formulaVersion,
      },
      update: {
        totalScore: score.totalScore ?? 0,
        energyScore: score.energyScore ?? 0,
        waterScore: score.waterScore ?? 0,
        wasteScore: score.wasteScore ?? 0,
        transportScore: score.transportScore ?? 0,
        improvementDelta: score.improvementDelta,
        coverage: score.coverage,
        inputs: JSON.stringify({ metrics: score.metrics, co2eByCategory: score.co2eByCategory, incomplete: score.incomplete }),
        weights: JSON.stringify(score.weights),
        factorsVersion,
        formulaVersion: score.formulaVersion,
      },
    })
    if (score.totalScore != null) previousTotals.push(score.totalScore)
    written++
  }
  return written
}
