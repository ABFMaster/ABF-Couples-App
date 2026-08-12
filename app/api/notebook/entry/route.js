export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { updateNoraMemory, SIGNAL_TYPES } from '@/lib/nora-memory'
import { getOwnCoupleId } from '@/lib/api-auth'
import { checkSensitiveContent, resolveSafetyAction } from '@/lib/safety'

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

    const { entryType, content } = await request.json()

    if (!VALID_ENTRY_TYPES.includes(entryType)) {
      return NextResponse.json({ error: 'entryType must be one of: noticed, working_on, reflection' }, { status: 400 })
    }
    if (!content?.trim()) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    // coupleId derived from the caller's own profile, never trusted from the
    // client — same fix and same rationale as practices/route.js POST. The
    // real client (app/profile/page.js) never sent a coupleId either, so
    // this had been silently null and NOTEBOOK_ENTRY never reached Nora's
    // memory in production.
    const coupleId = await getOwnCoupleId(supabase, user.id)

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

    // ── SENSITIVE-CONTENT SAFETY GATE ────────────────────────────────
    // This is the user's own notebook entry, not a chat turn — unlike
    // AI Coach/Couples Session, there's no generated reply to suppress and
    // no reason to block them from saving their own private note. The
    // entry above always saves regardless of what this returns. What's
    // gated is only whether it goes on to reach Nora's shared notes/claims
    // pipeline. Same resolveSafetyAction() contract as the chat routes:
    // GENERATE_AND_REMEMBER is the only outcome that writes to memory —
    // flagged content, and content the classifier couldn't evaluate, both
    // skip the memory write. Task #190, Aug 12 2026.
    const safety = await checkSensitiveContent(content.trim())
    const safetyAction = resolveSafetyAction(safety)
    if (safetyAction === 'GENERATE_AND_REMEMBER') {
      updateNoraMemory({
        coupleId: coupleId || null,
        userId: user.id,
        signalType: SIGNAL_TYPES.NOTEBOOK_ENTRY,
        inputData: { entryType, content: content.trim(), timestamp: now },
      }).catch(() => {})
    } else {
      console.warn('[safety] notebook entry skipped memory write', { route: 'notebook/entry', action: safetyAction, category: safety.category })
    }

    return NextResponse.json({ entry })
  } catch (err) {
    console.error('[notebook/entry] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
