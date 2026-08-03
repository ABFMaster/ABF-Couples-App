export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'

// No verifyCoupleMembership needed here — every write below is filtered by
// user_id = user.id (the verified caller's own row), so this can never
// touch a partner's or another couple's data regardless of sparkId. Uses
// the shared requireUser helper for consistency with the rest of the app.
export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { sparkId, reactionIcon, questionRating } = await request.json()
    if (!sparkId || (!reactionIcon && questionRating === undefined)) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const updates = {
      ...(reactionIcon && { reaction_icon: reactionIcon, reacted_at: new Date().toISOString() }),
      ...(questionRating !== undefined && { question_rating: questionRating }),
    }

    const { error } = await supabase
      .from('spark_responses')
      .update(updates)
      .eq('spark_id', sparkId)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: 'Failed to save reaction' }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[spark/react] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
