import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { noraVerdict } from '@/lib/nora'

export async function POST(request) {
  try {
    const { callSessionId, coupleId, score, totalRounds, predictorUserId } = await request.json()
    if (!callSessionId || !coupleId || score === undefined || !predictorUserId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Idempotency — return existing verdict if already generated
    const { data: existingSession } = await supabase
      .from('call_sessions')
      .select('nora_verdict')
      .eq('id', callSessionId)
      .maybeSingle()
    if (existingSession?.nora_verdict) {
      return NextResponse.json({ verdict: existingSession.nora_verdict, score, totalRounds })
    }

    // Get all rounds for context
    const { data: rounds } = await supabase
      .from('call_rounds')
      .select('*')
      .eq('session_id', callSessionId)
      .order('round_number', { ascending: true })

    // Get couple names
    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .maybeSingle()

    const partnerId = couple.user1_id === predictorUserId ? couple.user2_id : couple.user1_id

    const [{ data: predictorProfile }, { data: hotSeatProfile }] = await Promise.all([
      supabase.from('user_profiles').select('display_name').eq('user_id', predictorUserId).maybeSingle(),
      supabase.from('user_profiles').select('display_name').eq('user_id', partnerId).maybeSingle(),
    ])

    const predictorName = predictorProfile?.display_name || 'You'
    const hotSeatName = hotSeatProfile?.display_name || 'your partner'

    // Build rounds summary for Nora
    const roundsSummary = rounds?.map(r =>
      `Round ${r.round_number}: "${r.scenario}" — ${hotSeatName} chose "${r.hot_seat_answer}", ${predictorName} guessed "${r.predictor_answer}" — ${r.correct ? 'correct ✓' : 'wrong ✗'}${r.hot_seat_explanation ? ` — ${hotSeatName} said: "${r.hot_seat_explanation}"` : ''}`
    ).join('\n')

    const prompt = `You are Nora — sharp, dry, warm game show host. A couple just finished The Call — 5 rounds of predicting each other's instincts.

${predictorName} was predicting ${hotSeatName}'s answers.
Final score: ${score}/${totalRounds}

All rounds:
${roundsSummary}

Write a final verdict — 2-3 sentences. Reference what actually happened across the rounds. Be specific to their actual answers and explanations — not generic. Sharp, warm, occasionally snarky. End on something that makes them look at each other.

Score context:
5/5 — they know each other cold
4/5 — almost, one miss is interesting
3/5 — know each other well enough to be dangerous
2/5 — more surprising than they thought
1/5 — a mystery to each other
0/5 — ${predictorName}, introduce yourself`

    const response = await noraVerdict(prompt, { route: 'game-room/call/verdict', maxTokens: 400, system: 'You watched someone try to predict their partner across 5 rounds. The score is a starting point — the specific misses tell you everything. Find the most revealing gap — not what they got wrong, but what the wrong answers reveal about each person individually. Use \'one of you / the other\' when observing individual patterns — never name who is who. Let them claim the observation. Never recap the rounds. Two sentences maximum. Land it and stop.' })

    const verdict = response
    await supabase
      .from('call_sessions')
      .update({ nora_verdict: verdict })
      .eq('id', callSessionId)
    return NextResponse.json({ verdict, score, totalRounds })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
