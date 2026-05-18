export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { updateNoraMemory, SIGNAL_TYPES } from '@/lib/nora-memory'

const VALID_STATUSES = ['active', 'paused', 'done']

export async function PATCH(request, { params }) {
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

    const { id } = await params
    const { status, coupleId } = await request.json()

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'status must be one of: active, paused, done' }, { status: 400 })
    }

    const { data: existing, error: fetchError } = await supabase
      .from('user_practices')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existing) return NextResponse.json({ error: 'Practice not found' }, { status: 404 })

    const now = new Date().toISOString()

    const { data: practice, error } = await supabase
      .from('user_practices')
      .update({ status, updated_at: now })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: 'Failed to update practice' }, { status: 500 })

    updateNoraMemory({
      coupleId: coupleId || existing.couple_id || null,
      userId: user.id,
      signalType: SIGNAL_TYPES.PRACTICE_UPDATED,
      inputData: { title: existing.title, oldStatus: existing.status, newStatus: status, timestamp: now },
    }).catch(() => {})

    return NextResponse.json({ practice })
  } catch (err) {
    console.error('[practices/[id]] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
