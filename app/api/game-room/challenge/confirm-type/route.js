export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'
import { checkMemoryUnlocked } from '@/lib/memory-unlock'

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { sessionId, coupleId, challengeType, totalRounds } = await request.json()

    if (!sessionId || !coupleId || !challengeType || !totalRounds) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const isMember = await verifyCoupleMembership(supabase, user.id, coupleId)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Memory Test needs real shared history to draw on — enforced here,
    // not just hidden in the UI, so it can't be bypassed by hitting this
    // route directly with challengeType=memory.
    if (challengeType === 'memory') {
      const { unlocked } = await checkMemoryUnlocked(supabase, coupleId)
      if (!unlocked) {
        return NextResponse.json({ error: 'Memory Test is not unlocked yet for this couple' }, { status: 403 })
      }
    }

    // Expire any existing challenge sessions for this game session
    await supabase
      .from('challenge_sessions')
      .update({ status: 'expired' })
      .eq('session_id', sessionId)
      .neq('status', 'expired')

    // Create fresh challenge session with confirmed type
    const { data: challengeSession, error } = await supabase
      .from('challenge_sessions')
      .insert({
        session_id: sessionId,
        couple_id: coupleId,
        challenge_type: challengeType,
        total_rounds: totalRounds,
        current_round: 1,
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create challenge session' }, { status: 500 })
    }

    return NextResponse.json({ challengeSession })
  } catch (err) {
    console.error('[challenge/confirm-type] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
