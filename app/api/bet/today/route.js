import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getBetQuestion } from '@/lib/bet-questions'

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

    // Step 2: Check if today is a Bet day
    const today = new Date()
    const dayOfWeek = today.getDay()

    if (!forceOverride && !BET_DAYS.has(dayOfWeek)) {
      return NextResponse.json({ betDay: false })
    }

    const todayStr = today.toISOString().split('T')[0]

    // Step 3: Check for existing bet today
    let { data: bet } = await supabase
      .from('bets')
      .select('id, question, question_id, question_level, question_category, bet_date')
      .eq('couple_id', coupleId)
      .eq('bet_date', todayStr)
      .maybeSingle()

    // Step 4: Generate if none exists
    if (!bet) {
      const { data: usedRows } = await supabase
        .from('bets')
        .select('question_id')
        .eq('couple_id', coupleId)

      const usedIds = (usedRows || []).map(r => r.question_id).filter(Boolean)

      const coupleAgeDays = Math.floor(
        (Date.now() - new Date(couple.created_at).getTime()) / 86400000
      )

      const q = getBetQuestion({ coupleAgeDays, usedIds })

      const { data: inserted } = await supabase
        .from('bets')
        .insert({
          couple_id: coupleId,
          question: q.question,
          question_id: q.id,
          question_level: q.level,
          question_category: q.category || null,
          bet_date: todayStr,
        })
        .select('id, question, question_id, question_level, question_category, bet_date')
        .maybeSingle()

      bet = inserted
    }

    if (!bet) {
      return NextResponse.json({ error: 'Failed to generate bet' }, { status: 500 })
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

    // Step 6: Return response
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
      theirs: theirs || null,
      partnerId,
      partnerName: partnerProfile?.display_name || null,
    })
  } catch (err) {
    console.error('[bet/today] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
