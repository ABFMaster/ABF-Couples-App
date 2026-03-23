import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { sessionId, coupleId, userId, roundNumber } = await request.json()
    if (!sessionId || !coupleId || !userId || !roundNumber) {
      return NextResponse.json({ error: 'sessionId, coupleId, userId, roundNumber required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Get couple to know user1/user2
    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .maybeSingle()
    if (!couple) return NextResponse.json({ error: 'Couple not found' }, { status: 404 })

    const isUser1 = couple.user1_id === userId
    const readyField = isUser1 ? 'user1_ready' : 'user2_ready'
    const partnerId = isUser1 ? couple.user2_id : couple.user1_id

    // Update this user's ready state on current round
    const { data: round } = await supabase
      .from('game_rounds')
      .update({ [readyField]: true, updated_at: new Date().toISOString() })
      .eq('session_id', sessionId)
      .eq('round_number', roundNumber)
      .select('*')
      .maybeSingle()

    if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

    const bothReady = round.user1_ready && round.user2_ready

    // Notify partner that this user is ready
    const appBase = process.env.NEXT_PUBLIC_APP_URL || 'https://abf-couples-app.vercel.app'

    // Get user's name for notification
    const { data: myProfile } = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('user_id', userId)
      .maybeSingle()
    const myName = myProfile?.display_name || 'Your partner'

    if (bothReady) {
      // Mark current round complete
      await supabase
        .from('game_rounds')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('session_id', sessionId)
        .eq('round_number', roundNumber)

      // Notify both — next round is starting
      await Promise.all([
        fetch(`${appBase}/api/push/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: couple.user1_id,
            title: 'The Rabbit Hole',
            body: "You're both ready — Nora is sending you deeper.",
            url: '/game-room/rabbit-hole/play',
          }),
        }).catch(() => {}),
        fetch(`${appBase}/api/push/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: couple.user2_id,
            title: 'The Rabbit Hole',
            body: "You're both ready — Nora is sending you deeper.",
            url: '/game-room/rabbit-hole/play',
          }),
        }).catch(() => {}),
      ])
    } else {
      // Notify partner that this user is ready
      await fetch(`${appBase}/api/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: partnerId,
          title: 'The Rabbit Hole',
          body: `${myName} is ready for the next thread whenever you are.`,
          url: '/game-room/rabbit-hole/play',
        }),
      }).catch(() => {})
    }

    return NextResponse.json({
      round,
      bothReady,
      nextRound: bothReady ? roundNumber + 1 : null,
    })

  } catch (err) {
    console.error('[round-ready] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
