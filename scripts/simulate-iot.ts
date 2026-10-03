/**
 * MQTT-style simulator: streams readings for all IOT meters.
 * Usage: npm run simulate   (dev server must be running on :3000)
 * Each source's key is `iot-key-<sourceId>` (matches seed; devices only store its hash).
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE = process.env.BASE_URL ?? 'http://localhost:3000'

async function main() {
  const sources = await prisma.dataSource.findMany({ where: { mode: 'IOT' } })
  if (!sources.length) { console.log('no IoT sources'); return }
  for (const s of sources) {
    const end = new Date()
    const start = new Date(end.getFullYear(), end.getMonth(), 1)
    const base = 30000 + Math.random() * 40000
    const payload = {
      idempotencyKey: `sim-${s.id}-${start.toISOString().slice(0, 7)}`,
      readings: [{ value: Math.round(base), unit: s.unit, category: s.type === 'ELECTRICITY' ? 'electricity' : 'water', periodStart: start.toISOString(), periodEnd: end.toISOString(), method: 'IOT' }],
    }
    const r = await fetch(`${BASE}/api/ingest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': `iot-key-${s.id}` },
      body: JSON.stringify(payload),
    })
    console.log(s.name, r.status, await r.text())
  }
}

main().finally(() => prisma.$disconnect())
