import { prisma } from '@/lib/db'
import ReviewActions from './review-actions'

export const dynamic = 'force-dynamic'

export default async function ReviewPage() {
  const flagged = await prisma.reading.findMany({
    where: { status: { in: ['FLAGGED', 'PENDING'] } },
    include: { location: true, source: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Review queue</h1>
      <p className="text-sm text-zinc-500">Flagged and unverified entries. Flagged readings are excluded from the score until a facility admin approves them.</p>
      {flagged.length === 0 && <p className="rounded-lg border p-6 text-center text-zinc-400">Nothing to review 🎉</p>}
      <div className="space-y-2">
        {flagged.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white p-3 text-sm dark:bg-zinc-900">
            <div>
              <b>{r.location.name}</b> · {r.category}{r.subCategory ? `.${r.subCategory}` : ''} · <span className="font-mono">{r.value} {r.unit}</span>
              <div className="text-xs text-zinc-500">{r.periodStart.toISOString().slice(0, 7)} · {r.method} · {r.source.name} {r.flagReason ? `· ⚠️ ${r.flagReason}` : ''}</div>
            </div>
            <ReviewActions id={r.id} />
          </div>
        ))}
      </div>
    </div>
  )
}
