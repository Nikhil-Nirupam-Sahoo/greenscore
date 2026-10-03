export default function SettingsPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-bold">Settings</h1>
      <p className="text-sm text-zinc-500">Score weights, emission factors and templates are configured in <code>src/lib/scoring/config.ts</code> and the seed file — full admin UI coming in Phase 6.</p>
    </div>
  )
}
