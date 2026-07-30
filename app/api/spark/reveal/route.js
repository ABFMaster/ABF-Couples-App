export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

// Marks that this specific user has personally been through their own Spark
// reveal animation. Spark has no confirming tap like Bet's "Reveal the
// cards" — the reveal sequence (partnerCardShown -> myCardShown -> noraShown
// -> pillsShown) auto-plays the instant both answers exist. This endpoint is
// called client-side once that sequence finishes (pillsShown), giving
// Follow-Through the same per-user reveal-seen signal Bet already has via
// bet_responses.reveal_seen_at.
export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { sparkId } = await request.json()

    if (!sparkId) {
      return NextResponse.json({ error: 'sparkId required' }, { status: 400 })
    }

    const userId = user.id

    const { data: sparkRow } = await supabase
      .from('sparks')
      .select('couple_id')
      .eq('id', sparkId)
      .maybeSingle()

    if (!sparkRow) return NextResponse.json({ error: 'Spark not found' }, { status: 404 })

    const isMember = await verifyCoupleMembership(supabase, userId, sparkRow.couple_id)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await supabase
      .from('spark_responses')
      .update({ reveal_seen_at: new Date().toISOString() })
      .eq('spark_id', sparkId)
      .eq('user_id', userId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[spark/reveal] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
