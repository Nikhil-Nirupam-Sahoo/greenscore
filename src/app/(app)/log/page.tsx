'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { postOrQueue } from '@/lib/offline-queue'

const WASTE_CATS = [
  { key: 'wet', label: 'Wet / food', emoji: '🍌' },
  { key: 'dry', label: 'Dry paper', emoji: '📄' },
  { key: 'plastic', label: 'Plastic', emoji: '🧴' },
  { key: 'ewaste', label: 'E-waste', emoji: '💻' },
  { key: 'hazardous', label: 'Hazardous', emoji: '☣️' },
]
const MODES = [
  { key: 'walk', emoji: '🚶' }, { key: 'cycle', emoji: '🚲' }, { key: 'bus', emoji: '🚌' },
  { key: 'ev', emoji: '🔌' }, { key: 'bike', emoji: '🛵' }, { key: 'car', emoji: '🚗' }, { key: 'carpool', emoji: '🤝' },
]

interface Source { id: string; name: string; type: string; mode: string; unit: string; locationName: string }

export default function LogPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <LogInner />
    </Suspense>
  )
}

function LogInner() {
  const params = useSearchParams()
  const presetSource = params.get('source')
  const [tab, setTab] = useState<'meter' | 'waste' | 'commute'>('meter')
  const [sources, setSources] = useState<Source[]>([])
  const [msg, setMsg] = useState('')

  useEffect(() => { fetch('/api/meters').then((r) => r.json()).then(setSources) }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Log a reading</h1>
      <div className="flex gap-2">
        {(['meter', 'waste', 'commute'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-2 ${tab === t ? 'bg-green-600 text-white' : 'bg-zinc-200 dark:bg-zinc-800'}`}>
            {t === 'meter' ? '⚡ Meter' : t === 'waste' ? '🗑️ Waste' : '🚶 Commute'}
          </button>
        ))}
      </div>
      {msg && <p className="rounded bg-green-50 p-2 text-sm text-green-800">{msg}</p>}
      {tab === 'meter' && <MeterForm sources={sources.filter((s) => s.type !== 'WASTE')} preset={presetSource} done={setMsg} />}
      {tab === 'waste' && <WasteForm sources={sources.filter((s) => s.type === 'WASTE')} preset={presetSource} done={setMsg} />}
      {tab === 'commute' && <CommuteForm done={setMsg} />}
    </div>
  )
}

function MeterForm({ sources, preset, done }: { sources: Source[]; preset: string | null; done: (m: string) => void }) {
  const lastId = typeof window !== 'undefined' ? localStorage.getItem('gs_last_source') : null
  const [sourceId, setSourceId] = useState(preset ?? lastId ?? '')
  const [value, setValue] = useState('')
  const src = sources.find((s) => s.id === sourceId)
  return (
    <form className="space-y-3 rounded-xl border bg-white p-4 dark:bg-zinc-900" onSubmit={async (e) => {
      e.preventDefault()
      if (!src) return
      const end = new Date()
      const start = new Date(end.getFullYear(), end.getMonth(), 1)
      const res = await postOrQueue('/api/readings', { sourceId: src.id, value: Number(value), unit: src.unit, category: src.type === 'ELECTRICITY' ? 'electricity' : 'water', periodStart: start.toISOString(), periodEnd: end.toISOString() })
      if (res.queued) return done('Offline — saved, will sync when you are back online 📴')
      localStorage.setItem('gs_last_source', src.id)
      done(`Saved for ${src.name} ✅`)
    }}>
      <label className="block text-sm">Meter</label>
      <select className="w-full rounded border p-3 text-base" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
        <option value="">— pick a meter —</option>
        {sources.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.locationName}</option>)}
      </select>
      <label className="block text-sm">Reading ({src?.unit ?? 'unit'})</label>
      <input inputMode="decimal" className="w-full rounded border p-3 text-2xl" type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
      <p className="text-xs text-zinc-500">Tip: scan the QR code on the meter to pre-fill this form.</p>
      <button className="w-full rounded bg-green-600 p-3 text-white">Save</button>
    </form>
  )
}

function WasteForm({ sources, preset, done }: { sources: Source[]; preset: string | null; done: (m: string) => void }) {
  const [sourceId, setSourceId] = useState(preset ?? '')
  const [cat, setCat] = useState('wet')
  const [value, setValue] = useState('')
  const src = sources.find((s) => s.id === sourceId) ?? sources[0]
  return (
    <form className="space-y-3 rounded-xl border bg-white p-4 dark:bg-zinc-900" onSubmit={async (e) => {
      e.preventDefault()
      if (!src) return
      const end = new Date()
      const start = new Date(end.getFullYear(), end.getMonth(), 1)
      const res = await postOrQueue('/api/readings', { sourceId: src.id, value: Number(value), unit: 'kg', category: 'waste', subCategory: cat, periodStart: start.toISOString(), periodEnd: end.toISOString() })
      if (res.queued) return done('Offline — will sync later 📴')
      done('Waste logged ✅')
    }}>
      <label className="block text-sm">Bin location</label>
      <select className="w-full rounded border p-3" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
        <option value="">— pick —</option>
        {sources.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.locationName}</option>)}
      </select>
      <label className="block text-sm">What is it?</label>
      <div className="grid grid-cols-3 gap-2">
        {WASTE_CATS.map((c) => (
          <button type="button" key={c.key} onClick={() => setCat(c.key)} className={`rounded-lg border p-3 text-2xl ${cat === c.key ? 'border-green-600 bg-green-50' : ''}`}>
            {c.emoji}<div className="text-[11px]">{c.label}</div>
          </button>
        ))}
      </div>
      <input inputMode="decimal" className="w-full rounded border p-3 text-2xl" type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="kg" />
      <button className="w-full rounded bg-green-600 p-3 text-white">Save</button>
    </form>
  )
}

function CommuteForm({ done }: { done: (m: string) => void }) {
  const [mode, setMode] = useState(typeof window !== 'undefined' ? localStorage.getItem('gs_last_mode') ?? 'bus' : 'bus')
  const [km, setKm] = useState('')
  return (
    <form className="space-y-3 rounded-xl border bg-white p-4 dark:bg-zinc-900" onSubmit={async (e) => {
      e.preventDefault()
      const res = await postOrQueue('/api/commute', { mode, distanceKm: Number(km || 3), date: new Date().toISOString() })
      if (res.queued) return done('Offline — will sync later 📴')
      localStorage.setItem('gs_last_mode', mode)
      done('Commute logged 🌱')
    }}>
      <label className="block text-sm">How did you get here today?</label>
      <div className="grid grid-cols-4 gap-2">
        {MODES.map((m) => (
          <button type="button" key={m.key} onClick={() => setMode(m.key)} className={`rounded-lg border p-3 text-2xl ${mode === m.key ? 'border-green-600 bg-green-50' : ''}`}>
            {m.emoji}<div className="text-[11px]">{m.key}</div>
          </button>
        ))}
      </div>
      <input inputMode="decimal" className="w-full rounded border p-3" type="number" value={km} onChange={(e) => setKm(e.target.value)} placeholder="roughly how many km? (optional)" />
      <button className="w-full rounded bg-green-600 p-3 text-white">Save</button>
    </form>
  )
}
