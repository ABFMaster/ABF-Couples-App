export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requestOrConfirmRetire } from '@/lib/ritual-retire'

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
    const { userId, coupleId, ritualId, action } = await request.json()

    if (!userId || !coupleId || !ritualId || !['still_going', 'drifted'].includes(action)) {
      return NextResponse.json({ error: 'userId, coupleId, ritualId, and a valid action required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

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
