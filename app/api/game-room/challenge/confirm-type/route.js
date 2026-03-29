import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { sessionId, coupleId, challengeType, totalRounds } = await request.json()

    if (!sessionId || !coupleId || !challengeType || !totalRounds) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Expire any existing challenge sessions for this game session
    await supabase
      .from('challenge_sessions')
      .update({ status: 'expired' })
      .eq('session_id', sessionId)
      .neq('status', 'expired')

    // Create fresh challenge session with confirmed type
    const { data: challengeSession, error } = await supabase
      .from('challenge_sessions')
      .insert({
        session_id: sessionId,
        couple_id: coupleId,
        challenge_type: challengeType,
        total_rounds: totalRounds,
        current_round: 1,
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create challenge session' }, { status: 500 })
    }

    return NextResponse.json({ challengeSession })
  } catch (err) {
    console.error('[challenge/confirm-type] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
