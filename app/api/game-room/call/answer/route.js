import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { noraSignal } from '@/lib/nora'

export async function POST(request) {
  try {
    const { callSessionId, roundId, userId, answer, isHotSeat } = await request.json()
    if (!callSessionId || !roundId || !userId || !answer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Save answer to correct field
    const updateField = isHotSeat ? { hot_seat_answer: answer } : { predictor_answer: answer }
    const { data: round } = await supabase
      .from('call_rounds')
      .update(updateField)
      .eq('id', roundId)
      .select('*')
      .maybeSingle()

    // Check if both answered
    const bothAnswered = !!(round?.hot_seat_answer && round?.predictor_answer)

    if (!bothAnswered) {
      return NextResponse.json({ round, bothAnswered: false })
    }

    // Determine if correct
    const correct = round.hot_seat_answer === round.predictor_answer

    // Get names for Nora
    const { data: callSession } = await supabase
      .from('call_sessions')
      .select('couple_id')
      .eq('id', callSessionId)
      .maybeSingle()

    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', callSession.couple_id)
      .maybeSingle()

    const partnerId = couple.user1_id === round.hot_seat_user_id ? couple.user2_id : couple.user1_id

    const [{ data: hotSeatProfile }, { data: predictorProfile }] = await Promise.all([
      supabase.from('user_profiles').select('display_name').eq('user_id', round.hot_seat_user_id).maybeSingle(),
      supabase.from('user_profiles').select('display_name').eq('user_id', partnerId).maybeSingle(),
    ])

    const hotSeatName = hotSeatProfile?.display_name || 'them'
    const predictorName = predictorProfile?.display_name || 'their partner'

    // Generate Nora comment
    const optionMap = { option_a: round.option_a, option_b: round.option_b, option_c: round.option_c }
    const hotSeatAnswerText = optionMap[round.hot_seat_answer] || round.hot_seat_answer
    const predictorAnswerText = optionMap[round.predictor_answer] || round.predictor_answer
    const noraPrompt = `You are Nora — sharp, dry, warm game show host. A couple just revealed their answers in a game called The Call.

Scenario: "${round.scenario}"
${hotSeatName} (hot seat) answered: "${hotSeatAnswerText}"
${predictorName} (predictor) guessed: "${predictorAnswerText}"
${correct ? `${predictorName} got it right.` : `${predictorName} got it wrong.`}

Fire ONE sharp observation about the gap or the match. Max 15 words. Be specific to what they actually answered. Dry, warm, occasionally snarky. No affirmations. No therapy-speak.`

    const response = await noraSignal(noraPrompt, { route: 'game-room/call/answer', maxTokens: 60 })

    const noraComment = response

    // Save correct + nora_comment, update status
    const { data: updatedRound } = await supabase
      .from('call_rounds')
      .update({ correct, nora_comment: noraComment, status: 'answered' })
      .eq('id', roundId)
      .select('*')
      .maybeSingle()

    return NextResponse.json({ round: updatedRound, bothAnswered: true, correct, noraComment })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
