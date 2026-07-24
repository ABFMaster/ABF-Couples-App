export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { updateNoraMemory, SIGNAL_TYPES } from '@/lib/nora-memory'

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

    const { dateId, userId, rating, review } = await request.json()
    if (!dateId || !userId || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch the custom_date
    const { data: date, error: dateError } = await supabase
      .from('custom_dates')
      .select('id, title, date_time, stops, couple_id, user1_completed_at, user2_completed_at, user1_rating, user2_rating')
      .eq('id', dateId)
      .single()
    if (dateError || !date) {
      return NextResponse.json({ error: 'Date not found' }, { status: 404 })
    }

    // Fetch couple to determine user1 vs user2
    const { data: couple, error: coupleError } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', date.couple_id)
      .single()
    if (coupleError || !couple) {
      return NextResponse.json({ error: 'Couple not found' }, { status: 404 })
    }

    const isUser1 = couple.user1_id === userId
    // Guard — prevent double completion
    const alreadyCompleted = isUser1 ? !!date.user1_completed_at : !!date.user2_completed_at
    if (alreadyCompleted) {
      return NextResponse.json({ success: true, alreadyCompleted: true })
    }
    const updateData = isUser1
      ? { user1_rating: rating, user1_review: review?.trim() || null, user1_completed_at: new Date().toISOString() }
      : { user2_rating: rating, user2_review: review?.trim() || null, user2_completed_at: new Date().toISOString() }

    const { error: updateError } = await supabase
      .from('custom_dates')
      .update(updateData)
      .eq('id', dateId)
    if (updateError) {
      return NextResponse.json({ error: 'Failed to save completion' }, { status: 500 })
    }

    // Check if both partners have now completed
    const partnerAlreadyDone = isUser1 ? !!date.user2_completed_at : !!date.user1_completed_at
    const bothDone = partnerAlreadyDone

    if (bothDone) {
      await supabase
        .from('custom_dates')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', dateId)
    }

    updateNoraMemory({
      coupleId: date.couple_id,
      userId,
      signalType: SIGNAL_TYPES.DATE_COMPLETED,
      inputData: { dateId, title: date.title, dateTime: date.date_time, stops: date.stops, rating, review, bothDone },
    }).catch(() => {})

    return NextResponse.json({ success: true, bothDone })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
