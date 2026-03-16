import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { betId, userId, coupleId } = await request.json()

    if (!betId || !userId) {
      return NextResponse.json({ error: 'betId and userId required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Fetch current bet state
    const { data: bet } = await supabase
      .from('bets')
      .select('id, locked_by, locked_at')
      .eq('id', betId)
      .maybeSingle()

    if (!bet) {
      return NextResponse.json({ error: 'Bet not found' }, { status: 404 })
    }

    // Already locked — return early without changes
    if (bet.locked_by) {
      return NextResponse.json({ alreadyLocked: true, bet })
    }

    // Atomic lock: only updates if locked_by IS NULL (prevents race condition)
    const { data: updated } = await supabase
      .from('bets')
      .update({ locked_by: userId, locked_at: new Date().toISOString() })
      .eq('id', betId)
      .is('locked_by', null)
      .select('id, locked_by, locked_at')
      .maybeSingle()

    // If updated is null, another request won the race
    if (!updated) {
      const { data: refetched } = await supabase
        .from('bets')
        .select('id, locked_by, locked_at')
        .eq('id', betId)
        .maybeSingle()

      return NextResponse.json({ alreadyLocked: true, bet: refetched })
    }

    return NextResponse.json({ locked: true, bet: updated })
  } catch (err) {
    console.error('[bet/lock] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
