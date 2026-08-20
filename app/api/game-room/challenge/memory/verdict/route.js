export const dynamic = 'force-dynamic'

import { noraVerdict } from '@/lib/nora'
import { updateNoraMemory, SIGNAL_TYPES, getNoraMemory, getMemoryBriefing, getSurfaceableClaims } from '@/lib/nora-memory'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'
import { generateFollowUpPrompt } from '@/lib/nora-followup'

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return Response.json(authError.body, { status: authError.status })

    const { sessionId, roundNumber } = await request.json()

    if (!sessionId || !roundNumber) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch round data — couple_id comes from here, never trusted from the client
    const { data: round, error: roundError } = await supabase
      .from('challenge_rounds')
      .select('memory_question, memory_answer, guesser_answer, hints_granted, hint_requests, hint_denials, guesser_user_id, round_number, couple_id')
      .eq('session_id', sessionId)
      .eq('round_number', roundNumber)
      .single()

    if (roundError || !round) {
      return Response.json({ error: 'Round not found' }, { status: 404 })
    }

    const isMember = await verifyCoupleMembership(supabase, user.id, round.couple_id)
    if (!isMember) return Response.json({ error: 'Forbidden' }, { status: 403 })

    const coupleId = round.couple_id

    // Idempotency — return existing verdict if already generated
    const { data: existingRound } = await supabase
      .from('challenge_rounds')
      .select('nora_verdict, nora_follow_up')
      .eq('session_id', sessionId)
      .eq('round_number', roundNumber)
      .single()

    if (existingRound?.nora_verdict) {
      return Response.json({ ok: true, verdict: existingRound.nora_verdict, followUp: existingRound.nora_follow_up })
    }

    // Fetch partner names
    const { data: coupleData } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .single()

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, display_name')
      .in('user_id', [coupleData.user1_id, coupleData.user2_id])

    const guesserProfile = profiles?.find(p => p.user_id === round.guesser_user_id)
    const answerHolderProfile = profiles?.find(p => p.user_id !== round.guesser_user_id)
    const guesserName = guesserProfile?.display_name || 'Partner 1'
    const answerHolderName = answerHolderProfile?.display_name || 'Partner 2'

    // Check if answer-holder flagged a delta this round (answer has changed since original)
    // ROOT CAUSE FIX Aug 12 2026 — this block used to run BEFORE the
    // guesserName/answerHolderName consts above (which is why they used to
    // sit after it), but deltaContext's template literal references
    // answerHolderName. Referencing a `const` before its own declaration
    // line executes is a TDZ ReferenceError in JS, not just "undefined" —
    // whenever an answer-holder used the "It's changed" path (delta_flagged
    // true), this route threw before ever calling noraVerdict, and returned
    // a 500. The client's verdict trigger in challenge/play/page.js fires
    // this via a bare `fetch(...).catch()` — fetch only rejects on network
    // failure, never on a non-2xx status, so the 500 was silently
    // swallowed, memoryVerdictCalledRef stayed true (no retry), and the
    // round was left with no nora_verdict forever. From Matt's side this
    // looked exactly like "Memory Test just hangs/fails" with no visible
    // error, precisely matching the recurring report. Fixed by moving the
    // name consts above this block so they're initialized before use.
    const { data: deltaRecord } = await supabase
      .from('love_map_updates')
      .select('original_answer, current_answer, source, delta_flagged')
      .eq('couple_id', coupleId)
      .eq('user_id', round.guesser_user_id === coupleData.user1_id ? coupleData.user2_id : coupleData.user1_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const hasDelta = deltaRecord?.delta_flagged === true
    const deltaContext = hasDelta
      ? `IMPORTANT: ${answerHolderName} indicated their answer has changed since they last addressed this. They used to say: "${deltaRecord.original_answer}" — tonight they said: "${deltaRecord.current_answer}". This shift is significant and worth noting in your verdict.`
      : ''

    const noraMemory = await getNoraMemory(coupleId)
    const noraBriefing = noraMemory ? getMemoryBriefing(noraMemory, guesserName, answerHolderName) : null
    const claimsResult = (coupleData?.user1_id && coupleData?.user2_id)
      ? await getSurfaceableClaims(coupleId, coupleData.user1_id, coupleData.user2_id, guesserName, answerHolderName, noraMemory?.user1_individual_signal_count || 0, noraMemory?.user2_individual_signal_count || 0)
      : { promptBlock: '' }
    const claimsBlock = claimsResult.promptBlock || null

    const hintsGranted = (round.hints_granted || []).length
    const hintsDenied = round.hint_denials || 0
    const hintsRequested = round.hint_requests || 0

    // Determine if correct — fuzzy match, Nora decides
    const guesserAnswer = round.guesser_answer || '(no answer submitted)'
    const correctAnswer = round.memory_answer || '(unknown)'

    // Build hint drama string
    let hintNarrative = ''
    if (hintsRequested === 0) {
      hintNarrative = `${guesserName} asked for no hints and went in blind.`
    } else if (hintsDenied === hintsRequested) {
      hintNarrative = `${guesserName} asked for ${hintsRequested} hint${hintsRequested > 1 ? 's' : ''} and ${answerHolderName} denied every single one.`
    } else if (hintsDenied > 0) {
      hintNarrative = `${guesserName} asked for ${hintsRequested} hint${hintsRequested > 1 ? 's' : ''} — ${answerHolderName} granted ${hintsGranted} and denied ${hintsDenied}.`
    } else {
      hintNarrative = `${guesserName} used ${hintsGranted} hint${hintsGranted > 1 ? 's' : ''}.`
    }

    const systemPrompt = `You are the game master for a Love Map memory game. Your verdict is a reflection, not a scorecard. You stay in game master voice throughout — warm, specific, a little mischievous. The insight lands naturally as part of the story you're telling. You never label what you're doing. You never say "this reveals" or "research shows" or pivot into therapist mode. You end with one directed question to one specific person — not "discuss this together," but a targeted poke that almost always becomes a real conversation. Use their actual names when you see something specific to them. Find what they didn't say. Don't explain it.

Respond ONLY with valid JSON, no markdown fences:
{
  "result": "hit" | "close" | "miss",
  "verdict": "your 3-4 sentence verdict text"
}
"result" is your own judgment call on the actual guess-vs-answer match — "hit" for a real match (small wording differences are fine), "close" for a genuine near-miss that shows they were paying attention, "miss" for a real gap. This never gets shown to the couple as a raw label — it's used to build the session recap after all rounds are done, so judge it honestly rather than softening it for the verdict text.`

    const userPrompt = `Round ${roundNumber} of the Love Map memory game just finished.

THE QUESTION: "${round.memory_question}"
${answerHolderName.toUpperCase()}'S ACTUAL ANSWER: "${correctAnswer}"
${guesserName.toUpperCase()}'S GUESS: "${guesserAnswer}"
HINT STORY: ${hintNarrative}
${deltaContext ? `\n${deltaContext}` : ''}

YOUR JOB:
Write Nora's verdict for this round. 3-4 sentences max.

- Lead with the result — did ${guesserName} get it right, close, or miss entirely? Be specific about the gap or the match.
- Note the hint story if it's interesting — ${answerHolderName} denying every hint is a story worth telling. So is ${guesserName} going in blind and nailing it.
- Land one observation about what this moment says about these two — not a diagnosis, just a noticing. Make it feel earned, not announced.
- End with one directed question to either ${guesserName} or ${answerHolderName} specifically — a poke that opens territory rather than closes it. Not "discuss this." Something they'll answer out loud without thinking.

${noraBriefing ? `\nWhat Nora knows about this couple:\n${noraBriefing}\n` : ''}${claimsBlock ? `\n\n${claimsBlock}` : ''}
PHILOSOPHY: A miss is not a failure — it's a map gap worth knowing about. A hit is worth celebrating. Either way, ${guesserName} knows something now they may not have known before. That's the point.`

    const response = await noraVerdict(userPrompt, {
      route: 'game-room/challenge/memory/verdict',
      system: systemPrompt,
      maxTokens: 400,
    })

    // ROOT CAUSE FIX Aug 12 2026 — Game Room audit: this route's own code
    // comment used to say "Determine if correct — fuzzy match, Nora
    // decides" directly above a block that never actually asked Nora for a
    // structured judgment or stored one anywhere — only prose. That's why
    // Memory Test has no score: there was nothing to score with. Now asks
    // for JSON (result + verdict) and falls back to treating the whole
    // response as verdict text with a null result if parsing fails, so a
    // malformed response degrades to today's behavior instead of a 500.
    const cleaned = response.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    let verdict, result
    try {
      const parsed = JSON.parse(cleaned)
      verdict = parsed.verdict
      result = ['hit', 'close', 'miss'].includes(parsed.result) ? parsed.result : null
    } catch {
      verdict = response
      result = null
    }

    // Talk-to-Nora CTA (task #261) — separate standalone call, kept out of
    // the JSON verdict schema above on purpose. See lib/nora-followup.js.
    const followUpText = await generateFollowUpPrompt({
      activityLabel: 'the Memory Test',
      question: round.memory_question,
      answer: guesserAnswer,
      reactionText: verdict,
      route: 'game-room/memory-followup',
    })

    // Write verdict + result to DB. `result` needs the migration in
    // docs/database/memory_test_session_verdict.sql — until Matt runs it,
    // the update below fails (unknown column) and falls back to the
    // pre-existing single-field update, so the round verdict still saves
    // and the game isn't blocked on migration timing either way.
    const { error: updateError } = await supabase
      .from('challenge_rounds')
      .update({ nora_verdict: verdict, result, nora_follow_up: followUpText })
      .eq('session_id', sessionId)
      .eq('round_number', roundNumber)

    if (updateError) {
      const { error: fallbackError } = await supabase
        .from('challenge_rounds')
        .update({ nora_verdict: verdict, nora_follow_up: followUpText })
        .eq('session_id', sessionId)
        .eq('round_number', roundNumber)
      if (fallbackError) {
        return Response.json({ error: 'Failed to save verdict' }, { status: 500 })
      }
    }

    updateNoraMemory({ coupleId, userId: round.guesser_user_id, signalType: SIGNAL_TYPES.GAME_ROOM_DEBRIEF, inputData: { gameType: 'love_map_memory', question: round.memory_question, correctAnswer, guesserAnswer, verdict, result } }).catch(() => {})
    return Response.json({ ok: true, verdict, result, followUp: followUpText })
  } catch (err) {
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
