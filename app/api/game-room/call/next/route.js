export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { callSessionId } = await request.json()
    if (!callSessionId) {
      return NextResponse.json({ error: 'callSessionId required' }, { status: 400 })
    }

    const { data: callSession } = await supabase
      .from('call_sessions')
      .select('*')
      .eq('id', callSessionId)
      .maybeSingle()

    if (!callSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const isMember = await verifyCoupleMembership(supabase, user.id, callSession.couple_id)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
