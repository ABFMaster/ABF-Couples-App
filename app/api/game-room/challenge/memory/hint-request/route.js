import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { sessionId, roundNumber } = await request.json()

    if (!sessionId || !roundNumber) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch current round state
    const { data: round, error: fetchError } = await supabase
      .from('challenge_rounds')
      .select('hint_requests, hint_pending')
      .eq('session_id', sessionId)
      .eq('round_number', roundNumber)
      .single()

    if (fetchError || !round) {
      return Response.json({ error: 'Round not found' }, { status: 404 })
    }

    // Enforce 3 request cap
    if (round.hint_requests >= 3) {
      return Response.json({ error: 'Maximum hint requests reached' }, { status: 400 })
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
