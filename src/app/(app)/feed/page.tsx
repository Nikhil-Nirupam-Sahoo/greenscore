import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export default async function FeedPage() {
  const posts = await prisma.feedPost.findMany({ include: { author: true, comments: { include: { author: true } } }, orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }], take: 30 })
  const me = await getSession()
  const myPoints = me ? (await prisma.pointsLedger.findMany({ where: { userId: me.id } })).reduce((a, p) => a + (p.allowed ? p.points : 0), 0) : 0
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Community feed</h1>
        <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-800">⭐ {myPoints} pts</span>
      </div>
      {posts.map((p) => (
        <div key={p.id} className="rounded-xl border bg-white p-4 dark:bg-zinc-900">
          <div className="text-xs text-zinc-400">{p.author.name} · {p.kind} {p.pinned && '📌'}</div>
          <p className="mt-1">{p.text}</p>
          {p.comments.map((c) => (
            <p key={c.id} className="ml-4 mt-1 border-l pl-2 text-sm text-zinc-600"><b>{c.author.name}:</b> {c.text}</p>
          ))}
        </div>
      ))}
    </div>
  )
}
