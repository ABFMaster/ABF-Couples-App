import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
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

    const { searchParams } = new URL(request.url)
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')

    if (!lat || !lng) {
      return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
    }

    const radius = searchParams.get('radius') || '25'
    const date = searchParams.get('date') || null
    const size = searchParams.get('size') || '10'

    const apiKey = process.env.TICKETMASTER_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Ticketmaster API key not configured' }, { status: 503 })
    }

    const params = new URLSearchParams({
      apikey: apiKey,
      latlong: `${lat},${lng}`,
      radius,
      unit: 'miles',
      size,
      sort: 'date,asc',
    })

    if (date) {
      params.set('startDateTime', `${date}T00:00:00Z`)
      params.set('endDateTime', `${date}T23:59:59Z`)
    }

    const url = `https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`
    const res = await fetch(url)

    if (!res.ok) {
      console.error('[ticketmaster] HTTP error:', res.status)
      return NextResponse.json({ error: 'Failed to fetch from Ticketmaster' }, { status: 502 })
    }

    const data = await res.json()
    const rawEvents = data._embedded?.events || []

    const events = rawEvents.map(event => {
      const venue = event._embedded?.venues?.[0]
      return {
        id: event.id,
        name: event.name,
        url: event.url,
        date: event.dates?.start?.localDate ?? null,
        time: event.dates?.start?.localTime ?? null,
        venue: venue ? {
          name: venue.name,
          address: venue.address?.line1 ?? null,
          city: venue.city?.name ?? null,
        } : null,
        image: event.images?.find(i => i.ratio === '16_9' && i.width > 500)?.url
          || event.images?.[0]?.url
          || null,
        category: event.classifications?.[0]?.segment?.name ?? null,
        priceRange: event.priceRanges?.[0]
          ? `$${event.priceRanges[0].min}–$${event.priceRanges[0].max}`
          : null,
        source: 'ticketmaster',
      }
    })

    return NextResponse.json({ events })

  } catch (error) {
    console.error('[ticketmaster] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
