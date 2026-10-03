import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { audit } from '@/lib/audit/store'

const Body = z.object({
  csv: z.string().max(5_000_000),
  mapping: z.object({
    sourceName: z.string(),
    value: z.string(),
    unit: z.string().optional(),
    periodMonth: z.string(), // e.g. 2025-08 or 8/2025
    category: z.string().optional(),
  }),
})

export async function POST(req: Request) {
  const s = await getSession()
  if (!s || (s.role !== 'ADMIN' && s.role !== 'FACILITY_STAFF')) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid input' }, { status: 400 })

  const lines = parsed.data.csv.trim().split(/\r?\n/)
  const header = splitCsv(lines[0]).map((h) => h.trim())
  const idx = (name: string) => header.indexOf(name)
  const m = parsed.data.mapping
  const report = { totalRows: lines.length - 1, imported: 0, errors: [] as Array<{ row: number; error: string }> }
  const sources = await prisma.dataSource.findMany()
  const byName = new Map(sources.map((s) => [s.name.toLowerCase(), s]))

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsv(lines[i])
    const sourceName = cells[idx(m.sourceName)]?.trim()
    const value = Number(cells[idx(m.value)])
    const periodRaw = cells[idx(m.periodMonth)]?.trim()
    const unit = m.unit ? cells[idx(m.unit)]?.trim() : 'kWh'
    const category = m.category ? cells[idx(m.category)]?.trim() : sourceName && byName.get(sourceName.toLowerCase())?.type === 'WATER' ? 'water' : 'electricity'
    const src = sourceName ? byName.get(sourceName.toLowerCase()) : undefined
    const period = parseMonth(periodRaw)
    if (!src) { report.errors.push({ row: i + 1, error: `unknown meter "${sourceName}"` }); continue }
    if (!isFinite(value) || value < 0) { report.errors.push({ row: i + 1, error: 'bad value' }); continue }
    if (!period) { report.errors.push({ row: i + 1, error: `bad period "${periodRaw}"` }); continue }
    await prisma.reading.create({
      data: {
        value, unit: unit ?? src.unit ?? 'kWh', category: category ?? 'electricity',
        periodStart: period.start, periodEnd: period.end, locationId: src.locationId, sourceId: src.id,
        method: 'MANUAL', status: 'PENDING', createdById: s.id,
      },
    })
    report.imported++
  }
  await audit({ actorId: s.id, actorRole: s.role, action: 'CSV_IMPORT', payload: { imported: report.imported, errors: report.errors.length } })
  return NextResponse.json({ ok: true, report })
}

function splitCsv(line: string): string[] {
  const out: string[] = []
  let cur = '', q = false
  for (const ch of line) {
    if (ch === '"') q = !q
    else if (ch === ',' && !q) { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out
}

function parseMonth(s?: string): { start: Date; end: Date } | null {
  if (!s) return null
  let yy: number, mm: number
  const iso = s.match(/^(\d{4})-(\d{1,2})$/)
  const us = s.match(/^(\d{1,2})\/(\d{4})$/)
  if (iso) { yy = Number(iso[1]); mm = Number(iso[2]) }
  else if (us) { mm = Number(us[1]); yy = Number(us[2]) }
  else return null
  if (!yy || !mm || mm > 12) return null
  return { start: new Date(Date.UTC(yy, mm - 1, 1)), end: new Date(Date.UTC(yy, mm, 0)) }
}
