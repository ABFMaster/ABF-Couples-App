export const dynamic = 'force-dynamic'

// DB migration: see Sessions/RITUAL_ENRICHMENT_DESIGN.md — ritual_completions.partner_notified,
// ritual_completions.partner_note.

import { NextResponse } from 'next/server'
import { updateNoraMemory, SIGNAL_TYPES } from '@/lib/nora-memory'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'
import { checkSensitiveContent, resolveSafetyAction } from '@/lib/safety'

// POST /api/ritual/partner-note { userId, coupleId, ritualCompletionId, note }
// The lightweight capture point for the partner-loop nudge (piece 4 of
// Sessions/RITUAL_ENRICHMENT_DESIGN.md) — whoever didn't personally check in
// on this week's ritual can leave an optional one-liner. Never required; the
// note doesn't get its own Nora reaction, it just becomes one more thing
// feeding her memory, same as everything else.
export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { coupleId, ritualCompletionId, note } = await request.json()

    if (!coupleId || !ritualCompletionId) {
      return NextResponse.json({ error: 'coupleId and ritualCompletionId required' }, { status: 400 })
    }

    const isMember = await verifyCoupleMembership(supabase, user.id, coupleId)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (!note || !note.trim()) {
      return NextResponse.json({ success: true, skipped: true })
    }

    const { data: completion, error } = await supabase
      .from('ritual_completions')
      .update({ partner_note: note.trim() })
      .eq('id', ritualCompletionId)
      .eq('couple_id', coupleId)
      .select('ritual_id')
      .maybeSingle()

    if (error) {
      console.error('[ritual/partner-note] update error:', error)
      return NextResponse.json({ error: 'Failed to save note' }, { status: 500 })
    }

    if (completion?.ritual_id) {
      const { data: ritual } = await supabase
        .from('rituals')
        .select('title')
        .eq('id', completion.ritual_id)
        .maybeSingle()

      // ── SENSITIVE-CONTENT SAFETY GATE ──────────────────────────────
      // The note itself always saves above regardless — this only decides
      // whether it goes on to reach Nora's shared notes/claims pipeline.
      // Same contract as app/api/notebook/entry/route.js. Task #191,
      // Aug 12 2026.
      const safety = await checkSensitiveContent(note.trim())
      const safetyAction = resolveSafetyAction(safety)
      if (safetyAction === 'GENERATE_AND_REMEMBER') {
        updateNoraMemory({
          coupleId,
          signalType: SIGNAL_TYPES.RITUAL_CHECKIN,
          inputData: {
            ritualTitle: ritual?.title,
            partnerNote: note.trim(),
          },
        }).catch(() => {})
      } else {
        console.warn('[safety] partner note skipped memory write', { route: 'ritual/partner-note', action: safetyAction, category: safety.category })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[ritual/partner-note] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
