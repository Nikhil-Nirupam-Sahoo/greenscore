'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('admin@greenscore.dev')
  const [password, setPassword] = useState('password123')
  const [err, setErr] = useState('')
  const router = useRouter()
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <form
        className="w-full max-w-sm space-y-4 rounded-xl border bg-white p-6 dark:bg-zinc-900"
        onSubmit={async (e) => {
          e.preventDefault()
          const r = await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
          if (r.ok) router.push('/dashboard')
          else setErr('Invalid credentials')
        }}
      >
        <h1 className="text-xl font-bold text-green-700">🌿 GreenScore</h1>
        <p className="text-sm text-zinc-500">Campus sustainability tracker & auditor</p>
        <input className="w-full rounded border p-2" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
        <input className="w-full rounded border p-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button className="w-full rounded bg-green-600 p-2 text-white">Sign in</button>
        <p className="text-xs text-zinc-400">Demo: admin@ / facility@ / student@ / staff@ / auditor@ ·greenscore.dev · password123</p>
      </form>
    </div>
  )
}
