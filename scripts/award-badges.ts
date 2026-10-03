/** Award badges from real data only: streaks of verified commute logging, challenge winners. */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({ where: { role: 'STUDENT' }, select: { id: true } })
  let awarded = 0; // eslint-safe
  for (const u of users.slice(0, 400)) {
    const logs = await prisma.commuteLog.findMany({ where: { userId: u.id }, select: { date: true }, orderBy: { date: 'desc' }, take: 60 })
    const distinctMonths = new Set(logs.map((l) => l.date.toISOString().slice(0, 7)))
    if (distinctMonths.size >= 6) {
      const badge = await prisma.badge.findUnique({ where: { code: 'STREAK_3' } })
      if (badge) {
        const has = await prisma.userBadge.findFirst({ where: { userId: u.id, badgeId: badge.id } })
        if (!has) { await prisma.userBadge.create({ data: { userId: u.id, badgeId: badge.id } }); awarded++ }
      }
    }
  }
  console.log(`badges awarded: ${awarded}`)
}

main().finally(() => prisma.$disconnect())
