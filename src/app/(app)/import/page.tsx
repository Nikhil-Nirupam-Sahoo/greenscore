'use client'
import { useState } from 'react'

export default function ImportPage() {
  const [csv, setCsv] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [report, setReport] = useState<{ imported: number; errors: Array<{ row: number; error: string }> } | null>(null)

  const onFile = async (f: File) => {
    const text = await f.text()
    setCsv(text)
    const h = text.split(/\r?\n/)[0].split(',').map((x) => x.trim())
    setHeaders(h)
    const guess = (names: string[]) => h.find((x) => names.some((n) => x.toLowerCase().includes(n))) ?? ''
    setMapping({ sourceName: guess(['meter', 'source', 'name']), value: guess(['value', 'kwh', 'kl', 'reading']), periodMonth: guess(['month', 'period', 'date']), unit: guess(['unit']), category: guess(['category', 'type']) })
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Bulk CSV import</h1>
      <input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      {headers.length > 0 && (
        <div className="space-y-2 rounded-xl border bg-white p-4 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500">Map your columns:</p>
          {(['sourceName', 'value', 'periodMonth', 'unit', 'category'] as const).map((k) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              {k}: <select className="rounded border p-1" value={mapping[k] ?? ''} onChange={(e) => setMapping({ ...mapping, [k]: e.target.value })}>
                <option value="">—</option>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </label>
          ))}
          <button className="rounded bg-green-600 px-4 py-2 text-white" onClick={async () => {
            const r = await fetch('/api/import-csv', { method: 'POST', body: JSON.stringify({ csv, mapping }) })
            setReport((await r.json()).report)
          }}>Import & validate</button>
        </div>
      )}
      {report && (
        <div className="rounded-xl border bg-white p-4 text-sm dark:bg-zinc-900">
          ✅ Imported {report.imported} rows · ❌ {report.errors.length} errors
          <ul className="mt-2 max-h-60 overflow-auto text-xs text-red-600">{report.errors.slice(0, 50).map((e) => <li key={e.row}>row {e.row}: {e.error}</li>)}</ul>
        </div>
      )}
    </div>
  )
}
