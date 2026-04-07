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

    const { error } = await supabase
      .from('challenge_rounds')
      .update({ answer_revealed: true })
      .eq('session_id', sessionId)
      .eq('round_number', roundNumber)

    if (error) {
      return Response.json({ error: 'Failed to reveal answer' }, { status: 500 })
    }

    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
