import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import PDFDocument from 'pdfkit'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
  const badge = await prisma.userBadge.findFirst({ where: { userId }, include: { badge: true, user: true } })
  if (!badge) return NextResponse.json({ error: 'no badge awarded to this user yet' }, { status: 404 })
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 64 })
  const chunks: Buffer[] = []
  doc.on('data', (c) => chunks.push(c))
  const done = new Promise<Buffer>((res) => doc.on('end', () => res(Buffer.concat(chunks))))
  doc.rect(24, 24, doc.page.width - 48, doc.page.height - 48).stroke('#16a34a')
  doc.fontSize(32).fillColor('#16a34a').text('GreenScore Certificate', { align: 'center' })
  doc.moveDown()
  doc.fontSize(16).fillColor('#000').text(`This certifies that ${badge.user.name}`, { align: 'center' })
  doc.text(`has earned the "${badge.badge.name}" recognition`, { align: 'center' })
  doc.moveDown().fontSize(12).text(badge.badge.description, { align: 'center' })
  doc.moveDown(2).fontSize(10).fillColor('#555').text(`Awarded ${badge.awardedAt.toDateString()} · Verified via the campus audit ledger`, { align: 'center' })
  doc.end()
  const pdf = await done
  return new NextResponse(new Uint8Array(pdf), { headers: { 'content-type': 'application/pdf' } })
}
