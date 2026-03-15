import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getSparkQuestion } from '@/lib/spark-questions'

export async function POST(request) {
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

    const { sparkId, coupleId } = await request.json()

    // Step 2: Fetch or create spark_responses row, increment skip_count
    const { data: existing } = await supabase
      .from('spark_responses')
      .select('id, skip_count')
      .eq('spark_id', sparkId)
      .eq('user_id', user.id)
      .maybeSingle()

    let skipCount
    if (!existing) {
      const { data: inserted } = await supabase
        .from('spark_responses')
        .insert({ spark_id: sparkId, user_id: user.id, couple_id: coupleId, skip_count: 1 })
        .select('skip_count')
        .maybeSingle()
      skipCount = inserted?.skip_count ?? 1
    } else {
      skipCount = (existing.skip_count || 0) + 1
      await supabase
        .from('spark_responses')
        .update({ skip_count: skipCount })
        .eq('id', existing.id)
    }

    // Step 4: Fetch sparks row and couple created_at for coupleAgeDays
    const { data: sparkRow } = await supabase
      .from('sparks')
      .select('couple_id, question_id')
      .eq('id', sparkId)
      .maybeSingle()

    const { data: coupleRow } = await supabase
      .from('couples')
      .select('created_at')
      .eq('id', coupleId)
      .maybeSingle()

    const coupleAgeDays = Math.floor(
      (Date.now() - new Date(coupleRow.created_at).getTime()) / 86400000
    )

    // Step 5: Build usedIds including current question_id
    const { data: usedRows } = await supabase
      .from('sparks')
      .select('question_id')
      .eq('couple_id', coupleId)

    const usedIds = [...new Set([
      ...(usedRows || []).map(r => r.question_id).filter(Boolean),
      sparkRow?.question_id,
    ].filter(Boolean))]

    // Step 6: Pick new question
    const q = getSparkQuestion({ coupleAgeDays, skipCount, usedIds })

    // Step 7: Update sparks row with new question
    await supabase
      .from('sparks')
      .update({
        question: q.question,
        question_id: q.id,
        question_level: q.level,
        question_tone: q.tone,
      })
      .eq('id', sparkId)

    return NextResponse.json({
      question: q.question,
      question_id: q.id,
      question_level: q.level,
      question_tone: q.tone,
      skipCount,
    })
  } catch (err) {
    console.error('[spark/skip] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
