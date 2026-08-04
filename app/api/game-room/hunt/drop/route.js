export const dynamic = 'force-dynamic'

import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return Response.json(authError.body, { status: authError.status })

    const { sessionId, dropText, photoUrl } = await request.json()

    if (!sessionId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Derive couple_id from the hunt session itself rather than trusting a
    // client-supplied coupleId — the old check only confirmed the caller
    // belonged to WHATEVER coupleId they sent, never that sessionId
    // actually belonged to that couple. A member of couple A could supply
    // couple B's sessionId (with their own real coupleId, which still
    // passed membership) and drop content straight into couple B's hunt.
    // Same pattern already used correctly in hunt/confirm and hunt/return.
    const { data: huntForAuth } = await supabase
      .from('hunt_sessions')
      .select('couple_id')
      .eq('session_id', sessionId)
      .maybeSingle()
    if (!huntForAuth) return Response.json({ error: 'Hunt session not found' }, { status: 404 })

    const { data: coupleData } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', huntForAuth.couple_id)
      .single()

    if (!coupleData) {
      return Response.json({ error: 'Couple not found' }, { status: 404 })
    }

    const isMember = coupleData.user1_id === user.id || coupleData.user2_id === user.id
    if (!isMember) return Response.json({ error: 'Forbidden' }, { status: 403 })

    const userId = user.id
    const isUser1 = coupleData.user1_id === userId
    const dropField = isUser1 ? 'user1_drop' : 'user2_drop'
    const photoField = isUser1 ? 'user1_photo_url' : 'user2_photo_url'

    const updatePayload = {}
    if (dropText) updatePayload[dropField] = dropText
    if (photoUrl) updatePayload[photoField] = photoUrl

    if (Object.keys(updatePayload).length === 0) {
      return Response.json({ error: 'Nothing to drop' }, { status: 400 })
    }

    const { error } = await supabase
      .from('hunt_sessions')
      .update(updatePayload)
      .eq('session_id', sessionId)

    if (error) {
      return Response.json({ error: 'Failed to save drop' }, { status: 500 })
    }

    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
