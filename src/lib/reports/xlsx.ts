import ExcelJS from 'exceljs'
import type { gatherReportData } from './build'

type Data = Awaited<ReturnType<typeof gatherReportData>>

export async function buildXlsx(data: Data): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const summary = wb.addWorksheet('Summary')
  summary.addRow(['GreenScore report', new Date().toISOString()])
  summary.addRow(['Campus', data.campus.name])
  summary.addRow(['Period coverage %', Math.round(data.coverage)])
  summary.addRow(['Audit tip hash', data.tip])
  summary.addRow([])
  summary.addRow(['Month', 'Total', 'Energy', 'Water', 'Waste', 'Transport', 'Coverage %'])
  for (const s of data.snaps) summary.addRow([s.period, s.totalScore, s.energyScore, s.waterScore, s.wasteScore, s.transportScore, s.coverage])

  const raw = wb.addWorksheet('Raw rollups')
  raw.addRow(['locationId', 'period', 'category', 'total', 'unit', 'coverage'])
  for (const r of data.rollups) raw.addRow([r.locationId, r.period, r.category, r.totalValue, r.unit, r.coverage])

  const catSet = [...new Set(data.rollups.map((r) => r.category.split('.')[0]))]
  for (const cat of catSet) {
    const ws = wb.addWorksheet(`cat-${cat}`.slice(0, 31))
    ws.addRow(['period', 'category', 'locationId', 'total', 'unit'])
    for (const r of data.rollups.filter((r) => r.category.split('.')[0] === cat)) ws.addRow([r.period, r.category, r.locationId, r.totalValue, r.unit])
  }

  const factors = wb.addWorksheet('Emission factors')
  factors.addRow(['category', 'factor', 'unit', 'source', 'validFrom'])
  for (const f of data.factors) factors.addRow([f.category, f.factor, f.unit, f.source, f.validFrom.toISOString().slice(0, 10)])

  return Buffer.from(await wb.xlsx.writeBuffer())
}
