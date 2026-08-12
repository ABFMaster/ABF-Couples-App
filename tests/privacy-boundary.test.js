import { describe, it, expect, vi, beforeEach } from 'vitest'

// Fixture rows keyed by table name — what a real Supabase response would
// contain for each table getFullNoraContext touches.
const fixtures = {
  couples: { user1_id: 'u1', user2_id: 'u2' },
  nora_memory: {
    memory_summary: 'They are doing well.',
    user1_notes: { notes: 'Matt notes here.' },
    user2_notes: { notes: 'Cass notes here.' },
    couple_notes: { notes: 'Couple notes here.', structured_facts: {} },
    conversation_count: 3,
    user1_individual_signal_count: 10,
    user2_individual_signal_count: 8,
    couple_signal_count: 5,
  },
  nora_claims: [],
}

const calledTables = []

// Generic chainable query-builder stub standing in for the real Supabase
// client. Every filter method returns the same chain object, so any call
// order/length the real code uses still works, and the chain itself is
// thenable — `await supabase.from(x)...limit(6)` resolves correctly even
// with no terminal .single()/.maybeSingle(), matching how
// getSurfaceableClaims actually calls it.
function chain(table) {
  calledTables.push(table)
  const result = { data: fixtures[table] ?? null, error: null }
  const c = {
    select: () => c,
    eq: () => c,
    gt: () => c,
    lt: () => c,
    not: () => c,
    in: () => c,
    order: () => c,
    limit: () => c,
    maybeSingle: () => Promise.resolve(result),
    single: () => Promise.resolve(result),
    then: (resolve) => resolve(result),
  }
  return c
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table) => chain(table) }),
}))

const { getFullNoraContext } = await import('../lib/nora-memory.js')

// The privacy boundary between solo (private) and shared (couple-facing)
// context is architectural, not a runtime check: getFullNoraContext simply
// never queries nora_private_notes at all — private notes are only ever
// read by the separate getPrivateNotes(userId), called solely from AI
// Coach's own solo-facing context building. This test exists so that if a
// future change to getFullNoraContext (or anything it calls) ever adds a
// nora_private_notes read, it fails loudly here instead of silently
// shipping a privacy leak into a couple-facing surface like Couples
// Session.
describe('privacy boundary — getFullNoraContext', () => {
  beforeEach(() => { calledTables.length = 0 })

  it('never queries nora_private_notes', async () => {
    await getFullNoraContext('couple-1', 'u1', 'Matt', 'Cass')
    expect(calledTables).not.toContain('nora_private_notes')
  })

  it('only reads from couples, nora_memory, and nora_claims', async () => {
    await getFullNoraContext('couple-1', 'u1', 'Matt', 'Cass')
    const unexpected = calledTables.filter(t => !['couples', 'nora_memory', 'nora_claims'].includes(t))
    expect(unexpected).toEqual([])
  })
})
