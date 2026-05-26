export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getTodayString } from '@/lib/dates'

export async function GET(request) {
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

    const { searchParams } = new URL(request.url)
    const coupleId = searchParams.get('coupleId')
    if (!coupleId) return NextResponse.json({ error: 'coupleId required' }, { status: 400 })

    const todayStr = getTodayString('America/Los_Angeles')

    const { data: entry } = await supabase
      .from('wednesday_notices')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('date', todayStr)
      .maybeSingle()

    if (!entry) return NextResponse.json({ entry: null })

    const isUser1 = entry.user1_id === user.id
    const myNotice = isUser1 ? entry.user1_notice : entry.user2_notice
    const mySentAt = isUser1 ? entry.user1_sent_at : entry.user2_sent_at
    const partnerNotice = isUser1 ? entry.user2_notice : entry.user1_notice
    const partnerSentAt = isUser1 ? entry.user2_sent_at : entry.user1_sent_at

    return NextResponse.json({
      entry: {
        id: entry.id,
        date: entry.date,
        status: entry.status,
        myNotice,
        mySentAt,
        partnerNotice,
        partnerSentAt,
        nora_synthesis: entry.nora_synthesis
      }
    })

  } catch (err) {
    console.error('[wednesday/today] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
