import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { sessionId, userId, coupleId, dropText, photoUrl } = await request.json()

    if (!sessionId || !userId || !coupleId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Determine if this user is user1 or user2
    const { data: coupleData } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .single()

    if (!coupleData) {
      return Response.json({ error: 'Couple not found' }, { status: 404 })
    }

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
