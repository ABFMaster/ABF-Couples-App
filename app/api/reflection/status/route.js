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

    // Compute Monday of current week in Pacific time
    const d = new Date()
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const weekStart = d.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })

    const { data: reflection } = await supabase
      .from('weekly_reflections')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('week_start', weekStart)
      .maybeSingle()

    if (!reflection) {
      return NextResponse.json({ hasReflection: false, reflection: null })
    }

    return NextResponse.json({ hasReflection: true, reflection })
  } catch (err) {
    console.error('[reflection/status] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
