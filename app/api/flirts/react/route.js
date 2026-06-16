export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { flirtId, reaction } = await request.json()
    if (!flirtId || !reaction) return NextResponse.json({ error: 'flirtId and reaction required' }, { status: 400 })

    const validReactions = ['seen', 'felt', 'needed']
    if (!validReactions.includes(reaction)) {
      return NextResponse.json({ error: 'Invalid reaction' }, { status: 400 })
    }

    await supabase
      .from('flirts')
      .update({ reaction, reacted_at: new Date().toISOString() })
      .eq('id', flirtId)
      .eq('receiver_id', user.id)

    // Fetch flirt to get coupleId and senderId for signal
    const { data: flirt } = await supabase
      .from('flirts')
      .select('couple_id, sender_id, type, content')
      .eq('id', flirtId)
      .maybeSingle()

    if (flirt) {
      try {
        const { updateNoraMemory, SIGNAL_TYPES } = await import('@/lib/nora-memory')
        await updateNoraMemory({
          coupleId: flirt.couple_id,
          userId: user.id,
          signalType: SIGNAL_TYPES.FLIRT_RECEIVED,
          inputData: {
            type: flirt.type,
            content: flirt.content,
            reaction,
          },
        })
      } catch {}
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[flirts/react] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
