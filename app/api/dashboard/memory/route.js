import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getTodayString } from '@/lib/dates'

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

    const eventsWithPhotos = events.filter(e => e.photo_urls?.length > 0)
    const pool = eventsWithPhotos.length > 0 ? eventsWithPhotos : events
    const todayStr = getTodayString()
    const seedStr = coupleId + todayStr
    const seed = seedStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    const event = pool[seed % pool.length]
    return NextResponse.json(event)
  } catch (err) {
    console.error('[dashboard/memory] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
