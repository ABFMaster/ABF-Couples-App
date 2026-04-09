import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { NORA_VOICE } from '@/lib/nora-knowledge'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      system: NORA_VOICE,
      messages: [{ role: 'user', content: prompt }],
    })

    const verdict = response.content[0].text.trim()

    return NextResponse.json({ verdict, score, totalRounds })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
