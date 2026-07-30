export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { coupleId, ritualId } = await request.json()

    if (!coupleId || !ritualId) {
      return NextResponse.json({ error: 'coupleId and ritualId required' }, { status: 400 })
    }

    const isMember = await verifyCoupleMembership(supabase, user.id, coupleId)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const now = new Date().toISOString()

    const { data: ritual, error } = await supabase
      .from('rituals')
      .update({ status: 'adopted', adopted_at: now, updated_at: now })
      .eq('id', ritualId)
      .eq('couple_id', coupleId)
      .select('*')
      .maybeSingle()

    if (error) {
      console.error('[ritual/adopt] update error:', error)
      return NextResponse.json({ error: 'Failed to adopt ritual' }, { status: 500 })
    }

    return NextResponse.json({ ritual })
  } catch (err) {
    console.error('[ritual/adopt] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
