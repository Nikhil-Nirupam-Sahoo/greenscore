import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { refreshRollups } from '../src/lib/rollup'
import { audit } from '../src/lib/audit/store'

const prisma = new PrismaClient()

const MONTHS: string[] = []
for (let y = 2024; y <= 2026; y++) {
  for (let m = 0; m < 12; m++) {
    const ym = y * 12 + m
    if (ym < 2024 * 12 + 9) continue // start Oct 2024
    if (ym > 2026 * 12 + 8) break // end Sep 2026
    MONTHS.push(`${y}-${String(m + 1).padStart(2, '0')}`)
  }
}

const hashOnce = bcrypt.hashSync('password123', 10)

async function main() {
  console.log('Wiping…')
  await prisma.$transaction([
    prisma.auditLog.deleteMany(), prisma.savedReport.deleteMany(), prisma.monthlyRollup.deleteMany(),
    prisma.scoreSnapshot.deleteMany(), prisma.feedPost.deleteMany(), prisma.comment.deleteMany(),
    prisma.userBadge.deleteMany(), prisma.badge.deleteMany(), prisma.pointsLedger.deleteMany(),
    prisma.challengeProgress.deleteMany(), prisma.challenge.deleteMany(), prisma.commuteLog.deleteMany(),
    prisma.reading.deleteMany(), prisma.dataSource.deleteMany(), prisma.deviceKey.deleteMany(),
    prisma.location.deleteMany(), prisma.campus.deleteMany(), prisma.emissionFactor.deleteMany(),
    prisma.user.deleteMany(),
  ])

  // ---------- Campus ----------
  const campus = await prisma.campus.create({
    data: {
      name: 'Greenfield Institute of Technology',
      area_sqm: 450000,
      population_students: 2300,
      population_staff: 420,
      residents_hostel: 1500,
      locations: {
        create: [
          { name: 'CSE Dept', type: 'DEPARTMENT', area_sqm: 12000, occupancy: 700 },
          { name: 'MECH Dept', type: 'DEPARTMENT', area_sqm: 15000, occupancy: 650 },
          { name: 'ECE Dept', type: 'DEPARTMENT', area_sqm: 11000, occupancy: 600 },
          { name: 'CIVIL Dept', type: 'DEPARTMENT', area_sqm: 10000, occupancy: 550 },
          { name: 'Hostel A', type: 'HOSTEL_BLOCK', area_sqm: 20000, occupancy: 500 },
          { name: 'Hostel B', type: 'HOSTEL_BLOCK', area_sqm: 20000, occupancy: 500 },
          { name: 'Hostel C', type: 'HOSTEL_BLOCK', area_sqm: 20000, occupancy: 500 },
          { name: 'Admin Block', type: 'BUILDING', area_sqm: 8000, occupancy: 300 },
          { name: 'Central Library', type: 'BUILDING', area_sqm: 14000, occupancy: 800 },
          { name: 'Auditorium', type: 'BUILDING', area_sqm: 9000, occupancy: 1200 },
          { name: 'Sports Complex', type: 'BUILDING', area_sqm: 25000, occupancy: 400 },
          { name: 'Cafeteria', type: 'BUILDING', area_sqm: 6000, occupancy: 900 },
        ],
      },
    },
    include: { locations: true },
  })
  console.log(`Campus: ${campus.name}, ${campus.locations.length} locations`)

  // Peer campuses (anonymised bundles) for benchmarking
  for (const p of [
    { name: 'Peer Campus — North State University (anonymised)', pop: 3100 },
    { name: 'Peer Campus — River Valley College (anonymised)', pop: 2600 },
  ]) {
    await prisma.campus.create({
      data: { name: p.name, area_sqm: 500000, population_students: p.pop, population_staff: 450, residents_hostel: 1200, peerOfBand: '3000-band' },
    })
  }

  // ---------- Users ----------
  const demoUsers = [
    { email: 'admin@greenscore.dev', name: 'Aarav Admin', role: 'ADMIN' },
    { email: 'facility@greenscore.dev', name: 'Farah Facility', role: 'FACILITY_STAFF' },
    { email: 'student@greenscore.dev', name: 'Sam Student', role: 'STUDENT' },
    { email: 'staff@greenscore.dev', name: 'Dev Staff', role: 'STAFF' },
    { email: 'auditor@greenscore.dev', name: 'Audit Ayesha', role: 'AUDITOR' },
  ] as const
  for (const u of demoUsers) {
    await prisma.user.create({ data: { ...u, passwordHash: hashOnce } })
  }
  // extra facility staff
  for (let i = 1; i <= 3; i++) await prisma.user.create({ data: { email: `facility${i}@greenscore.dev`, name: `Facility ${i}`, role: 'FACILITY_STAFF', passwordHash: hashOnce } })
  // synthetic students (shared hash so seed is fast)
  const synthetic = []
  for (let i = 1; i <= 2900; i++) synthetic.push({ email: `student${i}@green.edu`, name: `Student ${i}`, role: 'STUDENT' as const, passwordHash: hashOnce })
  for (let i = 0; i < synthetic.length; i += 1000) await prisma.user.createMany({ data: synthetic.slice(i, i + 1000) })
  for (let i = 1; i <= 45; i++) await prisma.user.create({ data: { email: `prof${i}@green.edu`, name: `Prof ${i}`, role: 'STAFF', passwordHash: hashOnce } })
  console.log('Users seeded')

  // ---------- Emission factors (editable; cite CEA-2023 / placeholder notes) ----------
  const factors = [
    { category: 'electricity', factor: 0.82, unit: 'kgCO2e/kWh', source: 'CEA CO2 baseline database v18 (2023) — verify/update' },
    { category: 'water', factor: 0.34, unit: 'kgCO2e/kL', source: 'CPCB water supply & treatment estimate (placeholder, verify)' },
    { category: 'waste.wet', factor: 0.30, unit: 'kgCO2e/kg', source: 'IPCC default organic landfill w/ methane recovery (placeholder)' },
    { category: 'waste.dry', factor: 0.20, unit: 'kgCO2e/kg', source: 'Placeholder — verify with local LCA' },
    { category: 'waste.plastic', factor: 1.50, unit: 'kgCO2e/kg', source: 'PlasticsEurope eco-profile (placeholder)' },
    { category: 'waste.ewaste', factor: 0.40, unit: 'kgCO2e/kg', source: 'EU JRC study (placeholder)' },
    { category: 'waste.hazardous', factor: 2.00, unit: 'kgCO2e/kg', source: 'IPCC guidance (placeholder)' },
    { category: 'transport.walk', factor: 0, unit: 'kgCO2e/km', source: 'Direct tailpipe' },
    { category: 'transport.cycle', factor: 0, unit: 'kgCO2e/km', source: 'Direct tailpipe' },
    { category: 'transport.bike', factor: 0.062, unit: 'kgCO2e/km', source: '2-wheeler average (placeholder)' },
    { category: 'transport.bus', factor: 0.105, unit: 'kgCO2e/km', source: 'BEE bus average (placeholder)' },
    { category: 'transport.car', factor: 0.192, unit: 'kgCO2e/km', source: 'Petrol car average (placeholder)' },
    { category: 'transport.carpool', factor: 0.096, unit: 'kgCO2e/km', source: 'Car × 2 occupants (placeholder)' },
    { category: 'transport.ev', factor: 0.075, unit: 'kgCO2e/km', source: 'Grid-weighted EV (CEA factor × EV efficiency)' },
  ]
  for (const f of factors) await prisma.emissionFactor.create({ data: { ...f, validFrom: new Date('2024-04-01') } })
  console.log('Emission factors seeded (with source notes)')

  // ---------- Meters / DataSources ----------
  const locByName = new Map(campus.locations.map((l) => [l.name, l]))
  type Src = { name: string; type: string; mode: string; unit: string; locationId: string }
  const sources: Src[] = []
  const addSrc = (name: string, type: string, mode: string, unit: string, locName: string) =>
    sources.push({ name, type, mode, unit, locationId: locByName.get(locName)!.id })
  addSrc('CSE Main Meter', 'ELECTRICITY', 'IOT', 'kWh', 'CSE Dept')
  addSrc('MECH Main Meter', 'ELECTRICITY', 'MANUAL', 'kWh', 'MECH Dept')
  addSrc('ECE Main Meter', 'ELECTRICITY', 'IOT', 'kWh', 'ECE Dept')
  addSrc('CIVIL Main Meter', 'ELECTRICITY', 'MANUAL', 'kWh', 'CIVIL Dept')
  addSrc('Admin Meter', 'ELECTRICITY', 'MANUAL', 'kWh', 'Admin Block')
  addSrc('Library Meter', 'ELECTRICITY', 'IOT', 'kWh', 'Central Library')
  addSrc('Auditorium Meter', 'ELECTRICITY', 'MANUAL', 'kWh', 'Auditorium')
  addSrc('Sports Meter', 'ELECTRICITY', 'MANUAL', 'kWh', 'Sports Complex')
  addSrc('Cafeteria Meter', 'ELECTRICITY', 'IOT', 'kWh', 'Cafeteria')
  addSrc('Hostel A Meter', 'ELECTRICITY', 'IOT', 'kWh', 'Hostel A')
  addSrc('Hostel B Meter', 'ELECTRICITY', 'MANUAL', 'kWh', 'Hostel B')
  addSrc('Hostel C Meter', 'ELECTRICITY', 'IOT', 'kWh', 'Hostel C')
  addSrc('CSE Water Meter', 'WATER', 'IOT', 'kL', 'CSE Dept')
  addSrc('MECH Water Meter', 'WATER', 'MANUAL', 'kL', 'MECH Dept')
  addSrc('ECE Water Meter', 'WATER', 'IOT', 'kL', 'ECE Dept')
  addSrc('CIVIL Water Meter', 'WATER', 'MANUAL', 'kL', 'CIVIL Dept')
  addSrc('Library Water Meter', 'WATER', 'MANUAL', 'kL', 'Central Library')
  addSrc('Hostel A Water', 'WATER', 'IOT', 'kL', 'Hostel A')
  addSrc('Hostel B Water', 'WATER', 'MANUAL', 'kL', 'Hostel B')
  addSrc('Hostel C Water', 'WATER', 'IOT', 'kL', 'Hostel C')
  addSrc('Hostel A Waste', 'WASTE', 'MANUAL', 'kg', 'Hostel A')
  addSrc('Hostel B Waste', 'WASTE', 'MANUAL', 'kg', 'Hostel B')
  addSrc('Hostel C Waste', 'WASTE', 'MANUAL', 'kg', 'Hostel C')
  addSrc('Cafeteria Waste', 'WASTE', 'MANUAL', 'kg', 'Cafeteria')
  for (const s of sources) {
    const row = await prisma.dataSource.create({ data: s })
    if (s.mode === 'IOT') {
      const rawKey = `iot-key-${row.id}`
      const { createHash } = await import('crypto')
      await prisma.dataSource.update({ where: { id: row.id }, data: { apiKeyHash: createHash('sha256').update(rawKey).digest('hex') } })
    }
  }
  console.log(`${sources.length} meters seeded (manual + IoT mix)`)

  // ---------- Readings (24 months, seasonality, anomalies) ----------
  const rnd = mulberry32(20261003)
  const reads: Array<Record<string, unknown>> = []
  const allSources = await prisma.dataSource.findMany()
  const ioTKeys = allSources.map((s) => s.id)
  void ioTKeys
  for (const src of allSources) {
    const loc = campus.locations.find((l) => l.id === src.locationId)!
    const perCapitaElec = src.type === 'ELECTRICITY' ? 8 + rnd() * 6 : 0      // kWh/person/month
    const perCapitaWater = src.type === 'WATER' ? 2.5 + rnd() * 1.5 : 0       // kL/person/month
    const wasteBase = src.type === 'WASTE' ? loc.occupancy * (0.18 + rnd() * 0.1) : 0 // kg/day
    for (const ym of MONTHS) {
      const [y, m] = ym.split('-').map(Number)
      const monthIdx = (y - 2024) * 12 + (m - 1) - 9
      const season = seasonFactor(m) // 1.0 winter/monsoon, peak Mar-Jun
      const start = new Date(Date.UTC(y, m - 1, 1))
      const end = new Date(Date.UTC(y, m, 0))
      const month = `${ym}-01`
      // trend: slow improvement after 2025-09 (green campaign)
      const improvement = monthIdx > 14 ? 0.92 : 1.0
      if (src.type === 'ELECTRICITY') {
        const consumption = perCapitaElec * loc.occupancy * season * improvement * (0.9 + rnd() * 0.2)
        const anom = ym === '2025-08' && loc.name === 'Auditorium' ? 2.3 : ym === '2026-03' && loc.name === 'Hostel C' ? 1.8 : 1
        const val = consumption * anom
        reads.push({
          value: Math.round(val), unit: 'kWh', category: 'electricity', periodStart: start, periodEnd: end,
          locationId: loc.id, sourceId: src.id, method: src.mode === 'IOT' ? 'IOT' : 'MANUAL',
          status: anom > 1.3 ? 'FLAGGED' : rnd() < 0.85 ? 'VERIFIED' : 'PENDING',
          flagReason: anom > 1.3 ? 'statistical outlier vs history' : null,
          idempotencyKey: `seed-${src.id}-${month}`,
        })
      } else if (src.type === 'WATER') {
        const consumption = perCapitaWater * loc.occupancy * (0.7 + 0.3 * season) * improvement * (0.9 + rnd() * 0.2)
        const anom = ym === '2025-08' && loc.name === 'Hostel B' ? 2.2 : ym === '2026-04' && loc.name === 'Hostel A' ? 1.7 : 1
        reads.push({
          value: Math.round(consumption * anom * 10) / 10, unit: 'kL', category: 'water', periodStart: start, periodEnd: end,
          locationId: loc.id, sourceId: src.id, method: src.mode === 'IOT' ? 'IOT' : 'MANUAL',
          status: anom > 1.3 ? 'FLAGGED' : rnd() < 0.85 ? 'VERIFIED' : 'PENDING',
          flagReason: anom > 1.3 ? 'sudden jump vs meter history' : null,
          idempotencyKey: `seed-${src.id}-${month}`,
        })
      } else {
        for (const sub of ['wet', 'dry', 'plastic', 'ewaste', 'hazardous'] as const) {
          const share = sub === 'wet' ? 0.55 : sub === 'dry' ? 0.25 : sub === 'plastic' ? 0.12 : sub === 'ewaste' ? 0.05 : 0.03
          const anom = ym === '2026-02' && loc.name === 'Cafeteria' && sub === 'wet' ? 2.5 : 1
          reads.push({
            value: Math.round(wasteBase * share * 30 * improvement * anom * (0.85 + rnd() * 0.3)),
            unit: 'kg', category: 'waste', subCategory: sub, periodStart: start, periodEnd: end,
            locationId: loc.id, sourceId: src.id, method: 'MANUAL',
            status: anom > 1.3 ? 'FLAGGED' : rnd() < 0.8 ? 'VERIFIED' : 'PENDING',
            flagReason: anom > 1.3 ? 'duplicate / spike suspected' : null,
            idempotencyKey: `seed-${src.id}-${sub}-${month}`,
          })
        }
      }
    }
  }
  for (let i = 0; i < reads.length; i += 5000) await prisma.reading.createMany({ data: reads.slice(i, i + 5000) as never })
  console.log(`${reads.length} readings seeded`)

  // ---------- Commute logs ----------
  
  const demoStudent = await prisma.user.findUnique({ where: { email: 'student@greenscore.dev' } })
  const synthStudents = await prisma.user.findMany({ where: { email: { startsWith: 'student' } }, take: 100, select: { id: true } })
  const commutes: Array<{ userId: string; mode: string; distanceKm: number; date: Date }> = []
  const targets = [demoStudent!.id, ...synthStudents.map((s) => s.id)]
  for (const uid of targets) {
    for (let mi = 0; mi < 24; mi++) {
      const baseDate = new Date(Date.UTC(2024, 9, 1))
      baseDate.setUTCMonth(baseDate.getUTCMonth() + mi)
      const logsThisMonth = mi > 17 ? 12 : 6 // last ~7 months: richer logging
      for (let d = 0; d < logsThisMonth; d++) {
        const dayOffset = Math.floor(rnd() * 27)
        const date = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), 1 + dayOffset))
        const r = rnd()
        const mode = r < 0.3 ? 'bus' : r < 0.45 ? 'walk' : r < 0.55 ? 'cycle' : r < 0.65 ? 'bike' : r < 0.72 ? 'ev' : r < 0.86 ? 'carpool' : 'car'
        commutes.push({ userId: uid, mode, distanceKm: Math.round((1 + rnd() * 14) * 10) / 10, date })
      }
    }
  }
  for (let i = 0; i < commutes.length; i += 5000) await prisma.commuteLog.createMany({ data: commutes.slice(i, i + 5000) })
  console.log(`${commutes.length} commute logs seeded`)

  // ---------- Challenges ----------
  const ch1 = await prisma.challenge.create({
    data: {
      title: 'Hostel B water saver', description: 'Cut Hostel B water use by 10% vs last month baseline',
      targetType: 'water_reduction', targetPct: 10, scopeType: 'location', scopeId: locByName.get('Hostel B')!.id,
      startDate: new Date('2026-09-01'), endDate: new Date('2026-11-30'), baselineValue: 100, status: 'ACTIVE',
    },
  })
  await prisma.challenge.create({
    data: {
      title: 'Campus-wide sustainable commute push', description: 'Reach 60% sustainable mode share', targetType: 'sustainable_transport',
      targetPct: 60, scopeType: 'campus', startDate: new Date('2026-08-01'), endDate: new Date('2026-12-31'), status: 'ACTIVE',
    },
  })
  await prisma.challenge.create({
    data: {
      title: 'E-waste drive 2025', description: 'Divert 500 kg e-waste from landfill', targetType: 'waste_diversion',
      targetPct: 100, scopeType: 'campus', startDate: new Date('2025-03-01'), endDate: new Date('2025-04-30'), status: 'COMPLETED',
    },
  })
  await prisma.challengeProgress.create({ data: { challengeId: ch1.id, progressPct: 6 } })
  console.log('Challenges seeded')

  // ---------- Badges ----------
  const badges = [
    { code: 'STREAK_3', name: '3-Month Improver', description: 'Logged verified data 3 months straight' },
    { code: 'LOGGER', name: 'Consistent Logger', description: '20+ verified logs' },
    { code: 'CHALLENGE_WINNER', name: 'Challenge Winner', description: 'Completed a green challenge' },
    { code: 'HERO', name: 'Improvement Hero', description: 'Dept with 3 consecutive improving months' },
  ]
  for (const b of badges) await prisma.badge.create({ data: b })

  // ---------- Feed ----------
  const admin = await prisma.user.findUnique({ where: { email: 'admin@greenscore.dev' } })
  const posts = [
    { text: 'Welcome to GreenScore! Log your commute to earn your first points.', kind: 'announcement', pinned: true },
    { text: 'Hostel B saved 12% water last month — keep it up!', kind: 'update' },
    { text: 'Tip: switch off lab PCs overnight instead of sleep mode.', kind: 'tip' },
    { text: 'New challenge: Campus-wide sustainable commute push.', kind: 'announcement' },
    { text: 'E-waste drive 2025 diverted 520 kg — thank you all!', kind: 'update' },
  ]
  for (const p of posts) await prisma.feedPost.create({ data: { authorId: admin!.id, ...p } })

  // ---------- Rollups + scores + a first audit entry ----------
  const n = await refreshRollups()
  console.log(`Monthly rollups: ${n}`)
  const { computeAndStoreScores } = await import('../src/lib/scoring/compute')
  const snaps = await computeAndStoreScores()
  console.log(`Score snapshots: ${snaps}`)
  await audit({ action: 'SEED', payload: { users: 2953, readings: reads.length, rollups: n, snapshots: snaps } })
  console.log('Seed complete ✅')
}

function seasonFactor(m: number): number {
  // Mar(3)–Jun(6) peak cooling demand; Jan-Feb moderate; Jul-Sep monsoon lower; Oct-Dec moderate
  if (m >= 3 && m <= 6) return 1.35
  if (m >= 7 && m <= 9) return 0.9
  if (m === 1 || m === 2) return 1.1
  return 1.0
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
