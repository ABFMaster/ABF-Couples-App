// ─────────────────────────────────────────────────────────────────────────────
// ONE-SHOT BACKFILL — assessment data into Nora memory, for couples who
// paired BEFORE the Aug 5 2026 fixes landed.
//
// FULL STORY (see commits "Fix: ASSESSMENT_COMPLETE never reached
// user1_notes/user2_notes" and the assessment-memory pre-pairing fix, both
// Aug 5 2026):
//   Bug 1 — ASSESSMENT_COMPLETE was missing from INDIVIDUAL_NOTE_SIGNALS,
//   so even when a signal WAS logged, it never synthesized into notes.
//   Fixed in lib/nora-memory.js.
//
//   Bug 2 — bigger: updateNoraMemory requires a resolvable couple_id
//   (nora_memory is one row per couple). Anyone who completed their
//   assessment during solo onboarding (app/assessment/page.js's
//   onboarding path saves with couple_id: null BY DESIGN — the assessment
//   row needs to exist before a partner is even invited) had their entire
//   assessment_complete signal silently dropped at submission time: never
//   logged to nora_signals, no counts incremented, nothing. Fixed going
//   forward in app/api/couples/join/route.js, which now backfills this
//   automatically the moment a couple actually pairs.
//
// That join-time fix only fires for couples pairing AFTER Aug 5 2026. Any
// couple who already paired before that (Matt & Cass, currently the only
// two real users) needs a one-time manual catch-up — that's this script.
//
// WHAT IT DOES:
//   For each of the couple's two users, finds their most recent completed
//   relationship_assessments row (regardless of what couple_id is stored
//   on it — could be null from the original bug, or already correct), and
//   runs it through the exact same seedAssessmentMemory() pipeline
//   production now uses at live completion / join time. This means it
//   also correctly logs the signal to nora_signals and increments signal
//   counts for the first time — those were never incremented either,
//   since updateNoraMemory returned before reaching that step.
//
// SAFETY:
//   1. --counts   Free. No LLM calls, no DB writes. Shows what assessment
//                 data exists per user and whether it looks already seeded.
//   2. --preview  Predicts the notes update (same prompt builder production
//                 uses) and writes it to a local file. Zero writes to
//                 nora_memory. Review this before doing anything else.
//   3. --apply=<path-to-preview-json>   Backs up the current nora_memory
//                 row, then calls the REAL seedAssessmentMemory() pipeline
//                 for each user found in the preview. This regenerates
//                 notes fresh at apply time (not a literal replay of the
//                 previewed text) — same as production always does. In the
//                 short window between preview and apply nothing else
//                 should have changed the existing notes, so the applied
//                 text should closely match what you reviewed, but this is
//                 a live pipeline call, not a byte-for-byte replay.
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
import { computeAssessmentResults, seedAssessmentMemory } from '../lib/assessment-memory.js'
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

async function getLatestCompletedAssessment(userId) {
  const { data, error } = await supabase
    .from('relationship_assessments')
    .select('id, user_id, couple_id, answers, completed_at')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`Failed to fetch relationship_assessments for ${userId}: ${error.message}`)
  return data
}

async function getExistingSignalCount(coupleId, userId) {
  const { count, error } = await supabase
    .from('nora_signals')
    .select('*', { count: 'exact', head: true })
    .eq('couple_id', coupleId)
    .eq('user_id', userId)
    .eq('signal_type', SIGNAL_TYPES.ASSESSMENT_COMPLETE)
  if (error) return null
  return count
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
    const a1 = couple.user1_id ? await getLatestCompletedAssessment(couple.user1_id) : null
    const a2 = couple.user2_id ? await getLatestCompletedAssessment(couple.user2_id) : null
    console.log(`\ncouple_id: ${couple.id}`)
    console.log(`  created_at: ${couple.created_at}`)
    console.log(`  user1: ${user1Name} (${couple.user1_id}) — completed assessment: ${a1 ? a1.completed_at : 'none'}`)
    console.log(`  user2: ${user2Name} (${couple.user2_id || 'unpaired'}) — completed assessment: ${a2 ? a2.completed_at : 'none'}`)
  }
  console.log(`\nRe-run any mode with --couple-id=<the right id above> to target one specifically.`)
}

async function runCounts() {
  const couple = await getTheCouple()
  const { user1Name, user2Name } = await getNames(couple)

  console.log(`\nCouple: ${couple.id}`)
  for (const [name, uid] of [[user1Name, couple.user1_id], [user2Name, couple.user2_id]]) {
    if (!uid) { console.log(`  ${name}: no user_id on this couple`); continue }
    const assessment = await getLatestCompletedAssessment(uid)
    if (!assessment) {
      console.log(`  ${name}: no completed assessment found`)
      continue
    }
    const alreadySeeded = await getExistingSignalCount(couple.id, uid)
    console.log(`  ${name}: completed assessment on ${assessment.completed_at} (assessment row couple_id: ${assessment.couple_id || 'null'})`)
    console.log(`    existing assessment_complete nora_signals for this couple: ${alreadySeeded ?? 'unknown'}`)
    if (alreadySeeded > 0) {
      console.log(`    -> already seeded at least once. Re-running --preview/--apply will add another signal + re-synthesize notes, not a no-op.`)
    } else {
      console.log(`    -> NOT yet seeded. This is the gap --preview/--apply will fix.`)
    }
  }
}

async function runPreview() {
  const couple = await getTheCouple()
  const { user1Name, user2Name } = await getNames(couple)
  const current = await getCurrentMemory(couple.id)
  const existingCoupleNotes = current?.couple_notes?.notes || null

  const perUser = {}
  for (const [key, name, uid] of [['user1', user1Name, couple.user1_id], ['user2', user2Name, couple.user2_id]]) {
    if (!uid) { perUser[key] = null; continue }
    const assessment = await getLatestCompletedAssessment(uid)
    if (!assessment?.answers) { console.log(`${name}: no completed assessment found, skipping.`); perUser[key] = null; continue }

    const results = computeAssessmentResults(assessment.answers)
    const summaryParts = results.modules.map(m => {
      if (m.moduleId === 'attachment_profile') return `Attachment: ${m.headline} — ${m.description}`
      if (m.moduleId === 'conflict_profile') return `Conflict style: ${m.headline} — ${m.description}`
      if (m.moduleId === 'love_expression') return `Love expression: ${m.headline} — ${m.description}`
      return `${m.title}: ${m.headline}`
    }).filter(Boolean)
    const inputData = { type: 'assessment_complete', summary: summaryParts.join('\n'), answers: assessment.answers }

    const existingNotes = key === 'user1' ? (current?.user1_notes?.notes || null) : (current?.user2_notes?.notes || null)
    console.log(`\nSynthesizing ${name}'s notes from their assessment (completed ${assessment.completed_at})...`)
    const newNotes = await noraReact(
      buildPersonNotesPrompt(name, SIGNAL_TYPES.ASSESSMENT_COMPLETE, inputData, existingNotes),
      { route: 'backfill-assessment/person-notes', context: 'conversation', maxTokens: 400 }
    )
    perUser[key] = { userId: uid, answers: assessment.answers, results, newNotes }
  }

  if (!perUser.user1 && !perUser.user2) {
    console.log('\nNo completed assessments found for either partner. Nothing to preview.')
    return
  }

  const newUser1Notes = perUser.user1?.newNotes ?? (current?.user1_notes?.notes || null)
  const newUser2Notes = perUser.user2?.newNotes ?? (current?.user2_notes?.notes || null)

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
    // Carried through so --apply can call the REAL seedAssessmentMemory()
    // pipeline for each user, not just write notes text directly.
    perUser,
    memory_summary_preview: newSummary,
    user1_notes_preview: newUser1Notes,
    user2_notes_preview: newUser2Notes,
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const jsonPath = new URL(`assessment-backfill-preview-${ts}.json`, OUTPUT_DIR)
  const mdPath = new URL(`assessment-backfill-preview-${ts}.md`, OUTPUT_DIR)

  writeFileSync(jsonPath, JSON.stringify(result, null, 2))
  writeFileSync(mdPath, `# Assessment memory backfill preview — ${ts}

Couple: ${couple.id}
Generated: ${result.generatedAt}
${perUser.user1 ? `${user1Name}: assessment completed ${perUser.user1.answers ? '(found)' : ''}` : `${user1Name}: no completed assessment found`}
${perUser.user2 ? `${user2Name}: assessment completed ${perUser.user2.answers ? '(found)' : ''}` : `${user2Name}: no completed assessment found`}

**This is a PREVIEW ONLY. Nothing has been written to nora_memory or nora_signals yet.**
**couple_notes is untouched by this script — not shown here because it doesn't change.**
**--apply calls the real production pipeline and will regenerate this text fresh, not paste it verbatim — see file header.**

## ${user1Name}'s notes (predicted, after assessment backfill)

${newUser1Notes}

## ${user2Name}'s notes (predicted, after assessment backfill)

${newUser2Notes}

## Memory summary (predicted)

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

  for (const key of ['user1', 'user2']) {
    const entry = preview.perUser?.[key]
    if (!entry) { console.log(`${key}: nothing to apply (no assessment found in preview).`); continue }
    console.log(`\nApplying real seedAssessmentMemory() pipeline for ${key} (${entry.userId})...`)
    await seedAssessmentMemory({
      supabase,
      userId: entry.userId,
      coupleId: couple.id,
      answers: entry.answers,
      results: entry.results,
    })
    console.log(`  done — nora_signals logged, signal counts incremented, notes synthesized, user_profiles scores written.`)

    // Bookkeeping: if the assessment row still has couple_id null (the
    // original bug's fingerprint), attach it to the real couple now.
    await supabase
      .from('relationship_assessments')
      .update({ couple_id: couple.id })
      .eq('user_id', entry.userId)
      .is('couple_id', null)
      .not('completed_at', 'is', null)
  }

  console.log(`\nApplied. nora_memory for couple ${couple.id} now reflects the assessment backfill.`)
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
