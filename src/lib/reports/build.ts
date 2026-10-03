import { prisma } from '../db'
import { createHash } from 'crypto'

export interface ReportParams {
  template: 'naac' | 'internal'
  from: string // YYYY-MM
  to: string   // YYYY-MM inclusive
  scopeType: 'campus' | 'location'
  scopeId?: string | null
  title?: string
}

export async function gatherReportData(p: ReportParams) {
  const campus = await prisma.campus.findFirst({ where: { peerOfBand: null } })
  const snaps = await prisma.scoreSnapshot.findMany({
    where: { campusId: campus!.id, period: { gte: p.from, lte: p.to }, locationId: p.scopeType === 'campus' ? '' : p.scopeId ?? '' },
    orderBy: { period: 'asc' },
  })
  const rollups = await prisma.monthlyRollup.findMany({
    where: {
      period: { gte: p.from, lte: p.to },
      ...(p.scopeType === 'campus' ? { location: { campusId: campus!.id } } : { locationId: p.scopeId ?? '' }),
    },
  })
  const challenges = await prisma.challenge.findMany()
  const auditRows = await prisma.auditLog.findMany({ orderBy: { seq: 'asc' } })
  const tip = auditRows[auditRows.length - 1]?.hash ?? 'GENESIS'
  const factors = await prisma.emissionFactor.findMany({ where: { active: true } })
  const co2eByCategory: Record<string, number> = {}
  for (const s of snaps) {
    const parsed = JSON.parse(s.inputs)
    for (const [k, v] of Object.entries(parsed.co2eByCategory ?? {})) co2eByCategory[k] = (co2eByCategory[k] ?? 0) + (v as number)
  }
  const totals: Record<string, number> = {}
  for (const r of rollups) totals[r.category] = (totals[r.category] ?? 0) + r.totalValue
  const coverage = snaps.length ? snaps.reduce((a, s) => a + s.coverage, 0) / snaps.length : 0
  return { campus: campus!, snaps, rollups, challenges, tip, factors, co2eByCategory, totals, coverage }
}

export function reportIntegrityHash(params: ReportParams, tip: string): string {
  return createHash('sha256').update(JSON.stringify({ ...params, tip })).digest('hex').slice(0, 32)
}
