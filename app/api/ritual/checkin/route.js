import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { userId, coupleId, ritualId, completed, weekStart } = await request.json()

    if (!userId || !coupleId || !ritualId || weekStart === undefined) {
      return NextResponse.json({ error: 'userId, coupleId, ritualId, and weekStart required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const now = new Date().toISOString()

    // Upsert completion row (unique on ritual_id + week_start)
    const { data: completion, error: completionError } = await supabase
      .from('ritual_completions')
      .upsert(
        {
          ritual_id: ritualId,
          couple_id: coupleId,
          completed_by: userId,
          week_start: weekStart,
          completed: !!completed,
          updated_at: now,
        },
        { onConflict: 'ritual_id,week_start' }
      )
      .select('*')
      .maybeSingle()

    if (completionError) {
      console.error('[ritual/checkin] upsert error:', completionError)
      return NextResponse.json({ error: 'Failed to save check-in' }, { status: 500 })
    }

    // If completed, increment streak on the ritual row
    if (completed) {
      const { data: current } = await supabase
        .from('rituals')
        .select('streak')
        .eq('id', ritualId)
        .maybeSingle()

      await supabase
        .from('rituals')
        .update({ streak: (current?.streak || 0) + 1, updated_at: now })
        .eq('id', ritualId)
    }

    // Fetch updated ritual row
    const { data: ritual } = await supabase
      .from('rituals')
      .select('*')
      .eq('id', ritualId)
      .maybeSingle()

    return NextResponse.json({ ritual, completion })
  } catch (err) {
    console.error('[ritual/checkin] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
