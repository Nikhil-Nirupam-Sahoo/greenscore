import { verifyAuditChain } from '../src/lib/audit/store'

verifyAuditChain()
  .then((r) => {
    if (r.ok) { console.log(`✅ audit chain OK — ${r.length} entries, tip ${r.tip.slice(0, 16)}…`) ; process.exit(0) }
    console.error(`❌ audit chain BROKEN at #${r.brokenAt}: ${r.reason}`)
    process.exit(1)
  })
  .finally(() => process.exit(0))
