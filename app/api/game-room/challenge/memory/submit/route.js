export const dynamic = 'force-dynamic'

import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return Response.json(authError.body, { status: authError.status })

    const { sessionId, roundNumber, answer } = await request.json()

    if (!sessionId || !roundNumber || !answer) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: roundForAuth } = await supabase
      .from('challenge_rounds')
      .select('couple_id')
      .eq('session_id', sessionId)
      .eq('round_number', roundNumber)
      .maybeSingle()
    if (!roundForAuth) return Response.json({ error: 'Round not found' }, { status: 404 })

    const isMember = await verifyCoupleMembership(supabase, user.id, roundForAuth.couple_id)
    if (!isMember) return Response.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabase
      .from('challenge_rounds')
      .update({ guesser_answer: answer })
      .eq('session_id', sessionId)
      .eq('round_number', roundNumber)

    if (error) {
      return Response.json({ error: 'Failed to submit answer' }, { status: 500 })
    }

    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
