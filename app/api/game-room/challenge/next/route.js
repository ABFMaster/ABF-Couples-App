import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { userId, coupleId, challengeSessionId } = await request.json()

    if (!userId || !coupleId || !challengeSessionId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: session, error: fetchError } = await supabase
      .from('challenge_sessions')
      .select('*')
      .eq('id', challengeSessionId)
      .eq('couple_id', coupleId)
      .single()

    if (fetchError || !session) {
      return Response.json({ error: 'Session not found' }, { status: 404 })
    }

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
