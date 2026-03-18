import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function PATCH(request) {
  try {
    const { userId, coupleId, weekStart } = await request.json()

    if (!userId || !coupleId || !weekStart) {
      return NextResponse.json({ error: 'userId, coupleId, and weekStart required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Determine whether this user is user1 or user2
    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .maybeSingle()

    if (!couple) {
      return NextResponse.json({ error: 'Couple not found' }, { status: 404 })
    }

    const field =
      String(couple.user1_id) === String(userId)
        ? 'viewed_by_user1'
        : 'viewed_by_user2'

    await supabase
      .from('weekly_reflections')
      .update({ [field]: true })
      .eq('couple_id', coupleId)
      .eq('week_start', weekStart)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[reflection/viewed] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
