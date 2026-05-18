export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { updateNoraMemory, SIGNAL_TYPES } from '@/lib/nora-memory'

const VALID_ENTRY_TYPES = ['noticed', 'working_on', 'reflection']

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

    const { entryType, content, coupleId } = await request.json()

    if (!VALID_ENTRY_TYPES.includes(entryType)) {
      return NextResponse.json({ error: 'entryType must be one of: noticed, working_on, reflection' }, { status: 400 })
    }
    if (!content?.trim()) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    const now = new Date().toISOString()

    const { data: entry, error } = await supabase
      .from('notebook_entries')
      .insert({
        user_id: user.id,
        couple_id: coupleId || null,
        entry_type: entryType,
        content: content.trim(),
        created_at: now,
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: 'Failed to save entry' }, { status: 500 })

    updateNoraMemory({
      coupleId: coupleId || null,
      userId: user.id,
      signalType: SIGNAL_TYPES.NOTEBOOK_ENTRY,
      inputData: { entryType, content: content.trim(), timestamp: now },
    }).catch(() => {})

    return NextResponse.json({ entry })
  } catch (err) {
    console.error('[notebook/entry] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
