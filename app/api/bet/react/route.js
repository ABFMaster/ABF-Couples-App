import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { betId, userId, reactionIcon, questionRating } = await request.json()

    if (!betId || !userId) {
      return NextResponse.json({ error: 'betId and userId required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    await supabase
      .from('bet_responses')
      .update({
        reaction_icon: reactionIcon,
        question_rating: questionRating,
        reacted_at: new Date().toISOString(),
      })
      .eq('bet_id', betId)
      .eq('user_id', userId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[bet/react] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
