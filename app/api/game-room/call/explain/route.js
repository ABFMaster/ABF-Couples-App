export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { roundId, explanation } = await request.json()
    if (!roundId || !explanation) {
      return NextResponse.json({ error: 'roundId and explanation required' }, { status: 400 })
    }

    const { data: roundForAuth } = await supabase
      .from('call_rounds')
      .select('couple_id')
      .eq('id', roundId)
      .maybeSingle()
    if (!roundForAuth) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

    const isMember = await verifyCoupleMembership(supabase, user.id, roundForAuth.couple_id)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: round } = await supabase
      .from('call_rounds')
      .update({ hot_seat_explanation: explanation, status: 'answered', explanation_revealed: true })
      .eq('id', roundId)
      .select('*')
      .maybeSingle()

    return NextResponse.json({ round })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
