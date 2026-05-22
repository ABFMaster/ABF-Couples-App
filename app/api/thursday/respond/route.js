export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getTodayString } from '@/lib/dates'

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

    const { coupleId, response } = await request.json()
    if (!coupleId || !response?.trim()) return NextResponse.json({ error: 'coupleId and response required' }, { status: 400 })

    const todayStr = getTodayString('America/Los_Angeles')

    // Fetch today's entry
    const { data: entry } = await supabase
      .from('thursday_entries')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('date', todayStr)
      .maybeSingle()

    if (!entry) return NextResponse.json({ error: 'No Thursday entry for today' }, { status: 404 })

    const isUser1 = entry.user1_id === user.id
    const updateField = isUser1
      ? { user1_response: response.trim(), user1_responded_at: new Date().toISOString() }
      : { user2_response: response.trim(), user2_responded_at: new Date().toISOString() }

    await supabase
      .from('thursday_entries')
      .update(updateField)
      .eq('id', entry.id)

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[thursday/respond] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
