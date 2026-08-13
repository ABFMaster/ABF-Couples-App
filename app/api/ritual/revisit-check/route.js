export const dynamic = 'force-dynamic'

// DB migration: see Sessions/RITUAL_ENRICHMENT_DESIGN.md — rituals.last_revisited_at,
// rituals.pending_revisit_message.

import { NextResponse } from 'next/server'
import { noraGenerate, parseNoraJSON } from '@/lib/nora'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

const DORMANCY_MS = 6 * 7 * 24 * 3600 * 1000 // ~6 weeks, tunable
const REVISIT_ROLL = 0.25

// POST /api/ritual/revisit-check { coupleId }
// Called once when the Library view loads and nothing is already pending.
// Deliberately not on a fixed schedule — a dormancy gate plus a modest roll,
// same spirit as Follow-Through's wildcard. If nothing is eligible, or the
// roll doesn't land, this costs nothing (no generation happens) and the
// caller falls back to its normal "discover another ritual" suggestion.
export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { coupleId } = await request.json()
    if (!coupleId) {
      return NextResponse.json({ error: 'coupleId required' }, { status: 400 })
    }

    const isMember = await verifyCoupleMembership(supabase, user.id, coupleId)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: adopted } = await supabase
      .from('rituals')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('status', 'adopted')
      .is('pending_revisit_message', null)

    if (!adopted || adopted.length === 0) {
      return NextResponse.json({ ritual: null })
    }

    const now = Date.now()
    const eligible = adopted
      .map(r => ({ ritual: r, lastTouch: new Date(r.last_revisited_at || r.adopted_at || r.created_at).getTime() }))
      .filter(({ lastTouch }) => now - lastTouch >= DORMANCY_MS)
      .sort((a, b) => a.lastTouch - b.lastTouch)

    if (eligible.length === 0) {
      return NextResponse.json({ ritual: null })
    }

    if (Math.random() >= REVISIT_ROLL) {
      return NextResponse.json({ ritual: null })
    }

    const target = eligible[0].ritual

    let message = null
    try {
      const prompt = `Ritual: "${target.title}"${target.description ? ` — ${target.description}` : ''}

This couple adopted this ritual a while ago and hasn't been asked about it since.

You are Nora. Write ONE line that does two things at once: (1) casually confirms they're still doing this ritual, and (2) suggests one concrete, specific variation to try this time — a different angle, timing, or detail, not a generic "mix it up". Speak to them together as "you two". Warm, light, curious — not a check-up. Maximum 25 words. Example shape, do not copy it directly: "Are you two still doing your Sunday walk? If so, try a different route this time."

Return ONLY this JSON, no other text:
{"message": "..."}`

      const raw = await noraGenerate(prompt, {
        route: 'ritual/revisit-generate',
        system: 'You write warm, specific, non-judgmental relationship check-ins. Return only the requested JSON.',
        maxTokens: 120,
      })
      const parsed = parseNoraJSON(raw)
      message = parsed.message || null
    } catch (genErr) {
      console.error('[ritual/revisit-check] generation error:', genErr)
    }

    if (!message) {
      return NextResponse.json({ ritual: null })
    }

    const { data: updated } = await supabase
      .from('rituals')
      .update({ pending_revisit_message: message })
      .eq('id', target.id)
      .select('*')
      .maybeSingle()

    return NextResponse.json({ ritual: updated || { ...target, pending_revisit_message: message } })
  } catch (err) {
    console.error('[ritual/revisit-check] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
