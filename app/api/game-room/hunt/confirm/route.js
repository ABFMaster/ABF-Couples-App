import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { error } = await supabase
      .from('hunt_sessions')
      .update({
        confirmed_at: new Date().toISOString(),
        status: 'active',
      })
      .eq('session_id', sessionId)

    if (error) {
      return Response.json({ error: 'Failed to confirm hunt' }, { status: 500 })
    }

    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
