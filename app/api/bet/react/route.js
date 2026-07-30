export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { betId, reactionIcon, questionRating } = await request.json()

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
      .update({
        reaction_icon: reactionIcon,
        question_rating: questionRating,
        reacted_at: new Date().toISOString(),
      })
      .eq('bet_id', betId)
      .eq('user_id', userId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[bet/react] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
