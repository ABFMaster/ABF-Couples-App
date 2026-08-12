import { describe, it, expect } from 'vitest'
import { getClaimMode } from '../lib/nora-memory.js'

// TENTATIVE-vs-DIRECT is the mechanical core of the "earned trust" claim
// gating — a claim can only be stated as settled fact once BOTH its own
// confidence AND the relevant tier ceiling agree. Confidence alone must
// never be enough on its own; that's the whole point of the tier ceiling
// existing, so it's the specific thing this test guards against regressing.
describe('getClaimMode — DIRECT requires confidence AND tier together', () => {
  it('confidence 0.80 + tier 2 -> TENTATIVE (confidence below the DIRECT threshold)', () => {
    expect(getClaimMode(0.80, 2)).toBe('TENTATIVE')
  })

  it('confidence 0.90 + tier 3 -> DIRECT (both conditions met)', () => {
    expect(getClaimMode(0.90, 3)).toBe('DIRECT')
  })

  it('confidence 0.90 + tier 1 -> TENTATIVE (tier ceiling blocks it even at high confidence)', () => {
    expect(getClaimMode(0.90, 1)).toBe('TENTATIVE')
  })

  it('confidence exactly 0.85 + tier 3 -> DIRECT (boundary is inclusive)', () => {
    expect(getClaimMode(0.85, 3)).toBe('DIRECT')
  })
})
