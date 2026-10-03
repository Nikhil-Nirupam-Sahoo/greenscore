import { prisma } from '@/lib/db'
import { getWeights } from '@/lib/settings'
import SettingsForm from './settings-form'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const campus = await prisma.campus.findFirst({ where: { peerOfBand: null } })
  const factors = await prisma.emissionFactor.findMany({ where: { active: true } })
  const weights = await getWeights()
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>
      <section className="rounded-xl border bg-white p-4 dark:bg-zinc-900">
        <h2 className="font-semibold">Campus profile</h2>
        {campus && (
          <p className="mt-1 text-sm text-zinc-600">
            {campus.name} · {campus.area_sqm.toLocaleString()} m² · {campus.population_students} students · {campus.population_staff} staff · {campus.residents_hostel} hostel residents
          </p>
        )}
      </section>
      <section className="rounded-xl border bg-white p-4 dark:bg-zinc-900">
        <h2 className="font-semibold">Score weights</h2>
        <p className="text-sm text-zinc-500">Must sum to 100. Applied the next time monthly scores are recomputed (<code>npm run rollup</code>).</p>
        <SettingsForm initial={weights} />
      </section>
      <section className="rounded-xl border bg-white p-4 dark:bg-zinc-900">
        <h2 className="font-semibold">Emission factors (editable in <code>prisma/seed.ts</code>)</h2>
        <table className="mt-2 w-full text-xs">
          <thead><tr className="text-left text-zinc-500"><th>Category</th><th>Factor</th><th>Source</th></tr></thead>
          <tbody>
            {factors.map((f) => (
              <tr key={f.id} className="border-t"><td className="max-w-[160px] truncate py-1">{f.category}</td><td>{f.factor} {f.unit}</td><td className="max-w-[320px] truncate">{f.source}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
