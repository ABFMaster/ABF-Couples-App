export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { flirtId, mode, title, posterPath } = await request.json()

    if (!flirtId || !mode || !title) {
      return NextResponse.json({ error: 'flirtId, mode, and title are required' }, { status: 400 })
    }

    const userId = user.id

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

    const isMember = await verifyCoupleMembership(supabase, userId, flirtRow.couple_id)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabase
      .from('shared_items')
      .insert({
        couple_id: flirtRow.couple_id,
        type,
        title,
        ...(type === 'movie' ? { poster_url: posterPath } : {}),
        ...(type === 'song' ? { artwork_url: posterPath } : {}),
        user_id: userId,
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
