import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export default async function ImpactPage() {
  const me = await getSession()
  if (!me) return null
  const lastLog = await prisma.commuteLog.findFirst({ where: { userId: me.id }, orderBy: { date: 'desc' } })
  const since = lastLog
    ? new Date(Date.UTC(lastLog.date.getUTCFullYear(), lastLog.date.getUTCMonth(), 1))
    : new Date(new Date().setMonth(new Date().getMonth() - 1))
  const logs = await prisma.commuteLog.findMany({ where: { userId: me.id, date: { gte: since } } })
  const sustainable = logs.filter((l) => ['walk', 'cycle', 'bus', 'ev'].includes(l.mode))
  const carEquivalent = await prisma.emissionFactor.findFirst({ where: { category: 'transport.car' } })
  const co2Saved = sustainable.reduce((a, l) => a + l.distanceKm * (carEquivalent?.factor ?? 0.192), 0)
  const pct = logs.length ? Math.round((sustainable.length / logs.length) * 100) : 0
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">My impact</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 dark:bg-zinc-900"><div className="text-3xl font-bold text-green-600">{co2Saved.toFixed(1)} kg</div><p className="text-sm text-zinc-500">CO₂e you avoided this month vs driving a petrol car</p></div>
        <div className="rounded-xl border bg-white p-4 dark:bg-zinc-900"><div className="text-3xl font-bold">{logs.length}</div><p className="text-sm text-zinc-500">trips logged</p></div>
        <div className="rounded-xl border bg-white p-4 dark:bg-zinc-900"><div className="text-3xl font-bold">{pct}%</div><p className="text-sm text-zinc-500">of trips by walk/cycle/bus/EV</p></div>
      </div>
      <p className="text-sm text-zinc-500">That is roughly {(co2Saved / 0.12).toFixed(0)} smartphone charges ⚡ — small trips add up.</p>
    </div>
  )
}
