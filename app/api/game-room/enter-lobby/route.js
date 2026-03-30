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

    // Helper: expire sessions and clean their child records (plates cleared after Nora has eaten)
    const expireAndClean = async (query) => {
      const { data: toExpire } = await supabase
        .from('game_sessions')
        .select('id')
        .match(query.match)
        .in('status', query.statuses)
        .lt('updated_at', query.olderThan || new Date().toISOString())

      if (!toExpire?.length) return
      const ids = toExpire.map(s => s.id)

      // Clean child records first
      await Promise.all([
        supabase.from('game_rounds').delete().in('session_id', ids),
        supabase.from('game_finds').delete().in('session_id', ids),
        supabase.from('hot_take_sessions').delete().in('session_id', ids),
        supabase.from('hot_take_answers').delete().in('session_id', ids),
        supabase.from('challenge_sessions').delete().in('session_id', ids),
        supabase.from('challenge_rounds').delete().in('session_id', ids),
      ])

      // Then expire the sessions
      await supabase
        .from('game_sessions')
        .update({ status: 'expired' })
        .in('id', ids)
    }

    if (forceNew) {
      await expireAndClean({
        match: { couple_id: coupleId, mode },
        statuses: ['active', 'completed'],
        olderThan: new Date().toISOString(),
      })
    }

    // Expire stale lobby sessions older than 30 minutes
    await expireAndClean({
      match: { couple_id: coupleId, mode },
      statuses: ['lobby'],
      olderThan: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    })

    // Expire stale active sessions older than 24 hours
    await expireAndClean({
      match: { couple_id: coupleId, mode },
      statuses: ['active'],
      olderThan: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    })

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
