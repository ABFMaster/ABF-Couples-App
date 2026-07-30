export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requestOrConfirmRetire } from '@/lib/ritual-retire'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

// POST /api/ritual/revisit-respond { userId, coupleId, ritualId, action }
// action: 'still_going' | 'drifted'
//
// 'still_going' just resets the dormancy clock — no confirmation needed,
// it's a positive no-op. 'drifted' retires the ritual, but since this is an
// ADOPTED ritual (a joint decision, same as adopting it was), it goes through
// the exact same two-person request/confirm transition as the "See all
// rituals" library page — not a unilateral retire. Retiring is a fully fine
// outcome either way; nothing here should read as a failure state.
export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { coupleId, ritualId, action } = await request.json()

    if (!coupleId || !ritualId || !['still_going', 'drifted'].includes(action)) {
      return NextResponse.json({ error: 'coupleId, ritualId, and a valid action required' }, { status: 400 })
    }

    const userId = user.id

    const isMember = await verifyCoupleMembership(supabase, userId, coupleId)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (action === 'still_going') {
      const now = new Date().toISOString()
      const { data: ritual, error } = await supabase
        .from('rituals')
        .update({ last_revisited_at: now, pending_revisit_message: null, updated_at: now })
        .eq('id', ritualId)
        .eq('couple_id', coupleId)
        .select('*')
        .maybeSingle()

      if (error) {
        console.error('[ritual/revisit-respond] still_going error:', error)
        return NextResponse.json({ error: 'Failed to update ritual' }, { status: 500 })
      }
      return NextResponse.json({ ritual, status: 'still_going' })
    }

    // action === 'drifted'
    const result = await requestOrConfirmRetire({
      supabase, userId, coupleId, ritualId,
      extraUpdate: { pending_revisit_message: null },
    })

    if (result.error === 'not_found') return NextResponse.json({ error: 'Ritual not found' }, { status: 404 })
    if (result.error === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (result.error) return NextResponse.json({ error: 'Failed to update ritual' }, { status: 500 })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[ritual/revisit-respond] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
