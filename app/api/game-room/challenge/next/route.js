export const dynamic = 'force-dynamic'

import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return Response.json(authError.body, { status: authError.status })

    const { challengeSessionId } = await request.json()

    if (!challengeSessionId) {
      return Response.json({ error: 'challengeSessionId required' }, { status: 400 })
    }

    const { data: session, error: fetchError } = await supabase
      .from('challenge_sessions')
      .select('*')
      .eq('id', challengeSessionId)
      .single()

    if (fetchError || !session) {
      return Response.json({ error: 'Session not found' }, { status: 404 })
    }

    const isMember = await verifyCoupleMembership(supabase, user.id, session.couple_id)
    if (!isMember) return Response.json({ error: 'Forbidden' }, { status: 403 })

    if (session.status === 'complete') {
      return Response.json({ session, complete: true })
    }

    const nextRound = session.current_round + 1
    const complete = nextRound > session.total_rounds

    const { data: updatedSession, error: updateError } = await supabase
      .from('challenge_sessions')
      .update({
        current_round: complete ? session.current_round : nextRound,
        status: complete ? 'complete' : 'active',
      })
      .eq('id', challengeSessionId)
      .select()
      .single()

    if (updateError) {
      return Response.json({ error: 'Failed to advance session' }, { status: 500 })
    }

    return Response.json({
      session: updatedSession,
      complete,
      nextRound: complete ? null : nextRound,
    })
  } catch (err) {
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
