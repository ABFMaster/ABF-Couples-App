import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getTodayString, getDayOfWeek } from '@/lib/dates'

const BET_DAYS = new Set([3]) // Wednesday

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const forceOverride = searchParams.get('bet') === 'true'

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Step 1: Fetch couple for this user
    const { data: couple } = await supabase
      .from('couples')
      .select('id, user1_id, user2_id, created_at')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .maybeSingle()

    if (!couple) {
      return NextResponse.json({ error: 'No couple found' }, { status: 404 })
    }

    const coupleId = couple.id
    const partnerId = couple.user1_id === userId ? couple.user2_id : couple.user1_id

    // Fetch user's timezone for date calculation
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('timezone')
      .eq('user_id', userId)
      .maybeSingle()

    // Step 2: Check if today is a Bet day
    const todayStr = getTodayString(userProfile?.timezone)
    const dayOfWeek = getDayOfWeek(userProfile?.timezone)

    if (!forceOverride && !BET_DAYS.has(dayOfWeek)) {
      return NextResponse.json({ betDay: false })
    }

    // Step 3: Check for existing bet today
    let { data: bet } = await supabase
      .from('bets')
      .select('id, question, question_id, question_level, question_category, bet_date')
      .eq('couple_id', coupleId)
      .eq('bet_date', todayStr)
      .maybeSingle()

    if (!bet) {
      return Response.json({ error: 'No bet for today' }, { status: 404 })
    }

    // Step 5: Fetch bet_responses for both users
    const [{ data: mine }, { data: theirs }, { data: partnerProfile }] = await Promise.all([
      supabase
        .from('bet_responses')
        .select('*')
        .eq('bet_id', bet.id)
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('bet_responses')
        .select('*')
        .eq('bet_id', bet.id)
        .eq('user_id', partnerId)
        .maybeSingle(),
      supabase
        .from('user_profiles')
        .select('display_name')
        .eq('user_id', partnerId)
        .maybeSingle(),
    ])

    // Step 6: Return response (blind partner's response until user has submitted their own prediction)
    const blindedTheirs = mine?.prediction ? (theirs || null) : null

    return NextResponse.json({
      betDay: true,
      bet: {
        id: bet.id,
        question: bet.question,
        question_level: bet.question_level,
        question_category: bet.question_category,
        bet_date: bet.bet_date,
      },
      mine: mine || null,
      theirs: blindedTheirs,
      partnerId,
      partnerName: partnerProfile?.display_name || null,
    })
  } catch (err) {
    console.error('[bet/today] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
