import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sparkId, reactionIcon, questionRating } = await request.json()

    const updates = {}
    if (reactionIcon !== undefined) {
      updates.reaction_icon = reactionIcon
      updates.reacted_at = new Date().toISOString()
    }
    if (questionRating !== undefined) {
      updates.question_rating = questionRating
    }

    await supabase
      .from('spark_responses')
      .update(updates)
      .eq('spark_id', sparkId)
      .eq('user_id', user.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[spark/react] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
