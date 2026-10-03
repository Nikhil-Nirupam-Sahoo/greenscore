import { prisma } from '@/lib/db'
import QRCode from 'qrcode'

export const dynamic = 'force-dynamic'

export default async function MetersPage() {
  const sources = await prisma.dataSource.findMany({ include: { location: true }, orderBy: [{ location: { name: 'asc' } }] })
  const rows = await Promise.all(
    sources.map(async (s) => ({
      ...s,
      qr: await QRCode.toDataURL(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/log?source=${s.id}`),
    })),
  )
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Meters & bins</h1>
      <p className="text-sm text-zinc-500">Print the QR on each meter: staff scan it to pre-fill the logging form.</p>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {rows.map((s) => (
          <div key={s.id} className="rounded-xl border bg-white p-3 dark:bg-zinc-900">
            <div className="font-semibold">{s.name}</div>
            <div className="text-xs text-zinc-500">{s.location.name} · {s.type} · <b>{s.mode}</b></div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.qr} alt="QR" className="mt-2 h-24 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}
