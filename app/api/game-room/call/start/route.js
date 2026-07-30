export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { sessionId, coupleId } = await request.json()
    if (!sessionId || !coupleId) {
      return NextResponse.json({ error: 'sessionId and coupleId required' }, { status: 400 })
    }

    const isMember = await verifyCoupleMembership(supabase, user.id, coupleId)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Check if call session already exists
    const { data: existing } = await supabase
      .from('call_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ callSession: existing })
    }

    // Get couple to determine hot seat order
    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .maybeSingle()
    if (!couple) return NextResponse.json({ error: 'Couple not found' }, { status: 404 })

    // Create call session
    const { data: callSession } = await supabase
      .from('call_sessions')
      .insert({
        session_id: sessionId,
        couple_id: coupleId,
        current_round: 1,
        total_rounds: 5,
        status: 'active',
      })
      .select('*')
      .maybeSingle()

    return NextResponse.json({ callSession, couple })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
