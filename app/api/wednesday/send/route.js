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

    const { coupleId, notice, partnerName } = await request.json()
    if (!coupleId || !notice?.trim()) return NextResponse.json({ error: 'coupleId and notice required' }, { status: 400 })

    // Check 10pm Pacific cutoff
    const nowPacific = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })
    const pacificHour = new Date(nowPacific).getHours()
    const pacificDay = new Date(nowPacific).getDay()
    if (pacificDay === 3 && pacificHour >= 22) {
      return NextResponse.json({ error: 'Submission window closed at 10pm' }, { status: 403 })
    }

    const todayStr = getTodayString('America/Los_Angeles')
    // Get this week's Wednesday date
    const now = new Date(nowPacific)
    const dayOfWeek = now.getDay()
    const daysToWed = (3 - dayOfWeek + 7) % 7
    const wednesdayDate = new Date(now)
    wednesdayDate.setDate(now.getDate() - (dayOfWeek === 3 ? 0 : (7 - daysToWed) % 7))
    const wednesdayStr = wednesdayDate.toISOString().split('T')[0]

    const { data: entry } = await supabase
      .from('wednesday_notices')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('date', wednesdayStr)
      .maybeSingle()
    if (!entry) return NextResponse.json({ error: 'No Wednesday Notice found' }, { status: 404 })
    if (entry.status === 'revealed' && pacificHour >= 22) {
      return NextResponse.json({ error: 'Submission window closed' }, { status: 403 })
    }

    const isUser1 = entry.user1_id === user.id
    const updateField = isUser1
      ? { user1_notice: notice.trim(), user1_sent_at: new Date().toISOString() }
      : { user2_notice: notice.trim(), user2_sent_at: new Date().toISOString() }

    await supabase
      .from('wednesday_notices')
      .update(updateField)
      .eq('id', entry.id)

    // Get partner id and send push notification
    const partnerId = isUser1 ? entry.user2_id : entry.user1_id
    const { data: myProfile } = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .maybeSingle()

    const myName = myProfile?.display_name || 'Your partner'

    // Fire push to partner
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.CRON_SECRET}` },
      body: JSON.stringify({
        userId: partnerId,
        title: 'The Notice',
        body: `${myName} noticed something about you.`,
        url: '/dashboard',
        route: 'wednesday/send'
      })
    }).catch(() => {})

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[wednesday/send] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
