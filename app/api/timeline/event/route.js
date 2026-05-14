export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { updateNoraMemory, SIGNAL_TYPES } from '@/lib/nora-memory'

export async function POST(request) {
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

    const { coupleId, userId, eventType, title, description, eventDate, photoUrls } = await request.json()
    if (!coupleId || !userId || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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
