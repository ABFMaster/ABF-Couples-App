import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { callSessionId, coupleId } = await request.json()
    if (!callSessionId || !coupleId) {
      return NextResponse.json({ error: 'callSessionId and coupleId required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: callSession } = await supabase
      .from('call_sessions')
      .select('*')
      .eq('id', callSessionId)
      .maybeSingle()

    if (!callSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const nextRound = callSession.current_round + 1
    const complete = nextRound > callSession.total_rounds

    const { data: updated } = await supabase
      .from('call_sessions')
      .update({
        current_round: complete ? callSession.current_round : nextRound,
        status: complete ? 'complete' : 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', callSessionId)
      .select('*')
      .maybeSingle()

    // If complete — update parent game_session status
    if (complete) {
      await supabase
        .from('game_sessions')
        .update({ status: 'completed' })
        .eq('id', callSession.session_id)
    }

    return NextResponse.json({ callSession: updated, complete, nextRound: complete ? null : nextRound })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
