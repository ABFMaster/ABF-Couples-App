import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { coupleId, momentIndex, reaction } = await request.json()
    console.log('[reflection/react] body:', { coupleId, momentIndex, reaction })

    if (!coupleId || momentIndex === undefined || momentIndex === null || !reaction) {
      return NextResponse.json({ error: 'coupleId, momentIndex, and reaction required' }, { status: 400 })
    }

    if (reaction !== 'lands' && reaction !== 'not_quite') {
      return NextResponse.json({ error: 'reaction must be lands or not_quite' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Fetch most recent reflection for this couple
    const { data: reflection, error: fetchError } = await supabase
      .from('weekly_reflections')
      .select('id, moment_reactions')
      .eq('couple_id', coupleId)
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError) {
      console.error('[reflection/react] fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch reflection' }, { status: 500 })
    }

    if (!reflection) {
      return NextResponse.json({ error: 'Reflection not found' }, { status: 404 })
    }

    const updatedReactions = {
      ...(reflection.moment_reactions || {}),
      [String(momentIndex)]: reaction,
    }

    const { error: updateError } = await supabase
      .from('weekly_reflections')
      .update({ moment_reactions: updatedReactions })
      .eq('id', reflection.id)
    console.log('[reflection/react] update result:', { updateError })

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
