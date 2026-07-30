export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getWeekStart } from '@/lib/dates'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export async function GET(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { searchParams } = new URL(request.url)
    const coupleId = searchParams.get('coupleId')

    if (!coupleId) {
      return NextResponse.json({ error: 'coupleId required' }, { status: 400 })
    }

    const isMember = await verifyCoupleMembership(supabase, user.id, coupleId)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Fetch couple's active rituals
    const { data: rituals } = await supabase
      .from('rituals')
      .select('*')
      .eq('couple_id', coupleId)
      .neq('status', 'retired')
      .order('created_at', { ascending: true })

    if (!rituals || rituals.length === 0) {
      return NextResponse.json({ hasRituals: false, rituals: [], completions: [], usedSuggestionIds: [] })
    }

    const usedSuggestionIds = rituals.map(r => r.suggestion_id).filter(Boolean)

    const weekStart = getWeekStart()

    const ritualIds = rituals.map(r => r.id)

    const { data: completions } = await supabase
      .from('ritual_completions')
      .select('*')
      .in('ritual_id', ritualIds)
      .eq('week_start', weekStart)

    return NextResponse.json({
      hasRituals: true,
      rituals,
      completions: completions || [],
      usedSuggestionIds,
    })
  } catch (err) {
    console.error('[ritual/status] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
