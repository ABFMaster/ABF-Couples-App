// ── FOLLOW-THROUGH GENERATION ────────────────────────────────────────────────
// See Sessions/FOLLOW_THROUGH_GENERATION_SPEC.md. Shared across every daily
// activity that wires Follow-Through in (Bet, Spark, ...). Originally lived
// inline in app/api/bet/respond/route.js; extracted here so Spark's respond
// route (and future activities) call the exact same generation logic instead
// of a copy-pasted duplicate — one place to fix the prompt, the wildcard
// rules, or the distress gate.
//
// Called once per activity instance, right after both partners' answers (and
// that activity's own Nora reaction) are in. Non-blocking — any failure here
// must never affect the calling activity's own reveal. Callers should wrap
// this in their own try/catch (every step below is also defensive on top of
// that).
//
// Params:
//   sourceType    — 'bet' | 'spark' | 'wednesday' | 'thursday' | ... (stored
//                   on the row, read back by /api/follow-through/today's
//                   hasSeenSourceReveal gate)
//   sourceId      — the bet/spark/notice/entry id
//   sourceLabel   — display name used in generated prompts, e.g. "Bet", "Spark"
//   sourceQuestion — the question text asked that day, when both partners were
//                   asked the SAME question (Bet, Spark, Notice)
//   myQuestion / theirQuestion — use instead of sourceQuestion when each
//                   partner was asked a DIFFERENT, individualized question
//                   (Thursday). Falls back to sourceQuestion when omitted, so
//                   existing single-shared-question callers are unaffected.
//   myAnswer / theirAnswer — this activity's actual-answer text for each side.
//                   Either may be omitted (falsy) when only one partner
//                   responded — generation then runs single-sided: an action
//                   is only generated for whoever actually answered, never
//                   fabricated for the side that didn't. Added for Thursday,
//                   Aug 14 2026 — Matt: "why would I not want a Follow-
//                   Through even if my partner didn't answer." Existing
//                   callers (Bet/Spark/Wednesday) are unaffected — they only
//                   ever call this once both sides already have answers, so
//                   this path never triggers for them.
import { getNoraMemory } from '@/lib/nora-memory'
import { noraGenerate, noraSignal } from '@/lib/nora'
import { getHourInTimezone, hoursUntilNextLocalMorning } from '@/lib/dates'

export async function generateFollowThrough({
  supabase, coupleId, sourceType, sourceId, sourceLabel, sourceQuestion,
  myQuestion, theirQuestion,
  couple, userId, myName, partnerName, myAnswer, theirAnswer,
}) {
  const myQ = myQuestion || sourceQuestion
  const theirQ = theirQuestion || sourceQuestion
  const memory = await getNoraMemory(coupleId)

  // Distress gate — layer 1: coarse, couple-level, already-computed signal.
  // Layer 2: cheap per-night check on tonight's actual content. Either one
  // tripping skips generation entirely — err toward silence, never toward
  // forcing an action into a bad night.
  const trajectory = memory?.couple_notes?.structured_facts?.trajectory
  let distressGateTripped = trajectory === 'away'

  if (!distressGateTripped) {
    try {
      const distressQuestionLine = myQ === theirQ
        ? `Tonight's ${sourceLabel} question: "${sourceQuestion}"`
        : `Tonight's ${sourceLabel} asked each of them something different.\n${myName} was asked: "${myQ}"\n${partnerName} was asked: "${theirQ}"`
      const distressCheck = await noraSignal(
        `${distressQuestionLine}\n${myName}: "${myAnswer || '(no response)'}"\n${partnerName}: "${theirAnswer || '(no response)'}"\n\nDoes either answer suggest active distress, conflict, or a rough patch tonight, as opposed to normal playful or reflective engagement? Answer exactly YES or NO.`,
        { route: 'follow-through/distress-check', maxTokens: 10 }
      )
      distressGateTripped = distressCheck.trim().toUpperCase().startsWith('YES')
    } catch {
      distressGateTripped = true // check itself failed — err toward not generating
    }
  }

  if (distressGateTripped) return

  const now = new Date()

  // Replacement, not collision — supersede anything still open for this couple
  await supabase
    .from('follow_throughs')
    .update({ superseded_at: now.toISOString() })
    .eq('couple_id', coupleId)
    .is('superseded_at', null)

  // Recent actions, so Nora doesn't repeat herself
  const { data: recentRows } = await supabase
    .from('follow_throughs')
    .select('user1_action_text, user2_action_text')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false })
    .limit(5)
  const recentActionsList = (recentRows || [])
    .flatMap(r => [r.user1_action_text, r.user2_action_text])
    .filter(Boolean)
    .map(t => `- ${t}`)
    .join('\n') || 'None yet.'

  // Timing — single shared-timezone assumption, matches the existing cron pattern
  const timezone = 'America/Los_Angeles'
  const hour = getHourInTimezone(timezone)
  const pastCutoff = hour >= 18
  const expiryHours = hoursUntilNextLocalMorning(timezone) + (pastCutoff ? 24 : 0)
  const expiresAt = new Date(now.getTime() + expiryHours * 3600 * 1000).toISOString()
  const framingNote = pastCutoff
    ? 'It is currently evening. Frame the action as something for tomorrow, not tonight.'
    : 'Frame the action as something for today or tonight.'

  // Wildcard eligibility — both partners at Tier 2+ signal depth, no wildcard
  // for this couple in the last 14 days, distress gate already clean above.
  const bothTier2Plus = (memory?.user1_individual_signal_count || 0) > 5
    && (memory?.user2_individual_signal_count || 0) > 5
  const { count: recentWildcardCount } = await supabase
    .from('follow_throughs')
    .select('id', { count: 'exact', head: true })
    .eq('couple_id', coupleId)
    .eq('wildcard', true)
    .gt('created_at', new Date(now.getTime() - 14 * 24 * 3600 * 1000).toISOString())
  const wildcardEligible = bothTier2Plus && !(recentWildcardCount > 0)
  const isWildcard = wildcardEligible && Math.random() < 0.10
  const wildcardFlavor = isWildcard ? (Math.random() < 0.5 ? 'bigger_scope' : 'partner_authored') : null
  // Only one side gets the partner-authored treatment on a wildcard night —
  // the other side still gets a normal action the same night.
  const partnerAuthoredTarget = wildcardFlavor === 'partner_authored'
    ? (Math.random() < 0.5 ? 'me' : 'partner')
    : null

  const buildBasePrompt = (forName, otherName, forAnswer, otherAnswer, forQuestion, otherQuestion) => `${
    forQuestion === otherQuestion
      ? `The ${sourceLabel} question tonight was: "${forQuestion}"`
      : `Tonight's ${sourceLabel} asked ${forName} and ${otherName} different, individualized questions.\n${forName} was asked: "${forQuestion}"\n${otherName} was asked: "${otherQuestion}"`
  }

${forName}'s answer: "${forAnswer}"
${otherName}'s answer: ${otherAnswer ? `"${otherAnswer}"` : `(${otherName} didn't respond tonight — don't reference their answer, this is about ${forName}'s own reflection)`}

${memory?.couple_notes?.notes ? `WHAT YOU KNOW ABOUT THIS COUPLE:\n${memory.couple_notes.notes}\n` : ''}
RECENT FOLLOW-THROUGH ACTIONS ALREADY GIVEN (do not repeat these or anything close to them):
${recentActionsList}

You are Nora. Based on tonight's ${sourceLabel}, give ${forName} ONE specific, real-world thing to do — not homework, an invitation. Something they'd want to do because they're curious what happens, not because they should. ${framingNote}

Two kinds of action exist. Pick whichever tonight's content actually earns:
- OTHER-DIRECTED: something ${forName} does TO or FOR ${otherName} — said, given, shown. ${otherName} will experience this directly and immediately in the real world.
- SELF-DIRECTED: something ${forName} does privately that ${otherName} has no way of knowing about unless ${forName} chooses to share it.

Bias toward OTHER-DIRECTED when tonight's content genuinely supports it — but never invent or reassign whose task, item, or responsibility something is just to force that framing. If ${otherName}'s answer describes something ${forName} themselves needs to do (their own document, their own errand, their own decision) — even if ${otherName} is the one who wants it done — that is a SELF-DIRECTED action for ${forName}, not an excuse to fabricate a version where ${otherName} owns it instead. Pronouns inside the quoted answers ("you"/"your") belong to whoever that answer is actually addressed to — read the question to resolve them, and never silently swap which partner a fact belongs to.

CONCRETENESS IS NON-NEGOTIABLE: ${forName} must be able to read this and know exactly what to do with zero interpretation. Anchor it to one specific, real detail actually named in tonight's answers above — a place, thing, plan, memory, or choice — not a category of topic. Never write a generic relationship-coach gesture: banned patterns include "ask about a decision," "start a conversation about X," "check in about how they're feeling," "watch them think/talk it out," "have them open up about," or any version of "notice how they—". Those describe a shape of interaction, not an action. If ${forName} would have to invent the specifics themselves to actually do this, it's too abstract — rewrite it as the one concrete thing to say, do, bring, or ask, using the real detail from tonight.`

  const standardInstruction = (forName) => `\n\nReturn ONLY this JSON, no other text:\n{"action_text": "the invitation itself, max 20 words, one concrete action naming a real detail from tonight — not a topic or gesture, speaks directly to ${forName} as 'you'", "directed": "other" or "self"}`
  const BIGGER_SCOPE_INSTRUCTION = `\n\nThis is a wildcard night — Nora occasionally gives something with more scope than usual. Give a bigger action: more time, more effort, more intention than a typical night. Explicitly state when this runs through (e.g. "sometime this weekend") inside the action_text itself, so the window is never ambiguous.\n\nReturn ONLY this JSON, no other text:\n{"action_text": "...", "directed": "other" or "self"}`
  const CANDIDATES_INSTRUCTION = `\n\nReturn ONLY this JSON, no other text:\n{"candidates": [{"action_text": "...", "directed": "other"}, {"action_text": "...", "directed": "other"}, {"action_text": "...", "directed": "self"}]}`

  async function generateFor(forName, otherName, forAnswer, otherAnswer, forQuestion, otherQuestion, variant) {
    const base = buildBasePrompt(forName, otherName, forAnswer, otherAnswer, forQuestion, otherQuestion)
    const instruction = variant === 'bigger_scope' ? BIGGER_SCOPE_INSTRUCTION
      : variant === 'candidates' ? CANDIDATES_INSTRUCTION
      : standardInstruction(forName)
    try {
      const raw = await noraGenerate(base + instruction, {
        route: 'follow-through/generate',
        system: 'You write real-world relationship invitations, never app-aware or meta. Return only the requested JSON.',
        maxTokens: 220,
      })
      const cleaned = raw.replace(/```json|```/g, '').trim()
      return JSON.parse(cleaned)
    } catch {
      return null
    }
  }

  const myVariant = partnerAuthoredTarget === 'me' ? 'candidates' : (wildcardFlavor === 'bigger_scope' ? 'bigger_scope' : 'standard')
  const partnerVariant = partnerAuthoredTarget === 'partner' ? 'candidates' : (wildcardFlavor === 'bigger_scope' ? 'bigger_scope' : 'standard')

  // Only generate for a side that actually answered — giving someone a
  // Follow-Through action derived from an answer they never gave doesn't
  // make sense. Both existing callers only reach this function once both
  // sides already have answers, so both branches always resolve truthy for
  // them — this only actually skips a side for Thursday's new single-sided
  // path.
  const [myResult, partnerResult] = await Promise.all([
    myAnswer ? generateFor(myName, partnerName, myAnswer, theirAnswer, myQ, theirQ, myVariant) : Promise.resolve(null),
    theirAnswer ? generateFor(partnerName, myName, theirAnswer, myAnswer, theirQ, myQ, partnerVariant) : Promise.resolve(null),
  ])

  const isUser1 = userId === couple?.user1_id
  const row = {
    couple_id: coupleId,
    source_type: sourceType,
    source_id: sourceId,
    expires_at: expiresAt,
    wildcard: isWildcard,
    wildcard_flavor: wildcardFlavor,
  }

  const applyResult = (prefix, result, isCandidates) => {
    if (!result) return
    if (isCandidates && result.candidates) {
      row[`${prefix}_status`] = 'awaiting_partner_pick'
      row.candidate_actions = { for: prefix, options: result.candidates }
    } else if (result.action_text) {
      row[`${prefix}_action_text`] = result.action_text
      row[`${prefix}_directed`] = result.directed === 'self' ? 'self' : 'other'
    }
  }

  applyResult(isUser1 ? 'user1' : 'user2', myResult, myVariant === 'candidates')
  applyResult(isUser1 ? 'user2' : 'user1', partnerResult, partnerVariant === 'candidates')

  if (row.user1_action_text || row.user2_action_text || row.candidate_actions) {
    await supabase.from('follow_throughs').insert(row)
  }
}
