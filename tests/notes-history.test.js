import { describe, it, expect, vi, beforeEach } from 'vitest'

// Minimal in-memory stand-in for the handful of tables updateNoraMemory()
// touches. Deliberately not a generic test-DB library — just enough state
// (a couple row, a mutable nora_memory row, and arrays capturing what got
// inserted into nora_signals/nora_memory_history/nora_claims) to exercise
// the real write path in lib/nora-memory.js end to end, including the
// history-snapshot insert this test exists to verify.
let noraMemoryRow
let historyInserts
let claimsInserts

function resetState() {
  noraMemoryRow = {
    couple_id: 'couple-1',
    memory_summary: 'Old summary.',
    user1_notes: { notes: 'Old Matt notes.' },
    user2_notes: { notes: 'Old Cass notes.' },
    couple_notes: { notes: 'Old couple notes.', structured_facts: {} },
    conversation_count: 2,
    user1_individual_signal_count: 3,
    user2_individual_signal_count: 3,
    couple_signal_count: 4,
  }
  historyInserts = []
  claimsInserts = []
}

function chain(table) {
  const c = {
    _table: table,
    select: () => c,
    eq: () => c,
    in: () => c,
    order: () => c,
    limit: () => c,
    not: () => c,
    gt: () => c,
    single: () => resolveFor(table),
    maybeSingle: () => resolveFor(table),
    then: (resolve) => resolveFor(table).then(resolve),
    insert: (rows) => {
      const arr = Array.isArray(rows) ? rows : [rows]
      if (table === 'nora_memory_history') historyInserts.push(...arr)
      if (table === 'nora_claims') claimsInserts.push(...arr)
      return Promise.resolve({ data: null, error: null })
    },
    update: (fields) => {
      if (table === 'nora_memory') Object.assign(noraMemoryRow, fields)
      return { eq: () => Promise.resolve({ data: null, error: null }) }
    },
    upsert: (payload) => {
      if (table === 'nora_memory') Object.assign(noraMemoryRow, payload)
      return Promise.resolve({ data: null, error: null })
    },
  }
  return c
}

function resolveFor(table) {
  if (table === 'couples') return Promise.resolve({ data: { user1_id: 'u1', user2_id: 'u2' }, error: null })
  if (table === 'user_profiles') return Promise.resolve({ data: [{ user_id: 'u1', display_name: 'Matt' }, { user_id: 'u2', display_name: 'Cass' }], error: null })
  if (table === 'nora_memory') return Promise.resolve({ data: noraMemoryRow, error: null })
  if (table === 'sparks') return Promise.resolve({ data: [], error: null })
  if (table === 'nora_claims') return Promise.resolve({ data: [], error: null })
  return Promise.resolve({ data: null, error: null })
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table) => chain(table) }),
}))

// noraReact/noraGenerate go through lib/nora.js's real Anthropic client —
// mock the SDK so no network call happens and every call returns
// deterministic, recognisable text instead.
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    constructor() {}
    messages = {
      create: async () => ({
        content: [{ text: 'NEW SYNTHESIZED NOTES' }],
        usage: { input_tokens: 1, output_tokens: 1 },
      }),
    }
  },
}))

const { updateNoraMemory, SIGNAL_TYPES } = await import('../lib/nora-memory.js')

describe('notes-history snapshot', () => {
  beforeEach(() => { resetState() })

  it('captures the previous value of every non-null layer before overwriting it', async () => {
    // DATE_COMPLETED is a SHARED_NOTE_SIGNALS + SHARED_SIGNALS type — touches
    // user1, user2, AND couple notes in one call, exercising all three
    // snapshot branches at once.
    await updateNoraMemory({
      coupleId: 'couple-1',
      userId: 'u1',
      signalType: SIGNAL_TYPES.DATE_COMPLETED,
      inputData: { note: 'They went to dinner.' },
    })

    expect(historyInserts.length).toBeGreaterThan(0)

    const user1Row = historyInserts.find(r => r.layer === 'user1')
    const user2Row = historyInserts.find(r => r.layer === 'user2')
    const coupleRow = historyInserts.find(r => r.layer === 'couple')

    expect(user1Row?.previous_value).toBe('Old Matt notes.')
    expect(user2Row?.previous_value).toBe('Old Cass notes.')
    expect(coupleRow?.previous_value).toBe('Old couple notes.')
    expect(user1Row?.source_signal_type).toBe(SIGNAL_TYPES.DATE_COMPLETED)

    // The overwrite itself still happened — this test guards the snapshot,
    // not a change to what memory actually ends up containing.
    expect(noraMemoryRow.user1_notes.notes).toBe('NEW SYNTHESIZED NOTES')
  })

  it('does not snapshot a layer that was null before the write (first-ever memory for this couple)', async () => {
    noraMemoryRow = {
      couple_id: 'couple-1',
      memory_summary: null,
      user1_notes: null,
      user2_notes: null,
      couple_notes: null,
      conversation_count: 0,
      user1_individual_signal_count: 0,
      user2_individual_signal_count: 0,
      couple_signal_count: 0,
    }

    await updateNoraMemory({
      coupleId: 'couple-1',
      userId: 'u1',
      signalType: SIGNAL_TYPES.DATE_COMPLETED,
      inputData: { note: 'Their first date.' },
    })

    expect(historyInserts.length).toBe(0)
  })
})
