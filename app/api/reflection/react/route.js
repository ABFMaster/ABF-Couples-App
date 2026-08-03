export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { reflectionId, coupleId, momentIndex, reaction } = await request.json()
    if (!coupleId || momentIndex === undefined || momentIndex === null || !reaction) {
      return NextResponse.json({ error: 'coupleId, momentIndex, and reaction required' }, { status: 400 })
    }
    if (reaction !== 'lands' && reaction !== 'not_quite') {
      return NextResponse.json({ error: 'reaction must be lands or not_quite' }, { status: 400 })
    }
    // Use reflectionId directly if provided, otherwise fall back to most recent
    let reflection
    if (reflectionId) {
      const { data, error: fetchError } = await supabase
        .from('weekly_reflections')
        .select('id, couple_id, moment_reactions')
        .eq('id', reflectionId)
        .maybeSingle()
      if (fetchError) {
        console.error('[reflection/react] fetch error:', fetchError)
        return NextResponse.json({ error: 'Failed to fetch reflection' }, { status: 500 })
      }
      reflection = data
    } else {
      const { data, error: fetchError } = await supabase
        .from('weekly_reflections')
        .select('id, couple_id, moment_reactions')
        .eq('couple_id', coupleId)
        .order('week_start', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (fetchError) {
        console.error('[reflection/react] fetch error:', fetchError)
        return NextResponse.json({ error: 'Failed to fetch reflection' }, { status: 500 })
      }
      reflection = data
    }
    if (!reflection) {
      return NextResponse.json({ error: 'Reflection not found' }, { status: 404 })
    }

    // Verify membership against the reflection row's OWN couple_id, not the
    // client-supplied coupleId — closes the gap whether the caller passed
    // reflectionId or coupleId to look it up.
    const isMember = await verifyCoupleMembership(supabase, user.id, reflection.couple_id)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const updatedReactions = {
      ...(reflection.moment_reactions || {}),
      [String(momentIndex)]: reaction,
    }

    const { error: updateError } = await supabase
      .from('weekly_reflections')
      .update({ moment_reactions: updatedReactions })
      .eq('id', reflection.id)

    if (updateError) {
      console.error('[reflection/react] update error:', updateError)
      return NextResponse.json({ error: 'Failed to save reaction' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[reflection/react] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
