import { describe, it, expect } from 'vitest'
import { buildEntry, verifyChain, canonicalPayload } from '../src/lib/audit/chain'

function makeChain(n: number) {
  const entries: Array<ReturnType<typeof buildEntry> & { timestamp: Date }> = []
  let prev = 'GENESIS'
  for (let i = 0; i < n; i++) {
    const e = buildEntry(prev, { action: `A${i}`, payload: { i }, timestamp: new Date(2026, 0, i + 1) })
    entries.push(e as (typeof entries)[number])
    prev = e.hash
  }
  return entries
}

describe('audit chain', () => {
  it('verifies a clean chain', () => {
    const entries = makeChain(5).map((e) => ({ ...e, seq: 0 }))
    expect(verifyChain(entries as never).ok).toBe(true)
  })
  it('detects payload tampering', () => {
    const entries = makeChain(5)
    entries[2] = { ...entries[2], payload: { i: 999 } } as never
    const res = verifyChain(entries as never)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.brokenAt).toBe(2)
  })
  it('detects reordering / prevHash breaks', () => {
    const entries = makeChain(5)
    ;[entries[1], entries[2]] = [entries[2], entries[1]]
    expect(verifyChain(entries as never).ok).toBe(false)
  })
  it('canonicalPayload is key-order independent', () => {
    expect(canonicalPayload({ b: 1, a: { d: 2, c: 3 } })).toBe(canonicalPayload({ a: { c: 3, d: 2 }, b: 1 }))
  })
})
