import Nav from '@/components/nav'
import OfflineSync from '@/components/offline-sync'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Nav />
      <OfflineSync />
      <main className="mx-auto max-w-5xl px-3 py-4">{children}</main>
    </div>
  )
}
