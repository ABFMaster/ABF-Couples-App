import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { sessionId, coupleId, timerMinutes, together } = await request.json()
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
        timer_minutes: timerMinutes || null,
        together: together === true,
        started_at: now.toISOString(),
        expires_at: timerMinutes ? expiresAt.toISOString() : null,
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
      const mode = session?.mode || 'rabbit-hole'
      const modeNames = {
        'rabbit-hole': 'The Rabbit Hole',
        'hot-take': 'Hot Take',
        'challenge': 'The Challenge',
        'remake': 'The Remake',
        'the-hunt': 'The Hunt',
      }
      const modeBodies = {
        'rabbit-hole': "Nora is dropping you in. Get ready.",
        'hot-take': "Time to take some positions. Game is starting.",
        'challenge': "Your challenge is ready. Clock starts now.",
        'remake': "Nora picked your moment. Time to recreate it.",
        'the-hunt': "The hunt is on. Follow the clues.",
      }
      const modeUrls = {
        'rabbit-hole': '/game-room/rabbit-hole/play',
        'hot-take': '/game-room/hot-take',
        'challenge': '/game-room/challenge/play',
        'remake': '/game-room/remake/play',
        'the-hunt': '/game-room/the-hunt/play',
      }
      const title = modeNames[mode] || 'The Game Room'
      const body = modeBodies[mode] || "Your game is starting."
      const url = modeUrls[mode] || '/game-room'

      await Promise.all([
        fetch(`${appBase}/api/push/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: couple.user1_id, title, body, url }),
        }).catch(() => {}),
        fetch(`${appBase}/api/push/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: couple.user2_id, title, body, url }),
        }).catch(() => {}),
      ])
    }

    return NextResponse.json({ session })
  } catch (err) {
    console.error('[start-session] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
