export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Any couple member can append photos to a date (during/after) —
// merges with existing photos rather than overwriting, so one partner's
// upload never clobbers the other's.
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

    const { dateId, photoUrls } = await request.json()
    if (!dateId || !Array.isArray(photoUrls) || photoUrls.length === 0) {
      return NextResponse.json({ error: 'Missing dateId or photoUrls' }, { status: 400 })
    }

    const { data: existing, error: dateError } = await supabase
      .from('custom_dates')
      .select('id, couple_id, photos')
      .eq('id', dateId)
      .single()
    if (dateError || !existing) {
      return NextResponse.json({ error: 'Date not found' }, { status: 404 })
    }

    // Verify the requesting user belongs to this date's couple
    const { data: couple, error: coupleError } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', existing.couple_id)
      .single()
    if (coupleError || !couple || (couple.user1_id !== user.id && couple.user2_id !== user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existingPhotos = existing.photos || []
    const newPhotos = photoUrls.filter(url => !existingPhotos.includes(url))
    const updatedPhotos = [...existingPhotos, ...newPhotos]

    const { data: updated, error: updateError } = await supabase
      .from('custom_dates')
      .update({ photos: updatedPhotos })
      .eq('id', dateId)
      .select('photos')
      .single()
    if (updateError) {
      console.error('dates/photos/add update error:', updateError)
      return NextResponse.json({ error: 'Failed to save photos' }, { status: 500 })
    }

    return NextResponse.json({ success: true, photos: updated.photos })
  } catch (err) {
    console.error('dates/photos/add error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
