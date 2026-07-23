import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { noraChat } from '@/lib/nora'

export const dynamic = 'force-dynamic'

export async function PATCH(request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId, title, description, eventDate, photoUrls } = await request.json()

    if (!eventId) {
      return NextResponse.json({ error: 'Missing eventId' }, { status: 400 })
    }

    // Verify couple membership
    const { data: existing } = await supabase
      .from('timeline_events')
      .select('id, created_by, couple_id, photo_urls')
      .eq('id', eventId)
      .single()
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }
    // Verify user belongs to this couple
    const { data: coupleData } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', existing.couple_id)
      .single()
    const isCoupleMember = coupleData && (coupleData.user1_id === user.id || coupleData.user2_id === user.id)
    if (!isCoupleMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const isCreator = existing.created_by === user.id
    const updates = {}
    // Only creator can edit title, description, date
    if (isCreator) {
      if (title !== undefined) updates.title = title.trim()
      if (description !== undefined) updates.description = description?.trim() || null
      if (eventDate !== undefined) updates.event_date = eventDate
    }
    // Any couple member can append photos
    if (photoUrls !== undefined) {
      if (isCreator) {
        updates.photo_urls = photoUrls
      } else {
        // Partner appending — merge with existing photos
        const existingPhotos = existing.photo_urls || []
        const newPhotos = photoUrls.filter(url => !existingPhotos.includes(url))
        updates.photo_urls = [...existingPhotos, ...newPhotos]
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('timeline_events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single()

    if (updateError) {
      console.error('timeline update error:', updateError)
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    // Trigger Nora observation when partner adds photos to creator's memory
    if (!isCreator && photoUrls !== undefined && !existing.nora_observation) {
      try {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, display_name')
          .in('user_id', [coupleData.user1_id, coupleData.user2_id])
        const creatorProfile = profiles?.find(p => p.user_id === existing.created_by)
        const partnerProfile = profiles?.find(p => p.user_id === user.id)
        const prompt = `${creatorProfile?.display_name || 'One partner'} created a memory called "${existing.title}"${existing.event_date ? ` from ${existing.event_date}` : ''}. Both partners have now added photos to it. Write one warm, specific observation about this shared moment — 1-2 sentences max. Make it feel like something only Nora would notice. No questions.`
        const observation = await noraChat(
          [{ role: 'user', content: prompt }],
          { route: 'memory/observation', system: 'You are Nora — warm, specific, brief. Write one observation about a shared memory a couple has just captured together. Never generic.', maxTokens: 80 }
        )
        if (observation) {
          await supabase.from('timeline_events').update({
            nora_observation: observation.trim(),
            nora_observation_at: new Date().toISOString()
          }).eq('id', eventId)
        }
      } catch (err) {
        console.error('[timeline/update] Nora observation error:', err)
      }
    }

    return NextResponse.json({ success: true, event: updated })
  } catch (error) {
    console.error('timeline/event/update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
