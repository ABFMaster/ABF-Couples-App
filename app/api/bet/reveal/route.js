export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

// Marks that this specific user has personally triggered their reveal for
// this Bet. Needed because "both partners have answered" is a couple-level
// fact, but "have I personally watched my cards flip yet" is a per-user
// fact — without tracking it separately, whoever reopens the Bet after it's
// already fully resolved (almost always the first person to answer, since
// they have nothing else to do but leave and come back) gets skipped
// straight to the static end state and never gets their own reveal moment.
export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { betId } = await request.json()

    if (!betId) {
      return NextResponse.json({ error: 'betId required' }, { status: 400 })
    }

    const userId = user.id

    const { data: betRow } = await supabase
      .from('bets')
      .select('couple_id')
      .eq('id', betId)
      .maybeSingle()

    if (!betRow) return NextResponse.json({ error: 'Bet not found' }, { status: 404 })

    const isMember = await verifyCoupleMembership(supabase, userId, betRow.couple_id)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
