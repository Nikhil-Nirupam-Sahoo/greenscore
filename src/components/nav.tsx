import Link from 'next/link'
import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/log', label: 'Log Data' },
  { href: '/meters', label: 'Meters' },
  { href: '/trends', label: 'Trends' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/challenges', label: 'Challenges' },
  { href: '/feed', label: 'Feed' },
  { href: '/impact', label: 'My Impact' },
  { href: '/review', label: 'Review Queue', roles: ['ADMIN', 'FACILITY_STAFF'] },
  { href: '/audit', label: 'Integrity', roles: ['ADMIN', 'AUDITOR'] },
  { href: '/reports', label: 'Reports', roles: ['ADMIN', 'AUDITOR'] },
  { href: '/settings', label: 'Settings', roles: ['ADMIN'] },
  { href: '/import', label: 'CSV Import', roles: ['ADMIN','FACILITY_STAFF'] },
]

export default async function Nav() {
  const s = await getSession()
  if (!s) redirect('/login')
  return (
    <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur dark:bg-zinc-900/80">
      <div className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-3 py-2">
        <span className="mr-2 text-lg font-bold text-green-700">🌿 GreenScore</span>
        {links.filter((l) => !l.roles || l.roles.includes(s.role)).map((l) => (
          <Link key={l.href} href={l.href} className="rounded-md px-2 py-1 text-sm whitespace-nowrap hover:bg-zinc-100 dark:hover:bg-zinc-800">
            {l.label}
          </Link>
        ))}
        <span className="ml-auto text-xs text-zinc-500">{s.name} · {s.role}</span>
      </div>
    </header>
  )
}
