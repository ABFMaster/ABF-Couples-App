export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

// Either partner can remove a song from the shared Mixtape — it's a shared
// curated list ("Our Mixtape"), not a private inbox, so this isn't scoped to
// the original sender only. Matt's actual use case: a duplicate from his own
// testing, but either partner should be able to clean up mistakes/dupes.
export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { flirtId } = await request.json()
    if (!flirtId) {
      return NextResponse.json({ error: 'flirtId required' }, { status: 400 })
    }

    // Resource-derived couple check, not a client-supplied coupleId — same
    // pattern used throughout this app's BOLA fixes (e.g. challenge/generate).
    const { data: flirt } = await supabase
      .from('flirts')
      .select('id, couple_id, type')
      .eq('id', flirtId)
      .maybeSingle()

    if (!flirt) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (flirt.type !== 'song') {
      return NextResponse.json({ error: 'Only song flirts can be removed from Mixtape' }, { status: 400 })
    }

    const isMember = await verifyCoupleMembership(supabase, user.id, flirt.couple_id)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error: deleteError } = await supabase
      .from('flirts')
      .delete()
      .eq('id', flirtId)

    if (deleteError) {
      console.error('[mixtape/delete] delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[mixtape/delete] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
