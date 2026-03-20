import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { userId, coupleId, ritualId, action } = await request.json()

    if (!userId || !coupleId || !ritualId || !action) {
      return NextResponse.json({ error: 'userId, coupleId, ritualId, and action required' }, { status: 400 })
    }

    if (action !== 'confirm' && action !== 'discuss') {
      return NextResponse.json({ error: 'action must be confirm or discuss' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Verify the ritual belongs to this couple
    const { data: existing } = await supabase
      .from('rituals')
      .select('id, couple_id')
      .eq('id', ritualId)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ error: 'Ritual not found' }, { status: 404 })
    }

    if (existing.couple_id !== coupleId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date().toISOString()

    let updatePayload
    if (action === 'confirm') {
      updatePayload = {
        partner_confirmed: true,
        partner_confirmed_at: now,
        status: 'discovering',
        updated_at: now,
      }
    } else {
      updatePayload = {
        needs_discussion: true,
        status: 'pending',
        updated_at: now,
      }
    }

    const { data: ritual, error } = await supabase
      .from('rituals')
      .update(updatePayload)
      .eq('id', ritualId)
      .select('*')
      .maybeSingle()

    if (error) {
      console.error('[ritual/confirm] update error:', error)
      return NextResponse.json({ error: 'Failed to update ritual' }, { status: 500 })
    }

    // Fire push notification
    const appBase = process.env.NEXT_PUBLIC_APP_URL || 'https://abf-couples-app.vercel.app'
    try {
      const { data: couple } = await supabase
        .from('couples')
        .select('user1_id, user2_id')
        .eq('id', coupleId)
        .maybeSingle()
      const proposerId = ritual?.proposed_by
      if (proposerId) {
        const notifBody = action === 'confirm'
          ? `Your partner is in — the ritual is starting.`
          : `Your partner wants to talk about the ritual first.`
        await fetch(`${appBase}/api/push/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: proposerId,
            title: 'The Ritual',
            body: notifBody,
            url: '/ritual',
          }),
        }).catch(() => {})
      }
    } catch { /* non-blocking */ }

    return NextResponse.json({ ritual })
  } catch (err) {
    console.error('[ritual/confirm] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
