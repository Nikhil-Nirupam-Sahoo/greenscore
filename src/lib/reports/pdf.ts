import PDFDocument from 'pdfkit'
import type { gatherReportData } from './build'

type Data = Awaited<ReturnType<typeof gatherReportData>>

export async function buildPdf(title: string, paramsSummary: string, data: Data, integrity: string): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 48 })
  const chunks: Buffer[] = []
  doc.on('data', (c) => chunks.push(c))
  const done = new Promise<Buffer>((res) => doc.on('end', () => res(Buffer.concat(chunks))))

  doc.fontSize(20).text(`🌿 ${title}`, { continued: false })
  doc.moveDown(0.5).fontSize(10).fillColor('#555').text(paramsSummary)
  doc.moveDown()
  const latest = data.snaps[data.snaps.length - 1]
  doc.fillColor('#000').fontSize(14).text('1. Executive summary')
  doc.fontSize(10)
  doc.text(`Campus: ${data.campus.name} · Population: ${data.campus.population_students + data.campus.population_staff} (${data.campus.population_students} students, ${data.campus.population_staff} staff, ${data.campus.residents_hostel} hostel residents)`)
  doc.text(`Periods covered: ${paramsSummary.match(/\d{4}-\d{2}/g)?.join(' -> ')} · Monthly snapshots: ${data.snaps.length}`)
  if (latest) {
    doc.text(`Latest GreenScore: ${latest.totalScore}/100 (energy ${latest.energyScore}, water ${latest.waterScore}, waste ${latest.wasteScore}, transport ${latest.transportScore})`)
    doc.text(`Improvement vs own baseline: ${latest.improvementDelta >= 0 ? '+' : ''}${latest.improvementDelta} pts · Data coverage: ${latest.coverage}%`)
  }
  doc.moveDown()
  doc.fontSize(14).text('2. Methodology')
  doc.fontSize(10).text('Scores are computed from VERIFIED readings normalised by population (kWh/person/month, L/person/day, kg/person/day, commute CO2e/person) and mapped to 0–100 via benchmark interpolation (see docs/SCORING.md). Missing data never counts as zero. Emission factors version: seeded table, citations in prisma/seed.ts.')
  doc.moveDown()

  doc.fontSize(14).text('3. Consumption totals')
  doc.fontSize(9)
  for (const [k, v] of Object.entries(data.totals)) doc.text(`   ${k}: ${v.toLocaleString()}`)
  doc.moveDown()
  doc.fontSize(14).text('4. CO2e by category (kg)')
  doc.fontSize(9)
  let co2Total = 0
  for (const [k, v] of Object.entries(data.co2eByCategory)) { doc.text(`   ${k}: ${Math.round(v).toLocaleString()}`); co2Total += v }
  doc.text(`   TOTAL: ${Math.round(co2Total).toLocaleString()} kg (${(co2Total / 1000).toFixed(1)} t)`)
  doc.moveDown()

  doc.fontSize(14).text('5. Challenges & initiatives')
  doc.fontSize(9)
  for (const c of data.challenges) doc.text(`   • ${c.title} — ${c.status} (${c.description})`)
  doc.moveDown()

  doc.fontSize(14).text('6. Data quality & audit integrity statement')
  doc.fontSize(9)
  doc.text(`   Average monthly data coverage of reportable domains: ${data.coverage.toFixed(0)}%. Flagged/odd entries are held out of scoring until reviewed.`)
  doc.text(`   Audit-trail tip hash at report time: ${data.tip.slice(0, 32)}…`)
  doc.text(`   Re-running "npm run verify-audit" must reproduce a VALID verdict for this report to be considered tamper-evident.`)
  doc.moveDown()
  doc.fontSize(8).fillColor('#666')
  doc.text(`Report integrity hash: ${integrity} · Appendix: raw data available in the Excel export and SavedReport record.`)
  doc.end()
  return done
}
