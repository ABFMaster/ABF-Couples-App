// ─────────────────────────────────────────────────────────────────────────────
// ONE-SHOT BACKFILL — assessment_complete signals into user1_notes/user2_notes
//
// WHY THIS EXISTS (see commit "Fix: ASSESSMENT_COMPLETE never reached
// user1_notes/user2_notes", Aug 5 2026): ASSESSMENT_COMPLETE always had full
// signal weights and a full buildPersonNotesPrompt lens, and seed-memory/
// route.js always logged it to nora_signals correctly — but it was missing
// from INDIVIDUAL_NOTE_SIGNALS, the routing array that decides whether
// updateNoraMemory actually synthesizes notes. That's fixed now, so any
// NEW assessment completion updates notes correctly. This script is
// specifically for the couples who completed their assessment BEFORE that
// fix — their assessment_complete signal is sitting in nora_signals but
// was never synthesized into their notes. This backfills exactly that gap,
// nothing else.
//
// SCOPE — deliberately narrow, not a full memory rebuild:
// This does NOT touch dates, sparks, bets, follow-throughs, or any other
// signal history (see scripts/rebuild-nora-memory.mjs for that, a separate,
// much bigger tool for a different problem — the AI-coach privacy leak).
// This script only:
//   1. Finds each user's assessment_complete signal(s) in nora_signals
//   2. Synthesizes new notes for that user starting from their CURRENT
//      existing notes (not a rebuild-from-scratch — an incremental update,
//      same as if the fix had been live the day they submitted)
//   3. Regenerates memory_summary (it reads from all three notes layers,
//      so it needs to reflect the newly-synthesized assessment content)
//   4. Leaves couple_notes, structured_facts, all signal counts, and
//      conversation_count completely untouched — assessment_complete was
//      never routed to couple_notes by design (see ABF-SIGNAL-REGISTRY.md:
//      "Acting user only"), and counts were already incremented correctly
//      at original submission time (that logic was never broken — only
//      the notes-synthesis routing was).
//
// SAFETY — same three-step pattern as rebuild-nora-memory.mjs:
//   1. --counts   Free. No LLM calls, no DB writes. Shows which users have
//                 unsynthesized assessment signals.
//   2. --preview  Runs synthesis, writes result to a local file under
//                 scripts/output/. Zero writes to nora_memory.
//   3. --apply=<path-to-preview-json>   Only after review. Backs up the
//                 current nora_memory row first, then writes exactly what
//                 you reviewed.
//
// USAGE (run locally — needs real network access to Supabase + Anthropic,
// which this sandbox does not have):
//   node --env-file=.env.local scripts/backfill-assessment-notes.mjs --list-couples
//   node --env-file=.env.local scripts/backfill-assessment-notes.mjs --counts
//   node --env-file=.env.local scripts/backfill-assessment-notes.mjs --preview
//   node --env-file=.env.local scripts/backfill-assessment-notes.mjs --apply=scripts/output/<file>.json
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs'
import { SIGNAL_TYPES, buildPersonNotesPrompt, buildMemorySummaryPrompt } from '../lib/nora-memory.js'
import { noraReact } from '../lib/nora.js'

const args = process.argv.slice(2)
const mode = args.find(a => a === '--counts') ? 'counts'
  : args.find(a => a === '--preview') ? 'preview'
  : args.find(a => a.startsWith('--apply=')) ? 'apply'
  : args.find(a => a === '--list-couples') ? 'list-couples'
  : null
const applyFromPath = args.find(a => a.startsWith('--apply='))?.split('=')[1]
const targetCoupleId = args.find(a => a.startsWith('--couple-id='))?.split('=')[1] || null

if (!mode) {
  console.log(`
Usage:
  node --env-file=.env.local scripts/backfill-assessment-notes.mjs --list-couples
  node --env-file=.env.local scripts/backfill-assessment-notes.mjs --counts [--couple-id=<id>]
  node --env-file=.env.local scripts/backfill-assessment-notes.mjs --preview [--couple-id=<id>]
  node --env-file=.env.local scripts/backfill-assessment-notes.mjs --apply=scripts/output/<preview-file>.json

--couple-id is only needed if more than one couple exists in the database
(the script will tell you to use it if so). Run --list-couples first to
see the options.

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

// Same sanitization buildPersonNotesPrompt already applies to live
// inputData — applied here too since we're re-feeding historical rows.
function sanitize(data) {
  if (!data || typeof data !== 'object') return data
  const stripped = { ...data }
  for (const k of ['image_url', 'photo_url', 'photo_urls', 'album_art', 'poster_url', 'artwork_url']) {
    delete stripped[k]
  }
  return stripped
}

async function getTheCouple() {
  const { data: couples, error } = await supabase
    .from('couples')
    .select('id, user1_id, user2_id, created_at')
  if (error) throw new Error(`Failed to fetch couples: ${error.message}`)
  if (!couples || couples.length === 0) throw new Error('No couples found.')

  if (targetCoupleId) {
    const match = couples.find(c => c.id === targetCoupleId)
    if (!match) throw new Error(`No couple found with id ${targetCoupleId}. Run --list-couples to see valid ids.`)
    return match
  }

  if (couples.length > 1) {
    throw new Error(
      `Found ${couples.length} couples, not 1 — refusing to guess which one to target. ` +
      `Run --list-couples to see them, then re-run with --couple-id=<id>.`
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

async function runListCouples() {
  const { data: couples, error } = await supabase
    .from('couples')
    .select('id, user1_id, user2_id, created_at')
    .order('created_at', { ascending: true })
  if (error) throw new Error(`Failed to fetch couples: ${error.message}`)
  if (!couples || couples.length === 0) {
    console.log('No couples found.')
    return
  }
  for (const couple of couples) {
    const { user1Name, user2Name } = await getNames(couple)
    const { count: assessmentCount } = await supabase
      .from('nora_signals')
      .select('*', { count: 'exact', head: true })
      .eq('couple_id', couple.id)
      .eq('signal_type', SIGNAL_TYPES.ASSESSMENT_COMPLETE)
    console.log(`\ncouple_id: ${couple.id}`)
    console.log(`  created_at: ${couple.created_at}`)
    console.log(`  user1: ${user1Name} (${couple.user1_id})`)
    console.log(`  user2: ${user2Name} (${couple.user2_id})`)
    console.log(`  assessment_complete signals: ${assessmentCount ?? 'unknown'}`)
  }
  console.log(`\nRe-run any mode with --couple-id=<the right id above> to target one specifically.`)
}

async function getAssessmentSignals(coupleId) {
  const { data, error } = await supabase
    .from('nora_signals')
    .select('id, user_id, signal_type, input_data, created_at')
    .eq('couple_id', coupleId)
    .eq('signal_type', SIGNAL_TYPES.ASSESSMENT_COMPLETE)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`Failed to fetch nora_signals: ${error.message}`)
  return data || []
}

async function getCurrentMemory(coupleId) {
  const { data, error } = await supabase
    .from('nora_memory')
    .select('*')
    .eq('couple_id', coupleId)
    .maybeSingle()
  if (error) throw new Error(`Failed to fetch nora_memory: ${error.message}`)
  return data
}

async function synthesizePerson(personName, existingNotes, signalsForPerson) {
  let notes = existingNotes
  for (let i = 0; i < signalsForPerson.length; i++) {
    const s = signalsForPerson[i]
    process.stdout.write(`  ${personName}: assessment signal ${i + 1}/${signalsForPerson.length} (${s.created_at})...`)
    notes = await noraReact(
      buildPersonNotesPrompt(personName, SIGNAL_TYPES.ASSESSMENT_COMPLETE, sanitize(s.input_data), notes),
      { route: 'backfill-assessment/person-notes', context: 'conversation', maxTokens: 400 }
    )
    console.log(' done')
  }
  return notes
}

async function runCounts() {
  const couple = await getTheCouple()
  const { user1Name, user2Name } = await getNames(couple)
  const signals = await getAssessmentSignals(couple.id)
  const user1Signals = signals.filter(s => s.user_id === couple.user1_id)
  const user2Signals = signals.filter(s => s.user_id === couple.user2_id)
  const otherSignals = signals.filter(s => s.user_id !== couple.user1_id && s.user_id !== couple.user2_id)

  console.log(`\nCouple: ${couple.id}`)
  console.log(`Total assessment_complete signals found: ${signals.length}`)
  console.log(`  ${user1Name}: ${user1Signals.length}`)
  console.log(`  ${user2Name}: ${user2Signals.length}`)
  if (otherSignals.length) console.log(`  unattributed (no matching user_id): ${otherSignals.length} — will be skipped`)

  if (signals.length === 0) {
    console.log(`\nNothing to backfill — no assessment_complete signals found for this couple.`)
  } else {
    console.log(`\nThis will run ${user1Signals.length + user2Signals.length} LLM calls to synthesize notes, plus 1 to regenerate memory_summary.`)
  }
}

async function runPreview() {
  const couple = await getTheCouple()
  const { user1Name, user2Name } = await getNames(couple)
  const signals = await getAssessmentSignals(couple.id)

  if (signals.length === 0) {
    console.log('No assessment_complete signals found for this couple. Nothing to do.')
    return
  }

  const current = await getCurrentMemory(couple.id)
  const existingUser1Notes = current?.user1_notes?.notes || null
  const existingUser2Notes = current?.user2_notes?.notes || null
  const existingCoupleNotes = current?.couple_notes?.notes || null // unchanged, passed through to summary regen only

  const user1Signals = signals.filter(s => s.user_id === couple.user1_id)
  const user2Signals = signals.filter(s => s.user_id === couple.user2_id)

  console.log(`Found ${user1Signals.length} assessment signal(s) for ${user1Name}, ${user2Signals.length} for ${user2Name}.`)

  console.log(`\nSynthesizing ${user1Name}'s notes...`)
  const newUser1Notes = user1Signals.length
    ? await synthesizePerson(user1Name, existingUser1Notes, user1Signals)
    : existingUser1Notes

  console.log(`\nSynthesizing ${user2Name}'s notes...`)
  const newUser2Notes = user2Signals.length
    ? await synthesizePerson(user2Name, existingUser2Notes, user2Signals)
    : existingUser2Notes

  console.log(`\nRegenerating memory_summary (couple_notes unchanged, but summary blends all three layers)...`)
  const newSummary = await noraReact(
    buildMemorySummaryPrompt(user1Name, user2Name, newUser1Notes, newUser2Notes, existingCoupleNotes),
    { route: 'backfill-assessment/summary', context: 'conversation', maxTokens: 300 }
  )

  const result = {
    coupleId: couple.id,
    generatedAt: new Date().toISOString(),
    user1Name,
    user2Name,
    signalsUsed: { user1: user1Signals.length, user2: user2Signals.length },
    memory_summary: newSummary,
    user1_notes: newUser1Notes,
    user2_notes: newUser2Notes,
    // couple_notes intentionally not included — this script never writes it.
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const jsonPath = new URL(`assessment-backfill-preview-${ts}.json`, OUTPUT_DIR)
  const mdPath = new URL(`assessment-backfill-preview-${ts}.md`, OUTPUT_DIR)

  writeFileSync(jsonPath, JSON.stringify(result, null, 2))
  writeFileSync(mdPath, `# Assessment notes backfill preview — ${ts}

Couple: ${couple.id}
Generated: ${result.generatedAt}
Assessment signals used: ${user1Name}: ${user1Signals.length}, ${user2Name}: ${user2Signals.length}

**This is a PREVIEW ONLY. Nothing has been written to nora_memory.**
**couple_notes is untouched by this script — not shown here because it doesn't change.**

## ${user1Name}'s notes (after assessment backfill)

${newUser1Notes}

## ${user2Name}'s notes (after assessment backfill)

${newUser2Notes}

## Memory summary (regenerated to reflect the above)

${newSummary}
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

  const current = await getCurrentMemory(couple.id)

  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = new URL(`assessment-backfill-backup-before-apply-${ts}.json`, OUTPUT_DIR)
  writeFileSync(backupPath, JSON.stringify(current || { note: 'no existing row' }, null, 2))
  console.log(`Backed up current nora_memory row to:\n  ${backupPath.pathname}`)

  const { error: upsertErr } = await supabase
    .from('nora_memory')
    .upsert({
      couple_id: couple.id,
      memory_summary: preview.memory_summary,
      user1_notes: { notes: preview.user1_notes, updated_at: new Date().toISOString() },
      user2_notes: { notes: preview.user2_notes, updated_at: new Date().toISOString() },
      // couple_notes deliberately omitted from this upsert object entirely —
      // Supabase upsert only touches the columns you pass, so the existing
      // couple_notes value is left exactly as it was.
      last_updated: new Date().toISOString(),
      // Signal counts and conversation_count also deliberately untouched —
      // those were already correctly incremented at original submission
      // time (that logic was never broken, only notes-synthesis routing).
    }, { onConflict: 'couple_id' })

  if (upsertErr) throw new Error(`Upsert failed: ${upsertErr.message}. Your previous data is safe in the backup file above.`)

  console.log(`\nApplied. user1_notes/user2_notes/memory_summary for couple ${couple.id} now reflect the assessment backfill.`)
  console.log(`If anything looks wrong, the pre-apply state is saved at:\n  ${backupPath.pathname}`)
}

try {
  if (mode === 'list-couples') await runListCouples()
  if (mode === 'counts') await runCounts()
  if (mode === 'preview') await runPreview()
  if (mode === 'apply') await runApply()
} catch (err) {
  console.error('\nError:', err.message)
  process.exit(1)
}
