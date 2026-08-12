import { describe, it, expect } from 'vitest'
import { getTier } from '../lib/nora-knowledge.js'

// Regression guard for the exact boundary values consolidated into one
// shared function Aug 11 2026 (was previously duplicated, by coincidence
// with matching thresholds, between getNoraTierContext and an inline
// definition inside getSurfaceableClaims). Pinning these five values means
// any future accidental edit to either the shared function or a caller
// gets caught immediately instead of silently drifting.
describe('getTier boundaries', () => {
  it('0 signals -> tier 1', () => expect(getTier(0)).toBe(1))
  it('5 signals -> tier 1', () => expect(getTier(5)).toBe(1))
  it('6 signals -> tier 2', () => expect(getTier(6)).toBe(2))
  it('15 signals -> tier 2', () => expect(getTier(15)).toBe(2))
  it('16 signals -> tier 3', () => expect(getTier(16)).toBe(3))
})
