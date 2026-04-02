import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { sessionId, coupleId, userId } = await request.json()
    if (!sessionId || !coupleId || !userId) {
      return NextResponse.json({ error: 'sessionId, coupleId, userId required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

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
