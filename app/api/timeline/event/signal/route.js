import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { updateNoraMemory, SIGNAL_TYPES } from '@/lib/nora-memory'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId, title, description, eventDate } = await request.json()

    if (!eventId) {
      return NextResponse.json({ error: 'Missing eventId' }, { status: 400 })
    }

    const { data: couple } = await supabase
      .from('couples')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .maybeSingle()

    if (!couple) {
      return NextResponse.json({ error: 'No couple found' }, { status: 404 })
    }

    updateNoraMemory({
      coupleId: couple.id,
      userId: user.id,
      signalType: SIGNAL_TYPES.MEMORY_REFLECTION,
      inputData: { eventId, title, description, eventDate },
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('timeline/event/signal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
