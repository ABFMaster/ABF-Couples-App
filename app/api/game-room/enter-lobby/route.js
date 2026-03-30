import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { userId, coupleId, mode = 'rabbit-hole', forceNew = false } = await request.json()
    if (!userId || !coupleId) {
      return NextResponse.json({ error: 'userId and coupleId required' }, { status: 400 })
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
    const lobbyField = isUser1 ? 'user1_in_lobby' : 'user2_in_lobby'

    // Expire stale lobby sessions older than 30 minutes
    await supabase
      .from('game_sessions')
      .update({ status: 'expired' })
      .eq('couple_id', coupleId)
      .eq('mode', mode)
      .eq('status', 'lobby')
      .lt('updated_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())

    // Expire stale active sessions older than 24 hours
    await supabase
      .from('game_sessions')
      .update({ status: 'expired' })
      .eq('couple_id', coupleId)
      .eq('mode', mode)
      .eq('status', 'active')
      .lt('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    // If forceNew, expire all existing sessions for this mode first
    if (forceNew) {
      await supabase
        .from('game_sessions')
        .update({ status: 'expired' })
        .eq('couple_id', coupleId)
        .eq('mode', mode)
        .in('status', ['active', 'completed'])
    }

    // Check for existing lobby session
    const { data: existing } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('mode', mode)
      .in('status', ['lobby', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let session

    if (existing) {
      // Join existing lobby
      const { data: updated } = await supabase
        .from('game_sessions')
        .update({ [lobbyField]: true, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select('*')
        .maybeSingle()
      session = updated
    } else {
      // Create new lobby session
      const { data: created } = await supabase
        .from('game_sessions')
        .insert({
          couple_id: coupleId,
          mode,
          status: 'lobby',
          [lobbyField]: true,
          host_user_id: userId,
        })
        .select('*')
        .maybeSingle()
      session = created
    }

    // Notify partner
    const appBase = process.env.NEXT_PUBLIC_APP_URL || 'https://abf-couples-app.vercel.app'
    const partnerId = isUser1 ? couple.user2_id : couple.user1_id
    const notificationUrl = `/game-room/lobby?mode=${mode}`
    await fetch(`${appBase}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: partnerId,
        title: 'The Game Room',
        body: 'Your partner is in the lobby. Ready to play?',
        url: notificationUrl,
      }),
    }).catch(() => {})

    const bothInLobby = session?.user1_in_lobby && session?.user2_in_lobby
    return NextResponse.json({ session, bothInLobby })
  } catch (err) {
    console.error('[enter-lobby] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
