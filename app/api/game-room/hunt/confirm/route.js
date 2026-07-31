export const dynamic = 'force-dynamic'

import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return Response.json(authError.body, { status: authError.status })

    const { sessionId } = await request.json()

    if (!sessionId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: huntForAuth } = await supabase
      .from('hunt_sessions')
      .select('couple_id')
      .eq('session_id', sessionId)
      .maybeSingle()
    if (!huntForAuth) return Response.json({ error: 'Hunt session not found' }, { status: 404 })

    const isMember = await verifyCoupleMembership(supabase, user.id, huntForAuth.couple_id)
    if (!isMember) return Response.json({ error: 'Forbidden' }, { status: 403 })

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
