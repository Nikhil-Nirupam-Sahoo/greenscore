import { prisma } from './db'

/** Recompute MonthlyRollup from VERIFIED+PENDING readings (flagged excluded). Safe to run repeatedly. */
export async function refreshRollups() {
  await prisma.monthlyRollup.deleteMany()
  const readings = await prisma.reading.findMany({
    where: { status: { in: ['VERIFIED', 'PENDING'] } },
    orderBy: { periodStart: 'asc' },
  })
  const sources = await prisma.dataSource.findMany()
  const modeBySource = new Map(sources.map((s) => [s.id, s.mode]))
  type Acc = { total: number; unit: string; manual: number; iot: number; verified: number; flagged: number; days: number }
  const groups = new Map<string, Acc>()
  for (const r of readings) {
    const period = r.periodStart.toISOString().slice(0, 7)
    const key = `${r.locationId}|${period}|${r.category === 'waste' && r.subCategory ? `waste.${r.subCategory}` : r.category}`
    const a = groups.get(key) ?? { total: 0, unit: r.unit, manual: 0, iot: 0, verified: 0, flagged: 0, days: 0 }
    a.total += r.value
    if (modeBySource.get(r.sourceId) === 'IOT') a.iot++; else a.manual++
    if (r.status === 'VERIFIED') a.verified++
    const days = Math.max(1, Math.round((r.periodEnd.getTime() - r.periodStart.getTime()) / 86400000))
    a.days += days
    groups.set(key, a)
  }
  const rows = [...groups.entries()].map(([key, a]) => {
    const [locationId, period, category] = key.split('|')
    return {
      locationId,
      period,
      category,
      totalValue: Math.round(a.total * 100) / 100,
      unit: a.unit,
      coverage: Math.round((a.verified / Math.max(1, a.manual + a.iot)) * 100),
      manualCount: a.manual,
      iotCount: a.iot,
      verifiedCount: a.verified,
      flaggedCount: a.flagged,
    }
  })
  // chunk createMany
  for (let i = 0; i < rows.length; i += 2000) {
    await prisma.monthlyRollup.createMany({ data: rows.slice(i, i + 2000) })
  }
  return rows.length
}
