import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id

    const { data: couple } = await supabase
      .from('couples')
      .select('id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .maybeSingle()

    const coupleId = couple?.id || null

    await supabase.from('feedback').delete().eq('user_id', userId)
    await supabase.from('push_subscriptions').delete().eq('user_id', userId)
    await supabase.from('daily_checkins').delete().eq('user_id', userId)
    await supabase.from('spark_responses').delete().eq('user_id', userId)
    await supabase.from('bet_responses').delete().eq('user_id', userId)

    if (coupleId) {
      await supabase.from('nora_memory').delete().eq('couple_id', coupleId)
    }

    await supabase.from('timeline_events').delete().eq('created_by', userId)
    await supabase.from('shared_items').delete().eq('created_by', userId)
    await supabase.from('custom_dates').delete().eq('user_id', userId)

    if (coupleId) {
      await supabase.from('sparks').delete().eq('couple_id', coupleId)
      await supabase.from('bets').delete().eq('couple_id', coupleId)
      await supabase.from('couples').delete().eq('id', coupleId)
    }

    await supabase.from('user_profiles').delete().eq('user_id', userId)

    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId)
    if (deleteUserError) {
      console.error('[account/delete] auth.admin.deleteUser error:', deleteUserError)
      return NextResponse.json({ error: 'Failed to delete auth user' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[account/delete] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
