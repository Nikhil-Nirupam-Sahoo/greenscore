import { prisma } from './db'
import { DEFAULT_WEIGHTS, type Weights } from './scoring/config'

export async function getWeights(): Promise<Weights> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'weights' } })
    if (row) return { ...DEFAULT_WEIGHTS, ...(JSON.parse(row.value) as Partial<Weights>) }
  } catch {}
  return DEFAULT_WEIGHTS
}

export async function setWeights(w: Weights) {
  return prisma.setting.upsert({ where: { key: 'weights' }, create: { key: 'weights', value: JSON.stringify(w) }, update: { value: JSON.stringify(w) } })
}
