import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import { TrendChart } from '@/components/charts'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const session = await getSession()
  const snaps = await prisma.scoreSnapshot.findMany({ where: { locationId: '' }, orderBy: { period: 'asc' } })
  const latest = snaps[snaps.length - 1]
  const latestPeriod = latest?.period
  const flaggedCount = await prisma.reading.count({ where: { status: 'FLAGGED' } })
  const pendingReview = flaggedCount
  const hotspots = latestPeriod
    ? await prisma.monthlyRollup.findMany({
        where: { period: latestPeriod, category: 'electricity' },
        include: { location: true },
      })
    : []
  hotspots.sort((a, b) => b.totalValue / Math.max(1, b.location.occupancy) - a.totalValue / Math.max(1, a.location.occupancy))
  const feedPins = await prisma.feedPost.findMany({ where: { pinned: true }, include: { author: true }, take: 2 })

  const parsed = latest ? JSON.parse(latest.inputs) : null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Welcome back, {session?.name?.split(' ')[0]} 👋</h1>
      {feedPins.map((p) => (
        <div key={p.id} className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm dark:bg-green-950">
          📌 {p.text}
        </div>
      ))}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Campus score" value={latest ? `${latest.totalScore}/100` : '—'} sub={latest ? `coverage ${latest.coverage}%` : ''} />
        <Stat label="Trend" value={latest ? `${latest.improvementDelta >= 0 ? '+' : ''}${latest.improvementDelta}` : '—'} sub="vs trailing baseline" />
        <Stat label="CO₂e (latest mo)" value={parsed?.co2eByCategory ? `${(Object.values(parsed.co2eByCategory as Record<string, number>).reduce((a, b) => a + b, 0) / 1000).toFixed(1)} t` : '—'} sub="tonnes CO₂e" />
        <Stat label="Review queue" value={`${pendingReview}`} sub="flagged entries" />
      </div>

      <section className="rounded-xl border bg-white p-4 dark:bg-zinc-900">
        <h2 className="mb-2 font-semibold">Score trend (24 months)</h2>
        <TrendChart data={snaps.map((s) => ({ period: s.period, totalScore: s.totalScore }))} />
      </section>

      <section className="rounded-xl border bg-white p-4 dark:bg-zinc-900">
        <h2 className="mb-2 font-semibold">Hotspots — kWh per person ({latestPeriod})</h2>
        <ol className="space-y-1 text-sm">
          {hotspots.slice(0, 6).map((h) => (
            <li key={h.id} className="flex justify-between">
              <span>{h.location.name} ({h.location.type.toLowerCase()})</span>
              <span className="font-mono">{(h.totalValue / Math.max(1, h.location.occupancy)).toFixed(1)} kWh/person</span>
            </li>
          ))}
        </ol>
      </section>

      {parsed?.incomplete && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          ⚠️ Some categories have missing data this month — the score is partial, not a zero estimate.
        </p>
      )}
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-white p-3 dark:bg-zinc-900">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[11px] text-zinc-400">{sub}</div>
    </div>
  )
}
