// ─────────────────────────────────────────────────────────────────────────────
// SHARED ASSESSMENT -> NORA MEMORY PIPELINE
// Extracted Aug 5 2026 from app/api/assessment/seed-memory/route.js so the
// exact same logic can be called from two places:
//   1. The live path (seed-memory/route.js) -- fires the moment a user
//      completes their assessment.
//   2. The deferred path (couples/join/route.js) -- fires at pairing time
//      for anyone who completed their assessment during solo onboarding,
//      before a couple_id existed to attach it to. See the long comment in
//      couples/join/route.js for why that path is needed: updateNoraMemory
//      requires a resolvable couple_id (nora_memory is one row per couple),
//      so a null coupleId at submission time meant the whole signal was
//      silently dropped -- not misrouted, never logged at all.
// Single source of truth, zero drift between the two call sites.
// ─────────────────────────────────────────────────────────────────────────────
import { updateNoraMemory, SIGNAL_TYPES } from './nora-memory'
import {
  ASSESSMENT_MODULES,
  ASSESSMENT_QUESTIONS,
  generateModuleInsights,
  scoreAttachmentStyle,
  scoreConflictStyle,
} from './relationship-questions'

const MAIN_MODULES = ASSESSMENT_MODULES.filter(m => !m.standalone)

const filterAnswers = (answers, keys) =>
  Object.fromEntries(Object.entries(answers || {}).filter(([k]) => keys.includes(k)))

// Recomputes the same results.modules shape app/assessment/page.js builds
// client-side right when the assessment completes -- from answers alone.
// Used so any server-side caller never has to trust a client-supplied
// results blob (the live route already gets one from the request body) or
// guess at a possibly-stale DB column name for a stored results value (the
// deferred backfill path only has the DB row's `answers` to work from).
export function computeAssessmentResults(answers) {
  const modules = MAIN_MODULES.map(module => {
    const moduleAnswers = {}
    ASSESSMENT_QUESTIONS[module.id].forEach(q => {
      if (answers?.[q.id] !== undefined) moduleAnswers[q.id] = answers[q.id]
    })
    return generateModuleInsights(module.id, moduleAnswers)
  })
  const overallPercentage = Math.round(
    modules.reduce((sum, r) => sum + (r?.percentage || 0), 0) / modules.length
  )
  return { modules, overallPercentage, completedAt: new Date().toISOString() }
}

// The actual pipeline: log the signal + synthesize Nora notes (via
// updateNoraMemory, which no-ops safely if coupleId doesn't resolve to a
// real couple) and write the scored profile fields, regardless of whether
// the Nora memory part succeeded -- these two effects are independent and
// always both worth doing.
export async function seedAssessmentMemory({ supabase, userId, coupleId, answers, results }) {
  const moduleResults = results?.modules || []
  const summaryParts = moduleResults.map(m => {
    if (m.moduleId === 'attachment_profile') return `Attachment: ${m.headline} — ${m.description}`
    if (m.moduleId === 'conflict_profile') return `Conflict style: ${m.headline} — ${m.description}`
    if (m.moduleId === 'love_expression') return `Love expression: ${m.headline} — ${m.description}`
    return `${m.title}: ${m.headline}`
  }).filter(Boolean)

  const inputData = {
    type: 'assessment_complete',
    summary: summaryParts.join('\n'),
    answers,
  }

  await updateNoraMemory({
    userId,
    coupleId,
    signalType: SIGNAL_TYPES.ASSESSMENT_COMPLETE,
    inputData,
  })

  const attachmentResult = scoreAttachmentStyle(answers)
  const conflictResult = scoreConflictStyle(answers)
  const loveResult = generateModuleInsights('love_expression', filterAnswers(answers, ['le_1', 'le_2', 'le_3']))

  await supabase.from('user_profiles').upsert({
    user_id: userId,
    attachment_style: attachmentResult.primary,
    attachment_anxiety_score: attachmentResult.anxietyScore,
    attachment_avoidance_score: attachmentResult.avoidanceScore,
    conflict_style: conflictResult.primary,
    love_language_primary: loveResult.primary,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  await supabase.from('hero_cache').delete().eq('user_id', userId)
}
