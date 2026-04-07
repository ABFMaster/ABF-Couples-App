import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const anthropic = new Anthropic()

export async function POST(request) {
  try {
    const { sessionId, roundNumber, coupleId } = await request.json()

    if (!sessionId || !roundNumber || !coupleId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch round data
    const { data: round, error: roundError } = await supabase
      .from('challenge_rounds')
      .select('memory_question, memory_answer, guesser_answer, hints_granted, hint_requests, hint_denials, guesser_user_id, round_number')
      .eq('session_id', sessionId)
      .eq('round_number', roundNumber)
      .single()

    if (roundError || !round) {
      return Response.json({ error: 'Round not found' }, { status: 404 })
    }

    // Idempotency — return existing verdict if already generated
    const { data: existingRound } = await supabase
      .from('challenge_rounds')
      .select('nora_verdict')
      .eq('session_id', sessionId)
      .eq('round_number', roundNumber)
      .single()

    if (existingRound?.nora_verdict) {
      return Response.json({ ok: true, verdict: existingRound.nora_verdict })
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

    const systemPrompt = `You are Nora — the most fun person at the dinner table who happens to have a PhD in relationship psychology. You are the game master for a Love Map memory game. Your verdict is a reflection, not a scorecard. You stay in game master voice throughout — warm, specific, a little mischievous. The insight lands naturally as part of the story you're telling. You never label what you're doing. You never say "this reveals" or "research shows" or pivot into therapist mode. You end with one directed question to one specific person — not "discuss this together," but a targeted poke that almost always becomes a real conversation.`

    const userPrompt = `Round ${roundNumber} of the Love Map memory game just finished.

THE QUESTION: "${round.memory_question}"
${answerHolderName.toUpperCase()}'S ACTUAL ANSWER: "${correctAnswer}"
${guesserName.toUpperCase()}'S GUESS: "${guesserAnswer}"
HINT STORY: ${hintNarrative}

YOUR JOB:
Write Nora's verdict for this round. 3-4 sentences max.

- Lead with the result — did ${guesserName} get it right, close, or miss entirely? Be specific about the gap or the match.
- Note the hint story if it's interesting — ${answerHolderName} denying every hint is a story worth telling. So is ${guesserName} going in blind and nailing it.
- Land one observation about what this moment says about these two — not a diagnosis, just a noticing. Make it feel earned, not announced.
- End with one directed question to either ${guesserName} or ${answerHolderName} specifically — a poke that opens territory rather than closes it. Not "discuss this." Something they'll answer out loud without thinking.

PHILOSOPHY: A miss is not a failure — it's a map gap worth knowing about. A hit is worth celebrating. Either way, ${guesserName} knows something now they may not have known before. That's the point.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    })

    const verdict = response.content[0].text.trim()

    // Write verdict to DB
    const { error: updateError } = await supabase
      .from('challenge_rounds')
      .update({ nora_verdict: verdict })
      .eq('session_id', sessionId)
      .eq('round_number', roundNumber)

    if (updateError) {
      return Response.json({ error: 'Failed to save verdict' }, { status: 500 })
    }

    return Response.json({ ok: true, verdict })
  } catch (err) {
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
