import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const sources = await prisma.dataSource.findMany({
    include: { location: { select: { name: true, type: true } } },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(
    sources.map((s) => ({ id: s.id, name: s.name, type: s.type, mode: s.mode, unit: s.unit, locationId: s.locationId, locationName: s.location.name, locationType: s.location.type })),
  )
}
