export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
