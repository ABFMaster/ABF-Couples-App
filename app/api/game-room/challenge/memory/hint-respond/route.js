import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { sessionId, roundNumber, action } = await request.json()

    if (!sessionId || !roundNumber || !action) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (action !== 'grant' && action !== 'deny') {
      return Response.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Fetch current round state
    const { data: round, error: fetchError } = await supabase
      .from('challenge_rounds')
      .select('hint_requests, hint_denials, hints_granted, hint_pending')
      .eq('session_id', sessionId)
      .eq('round_number', roundNumber)
      .single()

    if (fetchError || !round) {
      return Response.json({ error: 'Round not found' }, { status: 404 })
    }

    if (!round.hint_pending) {
      return Response.json({ error: 'No hint request pending' }, { status: 400 })
    }

    // hints_granted is an array of hint numbers that have been unlocked e.g. [1, 2]
    const currentGranted = round.hints_granted || []
    const nextHintNumber = currentGranted.length + 1

    let updatePayload = { hint_pending: false }

    if (action === 'grant') {
      updatePayload.hints_granted = [...currentGranted, nextHintNumber]
    } else {
      updatePayload.hint_denials = (round.hint_denials || 0) + 1
    }

    const { error } = await supabase
      .from('challenge_rounds')
      .update(updatePayload)
      .eq('session_id', sessionId)
      .eq('round_number', roundNumber)

    if (error) {
      return Response.json({ error: 'Failed to respond to hint' }, { status: 500 })
    }

    return Response.json({ ok: true, action })
  } catch (err) {
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
