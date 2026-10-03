import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { audit } from '@/lib/audit/store'
import { gatherReportData, reportIntegrityHash } from '@/lib/reports/build'
import { buildPdf } from '@/lib/reports/pdf'
import { buildXlsx } from '@/lib/reports/xlsx'

const Params = z.object({
  template: z.enum(['naac', 'internal']),
  from: z.string().regex(/^\d{4}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}$/),
  scopeType: z.enum(['campus', 'location']).default('campus'),
  scopeId: z.string().optional(),
  format: z.enum(['pdf', 'xlsx']).default('pdf'),
  title: z.string().optional(),
})

export async function POST(req: Request) {
  const s = await getSession()
  if (!s || (s.role !== 'ADMIN' && s.role !== 'AUDITOR')) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const parsed = Params.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid input', issues: parsed.error.issues }, { status: 400 })
  const p = parsed.data
  const data = await gatherReportData(p)
  const integrity = reportIntegrityHash(p, data.tip)
  const title = p.title ?? (p.template === 'naac' ? 'NAAC Criterion 7 Environmental Sustainability Report' : 'Campus Sustainability — Internal Leadership Report')
  const paramsSummary = `${p.template} · ${p.from} -> ${p.to} · scope: ${p.scopeType}`
  const body = p.format === 'pdf' ? await buildPdf(title, paramsSummary, data, integrity) : await buildXlsx(data)
  await prisma.savedReport.create({
    data: { title, template: p.template, params: JSON.stringify(p), integrityHash: integrity, createdById: s.id },
  })
  await audit({ actorId: s.id, actorRole: s.role, action: 'REPORT_GENERATED', payload: { template: p.template, range: [p.from, p.to], format: p.format, integrity } })
  return new NextResponse(new Uint8Array(body), {
    headers: {
      'content-type': p.format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="greenscore-${p.template}-${p.from}_${p.to}.${p.format}"`,
    },
  })
}
