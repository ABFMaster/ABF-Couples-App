export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export async function PATCH(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { coupleId, weekStart } = await request.json()

    if (!coupleId || !weekStart) {
      return NextResponse.json({ error: 'coupleId and weekStart required' }, { status: 400 })
    }

    // Determine whether this user is user1 or user2 — derived from the
    // verified token (user.id), never a client-supplied userId. A
    // client-supplied userId here would let any couple member flip their
    // partner's viewed flag instead of their own.
    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .maybeSingle()

    if (!couple) {
      return NextResponse.json({ error: 'Couple not found' }, { status: 404 })
    }

    const isMember = couple.user1_id === user.id || couple.user2_id === user.id
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const field =
      couple.user1_id === user.id
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
