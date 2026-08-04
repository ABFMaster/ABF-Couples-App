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

    // verifyCoupleMembership above only proves the CALLER belongs to
    // coupleId — it says nothing about whether the client-supplied
    // sessionId actually belongs to that couple. Without this check, a
    // member of couple A could supply couple B's sessionId and either
    // read back couple B's already-picked questions, or (if none exist
    // yet) insert a second hot_take_sessions row for that session_id
    // tagged with couple A's id, corrupting couple B's session.
    const { data: gameSession } = await supabase
      .from('game_sessions')
      .select('couple_id')
      .eq('id', sessionId)
      .maybeSingle()
    if (!gameSession || gameSession.couple_id !== coupleId) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

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
