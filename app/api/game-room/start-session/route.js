import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { sessionId, coupleId, timerMinutes } = await request.json()
    if (!sessionId || !coupleId) {
      return NextResponse.json({ error: 'sessionId and coupleId required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const now = new Date()
    const expiresAt = new Date(now.getTime() + (timerMinutes || 60) * 60 * 1000)

    const { data: session, error } = await supabase
      .from('game_sessions')
      .update({
        status: 'active',
        timer_minutes: timerMinutes || 60,
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', sessionId)
      .eq('couple_id', coupleId)
      .select('*')
      .maybeSingle()

    if (error) {
      console.error('[start-session] error:', error)
      return NextResponse.json({ error: 'Failed to start session' }, { status: 500 })
    }

    // Notify partner that the game has started
    const appBase = process.env.NEXT_PUBLIC_APP_URL || 'https://abf-couples-app.vercel.app'
    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .maybeSingle()

    if (couple) {
      await Promise.all([
        fetch(`${appBase}/api/push/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: couple.user1_id,
            title: 'The Rabbit Hole',
            body: "Nora is dropping you in. Get ready.",
            url: '/game-room/rabbit-hole/play',
          }),
        }).catch(() => {}),
        fetch(`${appBase}/api/push/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: couple.user2_id,
            title: 'The Rabbit Hole',
            body: "Nora is dropping you in. Get ready.",
            url: '/game-room/rabbit-hole/play',
          }),
        }).catch(() => {}),
      ])
    }

    return NextResponse.json({ session })
  } catch (err) {
    console.error('[start-session] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
