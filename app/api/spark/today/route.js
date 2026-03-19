import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getSparkQuestion } from '@/lib/spark-questions'
import { getTodayString, getDayOfWeek } from '@/lib/dates'

const SPARK_DAYS = new Set([1, 2, 4]) // Mon, Tue, Thu

export async function GET(request) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Step 2: Get couple_id and timezone from user_profiles
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('couple_id, timezone')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile?.couple_id) {
      return NextResponse.json({ error: 'No couple found' }, { status: 404 })
    }

    const coupleId = profile.couple_id

    // Step 3: Get couple record
    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id, created_at')
      .eq('id', coupleId)
      .maybeSingle()

    if (!couple) {
      return NextResponse.json({ error: 'Couple not found' }, { status: 404 })
    }

    const partnerId = couple.user1_id === user.id ? couple.user2_id : couple.user1_id

    // Step 4: Check if today is a spark day
    const { searchParams } = new URL(request.url)
    const forceOverride = searchParams.get('spark') === 'true'
    const todayStr = getTodayString(profile?.timezone)
    const dayOfWeek = getDayOfWeek(profile?.timezone)

    if (!forceOverride && !SPARK_DAYS.has(dayOfWeek)) {
      return NextResponse.json({ sparkDay: false })
    }

    // Step 5: Check for existing spark today
    let { data: spark } = await supabase
      .from('sparks')
      .select('id, question, question_id, question_level, question_tone, spark_date')
      .eq('couple_id', coupleId)
      .eq('spark_date', todayStr)
      .maybeSingle()

    // Step 6: Generate if none exists
    if (!spark) {
      const { data: usedRows } = await supabase
        .from('sparks')
        .select('question_id')
        .eq('couple_id', coupleId)

      const usedIds = (usedRows || []).map(r => r.question_id).filter(Boolean)

      const coupleAgeDays = Math.floor(
        (Date.now() - new Date(couple.created_at).getTime()) / 86400000
      )

      const q = getSparkQuestion({ coupleAgeDays, skipCount: 0, usedIds })

      const { data: inserted } = await supabase
        .from('sparks')
        .insert({
          couple_id: coupleId,
          question: q.question,
          question_id: q.id,
          question_level: q.level,
          question_tone: q.tone,
          spark_date: todayStr,
        })
        .select('id, question, question_id, question_level, question_tone, spark_date')
        .maybeSingle()

      spark = inserted

      // Notify both users that a new Spark is ready
      try {
        const { data: myProfile } = await supabase
          .from('user_profiles')
          .select('name')
          .eq('user_id', user.id)
          .maybeSingle()

        const appBase = process.env.NEXT_PUBLIC_APP_URL || 'https://abf-couples-app.vercel.app'
        await Promise.all([
          fetch(`${appBase}/api/push/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: couple.user1_id,
              title: 'The Spark',
              body: 'A new Spark is waiting for you.',
              url: '/today',
            }),
          }),
          fetch(`${appBase}/api/push/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: couple.user2_id,
              title: 'The Spark',
              body: 'A new Spark is waiting for you.',
              url: '/today',
            }),
          }),
        ])
      } catch (notifyErr) {
        console.error('[spark/today] Notification error:', notifyErr)
      }
    }

    if (!spark) {
      return NextResponse.json({ error: 'Failed to generate spark' }, { status: 500 })
    }

    // Step 7: Fetch spark responses for both users
    const [{ data: mine }, { data: theirs }, { data: partnerProfile }] = await Promise.all([
      supabase
        .from('spark_responses')
        .select('*')
        .eq('spark_id', spark.id)
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('spark_responses')
        .select('*')
        .eq('spark_id', spark.id)
        .eq('user_id', partnerId)
        .maybeSingle(),
      supabase
        .from('user_profiles')
        .select('display_name')
        .eq('user_id', partnerId)
        .maybeSingle(),
    ])

    // Blind partner response until current user has answered
    const theirsVisible = mine?.responded_at != null
    const theirsSafe = theirs
      ? { ...theirs, response_text: theirsVisible ? theirs.response_text : null }
      : null

    return NextResponse.json({
      sparkDay: true,
      spark: {
        id: spark.id,
        question: spark.question,
        question_level: spark.question_level,
        question_tone: spark.question_tone,
        spark_date: spark.spark_date,
      },
      mine: mine || null,
      theirs: theirsSafe,
      partnerId,
      partnerName: partnerProfile?.display_name || null,
    })
  } catch (err) {
    console.error('[spark/today] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
