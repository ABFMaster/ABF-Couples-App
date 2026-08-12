export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { noraGenerate } from '@/lib/nora'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { sessionId, callSessionId, roundNumber, hotSeatUserId } = await request.json()
    if (!sessionId || !callSessionId || !roundNumber || !hotSeatUserId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Derive couple_id from the call_sessions row itself rather than
    // trusting a client-supplied coupleId — same pattern already used
    // correctly in call/answer. The old check only confirmed the caller
    // belonged to WHATEVER coupleId they sent, never that callSessionId
    // actually belonged to that couple.
    const { data: callSessionForAuth } = await supabase
      .from('call_sessions')
      .select('couple_id')
      .eq('id', callSessionId)
      .maybeSingle()
    if (!callSessionForAuth) return NextResponse.json({ error: 'Call session not found' }, { status: 404 })
    const coupleId = callSessionForAuth.couple_id

    const isMember = await verifyCoupleMembership(supabase, user.id, coupleId)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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

    // hotSeatUserId is client-supplied — must be one of THIS couple's two
    // members, or a caller could name an arbitrary third-party user_id and
    // leak that stranger's display_name/game_interests into the Nora
    // prompt below.
    if (hotSeatUserId !== couple.user1_id && hotSeatUserId !== couple.user2_id) {
      return NextResponse.json({ error: 'Invalid hot seat user' }, { status: 400 })
    }

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

    // ROOT CAUSE FIX Aug 12 2026 — Matt: "I get the same 3-5 Ikea or Wine
    // questions" every time he plays. Two real causes, both fixed here:
    // (1) the old tier-1 instruction literally said "IKEA, restaurants" as
    // examples — the model was echoing those exact nouns back as actual
    // content instead of treating them as loose texture, a common failure
    // mode when a prompt hands the model ready-made nouns instead of a
    // category. Reworded to describe the KIND of scenario without naming
    // specific ones. (2) there was no repeat-avoidance at all across
    // sessions — Memory Test tracks used questions per-couple over 90 days,
    // this had nothing, so the same handful of scenarios the model
    // gravitates toward by default could recur indefinitely. Added a query
    // for this couple's recent scenarios and an explicit avoid-these
    // instruction, same pattern as Memory Test's usedQuestions.
    const tierInstructions = {
      1: 'Absurd and light. Mundane, everyday situations with funny reveal potential — vary the specific domain round to round (errands, small purchases, minor social friction, tiny decisions, etc.) rather than defaulting to the same kind of setting every time.',
      2: 'Revealing but fun. Everyday situations that show personality and social dynamics — timing, apologies, boundaries, small disagreements.',
      3: 'Instinct under real pressure. Bigger life moments that reveal values and priorities.',
    }

    const { data: recentCallRounds } = await supabase
      .from('call_rounds')
      .select('scenario')
      .eq('couple_id', coupleId)
      .not('scenario', 'is', null)
      .order('created_at', { ascending: false })
      .limit(15)
    const recentScenarios = (recentCallRounds || []).map(r => r.scenario).filter(Boolean)

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
- The tier description above sets a category, not a script — invent a genuinely new specific situation each time, never reuse or lightly reword a setting you've used before for this couple${recentScenarios.length > 0 ? `\n- This couple has already had these scenarios — do not repeat any of them or anything close to them: ${recentScenarios.map(s => `"${s}"`).join(', ')}` : ''}

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
