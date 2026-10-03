'use client'
import { useState } from 'react'

export default function ReportsPage() {
  const [template, setTemplate] = useState<'naac' | 'internal'>('naac')
  const [from, setFrom] = useState('2025-10')
  const [to, setTo] = useState('2026-09')
  const [format, setFormat] = useState<'pdf' | 'xlsx'>('pdf')

  const generate = async () => {
    const r = await fetch('/api/reports', { method: 'POST', body: JSON.stringify({ template, from, to, format, scopeType: 'campus' }) })
    if (!r.ok) { alert('Error generating report'); return }
    const blob = await r.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `greenscore-${template}-${from}_${to}.${format}`
    a.click()
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Reports</h1>
      <div className="max-w-md space-y-3 rounded-xl border bg-white p-4 dark:bg-zinc-900">
        <label className="block text-sm">Template</label>
        <select className="w-full rounded border p-2" value={template} onChange={(e) => setTemplate(e.target.value as 'naac' | 'internal')}>
          <option value="naac">NAAC Criterion 7 (environmental sub-parameters)</option>
          <option value="internal">Internal leadership</option>
        </select>
        <label className="block text-sm">Range</label>
        <div className="flex gap-2">
          <input className="rounded border p-2" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="2025-10" />
          <input className="rounded border p-2" value={to} onChange={(e) => setTo(e.target.value)} placeholder="2026-09" />
        </div>
        <label className="block text-sm">Format</label>
        <div className="flex gap-2">
          {(['pdf', 'xlsx'] as const).map((f) => (
            <button key={f} onClick={() => setFormat(f)} className={`rounded px-3 py-1 ${format === f ? 'bg-green-600 text-white' : 'bg-zinc-200 dark:bg-zinc-800'}`}>{f.toUpperCase()}</button>
          ))}
        </div>
        <button className="w-full rounded bg-green-600 p-2 text-white" onClick={generate}>Generate & download</button>
        <p className="text-xs text-zinc-400">Each report stores its parameters + an integrity hash, so it can be regenerated identically.</p>
      </div>
    </div>
  )
}
