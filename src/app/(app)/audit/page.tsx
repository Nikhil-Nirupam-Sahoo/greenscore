import { verifyAuditChain } from '@/lib/audit/store'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function AuditPage() {
  const res = await verifyAuditChain()
  const count = await prisma.auditLog.count()
  const recent = await prisma.auditLog.findMany({ orderBy: { seq: 'desc' }, take: 15 })
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Audit integrity</h1>
      <div className={`rounded-xl border p-4 ${res.ok ? 'border-green-400 bg-green-50 dark:bg-green-950' : 'border-red-400 bg-red-50 dark:bg-red-950'}`}>
        {res.ok ? (
          <p>✅ Chain verified — {res.length} entries, tip hash <code className="text-xs">{res.tip.slice(0, 24)}…</code></p>
        ) : (
          <p>❌ Tampering detected at entry #{res.brokenAt}: {res.reason}</p>
        )}
      </div>
      <p className="text-sm text-zinc-500">{count} entries · every entry hashes the previous one (SHA-256 chain) · corrections are appended, never edited · run <code>npm run verify-audit</code> for the CLI check.</p>
      <table className="w-full text-xs">
        <thead><tr className="text-left text-zinc-500"><th>#</th><th>Action</th><th>Actor</th><th>Time</th><th>Hash</th></tr></thead>
        <tbody>
          {recent.map((r) => (
            <tr key={r.id} className="border-t">
              <td>{r.seq}</td><td>{r.action}</td><td className="max-w-[120px] truncate">{r.actorId ?? r.actorRole ?? '—'}</td>
              <td>{r.timestamp.toISOString().slice(0, 16).replace('T', ' ')}</td><td className="font-mono">{r.hash.slice(0, 10)}…</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
