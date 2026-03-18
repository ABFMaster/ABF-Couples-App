import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const coupleId = searchParams.get('coupleId')

    if (!userId || !coupleId) {
      return NextResponse.json({ error: 'userId and coupleId required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

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

    // Compute Monday of current week in Pacific time
    const d = new Date()
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const weekStart = d.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })

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
