import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const coupleId = searchParams.get('coupleId')
    const mode = searchParams.get('mode') || 'rabbit-hole'

    if (!coupleId) {
      return NextResponse.json({ error: 'coupleId required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: session } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('mode', mode)
      .in('status', ['lobby', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!session) {
      return NextResponse.json({ session: null, bothInLobby: false })
    }

    const bothInLobby = session.user1_in_lobby && session.user2_in_lobby

    return NextResponse.json({ session, bothInLobby })
  } catch (err) {
    console.error('[lobby-status] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
