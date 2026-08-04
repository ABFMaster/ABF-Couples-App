export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { noraSignal } from '@/lib/nora'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { callSessionId, roundId, answer } = await request.json()
    if (!callSessionId || !roundId || !answer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: callSessionForAuth } = await supabase
      .from('call_sessions')
      .select('couple_id')
      .eq('id', callSessionId)
      .maybeSingle()
    if (!callSessionForAuth) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const isMember = await verifyCoupleMembership(supabase, user.id, callSessionForAuth.couple_id)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Fetch the round scoped by session_id as well as id — callSessionId was
    // verified above to belong to the caller's couple, but roundId itself
    // was never checked against it: without this extra .eq, a member of
    // couple A could supply couple B's roundId (with their own real
    // callSessionId, which still passed the check above) and overwrite
    // couple B's call_rounds row.
    const { data: existingRound } = await supabase
      .from('call_rounds')
      .select('hot_seat_user_id')
      .eq('id', roundId)
      .eq('session_id', callSessionId)
      .maybeSingle()
    if (!existingRound) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

    // Derive which field to write from the round's real hot_seat_user_id
    // rather than trusting a client-supplied isHotSeat flag — otherwise
    // the predictor could claim isHotSeat:true and overwrite the hot
    // seat's answer instead of their own, corrupting the round.
    const isHotSeat = existingRound.hot_seat_user_id === user.id
    const updateField = isHotSeat ? { hot_seat_answer: answer } : { predictor_answer: answer }
    const { data: round } = await supabase
      .from('call_rounds')
      .update(updateField)
      .eq('id', roundId)
      .eq('session_id', callSessionId)
      .select('*')
      .maybeSingle()

    if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

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
