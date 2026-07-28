export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Marks that this specific user has personally triggered their reveal for
// this Bet. Needed because "both partners have answered" is a couple-level
// fact, but "have I personally watched my cards flip yet" is a per-user
// fact — without tracking it separately, whoever reopens the Bet after it's
// already fully resolved (almost always the first person to answer, since
// they have nothing else to do but leave and come back) gets skipped
// straight to the static end state and never gets their own reveal moment.
export async function POST(request) {
  try {
    const { betId, userId } = await request.json()

    if (!betId || !userId) {
      return NextResponse.json({ error: 'betId and userId required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    await supabase
      .from('bet_responses')
      .update({ reveal_seen_at: new Date().toISOString() })
      .eq('bet_id', betId)
      .eq('user_id', userId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[bet/reveal] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
