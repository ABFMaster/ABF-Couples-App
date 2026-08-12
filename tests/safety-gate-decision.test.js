import { describe, it, expect } from 'vitest'
import { resolveSafetyAction } from '../lib/safety.js'

// resolveSafetyAction is the exact branch app/api/ai-coach/route.js and
// app/api/couples-session/route.js both call to decide what happens after
// checkSensitiveContent runs. This pins tests D and E from the task #187
// spec at the decision level:
//   D. flagged -> generation and memory both skipped (SAFETY_RESPONSE_ONLY)
//   E. a normal message -> the ordinary generate-then-remember path
// plus the classifier-failure case in between (fail-open on generation,
// fail-closed on memory) that both routes' code reads directly off this
// same function. Both route files were read end-to-end to confirm they
// call resolveSafetyAction with checkSensitiveContent's real return value
// and branch on its three possible outputs exactly as tested here — see
// app/api/ai-coach/route.js and app/api/couples-session/route.js.
describe('resolveSafetyAction', () => {
  it('D: a flagged message produces SAFETY_RESPONSE_ONLY — no generation, no memory write', () => {
    expect(resolveSafetyAction({ flagged: true, category: 'ABUSE', ok: true })).toBe('SAFETY_RESPONSE_ONLY')
    expect(resolveSafetyAction({ flagged: true, category: 'SELF_HARM', ok: true })).toBe('SAFETY_RESPONSE_ONLY')
    expect(resolveSafetyAction({ flagged: true, category: 'SUICIDAL_IDEATION', ok: true })).toBe('SAFETY_RESPONSE_ONLY')
    expect(resolveSafetyAction({ flagged: true, category: 'CRISIS', ok: true })).toBe('SAFETY_RESPONSE_ONLY')
  })

  it('E: a normal, successfully-classified message produces GENERATE_AND_REMEMBER', () => {
    expect(resolveSafetyAction({ flagged: false, category: null, ok: true })).toBe('GENERATE_AND_REMEMBER')
  })

  it('a classifier failure produces GENERATE_ONLY — fail-open on generation, fail-closed on memory', () => {
    expect(resolveSafetyAction({ flagged: false, category: null, ok: false })).toBe('GENERATE_ONLY')
  })

  it('flagged always wins over ok, even if both happen to be true', () => {
    // Defensive: flagged should never be paired with ok:false in practice
    // (checkSensitiveContent's contract), but the decision function must
    // still resolve unambiguously if it ever were.
    expect(resolveSafetyAction({ flagged: true, category: 'CRISIS', ok: false })).toBe('SAFETY_RESPONSE_ONLY')
  })
})
