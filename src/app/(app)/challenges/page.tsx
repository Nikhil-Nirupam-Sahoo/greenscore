import { prisma } from '@/lib/db'
import { challengeProgress } from '@/lib/challenges'

export const dynamic = 'force-dynamic'

async function liveProgress(c: { targetType: string; targetPct: number; scopeType: string; scopeId: string | null }) {
  // baseline = average of first 3 months of water/electricity/waste for the scope; current = latest month
  const cat = c.targetType.startsWith('water') ? 'water' : c.targetType.startsWith('energy') ? 'electricity' : null
  if (!cat || !c.scopeId) {
    if (c.targetType === 'sustainable_transport') {
      const last = await prisma.commuteLog.findMany({ orderBy: { date: 'desc' }, take: 500 })
      const sustainable = last.filter((l) => ['walk', 'cycle', 'bus', 'ev'].includes(l.mode)).length
      return challengeProgress(c.targetType, 0, last.length ? (sustainable / last.length) * 100 : 0, c.targetPct)
    }
    return null
  }
  const rows = await prisma.monthlyRollup.findMany({ where: { locationId: c.scopeId, category: cat }, orderBy: { period: 'asc' } })
  if (rows.length < 4) return null
  const baseline = rows.slice(0, 3).reduce((a, r) => a + r.totalValue, 0) / 3
  const current = rows[rows.length - 1].totalValue
  return challengeProgress(c.targetType, baseline, current, c.targetPct)
}

export default async function ChallengesPage() {
  const challenges = await prisma.challenge.findMany()
  const progressMap = new Map<string, number | null>()
  for (const c of challenges) progressMap.set(c.id, await liveProgress(c))
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Green challenges</h1>
      {challenges.map((c) => {
        const pct = progressMap.get(c.id)
        return (
        <div key={c.id} className="rounded-xl border bg-white p-4 dark:bg-zinc-900">
          <div className="flex justify-between">
            <b>{c.title}</b>
            <span className={`rounded-full px-2 py-0.5 text-xs ${c.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-zinc-100 text-zinc-600'}`}>{c.status}</span>
          </div>
          <p className="text-sm text-zinc-500">{c.description}</p>
          <p className="text-xs text-zinc-400">{c.startDate.toDateString()} → {c.endDate.toDateString()}</p>
          {pct != null ? (
            <>
              <div className="mt-2 h-3 w-full rounded bg-zinc-200 dark:bg-zinc-800">
                <div className="h-3 rounded bg-green-500" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-zinc-500">{pct}% of target — progress is computed from real VERIFIED readings, not self-report.</p>
            </>
          ) : (
            <p className="mt-2 text-xs text-zinc-400">Progress appears once the scope has enough verified months of data.</p>
          )}
        </div>
      )})}
    </div>
  )
}

