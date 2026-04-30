import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { noraGenerate } from '@/lib/nora'

export async function POST(request) {
  try {
    const { sessionId, coupleId, callSessionId, roundNumber, hotSeatUserId } = await request.json()
    if (!sessionId || !coupleId || !callSessionId || !roundNumber || !hotSeatUserId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Idempotency — return existing round if already generated
    const { data: existing } = await supabase
      .from('call_rounds')
      .select('*')
      .eq('session_id', callSessionId)
      .eq('round_number', roundNumber)
      .maybeSingle()

    if (existing) return NextResponse.json({ round: existing })

    // Get couple profiles
    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .maybeSingle()

    const partnerId = couple.user1_id === hotSeatUserId ? couple.user2_id : couple.user1_id

    const [{ data: hotSeatProfile }, { data: predictorProfile }, { data: noraMemory }] = await Promise.all([
      supabase.from('user_profiles').select('display_name, game_interests').eq('user_id', hotSeatUserId).maybeSingle(),
      supabase.from('user_profiles').select('display_name').eq('user_id', partnerId).maybeSingle(),
      supabase.from('nora_memory').select('memory_summary').eq('couple_id', coupleId).maybeSingle(),
    ])

    const hotSeatName = hotSeatProfile?.display_name || 'them'
    const predictorName = predictorProfile?.display_name || 'their partner'
    const interests = hotSeatProfile?.game_interests || {}

    // Tier based on round number
    const tier = roundNumber <= 2 ? 1 : roundNumber <= 4 ? 2 : 3

    const tierInstructions = {
      1: 'Absurd and light. Mundane situations with funny reveal potential. IKEA, restaurants, small social moments.',
      2: 'Revealing but fun. Everyday situations that show personality. Who is late, who apologizes first, social dynamics.',
      3: 'Instinct under real pressure. Bigger life moments that reveal values and priorities.',
    }

    const prompt = `You are Nora, game master for a couples game called The Call. You are generating a scenario for round ${roundNumber} of 5.

The person in the hot seat is ${hotSeatName}.
Their predictor is ${predictorName}.
Nora memory: ${noraMemory?.memory_summary || 'none yet'}
Hot seat interests: ${JSON.stringify(interests)}

Tier ${tier}: ${tierInstructions[tier]}

Generate ONE scenario that puts ${hotSeatName} in a specific situation and gives exactly THREE response options. The options should be distinct, plausible, and revealing. No right or wrong answer. The gap between what ${predictorName} expects and what ${hotSeatName} actually does is the game.

Rules:
- Scenario must be specific and immediately relatable
- Options must be genuinely different approaches, not just variations of the same thing
- Draw from their interests or memory if it makes it more specific and fun
- Never be clinical or therapy-adjacent
- Can be funny, mundane, or pressure-filled depending on tier

Respond ONLY with valid JSON, no markdown:
{
  "scenario": "The specific situation — 1-2 sentences maximum",
  "option_a": "First distinct response",
  "option_b": "Second distinct response",
  "option_c": "Third distinct response"
}`

    const response = await noraGenerate(prompt, { route: 'game-room/call/generate', maxTokens: 300 })

    const raw = response
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    let generated
    try {
      generated = JSON.parse(cleaned)
    } catch (e) {
      console.error('[game-room/call/generate] JSON parse failed:', raw)
      return NextResponse.json({ error: 'Failed to parse Nora response' }, { status: 500 })
    }

    // Save round
    const { data: round } = await supabase
      .from('call_rounds')
      .insert({
        session_id: callSessionId,
        couple_id: coupleId,
        round_number: roundNumber,
        hot_seat_user_id: hotSeatUserId,
        scenario: generated.scenario,
        option_a: generated.option_a,
        option_b: generated.option_b,
        option_c: generated.option_c,
        status: 'pending',
      })
      .select('*')
      .maybeSingle()

    return NextResponse.json({ round })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
