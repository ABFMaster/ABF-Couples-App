import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const coupleId = searchParams.get('coupleId')

    if (!userId || !coupleId) {
      return NextResponse.json({ error: 'userId and coupleId required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: events, error } = await supabase
      .from('timeline_events')
      .select('id, title, event_type, event_date, photo_urls')
      .eq('couple_id', coupleId)

    if (error) {
      console.error('[dashboard/memory] fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 })
    }

    if (!events || events.length === 0) {
      return NextResponse.json({ empty: true })
    }

    const event = events[Math.floor(Math.random() * events.length)]
    return NextResponse.json(event)
  } catch (err) {
    console.error('[dashboard/memory] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
