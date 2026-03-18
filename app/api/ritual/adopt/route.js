import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { userId, coupleId, ritualId } = await request.json()

    if (!userId || !coupleId || !ritualId) {
      return NextResponse.json({ error: 'userId, coupleId, and ritualId required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

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
