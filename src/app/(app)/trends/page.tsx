import { prisma } from '@/lib/db'
import { TrendChart, SubscoreRadar } from '@/components/charts'

export const dynamic = 'force-dynamic'

export default async function TrendsPage() {
  const snaps = await prisma.scoreSnapshot.findMany({ where: { locationId: '' }, orderBy: { period: 'asc' } })
  const latest = snaps[snaps.length - 1]
  const radar = latest
    ? [
        { metric: 'Energy', score: latest.energyScore },
        { metric: 'Water', score: latest.waterScore },
        { metric: 'Waste', score: latest.wasteScore },
        { metric: 'Transport', score: latest.transportScore },
      ]
    : []
  const series = (key: 'energyScore' | 'waterScore' | 'wasteScore' | 'transportScore') =>
    snaps.map((s) => ({ period: s.period, [key]: s[key] }))
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Trends</h1>
      <section className="rounded-xl border bg-white p-4 dark:bg-zinc-900"><h2 className="font-semibold">Campus score (MoM)</h2><TrendChart data={snaps.map((s) => ({ period: s.period, totalScore: s.totalScore }))} /></section>
      <section className="rounded-xl border bg-white p-4 dark:bg-zinc-900"><h2 className="font-semibold">Energy sub-score</h2><TrendChart data={series('energyScore')} dataKey="energyScore" color="#eab308" /></section>
      <section className="rounded-xl border bg-white p-4 dark:bg-zinc-900"><h2 className="font-semibold">Water sub-score</h2><TrendChart data={series('waterScore')} dataKey="waterScore" color="#0284c7" /></section>
      <section className="rounded-xl border bg-white p-4 dark:bg-zinc-900"><h2 className="font-semibold">Sub-score radar — latest month</h2><SubscoreRadar data={radar} /></section>
      <p className="text-xs text-zinc-500">YoY: compare any period to 12 months earlier — the score normalises for seasonality when a flag is shown on the dashboard. Peer benchmarking is available in Reports.</p>
    </div>
  )
}
