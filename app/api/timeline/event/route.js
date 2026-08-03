export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { updateNoraMemory, SIGNAL_TYPES } from '@/lib/nora-memory'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { coupleId, eventType, title, description, eventDate, photoUrls } = await request.json()
    if (!coupleId || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // This is literally the route lib/api-auth.js's own docstring cites as
    // the motivating bad example — previously trusted BOTH coupleId and a
    // client-supplied userId with zero verification, which (since
    // TIMELINE_EVENT is a shared signal) let an attacker synthesize fresh
    // user1_notes/user2_notes/couple_notes and nora_claims for any real
    // couple using a fabricated title/description. Found in the Aug 2026
    // Nora memory audit. userId is no longer accepted from the client at
    // all — derived from the verified token instead.
    const isMember = await verifyCoupleMembership(supabase, user.id, coupleId)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const userId = user.id

    // Check for existing event with same title and couple to prevent duplicates
    const { data: existing } = await supabase
      .from('timeline_events')
      .select('id')
      .eq('couple_id', coupleId)
      .eq('title', title)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ success: true, event: existing, deduplicated: true })
    }

    const { data: event, error: insertError } = await supabase
      .from('timeline_events')
      .insert({
        couple_id: coupleId,
        created_by: userId,
        event_type: eventType,
        title,
        description: description || null,
        event_date: eventDate,
        photo_urls: photoUrls || [],
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: 'Failed to create timeline event' }, { status: 500 })
    }

    updateNoraMemory({
      coupleId,
      userId,
      signalType: SIGNAL_TYPES.TIMELINE_EVENT,
      inputData: { eventType, title, description, eventDate },
    }).catch(() => {})

    return NextResponse.json({ success: true, event })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
