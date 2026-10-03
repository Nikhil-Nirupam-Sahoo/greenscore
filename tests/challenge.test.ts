import { describe, it, expect } from 'vitest'
import { challengeProgress } from '../src/lib/challenges'

describe('challengeProgress', () => {
  it('tracks reduction challenges against baseline', () => {
    expect(challengeProgress('water_reduction', 100, 95, 10)).toBe(50) // 5% of 10% goal
    expect(challengeProgress('water_reduction', 100, 90, 10)).toBe(100)
    expect(challengeProgress('water_reduction', 100, 110, 10)).toBe(0) // worse, not rewarded
  })
  it('handles zero baseline safely', () => {
    expect(challengeProgress('energy_reduction', 0, 100, 10)).toBe(0)
  })
  it('tracks transport share challenges', () => {
    expect(challengeProgress('sustainable_transport', 0, 30, 60)).toBe(50)
  })
})
