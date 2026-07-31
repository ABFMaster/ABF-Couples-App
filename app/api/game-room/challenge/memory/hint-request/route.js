export const dynamic = 'force-dynamic'

import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return Response.json(authError.body, { status: authError.status })

    const { sessionId, roundNumber } = await request.json()

    if (!sessionId || !roundNumber) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch current round state
    const { data: round, error: fetchError } = await supabase
      .from('challenge_rounds')
      .select('hint_requests, hints_granted, hint_pending, couple_id')
      .eq('session_id', sessionId)
      .eq('round_number', roundNumber)
      .single()

    if (fetchError || !round) {
      return Response.json({ error: 'Round not found' }, { status: 404 })
    }

    const isMember = await verifyCoupleMembership(supabase, user.id, round.couple_id)
    if (!isMember) return Response.json({ error: 'Forbidden' }, { status: 403 })

    // Enforce cap on granted hints — denials do not count against the limit
    const hintsGranted = round.hints_granted || []
    if (hintsGranted.length >= 3) {
      return Response.json({ error: 'Maximum hints already granted' }, { status: 400 })
    }

    // Enforce one pending request at a time
    if (round.hint_pending) {
      return Response.json({ error: 'Hint request already pending' }, { status: 400 })
    }

    const { error } = await supabase
      .from('challenge_rounds')
      .update({
        hint_requests: round.hint_requests + 1,
        hint_pending: true,
      })
      .eq('session_id', sessionId)
      .eq('round_number', roundNumber)

    if (error) {
      return Response.json({ error: 'Failed to request hint' }, { status: 500 })
    }

    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
