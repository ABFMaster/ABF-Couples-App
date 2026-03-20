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

    const { data: existing } = await supabase
      .from('rituals')
      .select('id, couple_id, retire_requested_by')
      .eq('id', ritualId)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ error: 'Ritual not found' }, { status: 404 })
    }
    if (existing.couple_id !== coupleId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date().toISOString()

    // First person to request retire — flag it
    if (!existing.retire_requested_by) {
      const { data: ritual, error } = await supabase
        .from('rituals')
        .update({ retire_requested_by: userId, updated_at: now })
        .eq('id', ritualId)
        .select('*')
        .maybeSingle()

      if (error) {
        console.error('[ritual/retire] flag error:', error)
        return NextResponse.json({ error: 'Failed to flag ritual' }, { status: 500 })
      }

      return NextResponse.json({ ritual, status: 'requested' })
    }

    // Second person confirms — retire it
    if (existing.retire_requested_by !== userId) {
      const { data: ritual, error } = await supabase
        .from('rituals')
        .update({ status: 'retired', retire_requested_by: null, updated_at: now })
        .eq('id', ritualId)
        .select('*')
        .maybeSingle()

      if (error) {
        console.error('[ritual/retire] retire error:', error)
        return NextResponse.json({ error: 'Failed to retire ritual' }, { status: 500 })
      }

      return NextResponse.json({ ritual, status: 'retired' })
    }

    // Same person tapping again — cancel the request
    const { data: ritual, error } = await supabase
      .from('rituals')
      .update({ retire_requested_by: null, updated_at: now })
      .eq('id', ritualId)
      .select('*')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: 'Failed to cancel retire request' }, { status: 500 })
    }

    return NextResponse.json({ ritual, status: 'cancelled' })

  } catch (err) {
    console.error('[ritual/retire] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
