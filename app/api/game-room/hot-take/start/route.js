export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getHotTakeQuestions } from '@/lib/hot-take-questions'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { sessionId, coupleId, tiers = [1, 2, 3], count = 15 } = await request.json()
    if (!sessionId || !coupleId) {
      return NextResponse.json({ error: 'sessionId and coupleId required' }, { status: 400 })
    }

    const isMember = await verifyCoupleMembership(supabase, user.id, coupleId)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Check if questions already picked for this session
    const { data: existing } = await supabase
      .from('hot_take_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ questions: existing.questions, alreadyExists: true })
    }

    // Pick questions
    const questions = getHotTakeQuestions({ tiers, limit: count })

    // Save to hot_take_sessions
    await supabase
      .from('hot_take_sessions')
      .insert({
        session_id: sessionId,
        couple_id: coupleId,
        questions,
        current_index: 0,
      })

    return NextResponse.json({ questions })
  } catch (err) {
    console.error('[hot-take/start] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
