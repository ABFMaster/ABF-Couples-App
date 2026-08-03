export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getTodayString } from '@/lib/dates'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export async function GET(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { searchParams } = new URL(request.url)
    const coupleId = searchParams.get('coupleId')
    if (!coupleId) return NextResponse.json({ error: 'coupleId required' }, { status: 400 })

    const isMember = await verifyCoupleMembership(supabase, user.id, coupleId)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const todayStr = getTodayString('America/Los_Angeles')
    // Query this week's Wednesday entry regardless of current day
    const nowPacific = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })
    const now = new Date(nowPacific)
    const dayOfWeek = now.getDay()
    const daysBack = dayOfWeek === 3 ? 0 : (dayOfWeek + 4) % 7
    const wednesdayDate = new Date(now)
    wednesdayDate.setDate(now.getDate() - daysBack)
    const wednesdayStr = wednesdayDate.toISOString().split('T')[0]

    const { data: entry } = await supabase
      .from('wednesday_notices')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('date', wednesdayStr)
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
