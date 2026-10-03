import { refreshRollups } from '../src/lib/rollup'
import { computeAndStoreScores } from '../src/lib/scoring/compute'

const n = await refreshRollups()
const s = await computeAndStoreScores()
console.log(`rollups: ${n}, snapshots: ${s}`)
process.exit(0)
