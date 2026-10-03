import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function LeaderboardPage() {
  const latest = (await prisma.monthlyRollup.groupBy({ by: ['period'], _max: { period: true } }))[0]?._max.period
  const prev = previousPeriod(latest)
  const locs = await prisma.location.findMany({ where: { type: { in: ['DEPARTMENT', 'HOSTEL_BLOCK'] } } })
  const rows = await Promise.all(
    locs.map(async (l) => {
      const cur = await prisma.monthlyRollup.findFirst({ where: { locationId: l.id, period: latest ?? '', category: 'electricity' } })
      const old = await prisma.monthlyRollup.findFirst({ where: { locationId: l.id, period: prev ?? '', category: 'electricity' } })
      const perCap = cur ? cur.totalValue / Math.max(1, l.occupancy) : null
      const improvement = cur && old ? ((old.totalValue - cur.totalValue) / old.totalValue) * 100 : 0
      return { name: l.name, type: l.type, perCap, improvement }
    }),
  )
  const ranked = rows.filter((r) => r.perCap != null).sort((a, b) => a.perCap! - b.perCap!)
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Leaderboard — {latest}</h1>
      <p className="text-sm text-zinc-500">Ranked on per-capita energy and improvement, never raw volume.</p>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-zinc-500"><th>#</th><th>Unit</th><th>kWh / person</th><th>vs last month</th></tr></thead>
        <tbody>
          {ranked.map((r, i) => (
            <tr key={r.name} className="border-t">
              <td className="py-2">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
              <td>{r.name} <span className="text-xs text-zinc-400">{r.type.toLowerCase()}</span></td>
              <td className="font-mono">{r.perCap!.toFixed(1)}</td>
              <td className={r.improvement > 0 ? 'text-green-600' : 'text-red-500'}>{r.improvement > 0 ? '▼' : '▲'} {Math.abs(r.improvement).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function previousPeriod(p?: string | null) {
  if (!p) return null
  const [y, m] = p.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
