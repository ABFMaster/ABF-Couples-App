export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function PATCH(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, coupleId, weekStart } = await request.json()

    if (!userId || !coupleId || !weekStart) {
      return NextResponse.json({ error: 'userId, coupleId, and weekStart required' }, { status: 400 })
    }

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
