import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { updateNoraMemory, SIGNAL_TYPES } from '@/lib/nora-memory'

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { itemId, completionNote, photoUrl } = await request.json()
    if (!itemId) return Response.json({ error: 'itemId required' }, { status: 400 })

    // Fetch the shared item
    const { data: item, error: fetchError } = await supabase
      .from('shared_items')
      .select('*')
      .eq('id', itemId)
      .single()
    if (fetchError || !item) return Response.json({ error: 'Item not found' }, { status: 404 })

    // Idempotency guard — if already promoted, return existing Been record
    if (item.been_promoted_at) {
      return Response.json({ success: true, alreadyPromoted: true })
    }

    // Get couple
    const { data: couple } = await supabase
      .from('couples')
      .select('id, user1_id, user2_id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .single()
    if (!couple) return Response.json({ error: 'Couple not found' }, { status: 404 })

    const now = new Date().toISOString()
    const today = now.split('T')[0]

    // Mark shared_item as completed
    const { error: updateError } = await supabase
      .from('shared_items')
      .update({
        completed: true,
        completed_at: now,
        been_promoted_at: now,
        completion_note: completionNote || null,
        completion_photo_url: photoUrl || null,
      })
      .eq('id', itemId)
    if (updateError) return Response.json({ error: 'Failed to update item' }, { status: 500 })

    // Determine image for timeline
    const imageUrl = photoUrl || item.poster_url || item.artwork_url || null

    // Build photo_urls array for timeline
    const photoUrls = photoUrl ? [photoUrl] : []

    // Write to timeline_events — Option A: single source of truth for Been
    const { error: timelineError } = await supabase
      .from('timeline_events')
      .insert({
        couple_id: couple.id,
        event_type: 'shared_item',
        title: item.title,
        description: completionNote || null,
        event_date: today,
        photo_urls: photoUrls,
        created_by: user.id,
        source_id: item.id,
        image_url: imageUrl,
        artist: item.artist || null,
        item_subtype: item.type || null,
      })
    if (timelineError) return Response.json({ error: 'Failed to write timeline' }, { status: 500 })

    // Fire Nora memory update — fire and forget
    updateNoraMemory({
      coupleId: couple.id,
      userId: user.id,
      signalType: SIGNAL_TYPES.SHARED_ITEM_COMPLETED,
      inputData: {
        title: item.title,
        type: item.type,
        completionNote: completionNote || null,
        completedBy: user.id,
      }
    }).catch(() => {})

    return Response.json({ success: true })
  } catch (err) {
    console.error('ahead/complete error:', err)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
