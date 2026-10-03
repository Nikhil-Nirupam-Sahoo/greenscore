'use client'
import { useState } from 'react'

export default function SettingsForm({ initial }: { initial: { energy: number; water: number; waste: number; transport: number } }) {
  const [w, setW] = useState(initial)
  const [msg, setMsg] = useState('')
  const sum = w.energy + w.water + w.waste + w.transport
  return (
    <form
      className="mt-2 space-y-2"
      onSubmit={async (e) => {
        e.preventDefault()
        const r = await fetch('/api/settings', { method: 'POST', body: JSON.stringify(w) })
        setMsg(r.ok ? 'Saved ✅' : 'Weights must sum to 100')
      }}
    >
      {(Object.keys(w) as Array<keyof typeof w>).map((k) => (
        <label key={k} className="flex items-center gap-2 text-sm">
          {k}:
          <input type="number" className="w-24 rounded border p-1" value={w[k]} onChange={(e) => setW({ ...w, [k]: Number(e.target.value) })} />
        </label>
      ))}
      <p className={`text-xs ${sum === 100 ? 'text-green-600' : 'text-red-500'}`}>Total: {sum}</p>
      <button className="rounded bg-green-600 px-4 py-2 text-white" disabled={sum !== 100}>Save weights</button>
      {msg && <p className="text-sm">{msg}</p>}
    </form>
  )
}
