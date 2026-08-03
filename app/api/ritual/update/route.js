export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

// POST /api/ritual/update
// Rename/re-describe a custom ritual (title + optional description only —
// no status transition, no streak/completion touch). Used by
// app/ritual/page.js's EditForm, gated client-side to custom rituals only
// (!r.suggestion_id) since built-in suggestion-library rituals shouldn't be
// renamed. Previously this route didn't exist at all (handleSaveEdit posted
// to it and got a 404) — found and fixed during the Daily Rhythm audit.
export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { coupleId, ritualId, title, description } = await request.json()

    if (!coupleId || !ritualId || !title?.trim()) {
      return NextResponse.json({ error: 'coupleId, ritualId, and title required' }, { status: 400 })
    }

    const isMember = await verifyCoupleMembership(supabase, user.id, coupleId)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Scoped by couple_id, not just id — same confused-deputy pattern closed
    // elsewhere in this audit (follow-through/report). A verified couple
    // member should only ever be able to update their OWN couple's ritual.
    const { data: ritual, error } = await supabase
      .from('rituals')
      .update({
        title: title.trim(),
        description: description?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ritualId)
      .eq('couple_id', coupleId)
      .select('*')
      .maybeSingle()

    if (error) {
      console.error('[ritual/update] update error:', error)
      return NextResponse.json({ error: 'Failed to update ritual' }, { status: 500 })
    }

    if (!ritual) {
      return NextResponse.json({ error: 'Ritual not found' }, { status: 404 })
    }

    return NextResponse.json({ ritual })
  } catch (err) {
    console.error('[ritual/update] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
