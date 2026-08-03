// ─────────────────────────────────────────────────────────────────────────────
// ONE-SHOT CLEAN REBUILD — Nora memory (user1_notes/user2_notes/couple_notes/
// memory_summary/structured_facts) for a couple, rebuilt from their real
// nora_signals history with nora_conversation signals excluded.
//
// WHY THIS EXISTS (see Sessions/PRODUCT_BACKLOG.md "AI-coach privacy leak"):
// Before commit ae19dcd (July 31 2026), private AI-coach conversations were
// synthesized into user1_notes/user2_notes, and those notes fed the
// couple-facing memory_summary and couple_notes.structured_facts. That's
// fixed going forward (nora_conversation now writes to nora_private_notes
// instead). But any couple whose nora_memory row was built before that fix
// may still have AI-coach content blended into their existing notes. This
// script reconstructs those layers from scratch using only the signal
// types that were always meant to be couple-visible — same effect as if
// the privacy fix had been in place from day one.
//
// DESIGN — not a literal chronological replay:
// A true event-by-event replay (calling buildPersonNotesPrompt/
// buildCoupleNotesPrompt once per historical signal) would mean hundreds of
// sequential LLM calls for 6+ months of history — slow and expensive for no
// real benefit. Instead, signals are grouped into chronological batches
// (default 20) and synthesized incrementally, batch by batch, using the
// EXACT SAME prompt builders and signal-routing tables production uses
// (imported from lib/nora-memory.js, not reimplemented — zero drift risk).
// This mirrors how updateNoraMemory already works (existing notes + new
// signal -> updated notes), just processing many historical signals per
// call instead of one live signal per call.
//
// SAFETY — three separate steps, live DB is never touched by two of them:
//   1. --counts   Free. No LLM calls, no DB writes. Prints signal inventory.
//   2. --preview  Runs the full synthesis, writes the result to a local
//                 JSON + Markdown file under scripts/output/. Still makes
//                 ZERO writes to nora_memory. Review this file (and share
//                 it) before doing anything else.
//   3. --apply=<path-to-preview-json>   Only after review. Backs up the
//                 CURRENT nora_memory row to scripts/output/ first, then
//                 upserts EXACTLY what's in the given preview file (not a
//                 re-generation — what you reviewed is what gets written).
//                 Only memory_summary/user1_notes/user2_notes/couple_notes/
//                 last_updated are touched. Signal counts and
//                 conversation_count are left untouched.
//
// USAGE (run locally — this needs real network access to Supabase +
// Anthropic, which this sandbox does not have):
//   node --env-file=.env.local scripts/rebuild-nora-memory.mjs --counts
//   node --env-file=.env.local scripts/rebuild-nora-memory.mjs --preview
//   node --env-file=.env.local scripts/rebuild-nora-memory.mjs --apply=scripts/output/<file>.json
//
// SCOPE NOTE: assessment_complete signals are intentionally excluded here,
// matching a real gap found while building this script — ASSESSMENT_COMPLETE
// is written to nora_signals and has a full prompt lens in
// buildPersonNotesPrompt, but it's absent from INDIVIDUAL_NOTE_SIGNALS, so
// it does NOT currently update user1_notes/user2_notes in production either.
// This script reconstructs what production actually does today (minus the
// AI-coach leak), not a redesign — that gap is logged separately in
// PRODUCT_BACKLOG.md for a future, deliberate decision.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs'
import {
  SIGNAL_TYPES,
  SHARED_NOTE_SIGNALS,
  INDIVIDUAL_NOTE_SIGNALS,
  SHARED_SIGNALS,
  buildPersonNotesPrompt,
  buildCoupleNotesPrompt,
  buildMemorySummaryPrompt,
  extractStructuredFacts,
} from '../lib/nora-memory.js'
import { noraReact } from '../lib/nora.js'

const args = process.argv.slice(2)
const mode = args.find(a => a === '--counts') ? 'counts'
  : args.find(a => a === '--preview') ? 'preview'
  : args.find(a => a.startsWith('--apply=')) ? 'apply'
  : null
const applyFromPath = args.find(a => a.startsWith('--apply='))?.split('=')[1]
const batchSizeArg = args.find(a => a.startsWith('--batch-size='))?.split('=')[1]
const BATCH_SIZE = batchSizeArg ? parseInt(batchSizeArg, 10) : 20

if (!mode) {
  console.log(`
Usage:
  node --env-file=.env.local scripts/rebuild-nora-memory.mjs --counts
  node --env-file=.env.local scripts/rebuild-nora-memory.mjs --preview [--batch-size=20]
  node --env-file=.env.local scripts/rebuild-nora-memory.mjs --apply=scripts/output/<preview-file>.json

See the file header comment for what each mode does.
`)
  process.exit(0)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const OUTPUT_DIR = new URL('./output/', import.meta.url)
mkdirSync(OUTPUT_DIR, { recursive: true })

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// Strip anything that looks like an image/media reference before it ever
// reaches a prompt — same sanitization buildPersonNotesPrompt already
// applies to live inputData, applied here too since we're feeding it
// batches of raw historical input_data blobs.
function sanitize(data) {
  if (!data || typeof data !== 'object') return data
  const stripped = { ...data }
  for (const k of ['image_url', 'photo_url', 'photo_urls', 'album_art', 'poster_url', 'artwork_url']) {
    delete stripped[k]
  }
  if (stripped.metadata && typeof stripped.metadata === 'object') {
    stripped.metadata = { ...stripped.metadata }
    for (const k of ['image_url', 'photo_url', 'image', 'album_art', 'artwork_url']) {
      delete stripped.metadata[k]
    }
  }
  return stripped
}

async function getTheCouple() {
  const { data: couples, error } = await supabase
    .from('couples')
    .select('id, user1_id, user2_id, created_at')
  if (error) throw new Error(`Failed to fetch couples: ${error.message}`)
  if (!couples || couples.length === 0) throw new Error('No couples found.')
  if (couples.length > 1) {
    throw new Error(
      `Expected exactly one couple (this script assumes the "only users are Cass and I" setup) but found ${couples.length}. ` +
      `Refusing to guess — pass a specific couple explicitly by editing this script before running against a multi-couple database.`
    )
  }
  return couples[0]
}

async function getNames(couple) {
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, display_name')
    .in('user_id', [couple.user1_id, couple.user2_id])
  const user1Name = profiles?.find(p => p.user_id === couple.user1_id)?.display_name || 'Partner 1'
  const user2Name = profiles?.find(p => p.user_id === couple.user2_id)?.display_name || 'Partner 2'
  return { user1Name, user2Name }
}

async function getSignals(coupleId) {
  const { data, error } = await supabase
    .from('nora_signals')
    .select('id, user_id, signal_type, input_data, created_at')
    .eq('couple_id', coupleId)
    .neq('signal_type', SIGNAL_TYPES.NORA_CONVERSATION)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`Failed to fetch nora_signals: ${error.message}`)
  return data || []
}

function buildStreams(signals, couple) {
  const user1Stream = []
  const user2Stream = []
  const coupleStream = []

  for (const s of signals) {
    const isSharedNote = SHARED_NOTE_SIGNALS.includes(s.signal_type)
    const isIndividualNote = INDIVIDUAL_NOTE_SIGNALS.includes(s.signal_type)
    const actingIsUser1 = s.user_id === couple.user1_id
    const actingIsUser2 = s.user_id === couple.user2_id

    if (isSharedNote || (isIndividualNote && actingIsUser1)) user1Stream.push(s)
    if (isSharedNote || (isIndividualNote && actingIsUser2)) user2Stream.push(s)
    if (SHARED_SIGNALS.includes(s.signal_type)) coupleStream.push(s)
  }

  return { user1Stream, user2Stream, coupleStream }
}

function describeBatch(batch) {
  return {
    rebuild_note: 'This is a batch of historical signals being synthesized in one pass as part of a one-shot memory rebuild — not a single live event.',
    signals: batch.map(s => ({
      type: s.signal_type,
      date: s.created_at,
      data: sanitize(s.input_data),
    })),
  }
}

async function synthesizePerson(personName, stream, label) {
  const batches = chunk(stream, BATCH_SIZE)
  let notes = null
  for (let i = 0; i < batches.length; i++) {
    process.stdout.write(`  ${label}: batch ${i + 1}/${batches.length} (${batches[i].length} signals)...`)
    notes = await noraReact(
      buildPersonNotesPrompt(personName, 'historical_rebuild', describeBatch(batches[i]), notes),
      { route: 'rebuild-script/person-notes', context: 'conversation', maxTokens: 400 }
    )
    console.log(' done')
  }
  return notes
}

async function synthesizeCouple(user1Name, user2Name, stream) {
  const batches = chunk(stream, BATCH_SIZE)
  let notes = null
  for (let i = 0; i < batches.length; i++) {
    process.stdout.write(`  couple: batch ${i + 1}/${batches.length} (${batches[i].length} signals)...`)
    notes = await noraReact(
      buildCoupleNotesPrompt(user1Name, user2Name, 'historical_rebuild', describeBatch(batches[i]), notes, null),
      { route: 'rebuild-script/couple-notes', context: 'conversation', maxTokens: 400 }
    )
    console.log(' done')
  }
  return notes
}

function printCounts(signals, streams, couple) {
  const byType = {}
  for (const s of signals) byType[s.signal_type] = (byType[s.signal_type] || 0) + 1

  console.log(`\nCouple: ${couple.id}`)
  console.log(`Signals excluding nora_conversation: ${signals.length}`)
  console.log('\nBy type:')
  for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`)
  }
  console.log(`\nRouted streams:`)
  console.log(`  user1 notes stream: ${streams.user1Stream.length} signals -> ${Math.ceil(streams.user1Stream.length / BATCH_SIZE)} batches`)
  console.log(`  user2 notes stream: ${streams.user2Stream.length} signals -> ${Math.ceil(streams.user2Stream.length / BATCH_SIZE)} batches`)
  console.log(`  couple notes stream: ${streams.coupleStream.length} signals -> ${Math.ceil(streams.coupleStream.length / BATCH_SIZE)} batches`)
  const totalCalls = Math.ceil(streams.user1Stream.length / BATCH_SIZE) + Math.ceil(streams.user2Stream.length / BATCH_SIZE) + Math.ceil(streams.coupleStream.length / BATCH_SIZE) + 2
  console.log(`\nEstimated LLM calls for a --preview run: ~${totalCalls} (batched synthesis + 1 summary + 1 structured-facts call)`)
}

async function runCounts() {
  const couple = await getTheCouple()
  const signals = await getSignals(couple.id)
  const streams = buildStreams(signals, couple)
  printCounts(signals, streams, couple)
}

async function runPreview() {
  const couple = await getTheCouple()
  const { user1Name, user2Name } = await getNames(couple)
  const signals = await getSignals(couple.id)
  const streams = buildStreams(signals, couple)
  printCounts(signals, streams, couple)

  console.log(`\nSynthesizing ${user1Name}'s notes...`)
  const newUser1Notes = await synthesizePerson(user1Name, streams.user1Stream, user1Name)

  console.log(`\nSynthesizing ${user2Name}'s notes...`)
  const newUser2Notes = await synthesizePerson(user2Name, streams.user2Stream, user2Name)

  console.log(`\nSynthesizing couple notes...`)
  const newCoupleNotes = await synthesizeCouple(user1Name, user2Name, streams.coupleStream)

  console.log(`\nGenerating memory_summary...`)
  const newSummary = await noraReact(
    buildMemorySummaryPrompt(user1Name, user2Name, newUser1Notes, newUser2Notes, newCoupleNotes),
    { route: 'rebuild-script/summary', context: 'conversation', maxTokens: 300 }
  )

  console.log(`Extracting structured_facts...`)
  const structuredFacts = await extractStructuredFacts(user1Name, user2Name, newUser1Notes, newUser2Notes, newCoupleNotes)

  const result = {
    coupleId: couple.id,
    generatedAt: new Date().toISOString(),
    signalCounts: {
      total: signals.length,
      user1Stream: streams.user1Stream.length,
      user2Stream: streams.user2Stream.length,
      coupleStream: streams.coupleStream.length,
    },
    user1Name,
    user2Name,
    memory_summary: newSummary,
    user1_notes: newUser1Notes,
    user2_notes: newUser2Notes,
    couple_notes: newCoupleNotes,
    structured_facts: structuredFacts,
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const jsonPath = new URL(`nora-memory-rebuild-preview-${ts}.json`, OUTPUT_DIR)
  const mdPath = new URL(`nora-memory-rebuild-preview-${ts}.md`, OUTPUT_DIR)

  writeFileSync(jsonPath, JSON.stringify(result, null, 2))
  writeFileSync(mdPath, `# Nora memory rebuild preview — ${ts}

Couple: ${couple.id}
Generated: ${result.generatedAt}
Signals used: ${result.signalCounts.total} (nora_conversation excluded)

**This is a PREVIEW ONLY. Nothing has been written to nora_memory.**

## ${user1Name}'s notes

${newUser1Notes}

## ${user2Name}'s notes

${newUser2Notes}

## Couple notes

${newCoupleNotes}

## Memory summary (what Nora reads as her 90-second pre-session brief)

${newSummary}

## Structured facts

\`\`\`json
${JSON.stringify(structuredFacts, null, 2)}
\`\`\`
`)

  console.log(`\nPreview written:\n  ${jsonPath.pathname}\n  ${mdPath.pathname}`)
  console.log(`\nNo database writes were made. Review the .md file above, then run --apply=<the .json path> once you're ready.`)
}

async function runApply() {
  if (!applyFromPath || !existsSync(applyFromPath)) {
    throw new Error(`--apply requires a valid path to a preview JSON file produced by --preview. Got: ${applyFromPath}`)
  }
  const preview = JSON.parse(readFileSync(applyFromPath, 'utf8'))
  if (!preview.coupleId) throw new Error('Preview file is missing coupleId — refusing to apply.')

  const couple = await getTheCouple()
  if (couple.id !== preview.coupleId) {
    throw new Error(`Preview file's couple (${preview.coupleId}) does not match the couple found in the database (${couple.id}). Refusing to apply.`)
  }

  const { data: current, error: fetchErr } = await supabase
    .from('nora_memory')
    .select('*')
    .eq('couple_id', couple.id)
    .maybeSingle()
  if (fetchErr) throw new Error(`Failed to fetch current nora_memory row: ${fetchErr.message}`)

  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = new URL(`nora-memory-backup-before-apply-${ts}.json`, OUTPUT_DIR)
  writeFileSync(backupPath, JSON.stringify(current || { note: 'no existing row' }, null, 2))
  console.log(`Backed up current nora_memory row to:\n  ${backupPath.pathname}`)

  const { error: upsertErr } = await supabase
    .from('nora_memory')
    .upsert({
      couple_id: couple.id,
      memory_summary: preview.memory_summary,
      user1_notes: { notes: preview.user1_notes, updated_at: new Date().toISOString() },
      user2_notes: { notes: preview.user2_notes, updated_at: new Date().toISOString() },
      couple_notes: {
        notes: preview.couple_notes,
        structured_facts: preview.structured_facts,
        updated_at: new Date().toISOString(),
      },
      last_updated: new Date().toISOString(),
      // Deliberately NOT touching user1_individual_signal_count /
      // user2_individual_signal_count / couple_signal_count /
      // conversation_count — those are engagement-tier counters, not
      // subject to the privacy leak, and resetting them would lose real
      // progress toward Nora's trust tiers for no reason.
    }, { onConflict: 'couple_id' })

  if (upsertErr) throw new Error(`Upsert failed: ${upsertErr.message}. Your previous data is safe in the backup file above.`)

  console.log(`\nApplied. nora_memory for couple ${couple.id} now reflects the reviewed preview.`)
  console.log(`If anything looks wrong, the pre-apply state is saved at:\n  ${backupPath.pathname}`)
}

try {
  if (mode === 'counts') await runCounts()
  if (mode === 'preview') await runPreview()
  if (mode === 'apply') await runApply()
} catch (err) {
  console.error('\nError:', err.message)
  process.exit(1)
}
