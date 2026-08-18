export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'
import { describeAndStoreStopPhotos } from '@/lib/photo-descriptions'

// Date creation/editing writes `stops` directly from the client via the
// browser Supabase client (see app/dates/custom/page.js and
// app/dates/[id]/edit/page.js) rather than through a server route, so there's
// no existing request/response cycle to hook vision captioning into the way
// dates/photos/add and timeline/event/update can. This route exists purely
// so the client can fire-and-forget a call here right after saving stops —
// same pattern already used for /api/dates/conversation-starters, which the
// client already calls the same way immediately after a date save.
export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { dateId } = await request.json()
    if (!dateId) {
      return NextResponse.json({ error: 'dateId required' }, { status: 400 })
    }

    // Couple membership derived from the date row itself, not a
    // client-supplied coupleId — same "never trust the client for
    // identity/ownership" pattern used across this app's other routes.
    const { data: date } = await supabase
      .from('custom_dates')
      .select('id, couple_id, stops')
      .eq('id', dateId)
      .maybeSingle()
    if (!date) return NextResponse.json({ error: 'Date not found' }, { status: 404 })

    const isMember = await verifyCoupleMembership(supabase, user.id, date.couple_id)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Non-blocking on purpose — this route itself is already called
    // fire-and-forget by the client, but await here anyway so a caller that
    // does want to know when it's done (the backfill script) can.
    await describeAndStoreStopPhotos(supabase, { dateId: date.id, stops: date.stops })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('dates/photos/describe-stops error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
