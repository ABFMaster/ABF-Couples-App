export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getTodayString } from '@/lib/dates'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export async function GET(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { searchParams } = new URL(request.url)
    const coupleId = searchParams.get('coupleId')

    if (!coupleId) {
      return NextResponse.json({ error: 'coupleId required' }, { status: 400 })
    }

    const isMember = await verifyCoupleMembership(supabase, user.id, coupleId)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
