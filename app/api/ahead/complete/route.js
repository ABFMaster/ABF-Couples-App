export const dynamic = 'force-dynamic'

import { updateNoraMemory, SIGNAL_TYPES } from '@/lib/nora-memory'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return Response.json(authError.body, { status: authError.status })

    const { itemId, completionNote, photoUrl } = await request.json()
    if (!itemId) return Response.json({ error: 'itemId required' }, { status: 400 })

    const userId = user.id

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

    // Couple derived from the item's own couple_id — the source of truth —
    // rather than re-deriving it from the client-supplied userId.
    const isMember = await verifyCoupleMembership(supabase, userId, item.couple_id)
    if (!isMember) return Response.json({ error: 'Forbidden' }, { status: 403 })

    const couple = { id: item.couple_id }

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
        created_by: userId || null,
        source_id: item.id,
        image_url: imageUrl,
        artist: item.artist || null,
        item_subtype: item.type || null,
      })
    if (timelineError) return Response.json({ error: 'Failed to write timeline' }, { status: 500 })

    // Fire Nora memory update — fire and forget
    updateNoraMemory({
      coupleId: couple.id,
      userId: userId || null,
      signalType: SIGNAL_TYPES.SHARED_ITEM_COMPLETED,
      inputData: {
        title: item.title,
        type: item.type,
        completionNote: completionNote || null,
        completedBy: userId,
      }
    }).catch(() => {})

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
