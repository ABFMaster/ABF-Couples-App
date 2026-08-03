export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { updateNoraMemory, SIGNAL_TYPES } from '@/lib/nora-memory'
import { getOwnCoupleId } from '@/lib/api-auth'

export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: practices, error } = await supabase
      .from('user_practices')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: 'Failed to fetch practices' }, { status: 500 })

    return NextResponse.json({ practices })
  } catch (err) {
    console.error('[practices] GET Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { title } = await request.json()

    if (!title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    // coupleId is derived from the caller's own profile, never trusted from
    // the client. The client here never actually sent a coupleId (checked
    // app/profile/page.js — POST body is `{ title }` only), so this had been
    // silently defaulting to null and this signal never reached Nora's
    // memory at all. A crafted request supplying an arbitrary coupleId could
    // otherwise have polluted another couple's nora_signals log and forced
    // an unnecessary memory_summary regeneration against their nora_memory
    // row (actual notes content is protected — updateNoraMemory only writes
    // into a slot if the acting userId matches that couple's user1/user2).
    const coupleId = await getOwnCoupleId(supabase, user.id)

    const now = new Date().toISOString()

    const { data: practice, error } = await supabase
      .from('user_practices')
      .insert({
        user_id: user.id,
        couple_id: coupleId || null,
        title: title.trim(),
        status: 'active',
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: 'Failed to save practice' }, { status: 500 })

    updateNoraMemory({
      coupleId: coupleId || null,
      userId: user.id,
      signalType: SIGNAL_TYPES.PRACTICE_ADDED,
      inputData: { title: title.trim(), timestamp: now },
    }).catch(() => {})

    return NextResponse.json({ practice })
  } catch (err) {
    console.error('[practices] POST Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
