import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    // Verify ownership — only creator can edit
    const { data: existing } = await supabase
      .from('timeline_events')
      .select('id, created_by')
      .eq('id', eventId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (existing.created_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updates = {}
    if (title !== undefined) updates.title = title.trim()
    if (description !== undefined) updates.description = description?.trim() || null
    if (eventDate !== undefined) updates.event_date = eventDate
    if (photoUrls !== undefined) updates.photo_urls = photoUrls

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

    return NextResponse.json({ success: true, event: updated })
  } catch (error) {
    console.error('timeline/event/update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
