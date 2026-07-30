export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Marks that this specific user has personally been through their own Spark
// reveal animation. Spark has no confirming tap like Bet's "Reveal the
// cards" — the reveal sequence (partnerCardShown -> myCardShown -> noraShown
// -> pillsShown) auto-plays the instant both answers exist. This endpoint is
// called client-side once that sequence finishes (pillsShown), giving
// Follow-Through the same per-user reveal-seen signal Bet already has via
// bet_responses.reveal_seen_at.
export async function POST(request) {
  try {
    const { sparkId, userId } = await request.json()

    if (!sparkId || !userId) {
      return NextResponse.json({ error: 'sparkId and userId required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

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
