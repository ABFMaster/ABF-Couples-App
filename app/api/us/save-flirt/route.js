import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { flirtId, userId, mode, title, posterPath } = await request.json()

    if (!flirtId || !userId || !mode || !title) {
      return NextResponse.json({ error: 'flirtId, userId, mode, and title are required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const typeMap = {
      song: 'song',
      movie_show: 'movie',
    }
    const type = typeMap[mode]

    const { data: flirtRow } = await supabase
      .from('flirts')
      .select('couple_id')
      .eq('id', flirtId)
      .maybeSingle()

    if (!flirtRow?.couple_id) {
      return NextResponse.json({ error: 'Flirt not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('shared_items')
      .insert({
        couple_id: flirtRow.couple_id,
        type,
        title,
        poster_path: posterPath || null,
        added_by: userId,
      })

    if (error) {
      console.error('[us/save-flirt] Supabase error:', error)
      return NextResponse.json({ error: 'Failed to save to Us' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[us/save-flirt] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
